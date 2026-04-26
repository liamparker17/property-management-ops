import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';
import { createRequire } from 'node:module';
import path from 'node:path';

// Stub leaflet and react-leaflet before any code that imports portfolio-pins loads them.
// mock.module() is ESM-only; with --import tsx (CJS) we patch require.cache directly.
const req = createRequire(import.meta.url);

const leafletStub = {
  divIcon: () => ({}),
  latLngBounds: () => ({}),
};
const reactLeafletStub = {
  MapContainer: () => null,
  Marker: () => null,
  Popup: () => null,
  TileLayer: () => null,
  useMap: () => ({}),
};

// Resolve and cache-inject the stubs before the first real import of these modules.
const leafletPath = req.resolve('leaflet');
const reactLeafletPath = req.resolve('react-leaflet');
require.cache[leafletPath] = { id: leafletPath, filename: leafletPath, loaded: true, exports: leafletStub } as NodeJS.Module;
require.cache[reactLeafletPath] = { id: reactLeafletPath, filename: reactLeafletPath, loaded: true, exports: reactLeafletStub } as NodeJS.Module;

type Row = {
  id: string;
  name: string;
  suburb: string;
  city: string;
  province: string;
  occupiedUnits: number;
  totalUnits: number;
  occupancyPct: number;
  openMaintenance: number;
  arrearsCents: number;
  grossRentCents: number;
  healthScore: number;
  landlordName: string | null;
  agentName: string | null;
  href: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PropertyHealthRanking: (props: { rows: Row[]; className?: string }) => any;

before(async () => {
  const mod = await import('@/components/analytics/property-health-ranking');
  PropertyHealthRanking = mod.PropertyHealthRanking;
});

const rows: Row[] = [
  { id: 'a', name: 'Alpha', suburb: 'S', city: 'Johannesburg', province: 'GP', occupiedUnits: 9, totalUnits: 10, occupancyPct: 90, openMaintenance: 0, arrearsCents: 0, grossRentCents: 100_000_00, healthScore: 85, landlordName: null, agentName: null, href: '/properties/a' },
  { id: 'b', name: 'Beta', suburb: 'S', city: 'Johannesburg', province: 'GP', occupiedUnits: 4, totalUnits: 10, occupancyPct: 40, openMaintenance: 3, arrearsCents: 50_000_00, grossRentCents: 100_000_00, healthScore: 35, landlordName: null, agentName: null, href: '/properties/b' },
];

describe('<PropertyHealthRanking />', () => {
  it('renders rows sorted by healthScore desc by default', () => {
    const html = renderToString(<PropertyHealthRanking rows={rows} />);
    const alphaIdx = html.indexOf('Alpha');
    const betaIdx = html.indexOf('Beta');
    assert.ok(alphaIdx > 0 && betaIdx > 0 && alphaIdx < betaIdx);
  });
  it('renders empty-state when rows is empty', () => {
    const html = renderToString(<PropertyHealthRanking rows={[]} />);
    assert.match(html, /No properties/i);
  });
  it('renders a health badge for each row', () => {
    const html = renderToString(<PropertyHealthRanking rows={rows} />);
    assert.match(html, /85/);
    assert.match(html, /35/);
  });
});
