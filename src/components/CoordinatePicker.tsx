'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet no Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface CoordinatePickerProps {
  lat: number | null;
  lng: number | null;
  onCoordinateChange: (lat: number, lng: number) => void;
  height?: string;
}

// Componente para atualizar o centro do mapa quando as coordenadas mudam
function MapCenterUpdater({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (lat !== null && lng !== null) {
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      // Só atualiza se as coordenadas mudaram significativamente (mais de 0.001 graus)
      if (
        Math.abs(currentCenter.lat - lat) > 0.001 ||
        Math.abs(currentCenter.lng - lng) > 0.001
      ) {
        map.setView([lat, lng], currentZoom > 10 ? currentZoom : 13, { animate: true });
      }
    }
  }, [lat, lng, map]);

  return null;
}

// Componente para capturar cliques no mapa
function MapClickHandler({ onCoordinateChange }: { onCoordinateChange: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onCoordinateChange(lat, lng);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onCoordinateChange]);

  return null;
}

function CoordinatePickerClient({ lat, lng, onCoordinateChange, height = '400px' }: CoordinatePickerProps) {
  // Coordenadas do centro do Brasil
  const brazilCenter: [number, number] = [-14.2350, -51.9253];
  
  // Posição inicial do mapa
  const initialCenter: [number, number] = 
    lat !== null && lng !== null ? [lat, lng] : brazilCenter;
  
  const initialZoom = lat !== null && lng !== null ? 13 : 4;

  return (
    <div className="w-full rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onCoordinateChange={onCoordinateChange} />
        <MapCenterUpdater lat={lat} lng={lng} />
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} />
        )}
      </MapContainer>
    </div>
  );
}

// Importa dinamicamente para evitar problemas de SSR
const CoordinatePicker = dynamic(
  () => Promise.resolve(CoordinatePickerClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-lg border bg-gray-100 flex items-center justify-center" style={{ height: '400px' }}>
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    ),
  }
);

export default CoordinatePicker;

