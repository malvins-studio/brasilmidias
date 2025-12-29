'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

interface CoordinatePickerProps {
  lat: number | null;
  lng: number | null;
  onCoordinateChange: (lat: number, lng: number) => void;
  height?: string;
}

function CoordinatePickerClient({ lat, lng, onCoordinateChange, height = '400px' }: CoordinatePickerProps) {
  // Importa Leaflet apenas no cliente
  useEffect(() => {
    // Fix para ícones do Leaflet no Next.js
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const IconDefault = L.default.Icon.Default;
        // Remove propriedade privada do Leaflet para funcionar no Next.js
        delete (IconDefault.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
        IconDefault.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Coordenadas do centro do Brasil
  const brazilCenter: [number, number] = [-14.2350, -51.9253];
  
  // Posição inicial do mapa
  const initialCenter: [number, number] = 
    lat !== null && lng !== null ? [lat, lng] : brazilCenter;
  
  const initialZoom = lat !== null && lng !== null ? 13 : 4;

  // Importa react-leaflet dinamicamente
  // Tipos dinâmicos do react-leaflet (importados em runtime)
  const [MapComponents, setMapComponents] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MapContainer: React.ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TileLayer: React.ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Marker: React.ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useMap: () => any;
  } | null>(null);

  // Usa refs para evitar warnings de dependências
  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const onCoordinateChangeRef = useRef(onCoordinateChange);

  useEffect(() => {
    latRef.current = lat;
    lngRef.current = lng;
    onCoordinateChangeRef.current = onCoordinateChange;
  }, [lat, lng, onCoordinateChange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-leaflet').then((mod) => {
        setMapComponents({
          MapContainer: mod.MapContainer,
          TileLayer: mod.TileLayer,
          Marker: mod.Marker,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useMap: mod.useMap as any,
        });
      });
    }
  }, []);

  if (!MapComponents) {
    return (
      <div className="w-full rounded-lg border bg-gray-100 flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, useMap } = MapComponents;

  // Componentes internos que precisam de useMap
  const MapCenterUpdaterWithHook = () => {
    const map = useMap();
    useEffect(() => {
      if (latRef.current !== null && lngRef.current !== null) {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        if (
          Math.abs(currentCenter.lat - latRef.current) > 0.001 ||
          Math.abs(currentCenter.lng - lngRef.current) > 0.001
        ) {
          map.setView([latRef.current, lngRef.current], currentZoom > 10 ? currentZoom : 13, { animate: true });
        }
      }
    }, [map]);
    return null;
  };

  const MapClickHandlerWithHook = () => {
    const map = useMap();
    useEffect(() => {
      const handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        onCoordinateChangeRef.current(lat, lng);
      };
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }, [map]);
    return null;
  };

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
        <MapClickHandlerWithHook />
        <MapCenterUpdaterWithHook />
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

