'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import type L from 'leaflet';
import { Header } from '@/components/Header';
import { MediaFilters } from '@/components/MediaFilters';
import { MediaCard } from '@/components/MediaCard';
import { MediaMap } from '@/components/MediaMap';
import { useMidias } from '@/hooks/useMidias';
import { useReservas } from '@/hooks/useReservas';
import type { Media } from '@/types';

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cityFilter, setCityFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reservedMediaIds, setReservedMediaIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | undefined>();
  const [hoveredMediaId, setHoveredMediaId] = useState<string | undefined>();
  const [visibleMidias, setVisibleMidias] = useState<Media[]>([]);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [showMap, setShowMap] = useState(false);

  const { midias, loading, fetchMidias } = useMidias();
  const { getReservationsForPeriod } = useReservas();

  // Extrai cidades únicas das mídias disponíveis
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    midias.forEach((media) => {
      if (media.city) {
        cities.add(media.city);
      }
    });
    return Array.from(cities).sort();
  }, [midias]);

  // Carrega filtros da URL ao montar o componente
  useEffect(() => {
    const city = searchParams.get('city') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const hasFilters = !!(city || (startDate && endDate));
    
    // Só atualiza se realmente mudou
    if (city !== cityFilter) {
      setCityFilter(city);
    }

    if (startDate && endDate) {
      const newFrom = new Date(startDate);
      const newTo = new Date(endDate);
      if (
        !dateRange?.from ||
        !dateRange?.to ||
        dateRange.from.getTime() !== newFrom.getTime() ||
        dateRange.to.getTime() !== newTo.getTime()
      ) {
        setDateRange({
          from: newFrom,
          to: newTo,
        });
      }
    } else if (dateRange && (!startDate || !endDate)) {
      setDateRange(undefined);
    }

    // Verifica se há filtros na URL para mostrar o mapa
    setShowMap(hasFilters);

    // Se houver filtros na URL, busca automaticamente (só uma vez)
    if (!hasSearched) {
      if (hasFilters) {
        fetchMidias(city || undefined);
      } else {
        fetchMidias();
      }
      setHasSearched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const checkReservations = async () => {
      if (dateRange?.from && dateRange?.to && midias.length > 0) {
        const reserved = new Set<string>();
        
        for (const media of midias) {
          const reservations = await getReservationsForPeriod(
            media.id,
            dateRange.from!,
            dateRange.to!
          );
          if (reservations.length > 0) {
            reserved.add(media.id);
          }
        }
        
        setReservedMediaIds(reserved);
      } else {
        setReservedMediaIds(new Set());
      }
    };

    checkReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, midias]);

  const handleSearch = () => {
    fetchMidias(cityFilter || undefined);
    
    // Atualiza a URL com os filtros
    const params = new URLSearchParams();
    if (cityFilter.trim()) {
      params.set('city', cityFilter.trim());
    }
    if (dateRange?.from) {
      params.set('startDate', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      params.set('endDate', dateRange.to.toISOString());
    }
    
    const queryString = params.toString();
    const hasFilters = !!(cityFilter.trim() || (dateRange?.from && dateRange?.to));
    setShowMap(hasFilters);
    
    router.push(queryString ? `/?${queryString}` : '/', { scroll: false });
  };

  const handleMarkerClick = useCallback((mediaId: string) => {
    setSelectedMediaId(mediaId);
    // Scroll até o card correspondente
    setTimeout(() => {
      const element = document.getElementById(`media-${mediaId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Destaque visual temporário
        element.classList.add('ring-4', 'ring-blue-500', 'rounded-lg');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-500', 'rounded-lg');
        }, 2000);
      }
    }, 100);
  }, []);

  const handleMarkerHover = useCallback((mediaId: string | undefined) => {
    setHoveredMediaId(mediaId);
  }, []);

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    // Só atualiza se os bounds realmente mudaram
    setMapBounds((prev) => {
      if (!prev) return bounds;
      // Compara se os bounds são diferentes
      const prevStr = `${prev.getNorth()}-${prev.getSouth()}-${prev.getEast()}-${prev.getWest()}`;
      const newStr = `${bounds.getNorth()}-${bounds.getSouth()}-${bounds.getEast()}-${bounds.getWest()}`;
      if (prevStr === newStr) return prev;
      return bounds;
    });
  }, []);

  // Filtra mídias visíveis baseado nos bounds do mapa
  useEffect(() => {
    if (!mapBounds || midias.length === 0) {
      setVisibleMidias(midias);
      return;
    }

    const visible = midias.filter((media) => {
      return mapBounds.contains([media.coordinates.lat, media.coordinates.lng]);
    });

    // Se não houver nenhuma visível, mostra todas (pode ser zoom muito próximo)
    const newVisible = visible.length > 0 ? visible : midias;
    
    // Só atualiza se realmente mudou
    setVisibleMidias((prev) => {
      if (prev.length !== newVisible.length) return newVisible;
      const prevIds = new Set(prev.map(m => m.id));
      const newIds = new Set(newVisible.map(m => m.id));
      if (prevIds.size !== newIds.size) return newVisible;
      for (const id of prevIds) {
        if (!newIds.has(id)) return newVisible;
      }
      return prev; // Não mudou, retorna o anterior
    });
  }, [mapBounds, midias]);

  // Handler para clicar no mapa (será passado para o componente do mapa)
  const handleMapClick = useCallback(() => {
    setSelectedMediaId(undefined);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <MediaFilters
        city={cityFilter}
        dateRange={dateRange}
        onCityChange={setCityFilter}
        onDateRangeChange={setDateRange}
        onSearch={handleSearch}
        loading={loading}
        availableCities={availableCities}
      />
      <main className="flex gap-6 px-4 py-8">
        {/* Lista de mídias */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : midias.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhuma mídia encontrada. Tente ajustar os filtros.
              </p>
            </div>
          ) : (
            <>
              {showMap && mapBounds && visibleMidias.length < midias.length && visibleMidias.length > 0 && (
                <div className="mb-4 text-sm text-muted-foreground">
                  Mostrando {visibleMidias.length} de {midias.length} mídias na área visível
                </div>
              )}
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${showMap ? 'lg:grid-cols-2 xl:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
                {(showMap ? visibleMidias : midias).map((media) => (
                  <MediaCard
                    key={media.id}
                    media={media}
                    isReserved={reservedMediaIds.has(media.id)}
                    onMouseEnter={showMap ? () => setHoveredMediaId(media.id) : undefined}
                    onMouseLeave={showMap ? () => setHoveredMediaId(undefined) : undefined}
                    cardId={`media-${media.id}`}
                  />
              ))}
              </div>
            </>
          )}
        </div>

        {/* Mapa - só aparece quando há busca/filtros */}
        {showMap && (
          <div className="hidden lg:block w-[500px] sticky top-8 h-[calc(100vh-120px)]">
            <MediaMap
              midias={midias}
              selectedMediaId={selectedMediaId}
              hoveredMediaId={hoveredMediaId}
              onMarkerClick={handleMarkerClick}
              onMarkerHover={handleMarkerHover}
              onBoundsChange={handleBoundsChange}
              onMapClick={handleMapClick}
            />
          </div>
        )}
      </main>
    </div>
  );
}

