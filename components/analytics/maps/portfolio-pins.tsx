'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';
import Link from 'next/link';

export type PortfolioPin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  href?: string;
  meta?: string;
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

function getCenter(pins: PortfolioPin[]) {
  if (pins.length === 0) return [-26.2041, 28.0473] as [number, number];
  const lat = pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length;
  const lng = pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length;
  return [lat, lng] as [number, number];
}

export function PortfolioPins({ pins }: PortfolioPinsProps) {
  const center = getCenter(pins);

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom={false} className="h-full min-h-80 w-full">
      <TileLayer
        attribution="Map data OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
