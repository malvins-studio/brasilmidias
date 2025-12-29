'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';

interface StripeAccountStatus {
  hasAccount: boolean;
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  email?: string;
  country?: string;
}

export function StripeConnectCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAccountStatus = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/stripe/connect/account-status?userId=${user.uid}`
      );
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching account status:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      fetchAccountStatus();
    }
  }, [user, fetchAccountStatus]);

  const handleCreateAccount = async () => {
    if (!user?.uid) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Atualiza o status após criar a conta
      await fetchAccountStatus();

      // Redireciona para onboarding
      handleOnboarding();
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Erro ao criar conta Stripe Connect');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOnboarding = async () => {
    if (!user?.uid) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/stripe/connect/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Redireciona para o onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      alert('Erro ao criar link de onboarding');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!user?.uid) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/stripe/connect/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Abre o dashboard do Stripe em nova aba
      // Usa window.open sem verificar window.closed para evitar problemas de COOP
      const stripeWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
      if (!stripeWindow) {
        // Se o popup foi bloqueado, redireciona na mesma aba
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating login link:', error);
      alert('Erro ao criar link de login');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const isFullySetup =
    status.hasAccount &&
    status.detailsSubmitted &&
    status.chargesEnabled &&
    status.payoutsEnabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Conta Stripe Connect</span>
          {isFullySetup ? (
            <Badge className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configurada
            </Badge>
          ) : status.hasAccount ? (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
              Pendente
            </Badge>
          ) : (
            <Badge variant="outline" className="border-gray-500">
              Não configurada
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.hasAccount ? (
          <>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Stripe para receber pagamentos diretamente. 
              Você receberá 85% do valor e a plataforma ficará com 15%.
            </p>
            <Button
              onClick={handleCreateAccount}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta Stripe Connect'
              )}
            </Button>
          </>
        ) : !isFullySetup ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Detalhes enviados:</span>
                {status.detailsSubmitted ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pagamentos habilitados:</span>
                {status.chargesEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Saques habilitados:</span>
                {status.payoutsEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Complete o cadastro na Stripe para receber pagamentos.
            </p>
            <Button
              onClick={handleOnboarding}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Completar Cadastro
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Conta ID:</span>
                <span className="font-mono text-xs">{status.accountId}</span>
              </div>
              {status.email && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{status.email}</span>
                </div>
              )}
              {status.country && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">País:</span>
                  <span>{status.country.toUpperCase()}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-green-600">
              ✓ Sua conta está configurada e pronta para receber pagamentos!
            </p>
            <Button
              onClick={handleLogin}
              disabled={actionLoading}
              variant="outline"
              className="w-full"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Dashboard Stripe
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

