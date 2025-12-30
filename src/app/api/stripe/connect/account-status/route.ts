import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

/**
 * Retorna o status da conta Stripe Connect do owner
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Busca o usuário
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const user = userDoc.data();

    if (!user.companyId) {
      return NextResponse.json({
        hasAccount: false,
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    // Busca a company
    const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
    if (!companyDoc.exists()) {
      return NextResponse.json({
        hasAccount: false,
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const company = companyDoc.data();

    if (!company.stripeAccountId) {
      return NextResponse.json({
        hasAccount: false,
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    // Busca informações da conta no Stripe
    const account = await stripe.accounts.retrieve(company.stripeAccountId);

    return NextResponse.json({
      hasAccount: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      email: account.email,
      country: account.country,
    });
  } catch (error: unknown) {
    console.error('Error retrieving account status:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Erro ao buscar status da conta';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

