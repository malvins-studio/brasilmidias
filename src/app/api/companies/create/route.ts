import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Cria uma nova company e associa ao usuário
 * Também atualiza o role do usuário para 'owner' se ainda não for
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, companyName } = body;

    if (!userId || !companyName || !companyName.trim()) {
      return NextResponse.json(
        { error: 'userId e companyName são obrigatórios' },
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

    const user = userDoc.data();

    // Verifica se o usuário já tem uma company
    if (user.companyId) {
      return NextResponse.json(
        { error: 'Usuário já está associado a uma empresa' },
        { status: 400 }
      );
    }

    // Cria a company
    const companyRef = await addDoc(collection(db, 'companies'), {
      name: companyName.trim(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Atualiza o usuário: associa à company e muda o role para 'owner'
    await updateDoc(doc(db, 'users', userId), {
      companyId: companyRef.id,
      role: 'owner',
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      companyId: companyRef.id,
      message: 'Empresa criada com sucesso',
    });
  } catch (error: unknown) {
    console.error('Error creating company:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao criar empresa';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

