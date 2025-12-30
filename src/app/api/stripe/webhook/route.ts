import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error
      ? err.message
      : 'Webhook signature verification failed';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.metadata?.reservationId;
        const campaignId = session.metadata?.campaignId;
        const reservationIds = session.metadata?.reservationIds?.split(',') || [];

        // Se é uma campanha, processa todas as reservas
        if (campaignId && reservationIds.length > 0) {
          for (const resId of reservationIds) {
            if (resId) {
              const reservationRef = doc(db, 'reservations', resId);
              const reservationSnap = await getDoc(reservationRef);
              
              if (reservationSnap.exists()) {
                const reservation = reservationSnap.data();
                
                await updateDoc(reservationRef, {
                  status: 'confirmed',
                  paymentStatus: 'held',
                  paymentIntentId: session.payment_intent as string,
                });

                // Atualiza o campaignMedia para 'reserved'
                if (reservation.campaignMediaId) {
                  await updateDoc(doc(db, 'campaignMedias', reservation.campaignMediaId), {
                    status: 'reserved',
                    reservationId: resId,
                    updatedAt: Timestamp.now(),
                  });
                }
              }
            }
          }

          // Atualiza o status da campanha para 'paid'
          await updateDoc(doc(db, 'campaigns', campaignId), {
            status: 'paid',
            updatedAt: Timestamp.now(),
          });
        } else if (reservationId) {
          // Reserva individual (não é campanha)
          const reservationRef = doc(db, 'reservations', reservationId);
          await updateDoc(reservationRef, {
            status: 'confirmed',
            paymentStatus: 'held', // Pagamento está bloqueado até o final do aluguel
            paymentIntentId: session.payment_intent as string,
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // O pagamento foi processado com sucesso
        // O status já foi atualizado no checkout.session.completed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        // Busca a reserva pelo paymentIntentId
        // Nota: Em produção, você deveria ter um índice ou buscar de outra forma
        console.error('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Webhook handler failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

