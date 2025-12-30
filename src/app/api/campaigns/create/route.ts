import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore';

/**
 * Cria uma nova campanha
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name } = body;

    if (!userId || !name || !name.trim()) {
      return NextResponse.json(
        { error: 'userId e name são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se o usuário existe
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Cria a campanha
    const campaignRef = await addDoc(collection(db, 'campaigns'), {
      userId,
      name: name.trim(),
      status: 'draft',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      campaignId: campaignRef.id,
      message: 'Campanha criada com sucesso',
    });
  } catch (error: unknown) {
    console.error('Error creating campaign:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao criar campanha';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

