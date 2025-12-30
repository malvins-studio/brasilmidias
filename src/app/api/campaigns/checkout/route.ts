import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, Timestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

// Porcentagem da plataforma (ex: 7%)
const PLATFORM_FEE_PERCENTAGE = 7;

/**
 * Cria uma sessão de checkout para uma campanha completa
 * Processa todas as mídias da campanha em uma única transação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, userId, customerEmail } = body;

    if (!campaignId || !userId) {
      return NextResponse.json(
        { error: 'campaignId e userId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se a campanha existe
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    if (!campaignDoc.exists()) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      );
    }

    const campaign = campaignDoc.data();
    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para fazer checkout desta campanha' },
        { status: 403 }
      );
    }

    // Busca todas as mídias da campanha
    const campaignMediasQuery = query(
      collection(db, 'campaignMedias'),
      where('campaignId', '==', campaignId),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const campaignMediasSnapshot = await getDocs(campaignMediasQuery);
    
    if (campaignMediasSnapshot.empty) {
      return NextResponse.json(
        { error: 'Nenhuma mídia pendente na campanha' },
        { status: 400 }
      );
    }

    // Calcula o total e prepara os line items
    let totalPrice = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const mediaIds: string[] = [];
    const campaignMediaIds: string[] = [];

    for (const campaignMediaDoc of campaignMediasSnapshot.docs) {
      const campaignMedia = campaignMediaDoc.data();
      const mediaDoc = await getDoc(doc(db, 'media', campaignMedia.mediaId));
      
      if (!mediaDoc.exists()) {
        continue;
      }

      const media = mediaDoc.data();
      const itemPrice = campaignMedia.totalPrice || 0;
      totalPrice += itemPrice;

      lineItems.push({
        price_data: {
          currency: 'brl',
          product_data: {
            name: `${media.name} - ${media.city}`,
            description: campaignMedia.startDate && campaignMedia.endDate
              ? `Período: ${new Date(campaignMedia.startDate.toDate()).toLocaleDateString('pt-BR')} até ${new Date(campaignMedia.endDate.toDate()).toLocaleDateString('pt-BR')}`
              : undefined,
          },
          unit_amount: Math.round(itemPrice * 100),
        },
        quantity: 1,
      });

      mediaIds.push(campaignMedia.mediaId);
      campaignMediaIds.push(campaignMediaDoc.id);
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma mídia válida encontrada' },
        { status: 400 }
      );
    }

    // Calcula o split de pagamento (usa a primeira mídia como referência para o owner)
    const firstMediaDoc = await getDoc(doc(db, 'media', mediaIds[0]));
    const firstMedia = firstMediaDoc.data();
    
    let ownerStripeAccountId: string | null = null;
    if (firstMedia?.companyId) {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', firstMedia.companyId));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          ownerStripeAccountId = companyData.stripeAccountId || null;
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      }
    }

    const platformFee = Math.round(totalPrice * (PLATFORM_FEE_PERCENTAGE / 100));
    const ownerAmount = totalPrice - platformFee;

    // Cria reservas para cada mídia
    const reservationIds: string[] = [];
    
    for (const campaignMediaDoc of campaignMediasSnapshot.docs) {
      const campaignMedia = campaignMediaDoc.data();
      
      const reservationRef = await addDoc(collection(db, 'reservations'), {
        mediaId: campaignMedia.mediaId,
        userId,
        startDate: campaignMedia.startDate || Timestamp.now(),
        endDate: campaignMedia.endDate || Timestamp.now(),
        totalPrice: campaignMedia.totalPrice || 0,
        status: 'pending',
        paymentStatus: 'pending',
        platformFee: Math.round((campaignMedia.totalPrice || 0) * (PLATFORM_FEE_PERCENTAGE / 100)),
        ownerAmount: (campaignMedia.totalPrice || 0) - Math.round((campaignMedia.totalPrice || 0) * (PLATFORM_FEE_PERCENTAGE / 100)),
        campaignId: campaignId,
        campaignMediaId: campaignMediaDoc.id,
        createdAt: Timestamp.now(),
      });

      reservationIds.push(reservationRef.id);
    }

    // Cria a sessão de checkout do Stripe
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/campaigns?success=true`,
      cancel_url: `${request.headers.get('origin')}/campaigns/${campaignId}/checkout?canceled=true`,
      customer_email: customerEmail || undefined,
      metadata: {
        campaignId,
        userId,
        reservationIds: reservationIds.join(','),
        campaignMediaIds: campaignMediaIds.join(','),
      },
    };

    // Se o owner tem uma conta Stripe Connect, configura split automático
    if (ownerStripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(platformFee * 100),
        transfer_data: {
          destination: ownerStripeAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Atualiza as reservas com o paymentIntentId
    for (const reservationId of reservationIds) {
      await updateDoc(doc(db, 'reservations', reservationId), {
        paymentIntentId: session.payment_intent as string,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error creating campaign checkout session:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao criar sessão de pagamento';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

