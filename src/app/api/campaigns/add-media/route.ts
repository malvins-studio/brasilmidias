import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Adiciona uma mídia a uma campanha
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, mediaId, userId, startDate, endDate, quantity, priceType, totalPrice } = body;

    if (!campaignId || !mediaId || !userId || !startDate || !endDate || !quantity || !priceType || !totalPrice) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
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
        { error: 'Você não tem permissão para adicionar mídias a esta campanha' },
        { status: 403 }
      );
    }

    // Adiciona a mídia à campanha
    await addDoc(collection(db, 'campaignMedias'), {
      campaignId,
      mediaId,
      userId,
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      quantity,
      priceType,
      totalPrice,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Atualiza o status da campanha para pending_payment
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: 'pending_payment',
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Mídia adicionada à campanha com sucesso',
    });
  } catch (error: unknown) {
    console.error('Error adding media to campaign:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao adicionar mídia à campanha';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

