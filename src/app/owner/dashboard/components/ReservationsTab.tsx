'use client';

/**
 * Componente da aba de Reservas
 * 
 * Exibe todas as reservas das mídias do owner com:
 * - Filtros por status de pagamento
 * - Informações do cliente
 * - Detalhes financeiros
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Reservation, Media, User } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { DayPicker } from 'react-day-picker';
import {
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  User as UserIcon,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';

interface ReservationsTabProps {
  reservations: (Reservation & { media?: Media; client?: User })[];
}

/**
 * Retorna o badge de status da reserva
 * Status "Pendente" agora é mais explícito: "Pendente de Pagamento"
 */
function getStatusBadge(status: string, paymentStatus?: string) {
  if (status === 'completed') {
    return <Badge className="bg-green-500">Concluída</Badge>;
  }
  if (status === 'confirmed' && paymentStatus === 'held') {
    return <Badge className="bg-blue-500">Pagamento Bloqueado</Badge>;
  }
  if (status === 'confirmed' && paymentStatus === 'released') {
    return <Badge className="bg-green-500">Pagamento Liberado</Badge>;
  }
  if (status === 'confirmed' && paymentStatus === 'paid') {
    return <Badge className="bg-blue-500">Paga</Badge>;
  }
  if (status === 'confirmed') {
    return <Badge className="bg-blue-500">Confirmada</Badge>;
  }
  if (status === 'pending' || paymentStatus === 'pending') {
    return <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">Pendente de Pagamento</Badge>;
  }
  if (status === 'cancelled') {
    return <Badge variant="destructive">Cancelada</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

/**
 * Verifica se a reserva foi paga (para aplicar background verde claro)
 */
function isReservationPaid(reservation: Reservation & { media?: Media; client?: User }): boolean {
  return (
    reservation.paymentStatus === 'paid' ||
    reservation.paymentStatus === 'held' ||
    reservation.paymentStatus === 'released'
  );
}

export function ReservationsTab({ reservations }: ReservationsTabProps) {
  // Estado para tipo de visualização: 'cards' ou 'calendar'
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  
  // Estado para filtro de pagamento
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  
  // Estado para filtro de company
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  
  // Estado para mês selecionado no calendário
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Estado para armazenar o dia selecionado no calendário (para mostrar reservas)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Extrai todas as companies únicas das mídias nas reservas
  const uniqueCompanies = Array.from(
    new Set(
      reservations
        .map((r) => r.media?.companyId)
        .filter((id): id is string => !!id)
    )
  );

  // Busca os nomes das companies (se disponível na mídia)
  const companiesWithNames = uniqueCompanies.map((companyId) => {
    // Encontra a primeira reserva com essa company para pegar o nome
    const reservationWithCompany = reservations.find(
      (r) => r.media?.companyId === companyId
    );
    return {
      id: companyId,
      name: reservationWithCompany?.media?.companyName || companyId,
    };
  });

  // Filtra reservas baseado nos filtros selecionados
  const filteredReservations = reservations.filter((reservation) => {
    // Filtro por pagamento
    if (paymentFilter === 'paid') {
      // Pagas: paid, held, released
      const isPaid =
        reservation.paymentStatus === 'paid' ||
        reservation.paymentStatus === 'held' ||
        reservation.paymentStatus === 'released';
      if (!isPaid) return false;
    } else if (paymentFilter === 'unpaid') {
      // Não pagas: pending ou sem status
      const isUnpaid =
        reservation.paymentStatus === 'pending' || !reservation.paymentStatus;
      if (!isUnpaid) return false;
    }

    // Filtro por company
    if (companyFilter !== 'all') {
      if (reservation.media?.companyId !== companyFilter) {
        return false;
      }
    }

    return true;
  });

  /**
   * Calcula quais dias estão ocupados (têm reservas) no mês selecionado
   */
  const occupiedDays = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const occupied: Date[] = [];
    
    filteredReservations.forEach((reservation) => {
      if (!reservation.startDate || !reservation.endDate) return;
      
      const start = reservation.startDate.toDate();
      const end = reservation.endDate.toDate();
      
      daysInMonth.forEach((day) => {
        if (isWithinInterval(day, { start, end })) {
          occupied.push(day);
        }
      });
    });
    
    return occupied;
  }, [filteredReservations, selectedMonth]);

  /**
   * Obtém as reservas de um dia específico
   */
  const getReservationsForDay = (day: Date) => {
    return filteredReservations.filter((reservation) => {
      if (!reservation.startDate || !reservation.endDate) return false;
      const start = reservation.startDate.toDate();
      const end = reservation.endDate.toDate();
      return isWithinInterval(day, { start, end });
    });
  };

  return (
    <div>
      {/* Filtros e Toggle de Visualização */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
          {/* Filtro por pagamento */}
          <div className="flex items-center gap-2">
            <Label htmlFor="paymentFilter" className="text-sm font-medium">
              Filtrar por pagamento:
            </Label>
            <select
              id="paymentFilter"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas</option>
              <option value="paid">Pagas</option>
              <option value="unpaid">Não Pagas</option>
            </select>
          </div>

          {/* Filtro por Company */}
          {companiesWithNames.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="companyFilter" className="text-sm font-medium">
                Filtrar por Company:
              </Label>
              <select
                id="companyFilter"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas as Empresas</option>
                {companiesWithNames.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          </div>

          {/* Toggle de Visualização */}
          <div className="flex items-center gap-2 ml-auto">
            <Label className="text-sm font-medium">Visualização:</Label>
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <Button
                type="button"
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="rounded-none"
                title="Visualização em Cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-none"
                title="Visualização em Calendário"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Contador de reservas */}
        <div className="text-sm text-muted-foreground">
          {filteredReservations.length} de {reservations.length} reservas
          {companyFilter !== 'all' && (
            <span className="ml-2">
              • Empresa: {companiesWithNames.find((c) => c.id === companyFilter)?.name || companyFilter}
            </span>
          )}
        </div>
      </div>

      {/* Visualização em Cards */}
      {viewMode === 'cards' && (
        <>
          {filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {reservations.length === 0
                    ? 'Você ainda não tem reservas nas suas mídias'
                    : 'Nenhuma reserva encontrada com os filtros selecionados'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredReservations.map((reservation) => {
                // Determina se a reserva foi paga (para background verde claro)
                const isPaid = isReservationPaid(reservation);
                
                return (
                  <Card 
                    key={reservation.id}
                    className={`transition-all duration-200 hover:shadow-lg hover:border-primary/50 ${
                      isPaid ? 'bg-green-50/50 border-green-200' : ''
                    }`}
                  >
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
                              <CalendarIcon className="h-4 w-4" />
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
                      {/* Informações do Cliente que alugou a mídia */}
                      {reservation.client && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                          </div>
                          <div className="ml-6">
                            <p className="font-semibold">
                              {reservation.client.name || reservation.client.email}
                            </p>
                            {reservation.client.name && (
                              <p className="text-sm text-muted-foreground">
                                {reservation.client.email}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

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
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Visualização em Calendário */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Companies */}
          <Card>
            <CardHeader>
              <CardTitle>Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              {companiesWithNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada</p>
              ) : (
                <div className="space-y-2">
                  {companiesWithNames.map((company) => {
                    const companyReservations = filteredReservations.filter(
                      (r) => r.media?.companyId === company.id
                    );
                    const isSelected = companyFilter === company.id;
                    
                    return (
                      <button
                        key={company.id}
                        onClick={() => setCompanyFilter(isSelected ? 'all' : company.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{company.name}</span>
                          <Badge variant="outline">{companyReservations.length}</Badge>
                        </div>
                        {companyReservations.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {companyReservations.length} {companyReservations.length === 1 ? 'reserva' : 'reservas'}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCompanyFilter('all')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      companyFilter === 'all'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Todas as Empresas</span>
                      <Badge variant="outline">{filteredReservations.length}</Badge>
                    </div>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Calendário de Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredReservations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Nenhuma reserva encontrada com os filtros selecionados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center w-full">
                      <DayPicker
                        mode="single"
                        month={selectedMonth}
                        onMonthChange={setSelectedMonth}
                        selected={selectedDay || undefined}
                        onSelect={(day) => {
                          if (day && selectedDay && day.getTime() === selectedDay.getTime()) {
                            setSelectedDay(null);
                          } else {
                            setSelectedDay(day || null);
                          }
                        }}
                        locale={ptBR}
                        modifiers={{
                          occupied: occupiedDays,
                        }}
                        modifiersClassNames={{
                          occupied: 'bg-blue-500 text-white rounded text-center cursor-pointer hover:bg-blue-600',
                        }}
                        className="rounded-lg border p-4"
                        classNames={{
                          root: 'w-full',
                          table: '!w-full',
                          day: 'h-12 text-center',
                          day_button: 'w-full h-full cursor-pointer',
                          selected: '!bg-green-500 !text-white rounded text-center m-2 cursor-pointer hover:bg-blue-600',
                        }}
                      />
                    </div>

                    {/* Lista de reservas do dia selecionado */}
                    {selectedDay && getReservationsForDay(selectedDay).length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-3">
                          Reservas em {format(selectedDay, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </h4>
                        <div className="space-y-2">
                          {getReservationsForDay(selectedDay).map((reservation) => {
                            const isPaid = isReservationPaid(reservation);
                            return (
                              <Card
                                key={reservation.id}
                                className={`transition-all duration-200 hover:shadow-md ${
                                  isPaid ? 'bg-green-50/50 border-green-200' : ''
                                }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-semibold">
                                        {reservation.media?.name || 'Mídia não encontrada'}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {reservation.media?.city}, {reservation.media?.state}
                                      </p>
                                    </div>
                                    {getStatusBadge(reservation.status, reservation.paymentStatus)}
                                  </div>
                                  {reservation.client && (
                                    <div className="mt-2 text-sm">
                                      <span className="text-muted-foreground">Cliente: </span>
                                      <span className="font-medium">
                                        {reservation.client.name || reservation.client.email}
                                      </span>
                                    </div>
                                  )}
                                  <div className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">
                                      Valor: <span className="font-semibold">{formatCurrency(reservation.totalPrice)}</span>
                                    </span>
                                    {reservation.ownerAmount && (
                                      <span className="text-muted-foreground">
                                        Sua receita: <span className="font-semibold text-green-600">{formatCurrency(reservation.ownerAmount)}</span>
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedDay && getReservationsForDay(selectedDay).length === 0 && (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        Nenhuma reserva encontrada para este dia
                      </div>
                    )}
                  </div>
                )}
                
                {/* Legenda */}
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-blue-500"></div>
                    <span className="text-muted-foreground">Dias ocupados</span>
                  </div>
                  <div className="text-muted-foreground">
                    Total: {occupiedDays.length} {occupiedDays.length === 1 ? 'dia ocupado' : 'dias ocupados'} no mês
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

