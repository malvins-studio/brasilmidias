'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Search, Check, ChevronsUpDown } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface MediaFiltersProps {
  city: string;
  dateRange: DateRange | undefined;
  onCityChange: (city: string) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onSearch: () => void;
  loading?: boolean;
  availableCities?: string[];
}

export function MediaFilters({
  city,
  dateRange,
  onCityChange,
  onDateRangeChange,
  onSearch,
  loading = false,
  availableCities = [],
}: MediaFiltersProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(city);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtra cidades baseado no input
  const filteredCities = useMemo(() => {
    if (!inputValue.trim()) {
      return availableCities.slice(0, 10); // Mostra até 10 cidades quando vazio
    }
    return availableCities
      .filter((c) => c.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 10);
  }, [inputValue, availableCities]);

  // Atualiza input quando city muda externamente
  useEffect(() => {
    setInputValue(city);
  }, [city]);

  const handleSelect = (selectedCity: string) => {
    setInputValue(selectedCity);
    onCityChange(selectedCity);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onCityChange(value);
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCities.length > 0 && !city) {
        // Se não há cidade selecionada mas há sugestões, seleciona a primeira
        handleSelect(filteredCities[0]);
      }
      setOpen(false);
      onSearch();
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown' && !open) {
      setOpen(true);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border-b bg-white">
      <div className="flex-1 relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="Buscar por cidade..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setOpen(true)}
                className="w-full pr-8"
              />
              <ChevronsUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {filteredCities.length > 0 ? (
              <div className="max-h-[300px] overflow-auto">
                {filteredCities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between cursor-pointer",
                      city === c && "bg-accent"
                    )}
                    onClick={() => handleSelect(c)}
                  >
                    <span>{c}</span>
                    {city === c && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Nenhuma cidade encontrada
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full sm:w-[300px] justify-start text-left font-normal"
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
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      <Button 
        onClick={onSearch} 
        disabled={loading}
        className="w-full sm:w-auto"
      >
        <Search className="mr-2 h-4 w-4" />
        {loading ? 'Buscando...' : 'Buscar'}
      </Button>
    </div>
  );
}

