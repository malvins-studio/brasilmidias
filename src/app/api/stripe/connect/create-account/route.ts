import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

/**
 * Cria uma conta Stripe Connect para o owner
 * Tipo: Express (o owner gerencia sua própria conta)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Verifica se o usuário existe e é owner
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const user = userDoc.data();
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Apenas owners podem criar contas Stripe Connect' },
        { status: 403 }
      );
    }

    // Verifica se o usuário tem companyId
    if (!user.companyId) {
      return NextResponse.json(
        { error: 'Usuário não está associado a uma empresa. Associe-se a uma empresa primeiro.' },
        { status: 400 }
      );
    }

    // Verifica se a company já tem uma conta Stripe Connect
    const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const company = companyDoc.data();
    if (company.stripeAccountId) {
      return NextResponse.json(
        { error: 'Empresa já possui uma conta Stripe Connect' },
        { status: 400 }
      );
    }

    // Cria uma conta Express no Stripe Connect
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR', // Brasil
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId,
        companyId: user.companyId,
      },
    });

    // Salva o accountId na company
    await updateDoc(doc(db, 'companies', user.companyId), {
      stripeAccountId: account.id,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      accountId: account.id,
      message: 'Conta Stripe Connect criada com sucesso',
    });
  } catch (error: unknown) {
    console.error('Error creating Stripe Connect account:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Erro ao criar conta Stripe Connect';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

