'use client';

/**
 * Dashboard do Owner
 * 
 * Esta página permite ao owner:
 * - Ver todas as reservas feitas nas suas mídias
 * - Ver estatísticas de receita
 * - Gerenciar suas mídias (criar, editar, deletar)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOwnerMidias } from '@/hooks/useOwnerMidias';
import { Reservation, Media } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import {
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function OwnerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { userRole } = useUserRole(); // Para pegar o companyId
  const { midias, loading: midiasLoading, deleteMedia } = useOwnerMidias();

  // Estado para reservas
  const [reservations, setReservations] = useState<(Reservation & { media?: Media })[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  // Estatísticas calculadas
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingRevenue: 0,
    releasedRevenue: 0,
    totalReservations: 0,
    activeReservations: 0,
  });

  /**
   * Verifica autenticação e redireciona se necessário
   */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchReservations();
    }
  }, [user, authLoading, router]);

  /**
   * Busca todas as reservas das mídias do owner
   * Inclui informações da mídia para exibição
   */
  const fetchReservations = async () => {
    if (!user) return;

    try {
      setLoadingReservations(true);

      // Busca todas as mídias da company do owner
      // IMPORTANTE: As mídias são atreladas à company, não ao usuário diretamente
      if (!userRole?.companyId) {
        setReservations([]);
        calculateStats([]);
        return;
      }

      const midiasQuery = query(
        collection(db, 'media'),
        where('companyId', '==', userRole.companyId)
      );

      const midiasSnapshot = await getDocs(midiasQuery);
      // Filtra mídias deletadas logicamente
      const mediaIds = midiasSnapshot.docs
        .filter((doc) => !doc.data().deleted)
        .map((doc) => doc.id);

      if (mediaIds.length === 0) {
        setReservations([]);
        calculateStats([]);
        return;
      }

      // Busca reservas das mídias do owner
      // Nota: Firestore não suporta 'in' com mais de 10 itens, então fazemos múltiplas queries se necessário
      const allReservations: (Reservation & { media?: Media })[] = [];

      // Divide em chunks de 10 para a query 'in'
      const chunkSize = 10;
      for (let i = 0; i < mediaIds.length; i += chunkSize) {
        const chunk = mediaIds.slice(i, i + chunkSize);
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('mediaId', 'in', chunk)
        );

        const reservationsSnapshot = await getDocs(reservationsQuery);

        for (const docSnap of reservationsSnapshot.docs) {
          const reservation = {
            id: docSnap.id,
            ...docSnap.data(),
          } as Reservation;

          // Busca informações da mídia
          const mediaDoc = await getDoc(doc(db, 'media', reservation.mediaId));
          if (mediaDoc.exists()) {
            reservation.media = {
              id: mediaDoc.id,
              ...mediaDoc.data(),
            } as Media;
          }

          allReservations.push(reservation);
        }
      }

      // Ordena por data de criação (mais recentes primeiro)
      allReservations.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setReservations(allReservations);
      calculateStats(allReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoadingReservations(false);
    }
  };

  /**
   * Calcula estatísticas das reservas
   */
  const calculateStats = (reservationsData: (Reservation & { media?: Media })[]) => {
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let releasedRevenue = 0;
    let activeReservations = 0;

    reservationsData.forEach((reservation) => {
      if (reservation.ownerAmount) {
        totalRevenue += reservation.ownerAmount;

        if (reservation.paymentStatus === 'held') {
          pendingRevenue += reservation.ownerAmount;
        } else if (reservation.paymentStatus === 'released') {
          releasedRevenue += reservation.ownerAmount;
        }
      }

      // Reservas ativas (confirmadas e não completadas)
      if (reservation.status === 'confirmed' && reservation.paymentStatus !== 'released') {
        const endDate = reservation.endDate?.toDate();
        if (endDate && endDate >= new Date()) {
          activeReservations++;
        }
      }
    });

    setStats({
      totalRevenue,
      pendingRevenue,
      releasedRevenue,
      totalReservations: reservationsData.length,
      activeReservations,
    });
  };

  /**
   * Handler para deletar mídia (exclusão lógica)
   */
  const handleDeleteMedia = async (mediaId: string, mediaName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a mídia "${mediaName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteMedia(mediaId);
      alert('Mídia deletada com sucesso!');
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert(err.message || 'Erro ao deletar mídia');
    }
  };

  /**
   * Retorna badge de status da reserva
   */
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

  if (authLoading || loadingReservations) {
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
          <h1 className="text-3xl font-bold mb-2">Dashboard do Owner</h1>
          <p className="text-muted-foreground">
            Gerencie suas mídias e visualize suas reservas
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Pendente</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.pendingRevenue)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Liberada</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.releasedRevenue)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reservas Ativas</p>
                  <p className="text-2xl font-bold">{stats.activeReservations}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para Reservas e Mídias */}
        <Tabs defaultValue="reservations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reservations">Reservas ({reservations.length})</TabsTrigger>
            <TabsTrigger value="medias">Minhas Mídias ({midias.length})</TabsTrigger>
          </TabsList>

          {/* Tab de Reservas */}
          <TabsContent value="reservations">
            {reservations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Você ainda não tem reservas nas suas mídias
                  </p>
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Total</p>
                            <p className="font-semibold">
                              {formatCurrency(reservation.totalPrice)}
                            </p>
                          </div>
                        </div>
                        {reservation.ownerAmount && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Sua Receita</p>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(reservation.ownerAmount)}
                              </p>
                            </div>
                          </div>
                        )}
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab de Mídias */}
          <TabsContent value="medias">
            <div className="mb-4 flex justify-end">
              <Link href="/owner/media/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mídia
                </Button>
              </Link>
            </div>

            {midiasLoading ? (
              <div className="text-center py-12">Carregando mídias...</div>
            ) : midias.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Você ainda não tem mídias cadastradas
                  </p>
                  <Link href="/owner/media/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeira Mídia
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {midias.map((media) => (
                  <Card key={media.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-2">{media.name}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {media.city}, {media.state}
                            </div>
                            <div>
                              <span className="font-medium">{formatCurrency(media.pricePerDay)}</span>
                              <span className="text-muted-foreground"> / dia</span>
                            </div>
                            {media.deleted && (
                              <Badge variant="destructive">Deletada</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Link href={`/owner/media/${media.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMedia(media.id, media.name)}
                          disabled={media.deleted}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {media.deleted ? 'Deletada' : 'Deletar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

