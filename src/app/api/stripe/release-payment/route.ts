import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
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

    // Verifica se o pagamento já foi feito com split automático
    let hasAutomaticSplit = false;
    if (reservation.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          reservation.paymentIntentId as string
        );
        // Se o PaymentIntent tem transfer_data, significa que o split foi automático
        // e o dinheiro já foi para o owner no momento do pagamento
        hasAutomaticSplit = !!(paymentIntent.transfer_data?.destination);
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
      }
    }

    // Busca o stripeAccountId da company através da mídia
    let ownerStripeAccountId: string | null = null;
    try {
      const mediaDoc = await getDoc(doc(db, 'media', reservation.mediaId));
      if (mediaDoc.exists()) {
        const media = mediaDoc.data();
        if (media.companyId) {
          const companyDoc = await getDoc(doc(db, 'companies', media.companyId));
          if (companyDoc.exists()) {
            const companyData = companyDoc.data();
            ownerStripeAccountId = companyData.stripeAccountId || null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching company stripe account:', error);
    }

    // Se não há ownerStripeAccountId, apenas marca como liberado
    // (o dinheiro já está na conta da plataforma)
    if (!ownerStripeAccountId) {
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

    // Se o split foi automático, o dinheiro já foi para o owner no momento do pagamento
    // Apenas marca como liberado
    if (hasAutomaticSplit) {
      await updateDoc(reservationRef, {
        paymentStatus: 'released',
        paymentReleasedAt: Timestamp.now(),
        status: 'completed',
      });

      return NextResponse.json({ 
        success: true,
        message: 'Pagamento liberado (split automático já foi processado pelo Stripe)'
      });
    }

    // Se há ownerStripeAccountId mas o split não foi automático (caso legado),
    // transfere o valor manualmente para o owner
    if (reservation.paymentIntentId && reservation.ownerAmount && ownerStripeAccountId) {
      try {
        // Cria uma transferência para o owner (Stripe Connect)
        // O valor já está na conta da plataforma, então transferimos o ownerAmount
        const transfer = await stripe.transfers.create({
          amount: Math.round(reservation.ownerAmount * 100), // Converte para centavos
          currency: 'brl',
          destination: ownerStripeAccountId,
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
      } catch (transferError: unknown) {
        console.error('Error creating transfer:', transferError);
        const errorMessage = transferError instanceof Error
          ? transferError.message
          : 'Erro desconhecido na transferência';
        // Se a transferência falhar, ainda marca como liberado mas registra o erro
        await updateDoc(reservationRef, {
          paymentStatus: 'released',
          paymentReleasedAt: Timestamp.now(),
          status: 'completed',
          transferError: errorMessage,
        });

        return NextResponse.json({ 
          success: true,
          warning: 'Pagamento marcado como liberado, mas transferência falhou. Verifique manualmente.',
          error: errorMessage
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
  } catch (error: unknown) {
    console.error('Error releasing payment:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Erro ao liberar pagamento';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

