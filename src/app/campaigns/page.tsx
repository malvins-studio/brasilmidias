'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCampaign } from '@/contexts/CampaignContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Calendar, ShoppingCart, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CampaignsPage() {
  const { user, loading: authLoading } = useAuth();
  const { campaigns, campaignMedias, getCampaignTotalPrice, loading, setActiveCampaign, refetch } = useCampaign();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Verifica se houve sucesso no pagamento
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      refetch();
      // Remove o query param da URL
      router.replace('/campaigns');
    }
  }, [searchParams, router, refetch]);

  if (authLoading || loading) {
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Minhas Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas e visualize o histórico
          </p>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não tem campanhas
              </p>
              <Button onClick={() => router.push('/')}>
                Criar Campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {campaigns.map((campaign) => {
              const mediasCount = campaignMedias.filter(cm => cm.campaignId === campaign.id).length;
              const totalPrice = getCampaignTotalPrice(campaign.id);
              const hasMedias = mediasCount > 0;

              return (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-2">{campaign.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(campaign.createdAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                          <div>
                            {mediasCount} {mediasCount === 1 ? 'mídia' : 'mídias'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {campaign.status === 'draft' && 'Rascunho'}
                        {campaign.status === 'pending_payment' && 'Aguardando Pagamento'}
                        {campaign.status === 'paid' && 'Paga'}
                        {campaign.status === 'completed' && 'Concluída'}
                        {campaign.status === 'cancelled' && 'Cancelada'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {hasMedias && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total:</span>
                          <span className="text-lg font-bold">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {hasMedias && campaign.status === 'pending_payment' && (
                        <Button
                          onClick={() => router.push(`/campaigns/${campaign.id}/checkout`)}
                          className="flex-1"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Ir para Pagamento
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveCampaign(campaign);
                          router.push('/');
                        }}
                        className="flex-1"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

