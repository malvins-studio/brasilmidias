'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCampaign } from '@/contexts/CampaignContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Media } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Loader2, ShoppingCart } from 'lucide-react';

export default function CampaignCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { campaigns, campaignMedias, getCampaignTotalPrice, loading } = useCampaign();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [medias, setMedias] = useState<Record<string, Media>>({});

  const campaignId = params.id as string;
  const campaign = campaigns.find(c => c.id === campaignId);
  const mediasInCampaign = campaignMedias.filter(cm => cm.campaignId === campaignId);
  const totalPrice = getCampaignTotalPrice(campaignId);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!campaign) {
      router.push('/campaigns');
      return;
    }

    // Busca informações das mídias
    const fetchMedias = async () => {
      const mediasData: Record<string, Media> = {};
      
      for (const campaignMedia of mediasInCampaign) {
        try {
          const mediaDoc = await getDoc(doc(db, 'media', campaignMedia.mediaId));
          if (mediaDoc.exists()) {
            mediasData[campaignMedia.mediaId] = {
              id: mediaDoc.id,
              ...mediaDoc.data(),
            } as Media;
          }
        } catch (error) {
          console.error(`Error fetching media ${campaignMedia.mediaId}:`, error);
        }
      }
      
      setMedias(mediasData);
    };

    if (mediasInCampaign.length > 0) {
      fetchMedias();
    }
  }, [user, campaign, mediasInCampaign, router]);

  const handleCheckout = async () => {
    if (!user || !campaign) return;

    try {
      setProcessingPayment(true);

      const response = await fetch('/api/campaigns/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          userId: user.uid,
          customerEmail: user.email || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de checkout não disponível');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert(error instanceof Error ? error.message : 'Erro ao processar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
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

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Campanha não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Checkout da Campanha</h1>
          <p className="text-muted-foreground">
            {campaign.name}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resumo da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mediasInCampaign.map((campaignMedia) => {
              const media = medias[campaignMedia.mediaId];
              if (!media) return null;

              return (
                <div key={campaignMedia.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{media.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {media.city}, {media.state}
                      </p>
                      {campaignMedia.startDate && campaignMedia.endDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(campaignMedia.startDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                          {format(campaignMedia.endDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {campaignMedia.quantity}x {campaignMedia.priceType === 'biweek' ? 'Bi-semanal' : 'Mensal'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(campaignMedia.totalPrice || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-4 flex items-center justify-between">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold">{formatCurrency(totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Voltar
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={processingPayment || mediasInCampaign.length === 0}
            className="flex-1"
            size="lg"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ir para Pagamento
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

