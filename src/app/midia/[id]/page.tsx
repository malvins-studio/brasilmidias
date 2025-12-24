'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ImageGallery } from '@/components/ImageGallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useReservas } from '@/hooks/useReservas';
import { useAuth } from '@/hooks/useAuth';
import { Media } from '@/types';
import { calculatePrice, formatCurrency } from '@/lib/utils';

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { checkAvailability } = useReservas();
  
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isAvailable, setIsAvailable] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const docRef = doc(db, 'media', params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMedia({
            id: docSnap.id,
            ...docSnap.data(),
          } as Media);
        } else {
          setError('Mídia não encontrada');
        }
      } catch (err) {
        console.error('Error fetching media:', err);
        setError('Erro ao carregar mídia');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [params.id]);

  useEffect(() => {
    // Reset quando não há datas selecionadas
    if (!dateRange?.from || !dateRange?.to || !media) {
      setIsAvailable(true);
      setCheckingAvailability(false);
      return;
    }

    // Debounce para evitar verificações muito frequentes
    const timeoutId = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const available = await checkAvailability(
          media.id,
          dateRange.from!,
          dateRange.to!
        );
        setIsAvailable(available);
      } catch (err) {
        console.error('Erro ao verificar disponibilidade:', err);
        setIsAvailable(true); // Em caso de erro, assume disponível
      } finally {
        setCheckingAvailability(false);
      }
    }, 300); // 300ms de debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), media?.id]);

  const handleReserve = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!dateRange?.from || !dateRange?.to || !media) {
      setError('Por favor, selecione as datas');
      return;
    }

    try {
      setError(null);
      setSuccess(false);
      setProcessingPayment(true);
      const totalPrice = calculatePrice(media.pricePerDay, dateRange.from, dateRange.to);

      // Cria a sessão de checkout no Stripe
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId: media.id,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          totalPrice,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();

      // Redireciona para o checkout do Stripe usando a URL da sessão
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL de checkout não disponível');
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao fazer reserva');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    );
  }

  if (error && !media) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!media) return null;

  const totalPrice = dateRange?.from && dateRange?.to
    ? calculatePrice(media.pricePerDay, dateRange.from, dateRange.to)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {media.mediaType} - {media.city}
              </h1>
              <p className="text-muted-foreground">
                {media.city}, {media.state}
              </p>
            </div>

            <ImageGallery
              images={media.images}
              alt={media.name}
            />

            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Sobre esta mídia</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{media.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Mídia</p>
                      <p className="font-medium">{media.mediaType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tráfego</p>
                      <p className="font-medium">
                        {media.traffic.toLocaleString('pt-BR')} {media.trafficUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Empresa</p>
                      <p className="font-medium">{media.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">
                        {media.address.street}, {media.address.number}
                        {media.address.complement && ` - ${media.address.complement}`}
                        <br />
                        {media.address.neighborhood}, {media.address.city} - {media.address.state}
                        <br />
                        CEP: {media.address.zipCode}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold">
                      {formatCurrency(media.pricePerDay)}
                    </span>
                    <span className="text-muted-foreground">/ dia</span>
                  </div>
                  {totalPrice > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-1">Preço total</p>
                      <p className="text-3xl font-bold">{formatCurrency(totalPrice)}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />

                  {checkingAvailability && (
                    <p className="text-sm text-muted-foreground">
                      Verificando disponibilidade...
                    </p>
                  )}

                  {dateRange?.from && dateRange?.to && !checkingAvailability && (
                    <div>
                      {!isAvailable ? (
                        <Badge variant="destructive" className="w-full justify-center py-2">
                          Indisponível neste período
                        </Badge>
                      ) : (
                        <Badge variant="default" className="w-full justify-center py-2 bg-green-500">
                          Disponível
                        </Badge>
                      )}
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  {success && (
                    <p className="text-sm text-green-500">
                      Reserva realizada com sucesso! Redirecionando...
                    </p>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleReserve}
                    disabled={
                      !dateRange?.from ||
                      !dateRange?.to ||
                      !isAvailable ||
                      processingPayment ||
                      checkingAvailability
                    }
                  >
                    {processingPayment ? 'Processando...' : 'Ir para Pagamento'}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      Você precisa estar logado para fazer uma reserva
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

