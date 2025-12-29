'use client';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { CaptionProps } from 'react-day-picker';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  disabled?: boolean;
  priceType?: 'day' | 'week' | 'biweek' | 'month'; // Tipo de preço selecionado para ajustar a seleção
  disabledDates?: Date[]; // Datas que devem ser desabilitadas (indisponíveis)
  availableDates?: Date[]; // Datas disponíveis (se fornecido, apenas essas datas estarão disponíveis)
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  disabled,
  priceType = 'day',
  disabledDates = [],
  availableDates,
}: DateRangePickerProps) {
  /**
   * Handler para quando o usuário seleciona uma data
   * Ajusta automaticamente o período baseado no tipo de preço
   */
  const handleDateSelect = (range: DateRange | undefined) => {
    // Se não há data selecionada, limpa a seleção
    if (!range?.from) {
      onDateRangeChange(range);
      return;
    }

    const startDate = new Date(range.from);
    startDate.setHours(0, 0, 0, 0);

    // Para biweek, permite selecionar múltiplas bi-semanas consecutivas (14 dias)
    if (priceType === 'biweek') {
      // Se já existe uma seleção
      if (dateRange?.from && dateRange?.to) {
        const currentStart = new Date(dateRange.from);
        currentStart.setHours(0, 0, 0, 0);
        const currentEnd = new Date(dateRange.to);
        currentEnd.setHours(23, 59, 59, 999);

        // Calcula quantas bi-semanas já estão selecionadas
        const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const currentBiweeks = Math.floor(daysDiff / 14);

        // Verifica se o dia clicado está antes ou depois da seleção atual
        const daysBefore = Math.floor((currentStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysAfter = Math.floor((startDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));

        // Se clicou no primeiro dia da primeira bi-semana, limpa a seleção
        if (startDate.getTime() === currentStart.getTime()) {
          onDateRangeChange(undefined);
          return;
        }

        // Se clicou exatamente 14 dias antes do início, estende para trás
        if (daysBefore === 14) {
          const newStart = new Date(startDate);
          newStart.setHours(0, 0, 0, 0);
          // Verifica se a nova bi-semana está disponível
          let hasOccupiedDay = false;
          if (disabledDates.length > 0) {
            for (let i = 0; i < 14; i++) {
              const checkDate = new Date(newStart);
              checkDate.setDate(checkDate.getDate() + i);
              checkDate.setHours(0, 0, 0, 0);
              const checkDateStr = checkDate.toISOString().split('T')[0];
              const isOccupied = disabledDates.some(disabledDate => {
                const disabled = new Date(disabledDate);
                disabled.setHours(0, 0, 0, 0);
                return disabled.toISOString().split('T')[0] === checkDateStr;
              });
              if (isOccupied) {
                hasOccupiedDay = true;
                break;
              }
            }
          }
          if (!hasOccupiedDay) {
            onDateRangeChange({ from: newStart, to: currentEnd });
            return;
          }
        }

        // Se clicou exatamente 14 dias depois do fim, estende para frente
        if (daysAfter === 14) {
          // A nova bi-semana começa no dia clicado
          const newStart = new Date(startDate);
          newStart.setHours(0, 0, 0, 0);
          const newEnd = new Date(newStart);
          newEnd.setDate(newEnd.getDate() + 13);
          newEnd.setHours(23, 59, 59, 999);
          // Verifica se a nova bi-semana está disponível
          let hasOccupiedDay = false;
          if (disabledDates.length > 0) {
            for (let i = 0; i < 14; i++) {
              const checkDate = new Date(newStart);
              checkDate.setDate(checkDate.getDate() + i);
              checkDate.setHours(0, 0, 0, 0);
              const checkDateStr = checkDate.toISOString().split('T')[0];
              const isOccupied = disabledDates.some(disabledDate => {
                const disabled = new Date(disabledDate);
                disabled.setHours(0, 0, 0, 0);
                return disabled.toISOString().split('T')[0] === checkDateStr;
              });
              if (isOccupied) {
                hasOccupiedDay = true;
                break;
              }
            }
          }
          if (!hasOccupiedDay) {
            onDateRangeChange({ from: currentStart, to: newEnd });
            return;
          }
        }

        // Se clicou em um dia não consecutivo, inicia nova seleção
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        endDate.setHours(23, 59, 59, 999);
        // Verifica se a bi-semana está disponível
        let hasOccupiedDay = false;
        if (disabledDates.length > 0) {
          for (let i = 0; i < 14; i++) {
            const checkDate = new Date(startDate);
            checkDate.setDate(checkDate.getDate() + i);
            checkDate.setHours(0, 0, 0, 0);
            const checkDateStr = checkDate.toISOString().split('T')[0];
            const isOccupied = disabledDates.some(disabledDate => {
              const disabled = new Date(disabledDate);
              disabled.setHours(0, 0, 0, 0);
              return disabled.toISOString().split('T')[0] === checkDateStr;
            });
            if (isOccupied) {
              hasOccupiedDay = true;
              break;
            }
          }
        }
        if (!hasOccupiedDay) {
          onDateRangeChange({ from: startDate, to: endDate });
        }
        return;
      }

      // Primeira seleção: seleciona uma bi-semana (14 dias)
      let hasOccupiedDay = false;
      if (disabledDates.length > 0) {
        for (let i = 0; i < 14; i++) {
          const checkDate = new Date(startDate);
          checkDate.setDate(checkDate.getDate() + i);
          checkDate.setHours(0, 0, 0, 0);
          const checkDateStr = checkDate.toISOString().split('T')[0];
          const isOccupied = disabledDates.some(disabledDate => {
            const disabled = new Date(disabledDate);
            disabled.setHours(0, 0, 0, 0);
            return disabled.toISOString().split('T')[0] === checkDateStr;
          });
          if (isOccupied) {
            hasOccupiedDay = true;
            break;
          }
        }
      }
      
      if (hasOccupiedDay) {
        return;
      }
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      endDate.setHours(23, 59, 59, 999);
      onDateRangeChange({ from: startDate, to: endDate });
      return;
    }

    // Para month, sempre usa handleMonthYearSelect
    if (priceType === 'month') {
      if (range.from) {
        handleMonthYearSelect(range.from);
      }
      return;
    }

    // Para day e week, permite seleção normal
    if (range.from && range.to) {
      // Range completo selecionado
      onDateRangeChange(range);
      return;
    }

    // Se só tem a data de início, ajusta automaticamente baseado no tipo de preço
    if (range.from && !range.to) {
      if (priceType === 'day') {
        // Por dia: permite seleção livre (aguarda segunda data)
        onDateRangeChange({ from: startDate, to: undefined });
        return;
      } else if (priceType === 'week') {
        // Por semana: adiciona 7 dias automaticamente
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // 7 dias (incluindo o dia inicial)
        endDate.setHours(23, 59, 59, 999);
        onDateRangeChange({ from: startDate, to: endDate });
        return;
      }
    }

    // Fallback: mantém o range como está
    onDateRangeChange(range);
  };

  /**
   * Handler para seleção de mês/ano (quando priceType é 'month')
   * Permite selecionar múltiplos meses consecutivos
   */
  const handleMonthYearSelect = (date: Date | undefined) => {
    if (priceType === 'month' && date) {
      const clickedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      clickedMonth.setHours(0, 0, 0, 0);

      // Se já existe uma seleção
      if (dateRange?.from && dateRange?.to) {
        const currentStart = new Date(dateRange.from);
        currentStart.setHours(0, 0, 0, 0);
        const currentEnd = new Date(dateRange.to);
        currentEnd.setHours(23, 59, 59, 999);

        const currentStartMonth = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
        const currentEndMonth = new Date(currentEnd.getFullYear(), currentEnd.getMonth(), 1);

        // Se clicou no mês inicial, limpa a seleção
        if (clickedMonth.getTime() === currentStartMonth.getTime()) {
          onDateRangeChange(undefined);
          return;
        }

        // Se clicou antes do mês inicial, estende para trás
        if (clickedMonth < currentStartMonth) {
          // Verifica se é consecutivo
          const prevMonth = new Date(currentStartMonth);
          prevMonth.setMonth(prevMonth.getMonth() - 1);
          if (clickedMonth.getTime() === prevMonth.getTime()) {
            // Estende para trás
            const newStart = new Date(clickedMonth.getFullYear(), clickedMonth.getMonth(), 1);
            newStart.setHours(0, 0, 0, 0);
            onDateRangeChange({ from: newStart, to: currentEnd });
            return;
          }
        }

        // Se clicou depois do mês final, estende para frente
        if (clickedMonth > currentEndMonth) {
          // Verifica se é consecutivo
          const nextMonth = new Date(currentEndMonth);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          if (clickedMonth.getTime() === nextMonth.getTime()) {
            // Estende para frente
            const newEnd = new Date(clickedMonth.getFullYear(), clickedMonth.getMonth() + 1, 0);
            newEnd.setHours(23, 59, 59, 999);
            onDateRangeChange({ from: currentStart, to: newEnd });
            return;
          }
        }

        // Se clicou em um mês não consecutivo, inicia nova seleção
        const newStart = new Date(clickedMonth.getFullYear(), clickedMonth.getMonth(), 1);
        newStart.setHours(0, 0, 0, 0);
        const newEnd = new Date(clickedMonth.getFullYear(), clickedMonth.getMonth() + 1, 0);
        newEnd.setHours(23, 59, 59, 999);
        onDateRangeChange({ from: newStart, to: newEnd });
      } else {
        // Primeira seleção: seleciona apenas o mês clicado
        const startDate = new Date(clickedMonth.getFullYear(), clickedMonth.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(clickedMonth.getFullYear(), clickedMonth.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      onDateRangeChange({ from: startDate, to: endDate });
      }
    }
  };

  /**
   * Verifica se um mês está ocupado (tem datas indisponíveis)
   */
  const isMonthDisabled = (date: Date): boolean => {
    if (priceType !== 'month' || disabledDates.length === 0) {
      return false;
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Verifica se há alguma data ocupada neste mês/ano
    return disabledDates.some(disabledDate => {
      const d = new Date(disabledDate);
      d.setHours(0, 0, 0, 0);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  };

  /**
   * Componente customizado para o Caption que mostra ano primeiro, depois mês
   * Permite selecionar múltiplos meses consecutivos
   */
  const CustomCaption = ({ displayMonth }: CaptionProps) => {
    if (priceType !== 'month') {
      return null; // Usa o caption padrão para outros tipos
    }

    const year = displayMonth.getFullYear();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Calcula quais meses estão selecionados
    const selectedMonths = new Set<number>();
    if (dateRange?.from && dateRange?.to) {
      const start = new Date(dateRange.from);
      const end = new Date(dateRange.to);
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        if (current.getFullYear() === year) {
          selectedMonths.add(current.getMonth());
        }
        current.setMonth(current.getMonth() + 1);
      }
    }

    return (
      <div className="flex flex-col gap-2 p-2">
        {/* Dropdown de Ano - aparece primeiro */}
        <div className="flex items-center justify-center gap-2">
          <select
            className="px-2 py-1 border border-input rounded-md text-sm font-medium bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            value={year}
            onChange={(e) => {
              const newYear = parseInt(e.target.value);
              const newDate = new Date(newYear, displayMonth.getMonth(), 1);
              handleMonthYearSelect(newDate);
            }}
          >
            {Array.from({ length: 11 }, (_, i) => currentYear + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {/* Grid de meses clicáveis */}
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => {
            const monthDate = new Date(year, i, 1);
            const monthName = monthDate.toLocaleString('pt-BR', { month: 'short' });
            const isDisabled = isMonthDisabled(monthDate) || (year === today.getFullYear() && i < today.getMonth());
            const isSelected = selectedMonths.has(i);
            const isFirst = dateRange?.from && new Date(dateRange.from).getFullYear() === year && new Date(dateRange.from).getMonth() === i;
            const isLast = dateRange?.to && new Date(dateRange.to).getFullYear() === year && new Date(dateRange.to).getMonth() === i;
            
            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => handleMonthYearSelect(monthDate)}
                className={`
                  px-2 py-1 text-xs rounded-md transition-colors
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'bg-background hover:bg-accent'
                  }
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${isFirst ? 'rounded-l-md' : ''}
                  ${isLast ? 'rounded-r-md' : ''}
                `}
              >
                {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
              </>
            ) : (
              formatDate(dateRange.from)
            )
          ) : (
            <span>Selecione as datas</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={`w-auto p-0 ${priceType === 'month' ? 'month-selector' : ''}`} 
        align="start"
      >
        <Calendar
          initialFocus
          mode={priceType === 'month' ? 'single' : priceType === 'biweek' ? 'single' : 'range'}
          defaultMonth={dateRange?.from}
          selected={
            priceType === 'month' 
              ? dateRange?.from 
              : priceType === 'biweek'
                ? dateRange?.from // Para biweek, mostra apenas o dia inicial como selecionado
                : dateRange
          }
          onSelect={
            priceType === 'month' 
              ? handleMonthYearSelect 
              : priceType === 'biweek'
                ? (date) => {
                    // Para biweek, quando um dia é clicado, calcula os 14 dias
                    if (date) {
                      handleDateSelect({ from: date, to: undefined });
                    } else {
                      handleDateSelect(undefined);
                    }
                  }
                : handleDateSelect
          }
          onMonthChange={priceType === 'month' ? (month) => {
            // Quando o mês/ano muda no dropdown, seleciona automaticamente o mês
            if (month) {
              handleMonthYearSelect(month);
            }
          } : undefined}
          captionLayout={priceType === 'month' ? 'buttons' : 'label'}
          numberOfMonths={priceType === 'month' ? 1 : 2}
          fromYear={new Date().getFullYear()}
          toYear={new Date().getFullYear() + 10}
          locale={ptBR}
          formatters={priceType === 'month' ? {
            formatMonthDropdown: (date) => {
              return date.toLocaleString('pt-BR', { month: 'long' });
            },
            formatYearDropdown: (date) => {
              return date.getFullYear().toString();
            },
          } : undefined}
          disabled={priceType === 'month' ? isMonthDisabled : undefined}
          components={priceType === 'month' ? {
            Caption: CustomCaption,
          } : undefined}
          modifiers={{
            // Marca dias ocupados como modificador para estilização
            occupied: disabledDates.length > 0 ? disabledDates.map(d => {
              const date = new Date(d);
              date.setHours(0, 0, 0, 0);
              return date;
            }) : [],
            // Para mensal, marca todos os dias dos meses selecionados
            selected: priceType === 'month' && dateRange?.from && dateRange?.to
              ? (date: Date) => {
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0);
                  const start = new Date(dateRange.from);
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(dateRange.to);
                  end.setHours(23, 59, 59, 999);
                  return checkDate >= start && checkDate <= end;
                }
              : undefined,
            // Para biweek, marca todos os dias do range selecionado
            inRange: priceType === 'biweek' && dateRange?.from && dateRange?.to
              ? (date: Date) => {
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0);
                  const start = new Date(dateRange.from);
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(dateRange.to);
                  end.setHours(0, 0, 0, 0);
                  
                  // Verifica se a data está entre start e end (excluindo os extremos)
                  return checkDate > start && checkDate < end;
                }
              : undefined,
            // Marca o primeiro dia do range biweek
            range_start: priceType === 'biweek' && dateRange?.from
              ? (date: Date) => {
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0);
                  const start = new Date(dateRange.from);
                  start.setHours(0, 0, 0, 0);
                  return checkDate.getTime() === start.getTime();
                }
              : undefined,
            // Marca o último dia do range biweek
            range_end: priceType === 'biweek' && dateRange?.to
              ? (date: Date) => {
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0);
                  const end = new Date(dateRange.to);
                  end.setHours(0, 0, 0, 0);
                  return checkDate.getTime() === end.getTime();
                }
              : undefined,
          }}
          modifiersClassNames={{
            // Estilo para dias ocupados (vermelho)
            occupied: '!bg-red-500 !text-white rounded-md opacity-70 cursor-not-allowed hover:!bg-red-600',
            // Estilo para dias dentro do range biweek
            inRange: 'bg-accent text-accent-foreground',
            // Estilo para o primeiro dia do range biweek
            range_start: 'bg-primary text-primary-foreground rounded-l-md',
            // Estilo para o último dia do range biweek
            range_end: 'bg-primary text-primary-foreground rounded-r-md',
          }}
          classNames={{
            // Garante que dias ocupados tenham estilo vermelho
            day_selected: 'bg-primary text-primary-foreground',
            day_disabled: 'text-muted-foreground opacity-50',
          }}
          disabled={(date) => {
            // Normaliza a data para comparação (remove horas)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            
            // Desabilita apenas datas passadas
            if (checkDate < today) return true;
            
            // Para mensal, desabilita TODOS os dias - só permite seleção via dropdowns
            if (priceType === 'month') {
              return true; // Desabilita todos os dias, só permite seleção via dropdowns
            }
            
            // Se há lista de datas disponíveis, só permite essas
            if (availableDates && availableDates.length > 0) {
              const dateStr = checkDate.toISOString().split('T')[0];
              const isAvailable = availableDates.some(availDate => {
                const avail = new Date(availDate);
                avail.setHours(0, 0, 0, 0);
                return avail.toISOString().split('T')[0] === dateStr;
              });
              return !isAvailable;
            }
            
            // Desabilita apenas datas que estão na lista de indisponíveis (ocupadas)
            if (disabledDates.length > 0) {
              const dateStr = checkDate.toISOString().split('T')[0];
              const isOccupied = disabledDates.some(disabledDate => {
                const disabled = new Date(disabledDate);
                disabled.setHours(0, 0, 0, 0);
                return disabled.toISOString().split('T')[0] === dateStr;
              });
              return isOccupied;
            }
            
            // Por padrão, permite todas as datas futuras
            return false;
          }}
        />
        {priceType !== 'day' && (
          <div className="p-3 border-t text-xs text-muted-foreground">
            {priceType === 'week' && 'Selecione uma data para reservar por semana (7 dias)'}
            {priceType === 'biweek' && 'Selecione uma data para reservar por bi-semana (14 dias fixos)'}
            {priceType === 'month' && 'Selecione um mês e ano para reservar o mês completo'}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

