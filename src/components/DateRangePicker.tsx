'use client';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  disabled?: boolean;
  priceType?: 'day' | 'week' | 'month'; // Tipo de preço selecionado para ajustar a seleção
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  disabled,
  priceType = 'day',
}: DateRangePickerProps) {
  /**
   * Handler para quando o usuário seleciona uma data
   * Ajusta automaticamente o período baseado no tipo de preço
   */
  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onDateRangeChange(range);
      return;
    }

    // Se já tem uma data de início e o usuário seleciona uma segunda data
    if (range.from && range.to) {
      onDateRangeChange(range);
      return;
    }

    // Se só tem a data de início, ajusta automaticamente baseado no tipo de preço
    if (range.from && !range.to) {
      const startDate = new Date(range.from);
      let endDate: Date;

      if (priceType === 'day') {
        // Por dia: permite seleção livre
        onDateRangeChange({ from: startDate, to: undefined });
        return;
      } else if (priceType === 'week') {
        // Por semana: adiciona 7 dias
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // 7 dias (incluindo o dia inicial)
      } else if (priceType === 'month') {
        // Por mês: adiciona 1 mês
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1); // Ajusta para o último dia do mês
      } else {
        onDateRangeChange(range);
        return;
      }

      onDateRangeChange({ from: startDate, to: endDate });
    } else {
      onDateRangeChange(range);
    }
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
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleDateSelect}
          numberOfMonths={2}
          disabled={(date) => date < new Date()}
        />
        {priceType !== 'day' && (
          <div className="p-3 border-t text-xs text-muted-foreground">
            {priceType === 'week' && 'Selecione uma data para reservar por semana (7 dias)'}
            {priceType === 'month' && 'Selecione uma data para reservar por mês'}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

