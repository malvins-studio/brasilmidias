'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Reservation, Media } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Calendar, MapPin, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState<(Reservation & { media?: Media })[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchReservations();
    }
  }, [user, authLoading, router]);

  const fetchReservations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'reservations'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const reservationsData: (Reservation & { media?: Media })[] = [];

      for (const docSnap of querySnapshot.docs) {
        const reservation: Reservation & { media?: Media } = {
          id: docSnap.id,
          ...docSnap.data(),
        } as Reservation;

        // Busca informações da mídia
        try {
          const mediaDoc = await getDoc(doc(db, 'media', reservation.mediaId));
          if (mediaDoc.exists()) {
            reservation.media = {
              id: mediaDoc.id,
              ...mediaDoc.data(),
            } as Media;
          }
        } catch (error) {
          console.error('Error fetching media:', error);
        }

        reservationsData.push(reservation);
      }

      // Ordena por data de criação (mais recentes primeiro)
      reservationsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setReservations(reservationsData);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async (reservationId: string) => {
    try {
      const response = await fetch('/api/stripe/release-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao liberar pagamento');
        return;
      }

      // Atualiza a lista de reservas
      await fetchReservations();
      alert('Pagamento liberado com sucesso!');
    } catch (error) {
      console.error('Error releasing payment:', error);
      alert('Erro ao liberar pagamento');
    }
  };

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500">Concluída</Badge>;
    }
    if (status === 'confirmed' && paymentStatus === 'held') {
      return <Badge className="bg-blue-500">Pagamento Bloqueado</Badge>;
    }
    if (status === 'confirmed' && paymentStatus === 'released') {
      return <Badge className="bg-green-500">Pagamento Liberado</Badge>;
    }
    if (status === 'confirmed') {
      return <Badge className="bg-blue-500">Confirmada</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="outline">Pendente</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="destructive">Cancelada</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const canReleasePayment = (reservation: Reservation) => {
    const endDate = reservation.endDate?.toDate();
    const now = new Date();
    return (
      reservation.status === 'confirmed' &&
      reservation.paymentStatus === 'held' &&
      endDate &&
      now >= endDate
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meu Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie suas reservas e pagamentos
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              <CheckCircle className="inline mr-2" />
              Reserva confirmada com sucesso!
            </p>
          </div>
        )}

        {reservations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não tem reservas
              </p>
              <Button onClick={() => router.push('/')}>
                Explorar Mídias
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {reservations.map((reservation) => (
              <Card key={reservation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">
                        {reservation.media?.name || 'Mídia não encontrada'}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {reservation.media?.city}, {reservation.media?.state}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {reservation.startDate &&
                            format(reservation.startDate.toDate(), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}{' '}
                          -{' '}
                          {reservation.endDate &&
                            format(reservation.endDate.toDate(), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(reservation.status, reservation.paymentStatus)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total</p>
                        <p className="font-semibold">
                          {formatCurrency(reservation.totalPrice)}
                        </p>
                      </div>
                    </div>
                    {reservation.platformFee && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa Plataforma</p>
                          <p className="font-semibold">
                            {formatCurrency(reservation.platformFee)}
                          </p>
                        </div>
                      </div>
                    )}
                    {reservation.ownerAmount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Valor Owner</p>
                          <p className="font-semibold">
                            {formatCurrency(reservation.ownerAmount)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {reservation.paymentStatus === 'held' && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <Clock className="h-4 w-4" />
                        <p className="text-sm">
                          Pagamento bloqueado até o final do período de aluguel
                        </p>
                      </div>
                    </div>
                  )}

                  {reservation.paymentStatus === 'released' && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <p className="text-sm">
                          Pagamento liberado{' '}
                          {reservation.paymentReleasedAt &&
                            format(
                              reservation.paymentReleasedAt.toDate(),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {canReleasePayment(reservation) && (
                      <Button
                        onClick={() => handleReleasePayment(reservation.id)}
                        variant="default"
                      >
                        Liberar Pagamento
                      </Button>
                    )}
                    {reservation.media && (
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/midia/${reservation.mediaId}`)}
                      >
                        Ver Detalhes
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

