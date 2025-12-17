'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Media } from '@/types';

// Importa o mapa dinamicamente para evitar problemas de SSR
const MapComponent = dynamic(
  () => import('./MediaMapClient').then((mod) => mod.MediaMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    ),
  }
);

interface MediaMapProps {
  midias: Media[];
  selectedMediaId?: string;
  hoveredMediaId?: string;
  onMarkerClick?: (mediaId: string) => void;
  onMarkerHover?: (mediaId: string | undefined) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  onMapClick?: () => void;
}

export function MediaMap({ midias, selectedMediaId, hoveredMediaId, onMarkerClick, onMarkerHover, onBoundsChange, onMapClick }: MediaMapProps) {
  return <MapComponent midias={midias} selectedMediaId={selectedMediaId} hoveredMediaId={hoveredMediaId} onMarkerClick={onMarkerClick} onMarkerHover={onMarkerHover} onBoundsChange={onBoundsChange} onMapClick={onMapClick} />;
}
