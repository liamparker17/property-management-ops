'use client';

import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import { useEffect } from 'react';
import Link from 'next/link';

export type PortfolioPin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  href?: string;
  meta?: string;
  healthScore?: number | null;
};

type PortfolioPinsProps = {
  pins: PortfolioPin[];
};

const markerIcon = divIcon({
  className: 'analytics-map-pin',
  html: '<span style="display:block;height:14px;width:14px;border:2px solid var(--color-card);border-radius:9999px;background:var(--color-chart-2);box-shadow:0 0 0 4px color-mix(in oklch, var(--color-chart-2) 28%, transparent);"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const SOUTH_AFRICA_CENTER: [number, number] = [-29.0, 24.0];

// Fits the viewport to show every pin, with sensible fallbacks.
// - 0 pins: centered on South Africa at country zoom.
// - 1 pin:  centered on that pin at city zoom.
// - ≥2 pins that are close (all within ~0.5° ≈ one city): city-level zoom.
// - ≥2 pins spread across provinces: country zoom showing all.
function FitToPins({ pins }: { pins: PortfolioPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.setView(SOUTH_AFRICA_CENTER, 5);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    const bounds = latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [map, pins]);
  return null;
}

export function PortfolioPins({ pins }: PortfolioPinsProps) {
  return (
    <MapContainer
      center={SOUTH_AFRICA_CENTER}
      zoom={5}
      scrollWheelZoom
      zoomControl
      className="h-full min-h-80 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPins pins={pins} />
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={markerIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="font-medium">{pin.label}</p>
              {pin.meta ? <p className="text-xs text-slate-600">{pin.meta}</p> : null}
              {pin.href ? (
                <Link href={pin.href} className="text-xs underline">
                  Open property
                </Link>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
