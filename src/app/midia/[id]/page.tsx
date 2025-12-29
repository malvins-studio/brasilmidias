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
import { Label } from '@/components/ui/label';
import { useReservas } from '@/hooks/useReservas';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  // O usuário pode escolher entre bi-semanal ou mensal (sempre começa com bi-semanal)
  const [selectedPriceType, setSelectedPriceType] = useState<'biweek' | 'month'>('biweek');
  // Datas indisponíveis (reservadas)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [nextAvailableDate, setNextAvailableDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const docRef = doc(db, 'media', params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const mediaData = {
            id: docSnap.id,
            ...docSnap.data(),
          } as Media;
          setMedia(mediaData);
          
          // Busca reservas confirmadas para calcular datas indisponíveis
          await fetchUnavailableDates(mediaData.id);
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

  /**
   * Busca reservas confirmadas e calcula datas indisponíveis
   */
  const fetchUnavailableDates = async (mediaId: string) => {
    try {
      const q = query(
        collection(db, 'reservations'),
        where('mediaId', '==', mediaId),
        where('status', '==', 'confirmed')
      );

      const querySnapshot = await getDocs(q);
      const unavailable: Date[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      querySnapshot.forEach((docSnap) => {
        const reservation = docSnap.data();
        if (reservation.startDate && reservation.endDate) {
          const start = reservation.startDate.toDate();
          const end = reservation.endDate.toDate();
          
          // Adiciona todos os dias do período reservado
          const currentDate = new Date(start);
          while (currentDate <= end) {
            const dateCopy = new Date(currentDate);
            dateCopy.setHours(0, 0, 0, 0);
            unavailable.push(dateCopy);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });

      setUnavailableDates(unavailable);

      // Calcula próxima data disponível
      if (unavailable.length > 0) {
        const sortedUnavailable = [...unavailable].sort((a, b) => a.getTime() - b.getTime());
        const lastUnavailable = sortedUnavailable[sortedUnavailable.length - 1];
        const nextAvailable = new Date(lastUnavailable);
        nextAvailable.setDate(nextAvailable.getDate() + 1);
        setNextAvailableDate(nextAvailable);
      } else {
        // Se não há reservas, próxima data disponível é hoje
        setNextAvailableDate(today);
      }
    } catch (err) {
      console.error('Error fetching unavailable dates:', err);
    }
  };

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

  // Reseta o dateRange quando a mídia muda
  useEffect(() => {
    if (media) {
      setDateRange(undefined);
    }
  }, [media?.id]);

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
      // Para mensal, o preço é 2x o preço bi-semanal (1 mês = 2 bi-semanas)
      const totalPrice = calculatePrice(
        media.price, // Preço bi-semanal
        dateRange.from,
        dateRange.to,
        selectedPriceType,
        media.pricePerWeek,
        media.pricePerBiweek || media.price, // Usa o preço base se pricePerBiweek não existir
        selectedPriceType === 'month' ? media.price * 2 : media.pricePerMonth // Mensal = 2x bi-semanal
      );

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

  // Para mensal, o preço é 2x o preço bi-semanal (1 mês = 2 bi-semanas)
  const totalPrice = dateRange?.from && dateRange?.to
    ? calculatePrice(
        media.price, // Preço bi-semanal
        dateRange.from,
        dateRange.to,
        selectedPriceType,
        media.pricePerWeek,
        media.pricePerBiweek || media.price, // Usa o preço base se pricePerBiweek não existir
        selectedPriceType === 'month' ? media.price * 2 : media.pricePerMonth // Mensal = 2x bi-semanal
      )
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
                  {/* Seleção do tipo de preço */}
                  <div className="mb-4">
                    <Label className="mb-2 block">Escolha o período:</Label>
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={selectedPriceType === 'biweek' ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedPriceType('biweek');
                          setDateRange(undefined); // Reseta a seleção ao mudar o tipo
                        }}
                        className="flex-1"
                      >
                        Bi-semanal
                      </Button>
                      <Button
                        type="button"
                        variant={selectedPriceType === 'month' ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedPriceType('month');
                          setDateRange(undefined); // Reseta a seleção ao mudar o tipo
                        }}
                        className="flex-1"
                      >
                        Mensal
                      </Button>
                    </div>
                  </div>

                  {/* Exibição do preço baseado na escolha do usuário */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold">
                        {selectedPriceType === 'biweek'
                          ? formatCurrency(media.price)
                          : formatCurrency(media.price * 2)} {/* Mensal = 2x bi-semanal */}
                      </span>
                      <span className="text-muted-foreground">
                        / {selectedPriceType === 'biweek' ? 'bi-semana' : 'mês'}
                      </span>
                    </div>
                    {totalPrice > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-1">Preço total</p>
                        <p className="text-3xl font-bold">{formatCurrency(totalPrice)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  {/* Próxima data disponível */}
                  {nextAvailableDate && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Disponível a partir de:</strong>{' '}
                        {nextAvailableDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    priceType={selectedPriceType}
                    disabledDates={unavailableDates}
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

