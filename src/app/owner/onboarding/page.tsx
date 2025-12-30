'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { StripeConnectCard } from '../dashboard/components/StripeConnectCard';

type Step = 'company' | 'stripe';

function OwnerOnboardingContent() {
  const { user, loading: authLoading } = useAuth();
  const { userRole, loading: roleLoading, refetch } = useUserRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('company');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verifica query params do Stripe Connect (retorno do onboarding)
  useEffect(() => {
    const stripeSuccess = searchParams.get('stripe_success');
    const stripeRefresh = searchParams.get('stripe_refresh');

    if (stripeSuccess === 'true' || stripeRefresh === 'true') {
      // Remove o query param da URL
      router.replace('/owner/onboarding');
      // Força atualização do status do Stripe
      if (step === 'stripe') {
        // Recarrega a página após um pequeno delay para atualizar o status
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  }, [searchParams, router, step]);

  // Verifica se o usuário já tem company
  useEffect(() => {
    if (!authLoading && !roleLoading && user) {
      if (userRole?.companyId) {
        // Se já tem company, vai direto para o step do Stripe
        setStep('stripe');
      }
    }
  }, [user, userRole, authLoading, roleLoading]);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    if (!companyName.trim()) {
      setError('Nome fantasia é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/companies/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          companyName: companyName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar empresa');
      }

      setSuccess('Empresa criada com sucesso!');
      
      // Atualiza o userRole para pegar o companyId
      await refetch();
      
      // Aguarda um pouco antes de avançar para o próximo step
      setTimeout(() => {
        setStep('stripe');
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar empresa';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = () => {
    // Redireciona para o dashboard do owner
    router.push('/owner/dashboard');
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Onboarding de Proprietário</h1>
          <p className="text-muted-foreground">
            Configure sua empresa e comece a vender suas mídias
          </p>
        </div>

        {/* Indicador de progresso */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'company' ? 'text-primary' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'company' ? 'border-primary bg-primary text-white' : 'border-green-600 bg-green-600 text-white'
              }`}>
                {step === 'company' ? '1' : <CheckCircle className="h-5 w-5" />}
              </div>
              <span className="font-medium">Empresa</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 mx-4">
              <div className={`h-full transition-all ${
                step === 'stripe' ? 'bg-green-600' : 'bg-gray-300'
              }`} style={{ width: step === 'stripe' ? '100%' : '0%' }} />
            </div>
            <div className={`flex items-center gap-2 ${step === 'stripe' ? 'text-primary' : userRole?.companyId ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step === 'stripe' 
                  ? 'border-primary bg-primary text-white' 
                  : userRole?.companyId 
                    ? 'border-green-600 bg-green-600 text-white' 
                    : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {step === 'stripe' ? '2' : userRole?.companyId ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span className="font-medium">Stripe Connect</span>
            </div>
          </div>
        </div>

        {/* Step 1: Criar Company */}
        {step === 'company' && (
          <Card>
            <CardHeader>
              <CardTitle>Passo 1: Criar sua Empresa</CardTitle>
              <CardDescription>
                Informe o nome fantasia da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome Fantasia *</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Ex: Outdoor Solutions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Este será o nome exibido nas suas mídias
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Stripe Connect */}
        {step === 'stripe' && (
          <Card>
            <CardHeader>
              <CardTitle>Passo 2: Configurar Pagamentos</CardTitle>
              <CardDescription>
                Configure sua conta Stripe Connect para receber pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StripeConnectCard />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('company')}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCompleteOnboarding}
                    className="flex-1"
                  >
                    Concluir Onboarding
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function OwnerOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    }>
      <OwnerOnboardingContent />
    </Suspense>
  );
}

