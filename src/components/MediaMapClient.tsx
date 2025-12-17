'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Media } from '@/types';
import Link from 'next/link';

// Fix para ícones do Leaflet no Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface MediaMapClientProps {
  midias: Media[];
  selectedMediaId?: string;
  hoveredMediaId?: string;
  onMarkerClick?: (mediaId: string) => void;
  onMarkerHover?: (mediaId: string | undefined) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  onMapClick?: () => void;
}

function MapUpdater({ midias, onBoundsChange }: { midias: Media[]; onBoundsChange?: (bounds: L.LatLngBounds) => void }) {
  const map = useMap();

  useEffect(() => {
    if (midias.length === 0) return;

    const bounds = midias.map((media) => [
      media.coordinates.lat,
      media.coordinates.lng,
    ] as [number, number]);

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [midias, map]);

  // Detecta mudanças no bounds (zoom ou pan)
  useEffect(() => {
    if (!onBoundsChange) return;

    let timeoutId: NodeJS.Timeout;
    let lastBoundsStr: string | null = null;

    const updateBounds = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const bounds = map.getBounds();
        // Compara bounds como string para evitar atualizações desnecessárias
        const boundsStr = `${bounds.getNorth()}-${bounds.getSouth()}-${bounds.getEast()}-${bounds.getWest()}`;
        if (lastBoundsStr !== boundsStr) {
          lastBoundsStr = boundsStr;
          onBoundsChange(bounds);
        }
      }, 150); // Debounce de 150ms
    };

    // Dispara quando o mapa é movido ou quando o zoom muda
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    
    // Dispara inicialmente
    updateBounds();

    return () => {
      clearTimeout(timeoutId);
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map, onBoundsChange]);

  return null;
}

// Componente Marker customizado que atualiza o ícone
function PriceMarker({ 
  media, 
  isHovered, 
  isSelected, 
  onMarkerClick,
  onMarkerHover
}: { 
  media: Media; 
  isHovered: boolean; 
  isSelected: boolean; 
  onMarkerClick?: (mediaId: string) => void;
  onMarkerHover?: (mediaId: string | undefined) => void;
}) {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(media.pricePerDay);

  // Sempre mostra o preço, mas aumenta e muda cor quando hover/selected
  const scale = isHovered || isSelected ? 1.2 : 1;
  const bgColor = isHovered || isSelected ? '#3b82f6' : '#000000';
  const textColor = '#ffffff';
  const opacity = isHovered || isSelected ? 1 : 0.95; // Sempre visível, mas mais opaco quando hover
  const zIndexOffset = isHovered || isSelected ? 1000 : 0; // Z-index maior quando hover/selected

  // Cria o ícone sempre que hover/selected mudar
  const icon = L.divIcon({
    className: 'custom-price-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        padding: 6px 10px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 12px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
        transform: scale(${scale});
        transition: all 0.2s ease;
        opacity: ${opacity};
        cursor: pointer;
      ">
        ${formattedPrice}
      </div>
    `,
    iconSize: [100, 30],
    iconAnchor: [50, 30],
    popupAnchor: [0, -30],
  });

  // Usa key para forçar recriação quando hover/selected muda
  return (
    <Marker
      key={`${media.id}-${isHovered}-${isSelected}`}
      position={[media.coordinates.lat, media.coordinates.lng]}
      icon={icon}
      zIndexOffset={zIndexOffset}
      eventHandlers={{
        click: () => {
          if (onMarkerClick) {
            onMarkerClick(media.id);
          }
        },
        mouseover: () => {
          if (onMarkerHover) {
            onMarkerHover(media.id);
          }
        },
        mouseout: () => {
          if (onMarkerHover) {
            onMarkerHover(undefined);
          }
        },
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-semibold text-sm mb-1">{media.name}</h3>
          <p className="text-xs text-muted-foreground mb-2">
            {media.city}, {media.state}
          </p>
          <p className="text-xs font-medium mb-2">
            {media.mediaType} • {formattedPrice}/dia
          </p>
          <Link
            href={`/midia/${media.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Ver detalhes →
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick?: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (!onMapClick) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // Só deseleciona se clicou diretamente no mapa (não em marcadores)
      const target = e.originalEvent.target as HTMLElement;
      const isMarker = target.closest('.leaflet-marker-icon') || target.closest('.custom-price-marker');
      
      if (!isMarker) {
        onMapClick();
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onMapClick]);

  return null;
}

export function MediaMapClient({ midias, selectedMediaId, hoveredMediaId, onMarkerClick, onMarkerHover, onBoundsChange, onMapClick }: MediaMapClientProps) {
  if (midias.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-muted-foreground">Nenhuma mídia para exibir no mapa</p>
      </div>
    );
  }

  // Calcula o centro baseado nas mídias
  const centerLat = midias.reduce((sum, m) => sum + m.coordinates.lat, 0) / midias.length;
  const centerLng = midias.reduce((sum, m) => sum + m.coordinates.lng, 0) / midias.length;

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={midias.length === 1 ? 13 : 5}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater midias={midias} onBoundsChange={onBoundsChange} />
        <MapClickHandler onMapClick={onMapClick} />
        {midias.map((media) => (
          <PriceMarker
            key={media.id}
            media={media}
            isHovered={hoveredMediaId === media.id}
            isSelected={selectedMediaId === media.id}
            onMarkerClick={onMarkerClick}
            onMarkerHover={onMarkerHover}
          />
        ))}
      </MapContainer>
    </div>
  );
}

