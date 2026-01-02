'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCampaign } from '@/contexts/CampaignContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Media } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Calendar, ShoppingCart, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

function CampaignsContent() {
  const { user, loading: authLoading } = useAuth();
  const { campaigns, campaignMedias, getCampaignTotalPrice, loading, refetch } = useCampaign();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [mediasData, setMediasData] = useState<Record<string, Record<string, Media>>>({});
  const [loadingMedias, setLoadingMedias] = useState<Record<string, boolean>>({});

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

  // Busca dados das mídias quando uma campanha é expandida
  useEffect(() => {
    if (!expandedCampaignId) return;

    // Verifica se já carregou antes de buscar
    if (mediasData[expandedCampaignId]) return;

    const fetchMedias = async () => {
      const mediasInCampaign = campaignMedias.filter(cm => cm.campaignId === expandedCampaignId);
      
      if (mediasInCampaign.length === 0) return;

      setLoadingMedias(prev => ({ ...prev, [expandedCampaignId]: true }));

      try {
        const medias: Record<string, Media> = {};
        
        for (const campaignMedia of mediasInCampaign) {
          try {
            const mediaDoc = await getDoc(doc(db, 'media', campaignMedia.mediaId));
            if (mediaDoc.exists()) {
              medias[campaignMedia.mediaId] = {
                id: mediaDoc.id,
                ...mediaDoc.data(),
              } as Media;
            }
          } catch (error) {
            console.error(`Error fetching media ${campaignMedia.mediaId}:`, error);
          }
        }
        
        setMediasData(prev => ({
          ...prev,
          [expandedCampaignId]: medias,
        }));
      } catch (error) {
        console.error('Error fetching medias:', error);
      } finally {
        setLoadingMedias(prev => ({ ...prev, [expandedCampaignId]: false }));
      }
    };

    fetchMedias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedCampaignId]);

  const toggleCampaignDetails = (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
    } else {
      setExpandedCampaignId(campaignId);
    }
  };

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
                        onClick={() => toggleCampaignDetails(campaign.id)}
                        className="flex-1"
                      >
                        {expandedCampaignId === campaign.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Ocultar Detalhes
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Detalhes expandidos */}
                    {expandedCampaignId === campaign.id && (
                      <div className="mt-4 pt-4 border-t">
                        {loadingMedias[campaign.id] ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-sm mb-3">Resumo da Campanha</h3>
                            {campaignMedias
                              .filter(cm => cm.campaignId === campaign.id)
                              .map((campaignMedia) => {
                                const media = mediasData[campaign.id]?.[campaignMedia.mediaId];
                                if (!media) return null;

                                return (
                                  <div key={campaignMedia.id} className="border-b pb-4 last:border-0">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-sm">{media.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                          {media.city}, {media.state}
                                        </p>
                                        {campaignMedia.startDate && campaignMedia.endDate && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {format(campaignMedia.startDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                                            {format(campaignMedia.endDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                          <Badge variant="outline" className="text-xs">
                                            {campaignMedia.quantity}x {campaignMedia.priceType === 'biweek' ? 'Bi-semanal' : 'Mensal'}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-sm">
                                          {formatCurrency(campaignMedia.totalPrice || 0)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                            <div className="border-t pt-4 flex items-center justify-between">
                              <span className="text-sm font-semibold">Total:</span>
                              <span className="text-lg font-bold">{formatCurrency(totalPrice)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

export default function CampaignsPage() {
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
      <CampaignsContent />
    </Suspense>
  );
}

