import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

// Porcentagem da plataforma (ex: 15%)
const PLATFORM_FEE_PERCENTAGE = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaId, startDate, endDate, totalPrice, userId } = body;

    if (!mediaId || !startDate || !endDate || !totalPrice || !userId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Busca informações da mídia
    const mediaDoc = await getDoc(doc(db, 'media', mediaId));
    if (!mediaDoc.exists()) {
      return NextResponse.json(
        { error: 'Mídia não encontrada' },
        { status: 404 }
      );
    }

    const media = mediaDoc.data();
    
    // Calcula o split de pagamento
    const platformFee = Math.round(totalPrice * (PLATFORM_FEE_PERCENTAGE / 100));
    const ownerAmount = totalPrice - platformFee;

    // Cria uma reserva pendente primeiro
    const reservationRef = await addDoc(collection(db, 'reservations'), {
      mediaId,
      userId,
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
      platformFee,
      ownerAmount,
      ownerStripeAccountId: media.ownerStripeAccountId || null,
      createdAt: Timestamp.now(),
    });

    // Cria a sessão de checkout do Stripe
    // Se o owner tem uma conta Stripe Connect, usa split payment
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${media.name} - ${media.city}`,
              description: `Aluguel de ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`,
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/dashboard?success=true`,
      cancel_url: `${request.headers.get('origin')}/midia/${mediaId}?canceled=true`,
      metadata: {
        reservationId: reservationRef.id,
        mediaId,
        userId,
      },
    };

    // Nota: Para Checkout Sessions, o split será feito via transferência manual
    // quando o pagamento for liberado. Isso permite manter o pagamento bloqueado
    // até o final do período de aluguel.

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Atualiza a reserva com o paymentIntentId (será atualizado pelo webhook)
    await updateDoc(doc(db, 'reservations', reservationRef.id), {
      paymentIntentId: session.payment_intent as string,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao criar sessão de pagamento';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

