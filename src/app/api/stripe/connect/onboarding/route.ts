import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

/**
 * Cria um link de onboarding para o owner completar o cadastro na Stripe
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
      return NextResponse.json(
        { error: 'Usuário não está associado a uma empresa' },
        { status: 400 }
      );
    }

    // Busca a company
    const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const company = companyDoc.data();

    if (!company.stripeAccountId) {
      return NextResponse.json(
        { error: 'Empresa não possui conta Stripe Connect. Crie uma conta primeiro.' },
        { status: 400 }
      );
    }

    // Cria o link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: company.stripeAccountId,
      refresh_url: `${request.headers.get('origin')}/owner/dashboard?stripe_refresh=true`,
      return_url: `${request.headers.get('origin')}/owner/dashboard?stripe_success=true`,
      type: 'account_onboarding',
    });

    const urlWithLocale = new URL(accountLink.url);
    urlWithLocale.searchParams.set('stripe_locale', 'pt-BR');

    return NextResponse.json({
      success: true,
      url: urlWithLocale.toString(),
    });
  } catch (error: unknown) {
    console.error('Error creating onboarding link:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Erro ao criar link de onboarding';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

