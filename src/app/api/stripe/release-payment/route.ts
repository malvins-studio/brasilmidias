import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId é obrigatório' },
        { status: 400 }
      );
    }

    // Busca a reserva
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationSnap = await getDoc(reservationRef);

    if (!reservationSnap.exists()) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      );
    }

    const reservation = reservationSnap.data();

    // Verifica se o pagamento já foi liberado
    if (reservation.paymentStatus === 'released') {
      return NextResponse.json(
        { error: 'Pagamento já foi liberado' },
        { status: 400 }
      );
    }

    // Verifica se a data de término já passou
    const endDate = reservation.endDate.toDate();
    const now = new Date();

    if (now < endDate) {
      return NextResponse.json(
        { error: 'O período de aluguel ainda não terminou' },
        { status: 400 }
      );
    }

    // Se não há ownerStripeAccountId, apenas marca como liberado
    // (o dinheiro já está na conta da plataforma)
    if (!reservation.ownerStripeAccountId) {
      await updateDoc(reservationRef, {
        paymentStatus: 'released',
        paymentReleasedAt: Timestamp.now(),
        status: 'completed',
      });

      return NextResponse.json({ 
        success: true,
        message: 'Pagamento liberado (sem split - owner não configurado)'
      });
    }

    // Se há ownerStripeAccountId, transfere o valor para o owner
    if (reservation.paymentIntentId && reservation.ownerAmount) {
      try {
        // Busca o PaymentIntent para obter o charge
        const paymentIntent = await stripe.paymentIntents.retrieve(
          reservation.paymentIntentId as string
        );

        // Cria uma transferência para o owner (Stripe Connect)
        // O valor já está na conta da plataforma, então transferimos o ownerAmount
        const transfer = await stripe.transfers.create({
          amount: Math.round(reservation.ownerAmount * 100), // Converte para centavos
          currency: 'brl',
          destination: reservation.ownerStripeAccountId as string,
          description: `Pagamento para owner - Reserva ${reservationId}`,
        });

        await updateDoc(reservationRef, {
          paymentStatus: 'released',
          paymentReleasedAt: Timestamp.now(),
          status: 'completed',
          transferId: transfer.id,
        });

        return NextResponse.json({ 
          success: true,
          message: 'Pagamento liberado e transferido para o owner',
          transferId: transfer.id
        });
      } catch (transferError: any) {
        console.error('Error creating transfer:', transferError);
        // Se a transferência falhar, ainda marca como liberado mas registra o erro
        await updateDoc(reservationRef, {
          paymentStatus: 'released',
          paymentReleasedAt: Timestamp.now(),
          status: 'completed',
          transferError: transferError.message,
        });

        return NextResponse.json({ 
          success: true,
          warning: 'Pagamento marcado como liberado, mas transferência falhou. Verifique manualmente.',
          error: transferError.message
        });
      }
    }

    // Se não há paymentIntentId ou ownerAmount, apenas marca como liberado
    await updateDoc(reservationRef, {
      paymentStatus: 'released',
      paymentReleasedAt: Timestamp.now(),
      status: 'completed',
    });

    return NextResponse.json({ 
      success: true,
      message: 'Pagamento liberado'
    });
  } catch (error: any) {
    console.error('Error releasing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao liberar pagamento' },
      { status: 500 }
    );
  }
}

