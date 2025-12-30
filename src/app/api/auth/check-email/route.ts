import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * Verifica se um email existe no Firebase Auth e retorna os métodos de login disponíveis
 * 
 * @returns { hasEmail: boolean, methods: string[] }
 * - hasEmail: true se o email existe, false caso contrário
 * - methods: array com os métodos de login disponíveis ('password', 'google.com', etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Normaliza o email (trim e lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();

    try {
      // Busca o usuário pelo email usando Firebase Admin
      const user = await auth.getUserByEmail(normalizedEmail);
      
      // Se encontrou o usuário, retorna os providers (métodos de login)
      const providers = user.providerData.map(provider => provider.providerId);
      
      return NextResponse.json({
        hasEmail: true,
        methods: providers,
      });
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      
      // Se o erro for user-not-found, o email não existe
      if (firebaseError.code === 'auth/user-not-found') {
        return NextResponse.json({
          hasEmail: false,
          methods: [],
        });
      }

      // Para outros erros, retorna erro
      console.error('Erro ao verificar email:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar email' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Erro na API check-email:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao verificar email';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

