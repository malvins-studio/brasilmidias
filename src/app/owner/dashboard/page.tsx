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
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOwnerMidias } from '@/hooks/useOwnerMidias';
import { Reservation, Media, User } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { ReservationsTab } from './components/ReservationsTab';
import { MediasTab } from './components/MediasTab';
import { StripeConnectCard } from './components/StripeConnectCard';

export default function OwnerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { userRole } = useUserRole(); // Para pegar o companyId
  const { midias, loading: midiasLoading, deleteMedia } = useOwnerMidias();

  // Estado para reservas (inclui dados do cliente que alugou)
  const [reservations, setReservations] = useState<(Reservation & { media?: Media; client?: User })[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  // Estatísticas calculadas
  const [stats, setStats] = useState({
    totalRevenue: 0, // Receita total paga e confirmada
    pendingRevenue: 0, // Receita pendente (não paga ainda)
    releasedRevenue: 0, // Receita liberada para o owner
    totalReservations: 0,
    activeReservations: 0,
  });

  /**
   * Verifica autenticação e redireciona se necessário
   * Também verifica se o usuário tem companyId antes de buscar dados
   */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Só busca dados se o usuário tiver companyId
    // As mídias são atreladas à company, não ao usuário diretamente
    if (user && userRole?.companyId) {
      fetchReservations();
    } else if (user && userRole && !userRole.companyId) {
      // Usuário logado mas sem company - limpa dados
      setReservations([]);
      calculateStats([]);
      setLoadingReservations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole?.companyId, authLoading]);

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
      const allReservations: (Reservation & { media?: Media; client?: User })[] = [];

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
          const reservationData = {
            id: docSnap.id,
            ...docSnap.data(),
          } as Reservation;

          // Busca informações da mídia
          let media: Media | undefined;
          const mediaDoc = await getDoc(doc(db, 'media', reservationData.mediaId));
          if (mediaDoc.exists()) {
            media = {
              id: mediaDoc.id,
              ...mediaDoc.data(),
            } as Media;
          }

          // Busca informações do cliente que alugou a mídia
          let client: User | undefined;
          if (reservationData.userId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', reservationData.userId));
              if (clientDoc.exists()) {
                client = {
                  id: clientDoc.id,
                  ...clientDoc.data(),
                } as User;
              }
            } catch (clientError) {
              console.error('Error fetching client data:', clientError);
              // Continua mesmo se não conseguir buscar dados do cliente
            }
          }

          allReservations.push({
            ...reservationData,
            media,
            client,
          });
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
   * IMPORTANTE: Receita Total mostra apenas valores que foram realmente pagos (confirmados)
   * - 'pending': não foi pago ainda (não conta na receita total)
   * - 'paid' ou 'held': foi pago e confirmado (conta na receita total, mas está bloqueado)
   * - 'released': foi pago e liberado para o owner (conta na receita total e liberada)
   */
  const calculateStats = (reservationsData: (Reservation & { media?: Media; client?: User })[]) => {
    let paidRevenue = 0; // Receita realmente paga e confirmada (paymentStatus: 'paid', 'held' ou 'released')
    let pendingRevenue = 0; // Receita pendente - pagamento ainda não foi confirmado (paymentStatus: 'pending')
    let releasedRevenue = 0; // Receita liberada - paga e liberada para o owner (paymentStatus: 'released')
    let activeReservations = 0;

    reservationsData.forEach((reservation) => {
      if (reservation.ownerAmount) {
        // Receita pendente: pagamento ainda não foi confirmado
        if (reservation.paymentStatus === 'pending') {
          pendingRevenue += reservation.ownerAmount;
        }
        // Receita paga e confirmada (mas pode estar bloqueada)
        else if (
          reservation.paymentStatus === 'paid' ||
          reservation.paymentStatus === 'held' ||
          reservation.paymentStatus === 'released'
        ) {
          paidRevenue += reservation.ownerAmount;

          // Receita liberada: paga e liberada para o owner
          if (reservation.paymentStatus === 'released') {
            releasedRevenue += reservation.ownerAmount;
          }
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
      totalRevenue: paidRevenue, // Receita total = apenas valores pagos e confirmados
      pendingRevenue, // Valores que ainda não foram pagos
      releasedRevenue, // Valores liberados para o owner
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

  // Verifica se o usuário tem companyId
  // As mídias são atreladas à company, não ao usuário diretamente
  if (user && userRole && !userRole.companyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Você precisa estar atrelado a uma company para acessar o dashboard do owner.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador para ser vinculado a uma company.
              </p>
            </CardContent>
          </Card>
        </main>
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

        {/* Stripe Connect Card */}
        <div className="mb-8">
          <StripeConnectCard />
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total Paga</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valores realmente recebidos
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguardando pagamento
                  </p>
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
            <ReservationsTab reservations={reservations} />
          </TabsContent>

          {/* Tab de Mídias */}
          <TabsContent value="medias">
            <MediasTab 
              midias={midias} 
              loading={midiasLoading}
              onDeleteMedia={handleDeleteMedia}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

