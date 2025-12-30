'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ImageGallery } from '@/components/ImageGallery';
import { MediaMap } from '@/components/MediaMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Minus, Plus } from 'lucide-react';
import { useReservas } from '@/hooks/useReservas';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Media } from '@/types';
import { formatCurrency } from '@/lib/utils';

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
  // Quantidade de períodos (bi-semanas ou meses)
  const [quantity, setQuantity] = useState(1);
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
      setQuantity(1);
    }
  }, [media?.id]);

  // Flag para evitar loops infinitos entre quantidade e dateRange
  const [isUpdatingFromQuantity, setIsUpdatingFromQuantity] = useState(false);
  const [isUpdatingFromDateRange, setIsUpdatingFromDateRange] = useState(false);

  // Atualiza o dateRange quando a quantidade muda (se já houver uma data inicial selecionada)
  useEffect(() => {
    if (isUpdatingFromDateRange) return; // Evita loop quando dateRange atualiza quantidade
    
    if (dateRange?.from && quantity > 0) {
      setIsUpdatingFromQuantity(true);
      
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      let endDate: Date;
      
      if (selectedPriceType === 'biweek') {
        // Para bi-semanal: quantidade * 14 dias
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (quantity * 14) - 1);
      } else {
        // Para mensal: quantidade de meses
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + quantity);
        endDate.setDate(endDate.getDate() - 1); // Subtrai 1 dia para incluir o último dia do último mês
      }
      
      endDate.setHours(23, 59, 59, 999);
      
      setDateRange({
        from: startDate,
        to: endDate,
      });
      
      setTimeout(() => setIsUpdatingFromQuantity(false), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, selectedPriceType]);

  // Atualiza a quantidade quando o dateRange muda
  useEffect(() => {
    if (isUpdatingFromQuantity) return; // Evita loop quando quantidade atualiza dateRange
    
    if (dateRange?.from && dateRange?.to) {
      setIsUpdatingFromDateRange(true);
      
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      
      let calculatedQuantity = 1;
      
      if (selectedPriceType === 'biweek') {
        // Calcula quantas bi-semanas (14 dias) estão no range
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        calculatedQuantity = Math.max(1, Math.floor(diffDays / 14));
      } else {
        // Calcula quantos meses estão no range
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();
        const endMonth = endDate.getMonth();
        const endYear = endDate.getFullYear();
        
        calculatedQuantity = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
      }
      
      // Só atualiza se a quantidade calculada for diferente
      if (calculatedQuantity !== quantity) {
        setQuantity(calculatedQuantity);
      }
      
      setTimeout(() => setIsUpdatingFromDateRange(false), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), selectedPriceType]);

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
      // Calcula o preço baseado no tipo e multiplica pela quantidade
      const basePrice = selectedPriceType === 'biweek' 
        ? media.price 
        : media.price * 2; // Mensal = 2x bi-semanal
      const totalPrice = quantity * basePrice;

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
          customerEmail: user.email || undefined,
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
  // Multiplica pela quantidade de períodos
  const basePrice = selectedPriceType === 'biweek' 
    ? media.price 
    : media.price * 2; // Mensal = 2x bi-semanal
  
  const totalPrice = quantity * basePrice;

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

          <div className="sticky lg:col-span-1">
            <Card className="top-8">
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
                          setQuantity(1); // Reseta a quantidade
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
                          setQuantity(1); // Reseta a quantidade
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
                        {formatCurrency(basePrice)}
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

                  {/* Campo de quantidade */}
                  <div>
                    <Label className="mb-2 block">Quantidade</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-lg font-semibold">{quantity}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {selectedPriceType === 'biweek' ? 'bi-semana(s)' : 'mês(es)'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-10 w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

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

            {/* Mapa com localização da mídia */}
            {media.coordinates?.lat && media.coordinates?.lng && (
              <Card className='mt-4'>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Localização</h2>
                  <div className="h-[400px] w-full rounded-lg overflow-hidden">
                    <MediaMap
                      midias={[media]}
                      selectedMediaId={media.id}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

