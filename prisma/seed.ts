import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import {
  Prisma,
  PrismaClient,
  Role,
  LeaseState,
  SAProvince,
  DocumentKind,
  FeatureFlagKey,
  MaintenancePriority,
  MaintenanceStatus,
  InvoiceStatus,
  InvoiceLineItemKind,
  PaymentMethod,
  ReceiptSource,
  AllocationTarget,
  LedgerEntryType,
  ApplicationStage,
  ApplicationDecision,
  TpnCheckStatus,
  TpnRecommendation,
  NotificationChannel,
  NotificationStatus,
  AreaNoticeType,
  OutageSource,
  InspectionType,
  InspectionStatus,
  ConditionRating,
  ChargeResponsibility,
  StatementType,
  DebiCheckMandateStatus,
  UtilityType,
  MeterReadingSource,
  TariffStructure,
  ApprovalKind,
  ApprovalState,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { put } from '@vercel/blob';

// Prefer the direct Neon endpoint for the seed: the pooled endpoint refuses
// connections under the high-fanout write load this seed produces, causing
// partial/half-wiped state if we crash mid-run.
const SEED_CONN = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString: SEED_CONN });
const db = new PrismaClient({ adapter });

const ORG_SLUG = 'acme';
const DEMO_PASSWORD = 'demo1234';
const SEED_REFERENCE_DATE = new Date('2026-04-24T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

type PropertyKind = 'APARTMENT' | 'TOWNHOUSE' | 'ESTATE' | 'COTTAGE';
type LeaseScenario = 'ACTIVE' | 'UPCOMING' | 'DRAFT' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
type PaymentProfile = 'STABLE' | 'DEBICHECK' | 'LATE' | 'PARTIAL' | 'CHRONIC';

type PropertySeed = {
  name: string;
  addressLine1: string;
  suburb: string;
  city: string;
  province: SAProvince;
  postalCode: string;
  units: number;
  kind: PropertyKind;
  eskomAreaCode: string;
};

type UnitContext = {
  property: Awaited<ReturnType<typeof db.property.create>>;
  spec: PropertySeed;
  index: number;
  ordinal: number;
  unit: Awaited<ReturnType<typeof db.unit.create>>;
};

type LeaseContext = {
  lease: Awaited<ReturnType<typeof db.lease.create>>;
  property: Awaited<ReturnType<typeof db.property.create>>;
  spec: PropertySeed;
  unit: Awaited<ReturnType<typeof db.unit.create>>;
  tenants: Awaited<ReturnType<typeof db.tenant.create>>[];
  primaryTenant: Awaited<ReturnType<typeof db.tenant.create>>;
  landlordId: string;
  assignedAgentId: string | null;
  scenario: LeaseScenario;
  paymentProfile: PaymentProfile;
  currentOccupancy: boolean;
  expiringSoon: boolean;
};

type MeterContext = {
  water?: Awaited<ReturnType<typeof db.meter.create>>;
  electricity?: Awaited<ReturnType<typeof db.meter.create>>;
};

type StatementLineSeed = {
  occurredAt: Date;
  description: string;
  debitCents?: number;
  creditCents?: number;
  sourceType?: string;
  sourceId?: string;
};

const PROPERTY_SEEDS: PropertySeed[] = [
  { name: 'Rose Court', addressLine1: '12 Main Road', suburb: 'Observatory', city: 'Cape Town', province: SAProvince.WC, postalCode: '7925', units: 12, kind: 'APARTMENT', eskomAreaCode: 'obs-main-1' },
  { name: 'Atlantic Terraces', addressLine1: '41 Regent Road', suburb: 'Sea Point', city: 'Cape Town', province: SAProvince.WC, postalCode: '8005', units: 11, kind: 'APARTMENT', eskomAreaCode: 'sea-point-2' },
  { name: 'Signal View Lofts', addressLine1: '8 Strand Street', suburb: 'De Waterkant', city: 'Cape Town', province: SAProvince.WC, postalCode: '8001', units: 10, kind: 'APARTMENT', eskomAreaCode: 'de-waterkant-1' },
  { name: 'Observatory Exchange', addressLine1: '77 Lower Main Road', suburb: 'Observatory', city: 'Cape Town', province: SAProvince.WC, postalCode: '7925', units: 9, kind: 'APARTMENT', eskomAreaCode: 'obs-main-2' },
  { name: 'Plumstead Gardens', addressLine1: '16 Victoria Road', suburb: 'Plumstead', city: 'Cape Town', province: SAProvince.WC, postalCode: '7800', units: 8, kind: 'APARTMENT', eskomAreaCode: 'plumstead-1' },
  { name: 'Sea Point Studios', addressLine1: '112 High Level Road', suburb: 'Sea Point', city: 'Cape Town', province: SAProvince.WC, postalCode: '8005', units: 8, kind: 'APARTMENT', eskomAreaCode: 'sea-point-3' },
  { name: 'Oak Village', addressLine1: '5 Oak Street', suburb: 'Rondebosch', city: 'Cape Town', province: SAProvince.WC, postalCode: '7700', units: 7, kind: 'TOWNHOUSE', eskomAreaCode: 'rondebosch-1' },
  { name: 'Bergzicht Mews', addressLine1: '14 Andringa Walk', suburb: 'Stellenbosch Central', city: 'Stellenbosch', province: SAProvince.WC, postalCode: '7600', units: 7, kind: 'TOWNHOUSE', eskomAreaCode: 'stellenbosch-1' },
  { name: 'Willow Lane Houses', addressLine1: '17 Willow Lane', suburb: 'Claremont', city: 'Cape Town', province: SAProvince.WC, postalCode: '7708', units: 6, kind: 'ESTATE', eskomAreaCode: 'claremont-1' },
  { name: 'Somerset Square', addressLine1: '9 Church Street', suburb: 'Somerset West', city: 'Cape Town', province: SAProvince.WC, postalCode: '7130', units: 6, kind: 'TOWNHOUSE', eskomAreaCode: 'somerset-west-1' },
  { name: 'Jacaranda Place', addressLine1: '31 Justice Mahomed Street', suburb: 'Brooklyn', city: 'Pretoria', province: SAProvince.GP, postalCode: '0181', units: 6, kind: 'TOWNHOUSE', eskomAreaCode: 'brooklyn-pta-1' },
  { name: 'Brooklyn Heights', addressLine1: '64 Middel Street', suburb: 'Brooklyn', city: 'Pretoria', province: SAProvince.GP, postalCode: '0181', units: 6, kind: 'APARTMENT', eskomAreaCode: 'brooklyn-pta-2' },
  { name: 'Sunnyside Court', addressLine1: '128 Johnston Street', suburb: 'Sunnyside', city: 'Pretoria', province: SAProvince.GP, postalCode: '0002', units: 6, kind: 'APARTMENT', eskomAreaCode: 'sunnyside-1' },
  { name: 'Hatfield Commons', addressLine1: '23 Burnett Street', suburb: 'Hatfield', city: 'Pretoria', province: SAProvince.GP, postalCode: '0083', units: 6, kind: 'APARTMENT', eskomAreaCode: 'hatfield-1' },
  { name: 'Umhlanga Ridge Apartments', addressLine1: '21 Meridian Drive', suburb: 'Umhlanga Ridge', city: 'Durban', province: SAProvince.KZN, postalCode: '4319', units: 6, kind: 'APARTMENT', eskomAreaCode: 'umhlanga-1' },
  { name: 'Florida Grove', addressLine1: '45 Ontdekkers Road', suburb: 'Florida', city: 'Johannesburg', province: SAProvince.GP, postalCode: '1709', units: 6, kind: 'TOWNHOUSE', eskomAreaCode: 'florida-jhb-1' },
  { name: 'Greenstone Villas', addressLine1: '38 Greenstone Drive', suburb: 'Greenstone Hill', city: 'Johannesburg', province: SAProvince.GP, postalCode: '1609', units: 6, kind: 'ESTATE', eskomAreaCode: 'greenstone-1' },
  { name: 'Sandton Gate', addressLine1: '5 Grayston Drive', suburb: 'Sandown', city: 'Johannesburg', province: SAProvince.GP, postalCode: '2196', units: 6, kind: 'APARTMENT', eskomAreaCode: 'sandton-1' },
  { name: 'Melville Walk', addressLine1: '14 7th Street', suburb: 'Melville', city: 'Johannesburg', province: SAProvince.GP, postalCode: '2092', units: 5, kind: 'COTTAGE', eskomAreaCode: 'melville-1' },
  { name: 'Parkhurst Cottages', addressLine1: '38 6th Street', suburb: 'Parkhurst', city: 'Johannesburg', province: SAProvince.GP, postalCode: '2193', units: 5, kind: 'COTTAGE', eskomAreaCode: 'parkhurst-1' },
  { name: 'Morningside Mews', addressLine1: '88 Kelvin Drive', suburb: 'Morningside', city: 'Johannesburg', province: SAProvince.GP, postalCode: '2057', units: 5, kind: 'TOWNHOUSE', eskomAreaCode: 'morningside-1' },
  { name: 'Lonehill Row', addressLine1: '17 Lonehill Boulevard', suburb: 'Lonehill', city: 'Johannesburg', province: SAProvince.GP, postalCode: '2191', units: 5, kind: 'ESTATE', eskomAreaCode: 'lonehill-1' },
  { name: 'Waterfall Crest', addressLine1: '4 Maxwell Drive', suburb: 'Waterfall', city: 'Midrand', province: SAProvince.GP, postalCode: '1686', units: 5, kind: 'ESTATE', eskomAreaCode: 'waterfall-1' },
  { name: 'Stellenbosch Oaks', addressLine1: '6 Merriman Avenue', suburb: 'Die Boord', city: 'Stellenbosch', province: SAProvince.WC, postalCode: '7600', units: 5, kind: 'TOWNHOUSE', eskomAreaCode: 'stellenbosch-2' },
  { name: 'Paarl Valley Mews', addressLine1: '12 Main Street', suburb: 'Paarl South', city: 'Paarl', province: SAProvince.WC, postalCode: '7646', units: 5, kind: 'TOWNHOUSE', eskomAreaCode: 'paarl-1' },
  { name: 'George Garden Route Homes', addressLine1: '23 York Street', suburb: 'Dormehls Drift', city: 'George', province: SAProvince.WC, postalCode: '6529', units: 5, kind: 'ESTATE', eskomAreaCode: 'george-1' },
  { name: 'Walmer Gardens', addressLine1: '55 2nd Avenue', suburb: 'Walmer', city: 'Gqeberha', province: SAProvince.EC, postalCode: '6070', units: 4, kind: 'TOWNHOUSE', eskomAreaCode: 'walmer-1' },
  { name: 'Richmond Hill Flats', addressLine1: '11 Stanley Street', suburb: 'Richmond Hill', city: 'Gqeberha', province: SAProvince.EC, postalCode: '6001', units: 4, kind: 'APARTMENT', eskomAreaCode: 'richmond-hill-1' },
  { name: 'Westering Place', addressLine1: '7 Papenkuils Street', suburb: 'Westering', city: 'Gqeberha', province: SAProvince.EC, postalCode: '6025', units: 4, kind: 'ESTATE', eskomAreaCode: 'westering-1' },
  { name: 'Berea Court', addressLine1: '89 Currie Road', suburb: 'Berea', city: 'Durban', province: SAProvince.KZN, postalCode: '4001', units: 4, kind: 'APARTMENT', eskomAreaCode: 'berea-dbn-1' },
  { name: 'Glenwood Terraces', addressLine1: '42 Lena Ahrens Road', suburb: 'Glenwood', city: 'Durban', province: SAProvince.KZN, postalCode: '4001', units: 4, kind: 'TOWNHOUSE', eskomAreaCode: 'glenwood-1' },
  { name: 'Hillcrest Close', addressLine1: '18 Old Main Road', suburb: 'Hillcrest', city: 'Durban', province: SAProvince.KZN, postalCode: '3610', units: 4, kind: 'ESTATE', eskomAreaCode: 'hillcrest-1' },
  { name: 'Ballito Breeze', addressLine1: '27 Compensation Beach Road', suburb: 'Ballito', city: 'Durban', province: SAProvince.KZN, postalCode: '4420', units: 4, kind: 'APARTMENT', eskomAreaCode: 'ballito-1' },
  { name: 'Midstream Courtyard', addressLine1: '15 Brakfontein Road', suburb: 'Midstream', city: 'Centurion', province: SAProvince.GP, postalCode: '1692', units: 4, kind: 'ESTATE', eskomAreaCode: 'midstream-1' },
  { name: 'Centurion Lakeside', addressLine1: '66 Lenchen Avenue', suburb: 'Centurion Central', city: 'Centurion', province: SAProvince.GP, postalCode: '0157', units: 4, kind: 'APARTMENT', eskomAreaCode: 'centurion-1' },
  { name: 'Faerie Glen Mews', addressLine1: '91 Atterbury Road', suburb: 'Faerie Glen', city: 'Pretoria', province: SAProvince.GP, postalCode: '0081', units: 4, kind: 'TOWNHOUSE', eskomAreaCode: 'faerie-glen-1' },
  { name: 'Table View Cottages', addressLine1: '18 Blaauwberg Road', suburb: 'Table View', city: 'Cape Town', province: SAProvince.WC, postalCode: '7441', units: 4, kind: 'COTTAGE', eskomAreaCode: 'table-view-1' },
  { name: 'Durbanville Grove', addressLine1: '25 Wellington Road', suburb: 'Durbanville', city: 'Cape Town', province: SAProvince.WC, postalCode: '7550', units: 4, kind: 'ESTATE', eskomAreaCode: 'durbanville-1' },
  { name: 'Kuils River Houses', addressLine1: '14 Langverwacht Road', suburb: 'Kuils River', city: 'Cape Town', province: SAProvince.WC, postalCode: '7580', units: 4, kind: 'ESTATE', eskomAreaCode: 'kuils-river-1' },
  { name: 'Blouberg Sands', addressLine1: '9 Viola Road', suburb: 'West Beach', city: 'Cape Town', province: SAProvince.WC, postalCode: '7441', units: 4, kind: 'APARTMENT', eskomAreaCode: 'blouberg-1' },
  { name: 'Milnerton Links', addressLine1: '4 Koeberg Road', suburb: 'Milnerton', city: 'Cape Town', province: SAProvince.WC, postalCode: '7441', units: 4, kind: 'APARTMENT', eskomAreaCode: 'milnerton-1' },
  { name: 'Alberton Close', addressLine1: '31 Voortrekker Road', suburb: 'New Redruth', city: 'Johannesburg', province: SAProvince.GP, postalCode: '1449', units: 4, kind: 'TOWNHOUSE', eskomAreaCode: 'alberton-1' },
  { name: 'Randburg Row', addressLine1: '52 Republic Road', suburb: 'Ferndale', city: 'Johannesburg', province: SAProvince.GP, postalCode: '2194', units: 4, kind: 'TOWNHOUSE', eskomAreaCode: 'randburg-1' },
  { name: 'Paarl North Suites', addressLine1: '8 Bergriver Boulevard', suburb: 'Paarl North', city: 'Paarl', province: SAProvince.WC, postalCode: '7646', units: 4, kind: 'APARTMENT', eskomAreaCode: 'paarl-2' },
  { name: 'Woodlands Estate', addressLine1: '19 De Villiers Drive', suburb: 'Woodlands', city: 'Bloemfontein', province: SAProvince.FS, postalCode: '9301', units: 4, kind: 'ESTATE', eskomAreaCode: 'woodlands-bfn-1' },
];

const LANDLORD_SEEDS = [
  { name: 'Maseko Capital Rentals', email: 'landlord1@acme.test', phone: '+27 82 501 1001', vatNumber: '4380299911', notes: 'Institutional owner focused on Cape Town apartment stock.' },
  { name: 'Khumalo Family Trust', email: 'landlord2@acme.test', phone: '+27 82 501 1002', vatNumber: '4920187742', notes: 'Long-term hold portfolio across Gauteng townhouses.' },
  { name: 'Blue Crane Residential', email: 'landlord3@acme.test', phone: '+27 82 501 1003', vatNumber: '4765511020', notes: 'Mixed-use owner with Garden Route and Winelands assets.' },
  { name: 'Harbour View Holdings', email: 'landlord4@acme.test', phone: '+27 82 501 1004', vatNumber: '4587749021', notes: 'Premium coastal portfolio with a conservative reserve policy.' },
  { name: 'Jacaranda Asset Partners', email: 'landlord5@acme.test', phone: '+27 82 501 1005', vatNumber: '4301826678', notes: 'Pretoria-focused residential syndicate.' },
  { name: 'Sunridge Property Fund', email: 'landlord6@acme.test', phone: '+27 82 501 1006', vatNumber: '4855204477', notes: 'Diversified owner with smaller suburban schemes.' },
];

const MANAGING_AGENT_SEEDS = [
  { name: 'Lebo Nkosi', email: 'agent1@acme.test', phone: '+27 82 601 2001', notes: 'Cape Town south and city bowl portfolio.' },
  { name: 'Warren Naidoo', email: 'agent2@acme.test', phone: '+27 82 601 2002', notes: 'Johannesburg north and Midrand portfolio.' },
  { name: 'Ayanda Mthembu', email: 'agent3@acme.test', phone: '+27 82 601 2003', notes: 'Durban and coastal KZN portfolio.' },
  { name: 'Palesa Moloi', email: 'agent4@acme.test', phone: '+27 82 601 2004', notes: 'Pretoria and inland support portfolio.' },
];

const VENDOR_SEEDS = [
  { name: 'Rapid Response Plumbing', contactName: 'Gift Moyo', contactEmail: 'dispatch@rapidresponse.test', contactPhone: '+27 11 555 3001', categories: ['Plumbing', 'Emergency'] },
  { name: 'BrightSpark Electrical', contactName: 'Aimee Jacobs', contactEmail: 'ops@brightspark.test', contactPhone: '+27 11 555 3002', categories: ['Electrical', 'COCs'] },
  { name: 'SecureShutter Locksmiths', contactName: 'Imran Khan', contactEmail: 'callout@secureshutter.test', contactPhone: '+27 21 555 3003', categories: ['Locksmith', 'Security'] },
  { name: 'Coastal Roofing & Damp', contactName: 'Ruan Smit', contactEmail: 'quotes@coastalroofing.test', contactPhone: '+27 31 555 3004', categories: ['Roofing', 'Waterproofing'] },
  { name: 'Greenline Garden Services', contactName: 'Thabo Maseko', contactEmail: 'bookings@greenline.test', contactPhone: '+27 12 555 3005', categories: ['Landscaping', 'Common Areas'] },
  { name: 'LiftCare Mobility', contactName: 'Carmen Arendse', contactEmail: 'service@liftcare.test', contactPhone: '+27 21 555 3006', categories: ['Lifts', 'Mechanical'] },
  { name: 'Pest Patrol SA', contactName: 'Melvin Dlamini', contactEmail: 'service@pestpatrol.test', contactPhone: '+27 10 555 3007', categories: ['Pest Control'] },
  { name: 'Metro Appliance Repairs', contactName: 'Leonie Botha', contactEmail: 'repairs@metroappliance.test', contactPhone: '+27 87 555 3008', categories: ['Appliances', 'Geysers'] },
  { name: 'ClearView Glass & Aluminium', contactName: 'Akhona Xulu', contactEmail: 'admin@clearview.test', contactPhone: '+27 41 555 3009', categories: ['Glazing', 'Windows'] },
  { name: 'Prime Paint & Patch', contactName: 'Zander Kruger', contactEmail: 'quotes@primepaint.test', contactPhone: '+27 51 555 3010', categories: ['Painting', 'Plaster'] },
  { name: 'Guardline Security Systems', contactName: 'Nandi Cele', contactEmail: 'monitoring@guardline.test', contactPhone: '+27 11 555 3011', categories: ['Security', 'Access Control'] },
  { name: 'FlowSmart Water Meters', contactName: 'Siyabonga Buthelezi', contactEmail: 'support@flowsmart.test', contactPhone: '+27 31 555 3012', categories: ['Meters', 'Utilities'] },
];

const FIRST_NAMES = [
  'Noah', 'Lerato', 'Sipho', 'Anya', 'Tariq', 'Mia', 'Kabelo', 'Zara', 'Bongani', 'Amelia',
  'Yusuf', 'Naledi', 'Aiden', 'Palesa', 'Keagan', 'Nandi', 'Ayesha', 'Ruan', 'Boitumelo', 'Jason',
  'Thato', 'Ella', 'Vuyo', 'Hannah', 'Liam', 'Keitumetse', 'Olivia', 'Sibusiso', 'Cara', 'Tshepo',
  'Tumi', 'Ari', 'Refilwe', 'Megan', 'Mpho', 'Asanda', 'Dean', 'Shamila', 'Lutho', 'Zinhle',
];

const LAST_NAMES = [
  'Adams', 'Botha', 'Dlamini', 'Fourie', 'Hassan', 'Johnson', 'Khumalo', 'Naidoo', 'Petersen', 'Mokoena',
  'Sithole', 'Smit', 'Govender', 'Daniels', 'Meyer', 'Mabena', 'Pillay', 'van Wyk', 'Molefe', 'Arendse',
  'Jacobs', 'Zulu', 'Ndlovu', 'Mthembu', 'Marais', 'Coetzee', 'Malan', 'Muller', 'Khan', 'Cele',
];

const EMPLOYERS = [
  'Clicks Group', 'Woolworths Financial Services', 'Takealot', 'Capitec', 'Vodacom', 'Discovery Health',
  'Tiger Brands', 'Shoprite Checkers', 'Nedbank', 'Amazon Web Services SA', 'Old Mutual', 'UCT',
  'Tshwane University of Technology', 'City of Cape Town', 'eThekwini Municipality', 'SARS',
];

const MAINTENANCE_TEMPLATES = [
  { title: 'Burst geyser and ceiling staining', description: 'Tenant reported a burst geyser with water ingress into the passage ceiling after overnight pressure fluctuations.', category: 'Appliances' },
  { title: 'Kitchen sink backing up', description: 'Wastewater backing up during evening usage. Request includes photos of slow drainage and foul odour.', category: 'Plumbing' },
  { title: 'DB board tripping intermittently', description: 'Power trips when kettle and microwave run together. Tenant suspects a faulty earth leakage breaker.', category: 'Electrical' },
  { title: 'Main gate remote not syncing', description: 'Access remote stopped pairing after battery replacement. Security concern for the tenant.', category: 'Security' },
  { title: 'Balcony sliding door roller failure', description: 'Glass slider no longer closes smoothly, creating a weather and security risk.', category: 'Glazing' },
  { title: 'Rising damp in second bedroom', description: 'Recurring damp patch behind built-in cupboards following the last heavy rain.', category: 'Waterproofing' },
  { title: 'Common-area garden irrigation leak', description: 'Sprinkler line running continuously near parking bays, causing unnecessary water loss.', category: 'Landscaping' },
  { title: 'Pest treatment required', description: 'Tenant reported recurring cockroach activity in the kitchen despite over-the-counter treatment.', category: 'Pest Control' },
  { title: 'Bedroom repaint after leak repair', description: 'Wall was patched after a leak and needs repainting to restore the room.', category: 'Painting' },
  { title: 'Lift service follow-up noise complaint', description: 'Residents reported unusual lift noise during upward travel in the evenings.', category: 'Lifts' },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(260424);

function random() {
  return rng();
}

function intBetween(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[intBetween(0, items.length - 1)];
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

// Retries a DB operation on transient Prisma/Neon errors.
// P2028 = "Transaction already closed" — happens on high-latency links
// when implicit transactions time out mid-nested-write.
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.code;
      const retriable = code === 'P2028' || code === 'P1001' || code === 'P1017' || code === 'ECONNREFUSED';
      if (!retriable || i === attempts) break;
      const delay = 500 * i;
      console.log(`  [retry ${i}/${attempts - 1}] ${label} hit ${code}, backoff ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number, day = date.getUTCDate()) {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const maxDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, maxDay));
  return base;
}

function cityMultiplier(city: string) {
  switch (city) {
    case 'Cape Town':
    case 'Stellenbosch':
      return 1.14;
    case 'Johannesburg':
      return 1.08;
    case 'Midrand':
    case 'Centurion':
    case 'Pretoria':
      return 1.02;
    case 'Durban':
      return 1.05;
    case 'Paarl':
    case 'George':
      return 0.96;
    case 'Gqeberha':
    case 'Bloemfontein':
      return 0.92;
    default:
      return 1;
  }
}

function baseRentFor(spec: PropertySeed, bedrooms: number, ordinal: number) {
  const kindBase =
    spec.kind === 'APARTMENT'
      ? 720000
      : spec.kind === 'TOWNHOUSE'
        ? 980000
        : spec.kind === 'ESTATE'
          ? 1120000
          : 840000;
  const bedroomPremium = bedrooms * 165000;
  const sizeDrift = (ordinal % 4) * 35000 + intBetween(-45000, 55000);
  const rent = Math.round((kindBase + bedroomPremium + sizeDrift) * cityMultiplier(spec.city));
  return Math.max(590000, rent);
}

function depositForRent(rentAmountCents: number, spec: PropertySeed) {
  const factor = spec.kind === 'ESTATE' ? 1.25 : spec.kind === 'APARTMENT' ? 1.0 : 1.1;
  return Math.round(rentAmountCents * factor);
}

function phoneFor(index: number) {
  return `+27 82 ${String(7000000 + index).slice(-7, -4)} ${String(7000000 + index).slice(-4)}`.replace(/ /g, '');
}

function idNumberFor(index: number) {
  return `9001015${String(100000 + index).slice(-6)}`;
}

function unitLabel(spec: PropertySeed, ordinal: number) {
  if (spec.kind === 'APARTMENT') {
    const floor = Math.floor((ordinal - 1) / 4) + 1;
    const number = ((ordinal - 1) % 4) + 1;
    return `Flat ${floor}${String(number).padStart(2, '0')}`;
  }
  if (spec.kind === 'TOWNHOUSE') {
    return `Unit ${ordinal}`;
  }
  if (spec.kind === 'ESTATE') {
    return `House ${ordinal}`;
  }
  return `Cottage ${ordinal}`;
}

function bedroomCount(spec: PropertySeed, ordinal: number) {
  if (spec.kind === 'APARTMENT') {
    return ordinal % 5 === 0 ? 2 : ordinal % 3 === 0 ? 1 : 1;
  }
  if (spec.kind === 'TOWNHOUSE') {
    return ordinal % 4 === 0 ? 3 : 2;
  }
  if (spec.kind === 'ESTATE') {
    return ordinal % 3 === 0 ? 4 : 3;
  }
  return ordinal % 2 === 0 ? 2 : 1;
}

function bathroomCount(spec: PropertySeed, bedrooms: number) {
  if (spec.kind === 'APARTMENT') {
    return bedrooms >= 2 ? 2 : 1;
  }
  if (spec.kind === 'ESTATE') {
    return bedrooms >= 4 ? 3 : 2;
  }
  return bedrooms >= 3 ? 2 : 1;
}

function sizeSqmFor(spec: PropertySeed, bedrooms: number, ordinal: number) {
  const base =
    spec.kind === 'APARTMENT'
      ? 38
      : spec.kind === 'TOWNHOUSE'
        ? 74
        : spec.kind === 'ESTATE'
          ? 118
          : 52;
  return base + bedrooms * 16 + (ordinal % 4) * 3;
}

function paymentProfileFor(index: number): PaymentProfile {
  if (index % 9 === 0) return 'DEBICHECK';
  if (index % 17 === 0) return 'CHRONIC';
  if (index % 11 === 0) return 'PARTIAL';
  if (index % 7 === 0) return 'LATE';
  return 'STABLE';
}

function scenarioForUnit(spec: PropertySeed, propertyIndex: number, ordinal: number) {
  const vacancyCount =
    (spec.units >= 9 ? 1 : 0) +
    (spec.units >= 6 && propertyIndex % 4 === 0 ? 1 : 0) +
    (spec.units <= 5 && propertyIndex % 5 === 0 ? 1 : 0);

  if (propertyIndex === 7 && ordinal === 3) return 'THANDI';
  if (propertyIndex === 1 && ordinal === spec.units) return 'DANIEL';
  if (propertyIndex % 14 === 0 && ordinal === 1) return 'RENEWED';
  if (propertyIndex % 13 === 0 && ordinal === 2) return 'TERMINATED';
  if (propertyIndex % 11 === 0 && ordinal === 3) return 'EXPIRED';
  if (propertyIndex % 6 === 0 && ordinal === spec.units) return 'UPCOMING';
  if (propertyIndex % 9 === 0 && ordinal === Math.max(1, spec.units - 1)) return 'DRAFT';
  if (ordinal > spec.units - vacancyCount) return 'VACANT';
  return 'ACTIVE';
}

function invoicePeriods() {
  const thisMonth = startOfMonth(SEED_REFERENCE_DATE);
  return [addMonths(thisMonth, -2, 1), addMonths(thisMonth, -1, 1), thisMonth];
}

function dueDateFor(periodStart: Date, dueDay: number) {
  return addDays(new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), dueDay)), 0);
}

function leaseCoversPeriod(lease: LeaseContext['lease'], periodStart: Date) {
  const periodEnd = addDays(addMonths(periodStart, 1, 1), -1);
  return lease.startDate <= periodEnd && lease.endDate >= periodStart && lease.state !== LeaseState.DRAFT;
}

function utilityUsage(kind: UtilityType, bedrooms: number, periodIndex: number, spike = false) {
  const base =
    kind === UtilityType.ELECTRICITY
      ? 230 + bedrooms * 55 + periodIndex * 18
      : 12 + bedrooms * 4 + periodIndex * 1.7;
  return spike ? base * 1.65 : base;
}

function tieredTariffJson(type: UtilityType) {
  if (type === UtilityType.ELECTRICITY) {
    return [
      { upto: 350, rateCents: 265 },
      { upto: 650, rateCents: 305 },
      { rateCents: 345 },
    ];
  }
  return [
    { upto: 20, rateCents: 2450 },
    { upto: 35, rateCents: 2950 },
    { rateCents: 3450 },
  ];
}

function buildAllocations(
  lineItems: { id: string; amountCents: number }[],
  amountCents: number,
) {
  let remaining = amountCents;
  const allocations: Array<{
    target: AllocationTarget;
    invoiceLineItemId?: string;
    amountCents: number;
  }> = [];

  for (const lineItem of lineItems) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, lineItem.amountCents);
    allocations.push({
      target: AllocationTarget.INVOICE_LINE_ITEM,
      invoiceLineItemId: lineItem.id,
      amountCents: applied,
    });
    remaining -= applied;
  }

  if (remaining > 0) {
    allocations.push({
      target: AllocationTarget.UNAPPLIED,
      amountCents: remaining,
    });
  }

  return allocations;
}

function chooseReceiptSource(profile: PaymentProfile, invoiceIndex: number): ReceiptSource {
  if (profile === 'DEBICHECK') return ReceiptSource.DEBICHECK;
  if (invoiceIndex === 2 && random() < 0.08) return ReceiptSource.STITCH;
  return ReceiptSource.CSV_IMPORT;
}

function choosePaymentMethod(source: ReceiptSource): PaymentMethod {
  if (source === ReceiptSource.STITCH) return PaymentMethod.CARD_MANUAL;
  return PaymentMethod.EFT;
}

function bump(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

async function wipeDemoOrg(orgId: string) {
  await db.noticeDelivery.deleteMany({ where: { notice: { orgId } } });
  await db.notificationDelivery.deleteMany({ where: { notification: { orgId } } });
  await db.usageAlertEvent.deleteMany({ where: { orgId } });
  await db.usageAlertRule.deleteMany({ where: { orgId } });
  await db.loadSheddingOutage.deleteMany({ where: { orgId } });
  await db.agentMonthlySnapshot.deleteMany({ where: { orgId } });
  await db.landlordMonthlySnapshot.deleteMany({ where: { orgId } });
  await db.propertyMonthlySnapshot.deleteMany({ where: { orgId } });
  await db.orgMonthlySnapshot.deleteMany({ where: { orgId } });
  await db.depositSettlement.deleteMany({ where: { case: { orgId } } });
  await db.moveOutCharge.deleteMany({ where: { case: { orgId } } });
  await db.offboardingTask.deleteMany({ where: { case: { orgId } } });
  await db.offboardingCase.deleteMany({ where: { orgId } });
  await db.inspectionSignature.deleteMany({ where: { inspection: { orgId } } });
  await db.inspectionPhoto.deleteMany({ where: { item: { area: { inspection: { orgId } } } } });
  await db.inspectionItem.deleteMany({ where: { area: { inspection: { orgId } } } });
  await db.inspectionArea.deleteMany({ where: { inspection: { orgId } } });
  await db.inspection.deleteMany({ where: { orgId } });
  await db.maintenanceWorklog.deleteMany({ where: { request: { orgId } } });
  await db.maintenanceQuote.deleteMany({ where: { request: { orgId } } });
  await db.maintenanceRequest.deleteMany({ where: { orgId } });
  await db.allocation.deleteMany({ where: { receipt: { orgId } } });
  await db.paymentReceipt.deleteMany({ where: { orgId } });
  await db.invoiceLineItem.deleteMany({ where: { invoice: { orgId } } });
  await db.invoice.deleteMany({ where: { orgId } });
  await db.billingRun.deleteMany({ where: { orgId } });
  await db.meterReading.deleteMany({ where: { meter: { orgId } } });
  await db.meter.deleteMany({ where: { orgId } });
  await db.utilityTariff.deleteMany({ where: { orgId } });
  await db.leaseSignature.deleteMany({ where: { lease: { orgId } } });
  await db.leaseReviewRequest.deleteMany({ where: { lease: { orgId } } });
  await db.debiCheckMandate.deleteMany({ where: { orgId } });
  await db.trustLedgerEntry.deleteMany({ where: { trustAccount: { orgId } } });
  await db.trustAccount.deleteMany({ where: { orgId } });
  await db.statementLine.deleteMany({ where: { statement: { orgId } } });
  await db.statement.deleteMany({ where: { orgId } });
  await db.applicationNote.deleteMany({ where: { application: { orgId } } });
  await db.applicationDocument.deleteMany({ where: { application: { orgId } } });
  await db.tpnCheck.deleteMany({ where: { application: { orgId } } });
  await db.application.deleteMany({ where: { orgId } });
  await db.applicant.deleteMany({ where: { orgId } });
  await db.notification.deleteMany({ where: { orgId } });
  await db.areaNotice.deleteMany({ where: { orgId } });
  await db.approval.deleteMany({ where: { orgId } });
  await db.vendor.deleteMany({ where: { orgId } });
  await db.auditLog.deleteMany({ where: { orgId } });
  await db.document.deleteMany({ where: { orgId } });
  await db.leaseTenant.deleteMany({ where: { lease: { orgId } } });
  await db.lease.deleteMany({ where: { orgId } });
  await db.tenant.deleteMany({ where: { orgId } });
  await db.unit.deleteMany({ where: { orgId } });
  await db.property.deleteMany({ where: { orgId } });
  await db.orgFeature.deleteMany({ where: { orgId } });
  await db.orgIntegration.deleteMany({ where: { orgId } });
  await db.user.deleteMany({ where: { orgId } });
  await db.managingAgent.deleteMany({ where: { orgId } });
  await db.landlord.deleteMany({ where: { orgId } });
  await db.org.delete({ where: { id: orgId } });
}

async function createStatement(
  orgId: string,
  type: StatementType,
  subjectType: string,
  subjectId: string,
  periodStart: Date,
  periodEnd: Date,
  openingBalanceCents: number,
  lines: StatementLineSeed[],
  storageKey?: string,
) {
  let runningBalance = openingBalanceCents;
  const linesWithBalance = lines.map((line) => {
    runningBalance += (line.debitCents ?? 0) - (line.creditCents ?? 0);
    return {
      occurredAt: line.occurredAt,
      description: line.description,
      debitCents: line.debitCents ?? 0,
      creditCents: line.creditCents ?? 0,
      runningBalanceCents: runningBalance,
      sourceType: line.sourceType,
      sourceId: line.sourceId,
    };
  });

  return db.statement.create({
    data: {
      orgId,
      type,
      subjectType,
      subjectId,
      periodStart,
      periodEnd,
      openingBalanceCents,
      closingBalanceCents: runningBalance,
      totalsJson: {
        debitsCents: lines.reduce((sum, line) => sum + (line.debitCents ?? 0), 0),
        creditsCents: lines.reduce((sum, line) => sum + (line.creditCents ?? 0), 0),
      },
      storageKey,
      lines: {
        create: linesWithBalance,
      },
    },
  });
}

async function main() {
  const existing = await db.org.findUnique({ where: { slug: ORG_SLUG } });
  if (existing) {
    await wipeDemoOrg(existing.id);
  }

  const org = await db.org.create({
    data: {
      name: 'Acme Property Co',
      slug: ORG_SLUG,
      expiringWindowDays: 60,
      landlordApprovalThresholdCents: 500000,
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.orgFeature.createMany({
    data: Object.values(FeatureFlagKey).map((key) => ({
      orgId: org.id,
      key,
      enabled: true,
    })),
  });

  await db.user.createMany({
    data: [
      { email: 'admin@acme.test', name: 'Alice Admin', role: Role.ADMIN, orgId: org.id, passwordHash, smsOptIn: true },
      { email: 'pm@acme.test', name: 'Priya Manager', role: Role.PROPERTY_MANAGER, orgId: org.id, passwordHash, smsOptIn: true },
      { email: 'finance@acme.test', name: 'Frank Finance', role: Role.FINANCE, orgId: org.id, passwordHash },
      { email: 'tenant@acme.test', name: 'Thandi Tenant', role: Role.TENANT, orgId: org.id, passwordHash, smsOptIn: true },
      { email: 'tenant2@acme.test', name: 'Daniel Newman', role: Role.TENANT, orgId: org.id, passwordHash },
    ],
  });

  const adminUser = await db.user.findUniqueOrThrow({ where: { email: 'admin@acme.test' } });
  const pmUser = await db.user.findUniqueOrThrow({ where: { email: 'pm@acme.test' } });
  const financeUser = await db.user.findUniqueOrThrow({ where: { email: 'finance@acme.test' } });
  const tenantUser = await db.user.findUniqueOrThrow({ where: { email: 'tenant@acme.test' } });
  const tenant2User = await db.user.findUniqueOrThrow({ where: { email: 'tenant2@acme.test' } });

  const landlords = [];
  for (const landlordSeed of LANDLORD_SEEDS) {
    landlords.push(
      await db.landlord.create({
        data: {
          orgId: org.id,
          name: landlordSeed.name,
          email: landlordSeed.email,
          phone: landlordSeed.phone,
          vatNumber: landlordSeed.vatNumber,
          notes: landlordSeed.notes,
        },
      }),
    );
  }

  const managingAgents = [];
  for (const agentSeed of MANAGING_AGENT_SEEDS) {
    managingAgents.push(
      await db.managingAgent.create({
        data: {
          orgId: org.id,
          name: agentSeed.name,
          email: agentSeed.email,
          phone: agentSeed.phone,
          notes: agentSeed.notes,
        },
      }),
    );
  }

  for (const landlord of landlords) {
    await db.user.create({
      data: {
        email: LANDLORD_SEEDS[landlords.indexOf(landlord)]!.email,
        name: landlord.name,
        role: Role.LANDLORD,
        orgId: org.id,
        landlordId: landlord.id,
        passwordHash,
      },
    });
  }

  for (const agent of managingAgents) {
    const seed = MANAGING_AGENT_SEEDS[managingAgents.indexOf(agent)]!;
    await db.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        role: Role.MANAGING_AGENT,
        orgId: org.id,
        managingAgentId: agent.id,
        passwordHash,
        smsOptIn: true,
      },
    });
  }

  const vendors = [];
  for (const vendorSeed of VENDOR_SEEDS) {
    vendors.push(
      await db.vendor.create({
        data: {
          orgId: org.id,
          name: vendorSeed.name,
          contactName: vendorSeed.contactName,
          contactEmail: vendorSeed.contactEmail,
          contactPhone: vendorSeed.contactPhone,
          categories: vendorSeed.categories,
        },
      }),
    );
  }

  const trustAccountByLandlord = new Map<string, Awaited<ReturnType<typeof db.trustAccount.create>>>();
  for (const landlord of landlords) {
    const trustAccount = await db.trustAccount.create({
      data: {
        orgId: org.id,
        landlordId: landlord.id,
        name: `${landlord.name} Trust Account`,
        bankRef: `TRUST-${landlord.name.slice(0, 4).toUpperCase()}`,
        openedAt: addMonths(SEED_REFERENCE_DATE, -18, 1),
      },
    });
    trustAccountByLandlord.set(landlord.id, trustAccount);
  }

  const propertyContexts: Array<{
    property: Awaited<ReturnType<typeof db.property.create>>;
    spec: PropertySeed;
    units: UnitContext[];
  }> = [];

  for (const spec of PROPERTY_SEEDS) {
    const propertyIndex = PROPERTY_SEEDS.indexOf(spec);
    const landlord = landlords[propertyIndex % landlords.length]!;
    const assignedAgent = managingAgents[propertyIndex % managingAgents.length]!;

    const property = await db.property.create({
      data: {
        orgId: org.id,
        landlordId: landlord.id,
        assignedAgentId: assignedAgent.id,
        name: spec.name,
        addressLine1: spec.addressLine1,
        suburb: spec.suburb,
        city: spec.city,
        province: spec.province,
        postalCode: spec.postalCode,
        eskomAreaCode: spec.eskomAreaCode,
        notes:
          spec.kind === 'APARTMENT'
            ? 'Multi-unit residential block with shared common areas and utility oversight.'
            : spec.kind === 'TOWNHOUSE'
              ? 'Sectional-title style complex with mixed family occupancy.'
              : spec.kind === 'ESTATE'
                ? 'Freehold cluster or estate stock with larger homes and higher deposits.'
                : 'Smaller suburban cottages suited to young professionals and couples.',
      },
    });

    const units: UnitContext[] = [];
    for (let ordinal = 1; ordinal <= spec.units; ordinal++) {
      const bedrooms = bedroomCount(spec, ordinal);
      const unit = await db.unit.create({
        data: {
          orgId: org.id,
          propertyId: property.id,
          label: unitLabel(spec, ordinal),
          bedrooms,
          bathrooms: bathroomCount(spec, bedrooms),
          sizeSqm: sizeSqmFor(spec, bedrooms, ordinal),
          notes:
            spec.kind === 'APARTMENT'
              ? 'Sub-metered utilities where installed; common-area maintenance handled by PM team.'
              : null,
        },
      });
      units.push({
        property,
        spec,
        index: propertyIndex + 1,
        ordinal,
        unit,
      });
    }

    propertyContexts.push({ property, spec, units });
  }

  let tenantCounter = 0;
  async function createTenant(
    overrides?: Partial<
      Pick<
        Prisma.TenantUncheckedCreateInput,
        'firstName' | 'lastName' | 'email' | 'phone' | 'idNumber' | 'notes' | 'userId' | 'archivedAt'
      >
    >,
  ) {
    const firstName = FIRST_NAMES[tenantCounter % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[Math.floor(tenantCounter / 2) % LAST_NAMES.length]!;
    const emailSlug = `${firstName}.${lastName}.${tenantCounter}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const tenant = await db.tenant.create({
      data: {
        orgId: org.id,
        firstName,
        lastName,
        email: `${emailSlug}@residents.acme.test`,
        phone: phoneFor(tenantCounter),
        idNumber: idNumberFor(tenantCounter),
        notes: tenantCounter % 19 === 0 ? 'Prefers WhatsApp updates for maintenance scheduling.' : null,
        ...overrides,
      },
    });
    tenantCounter += 1;
    return tenant;
  }

  const leaseContexts: LeaseContext[] = [];
  const currentOccupiedLeaseContexts: LeaseContext[] = [];
  const vacantUnits: UnitContext[] = [];
  const draftLeaseContexts: LeaseContext[] = [];
  const upcomingLeaseContexts: LeaseContext[] = [];
  const terminatedLeaseContexts: LeaseContext[] = [];
  const meterMap = new Map<string, MeterContext>();
  const depositLedgerByLandlord = new Map<string, number>();
  const receiptLedgerByLandlord = new Map<string, number>();
  const disbursementLedgerByLandlord = new Map<string, number>();
  const maintenanceLedgerByLandlord = new Map<string, number>();

  for (const propertyContext of propertyContexts) {
    for (const unitContext of propertyContext.units) {
      const scenario = scenarioForUnit(propertyContext.spec, unitContext.index, unitContext.ordinal);
      if (scenario === 'VACANT') {
        vacantUnits.push(unitContext);
        continue;
      }

      const propertyIndex = unitContext.index;
      const rentAmountCents = baseRentFor(
        propertyContext.spec,
        unitContext.unit.bedrooms,
        unitContext.ordinal,
      );
      const depositAmountCents = depositForRent(rentAmountCents, propertyContext.spec);
      const paymentDueDay = unitContext.ordinal % 3 === 0 ? 3 : 1;
      const paymentProfile = paymentProfileFor(propertyIndex + unitContext.ordinal);
      const landlordId = propertyContext.property.landlordId!;
      const assignedAgentId = propertyContext.property.assignedAgentId;
      let lease: Awaited<ReturnType<typeof db.lease.create>>;
      let tenants: Awaited<ReturnType<typeof db.tenant.create>>[];
      let primaryTenant: Awaited<ReturnType<typeof db.tenant.create>>;
      let currentOccupancy = false;
      let expiringSoon = false;

      if (scenario === 'THANDI') {
        const thandi = await db.tenant.create({
          data: {
            orgId: org.id,
            firstName: 'Thandi',
            lastName: 'Tenant',
            email: 'tenant@acme.test',
            phone: '+27825550100',
            idNumber: '9001015009087',
            userId: tenantUser.id,
            notes: 'Demo tenant for portal walkthrough and statement testing.',
          },
        });
        tenants = [thandi];
        primaryTenant = thandi;
        const startDate = addMonths(SEED_REFERENCE_DATE, -10, 1);
        const endDate = addDays(SEED_REFERENCE_DATE, 42);
        expiringSoon = true;
        currentOccupancy = true;
        lease = await db.lease.create({
          data: {
            orgId: org.id,
            unitId: unitContext.unit.id,
            startDate,
            endDate,
            rentAmountCents,
            depositAmountCents,
            depositReceivedAt: addDays(startDate, -3),
            heldInTrustAccount: true,
            paymentDueDay,
            state: LeaseState.ACTIVE,
            selfManagedDebitOrderActive: true,
            notes: 'Demo tenant lease for the tenant portal, renewals, payments, and statements walkthrough.',
            tenants: {
              create: [{ tenantId: thandi.id, isPrimary: true }],
            },
          },
        });
      } else if (scenario === 'DANIEL') {
        const daniel = await db.tenant.create({
          data: {
            orgId: org.id,
            firstName: 'Daniel',
            lastName: 'Newman',
            email: 'tenant2@acme.test',
            phone: '+27825550101',
            idNumber: '9202025019088',
            userId: tenant2User.id,
            notes: 'Demo draft lease awaiting signature and clause clarification.',
          },
        });
        tenants = [daniel];
        primaryTenant = daniel;
        lease = await db.lease.create({
          data: {
            orgId: org.id,
            unitId: unitContext.unit.id,
            startDate: addMonths(SEED_REFERENCE_DATE, 1, 1),
            endDate: addMonths(SEED_REFERENCE_DATE, 13, 1),
            rentAmountCents: rentAmountCents - 45000,
            depositAmountCents: depositAmountCents - 45000,
            heldInTrustAccount: true,
            paymentDueDay: 1,
            state: LeaseState.DRAFT,
            notes: 'Pending tenant signature after move-in inspection scheduling and clause review.',
            tenants: {
              create: [{ tenantId: daniel.id, isPrimary: true }],
            },
          },
        });
      } else if (scenario === 'RENEWED') {
        const predecessorTenant = await createTenant();
        tenants = [predecessorTenant];
        primaryTenant = predecessorTenant;
        const oldStart = addMonths(SEED_REFERENCE_DATE, -23, 1);
        const oldEnd = addMonths(SEED_REFERENCE_DATE, -1, 20);
        const predecessor = await db.lease.create({
          data: {
            orgId: org.id,
            unitId: unitContext.unit.id,
            startDate: oldStart,
            endDate: oldEnd,
            rentAmountCents: rentAmountCents - 85000,
            depositAmountCents: Math.round((rentAmountCents - 85000) * 1.05),
            depositReceivedAt: addDays(oldStart, -4),
            heldInTrustAccount: true,
            paymentDueDay,
            state: LeaseState.RENEWED,
            notes: 'Historical lease retained to demonstrate renewals.',
            tenants: {
              create: [{ tenantId: predecessorTenant.id, isPrimary: true }],
            },
          },
        });
        lease = await db.lease.create({
          data: {
            orgId: org.id,
            unitId: unitContext.unit.id,
            startDate: addDays(oldEnd, 1),
            endDate: addMonths(addDays(oldEnd, 1), 12, addDays(oldEnd, 1).getUTCDate()),
            rentAmountCents,
            depositAmountCents,
            depositReceivedAt: addDays(addDays(oldEnd, 1), -5),
            heldInTrustAccount: true,
            paymentDueDay,
            state: LeaseState.ACTIVE,
            renewedFromId: predecessor.id,
            notes: 'Renewed at market uplift after a retention negotiation.',
            tenants: {
              create: [{ tenantId: predecessorTenant.id, isPrimary: true }],
            },
          },
        });
        currentOccupancy = true;
      } else {
        const householdSize =
          propertyContext.spec.kind !== 'APARTMENT' && unitContext.unit.bedrooms >= 2 && random() < 0.12
            ? 2
            : 1;
        tenants = [];
        for (let i = 0; i < householdSize; i++) {
          tenants.push(await createTenant());
        }
        primaryTenant = tenants[0]!;

        if (scenario === 'ACTIVE') {
          const startDate = addMonths(SEED_REFERENCE_DATE, -intBetween(3, 20), intBetween(1, 4));
          let endDate = addMonths(startDate, intBetween(12, 24), startDate.getUTCDate());
          if ((propertyIndex + unitContext.ordinal) % 16 === 0) {
            endDate = addDays(SEED_REFERENCE_DATE, intBetween(18, 55));
            expiringSoon = true;
          }
          currentOccupancy = true;
          lease = await db.lease.create({
            data: {
              orgId: org.id,
              unitId: unitContext.unit.id,
              startDate,
              endDate,
              rentAmountCents,
              depositAmountCents,
              depositReceivedAt: addDays(startDate, -intBetween(2, 8)),
              heldInTrustAccount: true,
              paymentDueDay,
              state: LeaseState.ACTIVE,
              selfManagedDebitOrderActive: paymentProfile === 'DEBICHECK',
              notes:
                householdSize === 2
                  ? 'Joint household with both adult occupants listed on lease.'
                  : propertyIndex % 10 === 0
                    ? 'Longer-term tenant with excellent maintenance history.'
                    : null,
              tenants: {
                create: tenants.map((tenant, index) => ({
                  tenantId: tenant.id,
                  isPrimary: index === 0,
                })),
              },
            },
          });
        } else if (scenario === 'UPCOMING') {
          lease = await db.lease.create({
            data: {
              orgId: org.id,
              unitId: unitContext.unit.id,
              startDate: addDays(SEED_REFERENCE_DATE, intBetween(7, 32)),
              endDate: addMonths(addDays(SEED_REFERENCE_DATE, intBetween(7, 32)), 12, 1),
              rentAmountCents,
              depositAmountCents,
              heldInTrustAccount: true,
              paymentDueDay,
              state: LeaseState.ACTIVE,
              notes: 'Approved applicant awaiting move-in; first rent invoice not yet issued.',
              tenants: {
                create: tenants.map((tenant, index) => ({
                  tenantId: tenant.id,
                  isPrimary: index === 0,
                })),
              },
            },
          });
        } else if (scenario === 'DRAFT') {
          lease = await db.lease.create({
            data: {
              orgId: org.id,
              unitId: unitContext.unit.id,
              startDate: addDays(SEED_REFERENCE_DATE, intBetween(10, 40)),
              endDate: addMonths(addDays(SEED_REFERENCE_DATE, intBetween(10, 40)), 12, 1),
              rentAmountCents,
              depositAmountCents,
              heldInTrustAccount: true,
              paymentDueDay,
              state: LeaseState.DRAFT,
              notes: 'Draft lease pending internal vetting close-out.',
              tenants: {
                create: tenants.map((tenant, index) => ({
                  tenantId: tenant.id,
                  isPrimary: index === 0,
                })),
              },
            },
          });
        } else if (scenario === 'EXPIRED') {
          lease = await db.lease.create({
            data: {
              orgId: org.id,
              unitId: unitContext.unit.id,
              startDate: addMonths(SEED_REFERENCE_DATE, -13, 1),
              endDate: addDays(SEED_REFERENCE_DATE, -intBetween(8, 40)),
              rentAmountCents: rentAmountCents - 40000,
              depositAmountCents: depositAmountCents - 40000,
              depositReceivedAt: addMonths(SEED_REFERENCE_DATE, -13, 1),
              heldInTrustAccount: true,
              paymentDueDay,
              state: LeaseState.ACTIVE,
              notes: 'Lease has passed end date and is awaiting formal renewal or notice workflow.',
              tenants: {
                create: tenants.map((tenant, index) => ({
                  tenantId: tenant.id,
                  isPrimary: index === 0,
                })),
              },
            },
          });
        } else {
          const startDate = addMonths(SEED_REFERENCE_DATE, -15, 1);
          const endDate = addDays(SEED_REFERENCE_DATE, -intBetween(25, 75));
          lease = await db.lease.create({
            data: {
              orgId: org.id,
              unitId: unitContext.unit.id,
              startDate,
              endDate,
              rentAmountCents: rentAmountCents - 65000,
              depositAmountCents: depositAmountCents - 65000,
              depositReceivedAt: addDays(startDate, -6),
              heldInTrustAccount: true,
              paymentDueDay,
              state: LeaseState.TERMINATED,
              terminatedAt: addDays(endDate, 2),
              terminatedReason: 'Tenant relocated closer to work.',
              notes: 'Historical termination retained to demo offboarding and deposit settlement.',
              tenants: {
                create: tenants.map((tenant, index) => ({
                  tenantId: tenant.id,
                  isPrimary: index === 0,
                })),
              },
            },
          });
        }
      }

      const context: LeaseContext = {
        lease,
        property: propertyContext.property,
        spec: propertyContext.spec,
        unit: unitContext.unit,
        tenants,
        primaryTenant,
        landlordId,
        assignedAgentId,
        scenario:
          scenario === 'THANDI'
            ? 'ACTIVE'
            : scenario === 'DANIEL'
              ? 'DRAFT'
              : scenario,
        paymentProfile:
          scenario === 'THANDI'
            ? 'DEBICHECK'
            : scenario === 'DANIEL'
              ? 'STABLE'
              : paymentProfile,
        currentOccupancy,
        expiringSoon,
      };

      leaseContexts.push(context);
      if (currentOccupancy) currentOccupiedLeaseContexts.push(context);
      if (context.scenario === 'DRAFT') draftLeaseContexts.push(context);
      if (context.scenario === 'UPCOMING') upcomingLeaseContexts.push(context);
      if (context.scenario === 'TERMINATED') terminatedLeaseContexts.push(context);

      if (lease.depositReceivedAt) {
        const trustAccount = trustAccountByLandlord.get(landlordId)!;
        await db.trustLedgerEntry.create({
          data: {
            trustAccountId: trustAccount.id,
            landlordId,
            tenantId: primaryTenant.id,
            leaseId: lease.id,
            occurredAt: lease.depositReceivedAt,
            type: LedgerEntryType.DEPOSIT_IN,
            amountCents: lease.depositAmountCents,
            sourceType: 'seed.deposit',
            sourceId: lease.id,
            note: 'Security deposit received into trust.',
          },
        });
        bump(depositLedgerByLandlord, landlordId, lease.depositAmountCents);
      }

      if (context.paymentProfile === 'DEBICHECK' && context.scenario === 'ACTIVE' && currentOccupancy) {
        await db.debiCheckMandate.create({
          data: {
            orgId: org.id,
            leaseId: lease.id,
            tenantId: primaryTenant.id,
            mandateExternalId: `mandate-${lease.id.slice(-8)}`,
            upperCapCents: Math.round(lease.rentAmountCents * 1.25),
            status: DebiCheckMandateStatus.ACTIVE,
            signedAt: addDays(lease.startDate, -2),
          },
        });
      }
    }
  }

  const documentLeaseIds = [
    leaseContexts.find((context) => context.primaryTenant.userId === tenantUser.id)?.lease.id,
    leaseContexts.find((context) => context.primaryTenant.userId === tenant2User.id)?.lease.id,
    currentOccupiedLeaseContexts[0]?.lease.id,
    currentOccupiedLeaseContexts[1]?.lease.id,
  ].filter((value): value is string => Boolean(value));

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    for (const leaseId of documentLeaseIds) {
      const dummy = new File(
        [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
        `agreement-${leaseId}.pdf`,
        { type: 'application/pdf' },
      );
      const result = await put(`orgs/${org.id}/leases/${leaseId}/${dummy.name}`, dummy, {
        access: 'public',
        addRandomSuffix: true,
      });
      await db.document.create({
        data: {
          orgId: org.id,
          kind: DocumentKind.LEASE_AGREEMENT,
          leaseId,
          filename: dummy.name,
          mimeType: 'application/pdf',
          sizeBytes: 4,
          storageKey: result.pathname,
          checksum: `seed-${leaseId.slice(-6)}`,
          encryptionNote: 'provider-default',
          uploadedById: adminUser.id,
        },
      });
    }
  } else {
    console.warn('BLOB_READ_WRITE_TOKEN not set - skipping seeded blob uploads');
  }

  const thandiLease = leaseContexts.find((context) => context.primaryTenant.userId === tenantUser.id);
  if (!thandiLease) {
    throw new Error('Expected Thandi demo lease to exist.');
  }
  const danielLease = leaseContexts.find((context) => context.primaryTenant.userId === tenant2User.id);
  if (!danielLease) {
    throw new Error('Expected Daniel demo draft lease to exist.');
  }

  await db.leaseSignature.create({
    data: {
      leaseId: thandiLease.lease.id,
      tenantId: thandiLease.primaryTenant.id,
      signedName: 'Thandi Tenant',
      signedAt: addMonths(SEED_REFERENCE_DATE, -10, 2),
      ipAddress: '105.18.22.44',
      userAgent: 'Seeded Mobile Safari',
      latitude: -33.9369,
      longitude: 18.4683,
      locationText: 'Rondebosch, Cape Town',
    },
  });

  const signedJointLease = currentOccupiedLeaseContexts.find((context) => context.tenants.length > 1);
  if (signedJointLease) {
    for (const tenant of signedJointLease.tenants) {
      await db.leaseSignature.create({
        data: {
          leaseId: signedJointLease.lease.id,
          tenantId: tenant.id,
          signedName: `${tenant.firstName} ${tenant.lastName}`,
          signedAt: addDays(signedJointLease.lease.startDate, -2),
          ipAddress: '197.210.33.88',
          userAgent: 'Seeded Chrome',
          locationText: `${signedJointLease.property.suburb}, ${signedJointLease.property.city}`,
        },
      });
    }
  }

  await db.leaseReviewRequest.create({
    data: {
      leaseId: danielLease.lease.id,
      tenantId: danielLease.primaryTenant.id,
      clauseExcerpt: 'Clause 6.2 - professional carpet cleaning at exit.',
      tenantNote: 'Please clarify whether this still applies if the flooring is vinyl rather than carpet.',
      status: 'OPEN',
    },
  });

  const resolvedReviewLease = draftLeaseContexts.find((context) => context.lease.id !== danielLease.lease.id);
  if (resolvedReviewLease) {
    await db.leaseReviewRequest.create({
      data: {
        leaseId: resolvedReviewLease.lease.id,
        tenantId: resolvedReviewLease.primaryTenant.id,
        clauseExcerpt: 'Clause 8.1 - utility back-billing for estimated reads.',
        tenantNote: 'Requested confirmation that estimated reads will be adjusted at the next actual reading.',
        pmResponse: 'Confirmed. Any estimate is trued up against the following actual meter read.',
        status: 'RESOLVED',
        respondedAt: addDays(SEED_REFERENCE_DATE, -5),
      },
    });
  }

  await db.utilityTariff.createMany({
    data: [
      {
        orgId: org.id,
        type: UtilityType.ELECTRICITY,
        structure: TariffStructure.TIERED,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        tieredJson: tieredTariffJson(UtilityType.ELECTRICITY),
      },
      {
        orgId: org.id,
        type: UtilityType.WATER,
        structure: TariffStructure.TIERED,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        tieredJson: tieredTariffJson(UtilityType.WATER),
      },
      {
        orgId: org.id,
        type: UtilityType.REFUSE,
        structure: TariffStructure.FLAT,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        flatUnitRateCents: 18500,
      },
      {
        orgId: org.id,
        type: UtilityType.SEWER,
        structure: TariffStructure.FLAT,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        flatUnitRateCents: 14500,
      },
    ],
  });

  const premiumPropertyIds = propertyContexts
    .filter((context) => ['Umhlanga Ridge Apartments', 'Atlantic Terraces', 'Sandton Gate'].includes(context.property.name))
    .map((context) => context.property.id);

  for (const propertyId of premiumPropertyIds) {
    await db.utilityTariff.create({
      data: {
        orgId: org.id,
        propertyId,
        type: UtilityType.ELECTRICITY,
        structure: TariffStructure.FLAT,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        flatUnitRateCents: 328,
      },
    });
  }

  const meteredLeases = currentOccupiedLeaseContexts.filter((context, index) => {
    return context.spec.kind !== 'COTTAGE' && (index % 2 === 0 || context.spec.kind === 'APARTMENT');
  });

  for (const context of meteredLeases) {
    const meterContext: MeterContext = {};
    const shouldCreateWater = context.spec.kind !== 'ESTATE' || random() < 0.65;
    const shouldCreateElectricity = true;

    if (shouldCreateWater) {
      meterContext.water = await db.meter.create({
        data: {
          orgId: org.id,
          unitId: context.unit.id,
          type: UtilityType.WATER,
          serial: `WM-${context.unit.id.slice(-6).toUpperCase()}`,
          installedAt: addMonths(SEED_REFERENCE_DATE, -18, 1),
        },
      });
    }

    if (shouldCreateElectricity) {
      meterContext.electricity = await db.meter.create({
        data: {
          orgId: org.id,
          unitId: context.unit.id,
          type: UtilityType.ELECTRICITY,
          serial: `EM-${context.unit.id.slice(-6).toUpperCase()}`,
          installedAt: addMonths(SEED_REFERENCE_DATE, -18, 1),
        },
      });
    }

    meterMap.set(context.unit.id, meterContext);
  }

  const readingPeriods = [addMonths(startOfMonth(SEED_REFERENCE_DATE), -3, 1), addMonths(startOfMonth(SEED_REFERENCE_DATE), -2, 1), addMonths(startOfMonth(SEED_REFERENCE_DATE), -1, 1), startOfMonth(SEED_REFERENCE_DATE)];
  const spikeMeters = new Set(
    Array.from(meterMap.values())
      .flatMap((context) => [context.water?.id, context.electricity?.id].filter((value): value is string => Boolean(value)))
      .slice(0, 3),
  );

  // Batched: build all meter readings in memory, createMany once.
  const meterReadingsData: Prisma.MeterReadingCreateManyInput[] = [];
  for (const context of meteredLeases) {
    const meters = meterMap.get(context.unit.id);
    if (!meters) continue;

    for (const meter of [meters.water, meters.electricity].filter((value): value is NonNullable<typeof value> => Boolean(value))) {
      let cumulative = meter.type === UtilityType.ELECTRICITY ? intBetween(2400, 4100) : intBetween(120, 320);
      for (const periodStart of readingPeriods) {
        const isSpike = spikeMeters.has(meter.id) && periodStart.getTime() === startOfMonth(SEED_REFERENCE_DATE).getTime();
        cumulative += utilityUsage(
          meter.type,
          context.unit.bedrooms,
          readingPeriods.indexOf(periodStart),
          isSpike,
        );
        meterReadingsData.push({
          meterId: meter.id,
          takenAt: periodStart,
          readingValue: new Prisma.Decimal(cumulative.toFixed(2)),
          source: isSpike ? MeterReadingSource.ESTIMATED : MeterReadingSource.MANUAL,
          recordedById: pmUser.id,
        });
      }
    }
  }
  if (meterReadingsData.length) {
    await db.meterReading.createMany({ data: meterReadingsData });
  }

  const billingRunMap = new Map<string, Awaited<ReturnType<typeof db.billingRun.create>>>();
  for (const periodStart of invoicePeriods()) {
    const billingRun = await db.billingRun.create({
      data: {
        orgId: org.id,
        periodStart,
        status: 'PUBLISHED',
        createdById: financeUser.id,
        publishedAt: addDays(periodStart, 1),
        summary: {
          seeded: true,
          portfolioMonth: `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, '0')}`,
        },
      },
    });
    billingRunMap.set(periodStart.toISOString(), billingRun);
  }

  const receiptsByLandlordPeriod = new Map<string, number>();
  const invoiceOutstandingByProperty = new Map<string, number>();
  const grossRentByProperty = new Map<string, number>();
  const invoiceTotalsByLease = new Map<string, number>();
  const createdInvoices: Array<Awaited<ReturnType<typeof db.invoice.create>> & { lineItems: { id: string; amountCents: number }[] }> = [];

  for (const context of leaseContexts) {
    if (context.scenario === 'DRAFT') continue;

    for (const periodStart of invoicePeriods()) {
      if (!leaseCoversPeriod(context.lease, periodStart)) continue;

      const dueDate = dueDateFor(periodStart, context.lease.paymentDueDay);
      const isCurrentMonth = periodStart.getTime() === startOfMonth(SEED_REFERENCE_DATE).getTime();
      const meterContext = meterMap.get(context.unit.id);
      const lineItems: Array<Prisma.InvoiceLineItemCreateWithoutInvoiceInput> = [
        {
          kind: InvoiceLineItemKind.RENT,
          description: `Monthly rent - ${context.unit.label}`,
          amountCents: context.lease.rentAmountCents,
        },
      ];

      let utilityTotal = 0;
      const periodIndex = invoicePeriods().findIndex((value) => value.getTime() === periodStart.getTime());
      if (meterContext?.water) {
        const waterQty = utilityUsage(UtilityType.WATER, context.unit.bedrooms, periodIndex);
        const waterRate = premiumPropertyIds.includes(context.property.id) ? 3150 : 2790;
        const amount = Math.round(waterQty * waterRate);
        utilityTotal += amount;
        lineItems.push({
          kind: InvoiceLineItemKind.UTILITY_WATER,
          description: 'Water consumption',
          quantity: new Prisma.Decimal(waterQty.toFixed(2)),
          unitRateCents: waterRate,
          amountCents: amount,
          sourceType: 'seed.meter',
          sourceId: meterContext.water.id,
          estimated: spikeMeters.has(meterContext.water.id) && isCurrentMonth,
        });
      }
      if (meterContext?.electricity) {
        const electricQty = utilityUsage(UtilityType.ELECTRICITY, context.unit.bedrooms, periodIndex);
        const electricRate = premiumPropertyIds.includes(context.property.id) ? 328 : 298;
        const amount = Math.round(electricQty * electricRate);
        utilityTotal += amount;
        lineItems.push({
          kind: InvoiceLineItemKind.UTILITY_ELECTRICITY,
          description: 'Electricity consumption',
          quantity: new Prisma.Decimal(electricQty.toFixed(2)),
          unitRateCents: electricRate,
          amountCents: amount,
          sourceType: 'seed.meter',
          sourceId: meterContext.electricity.id,
          estimated: spikeMeters.has(meterContext.electricity.id) && isCurrentMonth,
        });
      }
      if (context.spec.kind !== 'COTTAGE' && periodIndex >= 1) {
        lineItems.push({
          kind: InvoiceLineItemKind.UTILITY_REFUSE,
          description: 'Refuse recovery',
          amountCents: 18500,
        });
        utilityTotal += 18500;
      }
      if (context.spec.kind === 'ESTATE' && periodIndex >= 1) {
        lineItems.push({
          kind: InvoiceLineItemKind.UTILITY_SEWER,
          description: 'Sewer availability charge',
          amountCents: 14500,
        });
        utilityTotal += 14500;
      }

      const subtotal = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
      const remainingBehavior =
        context.paymentProfile === 'CHRONIC'
          ? periodIndex === 0
            ? 0
            : Math.round(subtotal * 0.35)
          : context.paymentProfile === 'PARTIAL'
            ? periodIndex === 2
              ? Math.round(subtotal * 0.82)
              : Math.round(subtotal * 0.9)
            : subtotal;

      const shouldBePaid =
        context.paymentProfile === 'STABLE' ||
        context.paymentProfile === 'DEBICHECK' ||
        (context.paymentProfile === 'LATE' && (periodIndex < 2 || SEED_REFERENCE_DATE.getUTCDate() > 20));
      const isPartial = context.paymentProfile === 'PARTIAL' || context.paymentProfile === 'CHRONIC';
      const paidAmount =
        isPartial
          ? remainingBehavior
          : shouldBePaid
            ? subtotal
            : context.paymentProfile === 'LATE' && isCurrentMonth
              ? 0
              : subtotal;

      let status: InvoiceStatus = InvoiceStatus.DUE;
      if (paidAmount >= subtotal) {
        status = InvoiceStatus.PAID;
      } else if (paidAmount === 0 && dueDate < SEED_REFERENCE_DATE) {
        status = InvoiceStatus.OVERDUE;
      } else if (paidAmount > 0 && paidAmount < subtotal) {
        status = InvoiceStatus.OVERDUE;
      } else if (dueDate < SEED_REFERENCE_DATE) {
        status = InvoiceStatus.OVERDUE;
      }

      if (context.scenario === 'UPCOMING' && periodStart >= startOfMonth(SEED_REFERENCE_DATE)) {
        continue;
      }
      if (context.scenario === 'TERMINATED' && periodStart > startOfMonth(context.lease.endDate)) {
        continue;
      }

      const billingRun = billingRunMap.get(periodStart.toISOString())!;
      const paidAt =
        paidAmount > 0
          ? addDays(
              dueDate,
              context.paymentProfile === 'DEBICHECK'
                ? 0
                : context.paymentProfile === 'LATE'
                  ? intBetween(5, 12)
                  : context.paymentProfile === 'PARTIAL'
                    ? intBetween(10, 18)
                    : intBetween(0, 4),
            )
          : null;

      if ((context.paymentProfile === 'CHRONIC' || context.paymentProfile === 'PARTIAL') && status === InvoiceStatus.OVERDUE) {
        lineItems.push({
          kind: InvoiceLineItemKind.LATE_FEE,
          description: 'Late payment fee',
          amountCents: 35000,
        });
      }

      const total = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
      const effectivePaidAmount = Math.min(total, paidAmount > 0 ? paidAmount : 0);

      const invoice = await withRetry(`invoice ${context.lease.id} ${periodStart.toISOString().slice(0, 7)}`, () =>
        db.invoice.create({
          data: {
            orgId: org.id,
            leaseId: context.lease.id,
            periodStart,
            dueDate,
            amountCents: total,
            subtotalCents: total,
            taxCents: 0,
            totalCents: total,
            status:
              effectivePaidAmount >= total
                ? InvoiceStatus.PAID
                : effectivePaidAmount > 0 || dueDate < SEED_REFERENCE_DATE
                  ? InvoiceStatus.OVERDUE
                  : InvoiceStatus.DUE,
            paidAt: effectivePaidAmount > 0 ? paidAt : null,
            paidAmountCents: effectivePaidAmount > 0 ? effectivePaidAmount : null,
            paidNote:
              effectivePaidAmount > 0 && effectivePaidAmount < total
                ? 'Partially settled against imported bank receipt.'
                : effectivePaidAmount >= total
                  ? context.paymentProfile === 'DEBICHECK'
                    ? 'Settled via DebiCheck collection.'
                    : 'Settled against imported payment receipt.'
                  : null,
            billingRunId: billingRun.id,
            lineItems: {
              create: lineItems,
            },
          },
          include: {
            lineItems: {
              select: { id: true, amountCents: true },
            },
          },
        }),
      );

      createdInvoices.push(invoice);
      bump(grossRentByProperty, context.property.id, context.lease.rentAmountCents);
      bump(invoiceTotalsByLease, context.lease.id, invoice.totalCents);

      const outstanding = invoice.totalCents - (invoice.paidAmountCents ?? 0);
      if (outstanding > 0) {
        bump(invoiceOutstandingByProperty, context.property.id, outstanding);
      }

      if ((invoice.paidAmountCents ?? 0) > 0) {
        const receiptSource = chooseReceiptSource(context.paymentProfile, periodIndex);
        const receipt = await withRetry(`receipt ${context.lease.id} ${periodStart.toISOString().slice(0, 7)}`, () =>
          db.paymentReceipt.create({
            data: {
              orgId: org.id,
              tenantId: context.primaryTenant.id,
              leaseId: context.lease.id,
              receivedAt: invoice.paidAt!,
              amountCents: invoice.paidAmountCents!,
              method: choosePaymentMethod(receiptSource),
              source: receiptSource,
              externalRef: `PMO-${context.lease.id.slice(-6).toUpperCase()}-${periodStart.getUTCFullYear()}${String(periodStart.getUTCMonth() + 1).padStart(2, '0')}`,
              note:
                receiptSource === ReceiptSource.DEBICHECK
                  ? 'Auto-collected via mandate.'
                  : receiptSource === ReceiptSource.STITCH
                    ? 'Tenant card checkout.'
                    : 'Imported from bank statement.',
              recordedById: receiptSource === ReceiptSource.CSV_IMPORT ? financeUser.id : pmUser.id,
              allocations: {
                create: buildAllocations(invoice.lineItems, invoice.paidAmountCents!),
              },
            },
          }),
        );

        const trustAccount = trustAccountByLandlord.get(context.landlordId)!;
        await withRetry(`trustLedger receipt ${receipt.id}`, () =>
          db.trustLedgerEntry.create({
            data: {
              trustAccountId: trustAccount.id,
              landlordId: context.landlordId,
              tenantId: context.primaryTenant.id,
              leaseId: context.lease.id,
              occurredAt: receipt.receivedAt,
              type: LedgerEntryType.RECEIPT,
              amountCents: receipt.amountCents,
              sourceType: 'PaymentReceipt',
              sourceId: receipt.id,
              note: `Tenant receipt allocated to ${periodStart.toISOString().slice(0, 7)} invoice.`,
            },
          }),
        );
        bump(receiptLedgerByLandlord, context.landlordId, receipt.amountCents);
        bump(
          receiptsByLandlordPeriod,
          `${context.landlordId}:${periodStart.toISOString()}`,
          receipt.amountCents,
        );
      }
    }
  }

  const unappliedReceipt = await db.paymentReceipt.create({
    data: {
      orgId: org.id,
      receivedAt: addDays(SEED_REFERENCE_DATE, -3),
      amountCents: 125000,
      method: PaymentMethod.EFT,
      source: ReceiptSource.CSV_IMPORT,
      externalRef: 'UNMATCHED-BANK-REF-APR26',
      note: 'Imported payment awaiting tenant reference clarification.',
      recordedById: financeUser.id,
      allocations: {
        create: [{ target: AllocationTarget.UNAPPLIED, amountCents: 125000 }],
      },
    },
  });

  const maintenanceRequests: Array<{
    request: Awaited<ReturnType<typeof db.maintenanceRequest.create>>;
    context: LeaseContext;
    assignedVendor: Awaited<ReturnType<typeof db.vendor.create>>;
  }> = [];
  const maintenanceCandidates = currentOccupiedLeaseContexts.filter((_, index) => index % 11 === 0 || index % 17 === 0).slice(0, 18);
  for (const context of maintenanceCandidates) {
    const template: (typeof MAINTENANCE_TEMPLATES)[number] =
      MAINTENANCE_TEMPLATES[maintenanceRequests.length % MAINTENANCE_TEMPLATES.length]!;
    const matchingVendors: typeof vendors = vendors.filter(
      (vendor) => vendor.categories.includes(template.category) || vendor.categories.includes('Emergency'),
    );
    const assignedVendor: (typeof vendors)[number] =
      matchingVendors[0] ?? vendors[maintenanceRequests.length % vendors.length]!;
    const status =
      maintenanceRequests.length % 6 === 0
        ? MaintenanceStatus.OPEN
        : maintenanceRequests.length % 5 === 0
          ? MaintenanceStatus.IN_PROGRESS
          : maintenanceRequests.length % 4 === 0
            ? MaintenanceStatus.RESOLVED
            : MaintenanceStatus.CLOSED;
    const estimatedCost = intBetween(180000, 1450000);
    const completedAt =
      status === MaintenanceStatus.CLOSED || status === MaintenanceStatus.RESOLVED
        ? addDays(SEED_REFERENCE_DATE, -intBetween(4, 32))
        : null;

    const request: Awaited<ReturnType<typeof db.maintenanceRequest.create>> =
      await db.maintenanceRequest.create({
      data: {
        orgId: org.id,
        tenantId: context.primaryTenant.id,
        unitId: context.unit.id,
        title: template.title,
        description: template.description,
        priority:
          estimatedCost > 850000
            ? MaintenancePriority.URGENT
            : estimatedCost > 450000
              ? MaintenancePriority.HIGH
              : maintenanceRequests.length % 3 === 0
                ? MaintenancePriority.MEDIUM
                : MaintenancePriority.LOW,
        status,
        internalNotes:
          status === MaintenanceStatus.OPEN
            ? 'Landlord approval threshold exceeded; holding final commitment pending response.'
            : status === MaintenanceStatus.IN_PROGRESS
              ? 'Vendor confirmed callout and ETA with tenant.'
              : 'Work completed and cost captured for trust reporting.',
        assignedVendorId: assignedVendor.id,
        estimatedCostCents: estimatedCost,
        quotedCostCents: Math.round(estimatedCost * (0.92 + random() * 0.18)),
        scheduledFor:
          status === MaintenanceStatus.OPEN
            ? addDays(SEED_REFERENCE_DATE, 2)
            : addDays(SEED_REFERENCE_DATE, -intBetween(1, 12)),
        completedAt,
        resolvedAt: status === MaintenanceStatus.RESOLVED || status === MaintenanceStatus.CLOSED ? completedAt : null,
        invoiceCents:
          status === MaintenanceStatus.CLOSED
            ? Math.round(estimatedCost * (0.94 + random() * 0.14))
            : null,
        invoiceBlobKey:
          status === MaintenanceStatus.CLOSED
            ? `seed/maintenance/${context.unit.id}/${maintenanceRequests.length + 1}.pdf`
            : null,
      },
      });

    maintenanceRequests.push({ request, context, assignedVendor });

    await db.maintenanceQuote.createMany({
      data: [
        {
          requestId: request.id,
          vendorId: assignedVendor.id,
          amountCents: Math.round(estimatedCost * 0.97),
          note: 'Preferred vendor familiar with the complex.',
        },
        {
          requestId: request.id,
          vendorId: vendors[(vendors.indexOf(assignedVendor) + 1) % vendors.length]!.id,
          amountCents: Math.round(estimatedCost * 1.08),
          note: 'Alternative quote received for comparison.',
        },
      ],
    });

    await db.maintenanceWorklog.createMany({
      data: [
        {
          requestId: request.id,
          authorId: pmUser.id,
          body: 'Tenant contacted and access window confirmed.',
        },
        {
          requestId: request.id,
          authorId: financeUser.id,
          body:
            estimatedCost > org.landlordApprovalThresholdCents
              ? 'Trust impact reviewed; reserve remains adequate pending landlord decision.'
              : 'Below threshold; proceed under standing authority.',
        },
      ],
    });

    if (request.invoiceCents) {
      const trustAccount = trustAccountByLandlord.get(context.landlordId)!;
      await db.trustLedgerEntry.create({
        data: {
          trustAccountId: trustAccount.id,
          landlordId: context.landlordId,
          leaseId: context.lease.id,
          tenantId: context.primaryTenant.id,
          occurredAt: request.completedAt!,
          type: LedgerEntryType.FEE,
          amountCents: -request.invoiceCents,
          sourceType: 'MaintenanceRequest',
          sourceId: request.id,
          note: `${request.title} contractor invoice captured.`,
        },
      });
      bump(maintenanceLedgerByLandlord, context.landlordId, request.invoiceCents);
    }
  }

  const approvalsToCreate = maintenanceRequests.slice(0, 3);
  for (const item of approvalsToCreate) {
    await db.approval.create({
      data: {
        orgId: org.id,
        landlordId: item.context.landlordId,
        propertyId: item.context.property.id,
        kind:
          approvalsToCreate.indexOf(item) === 0
            ? ApprovalKind.MAINTENANCE_COMMIT
            : approvalsToCreate.indexOf(item) === 1
              ? ApprovalKind.RENT_CHANGE
              : ApprovalKind.LEASE_RENEW,
        subjectType:
          approvalsToCreate.indexOf(item) === 0 ? 'MaintenanceRequest' : approvalsToCreate.indexOf(item) === 1 ? 'Lease' : 'Lease',
        subjectId: approvalsToCreate.indexOf(item) === 0 ? item.request.id : item.context.lease.id,
        payload:
          approvalsToCreate.indexOf(item) === 0
            ? { title: item.request.title, quotedCostCents: item.request.quotedCostCents, vendor: item.assignedVendor.name }
            : approvalsToCreate.indexOf(item) === 1
              ? { currentRentCents: item.context.lease.rentAmountCents, proposedRentCents: item.context.lease.rentAmountCents + 85000 }
              : { leaseId: item.context.lease.id, requestedTermMonths: 12, reason: 'Tenant requested longer renewal term.' },
        state:
          approvalsToCreate.indexOf(item) === 0
            ? ApprovalState.PENDING
            : approvalsToCreate.indexOf(item) === 1
              ? ApprovalState.APPROVED
              : ApprovalState.DECLINED,
        reason:
          approvalsToCreate.indexOf(item) === 2
            ? 'Owner prefers to reassess market rent before committing to another term.'
            : null,
        decisionNote:
          approvalsToCreate.indexOf(item) === 1
            ? 'Approved within annual rent review mandate.'
            : approvalsToCreate.indexOf(item) === 2
              ? 'Hold until unit refresh and revised pricing proposal.'
              : null,
        requestedById: pmUser.id,
        decidedById:
          approvalsToCreate.indexOf(item) === 0
            ? null
            : (await db.user.findFirstOrThrow({ where: { landlordId: item.context.landlordId, role: Role.LANDLORD } })).id,
        decidedAt:
          approvalsToCreate.indexOf(item) === 0
            ? null
            : addDays(SEED_REFERENCE_DATE, -intBetween(3, 12)),
      },
    });
  }

  const applicants = [];
  const applicationStages: ApplicationStage[] = [
    ApplicationStage.SUBMITTED,
    ApplicationStage.UNDER_REVIEW,
    ApplicationStage.VETTING,
    ApplicationStage.VETTING,
    ApplicationStage.APPROVED,
    ApplicationStage.DECLINED,
    ApplicationStage.CONVERTED,
    ApplicationStage.WITHDRAWN,
  ];
  const convertedLeaseContext = upcomingLeaseContexts[0];

  for (let i = 0; i < 8; i++) {
    const targetUnitContext = vacantUnits[i] ?? propertyContexts[0]!.units[i];
    const targetLeaseContext = i === 6 ? convertedLeaseContext : undefined;
    const firstName = FIRST_NAMES[(tenantCounter + i) % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[(tenantCounter + i * 2) % LAST_NAMES.length]!;
    const grossIncome = baseRentFor(targetUnitContext.spec, targetUnitContext.unit.bedrooms, targetUnitContext.ordinal) * 3.8;
    const applicant = await db.applicant.create({
      data: {
        orgId: org.id,
        firstName,
        lastName,
        email: `${firstName}.${lastName}.app${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@apply.acme.test',
        phone: phoneFor(900 + i),
        idNumber: idNumberFor(800 + i),
        employer: EMPLOYERS[i % EMPLOYERS.length],
        grossMonthlyIncomeCents: Math.round(grossIncome),
        netMonthlyIncomeCents: Math.round(grossIncome * 0.72),
        tpnConsentGiven: i !== 7,
        tpnConsentAt: i !== 7 ? addDays(SEED_REFERENCE_DATE, -intBetween(4, 40)) : null,
        tpnConsentCapturedById: i !== 7 ? pmUser.id : null,
      },
    });
    applicants.push(applicant);

    const stage = applicationStages[i]!;
    const decision =
      stage === ApplicationStage.APPROVED || stage === ApplicationStage.CONVERTED
        ? ApplicationDecision.APPROVED
        : stage === ApplicationStage.DECLINED
          ? ApplicationDecision.DECLINED
          : ApplicationDecision.PENDING;

    const application = await db.application.create({
      data: {
        orgId: org.id,
        applicantId: applicant.id,
        propertyId: targetUnitContext.property.id,
        unitId: targetUnitContext.unit.id,
        requestedMoveIn: addDays(SEED_REFERENCE_DATE, intBetween(10, 45)),
        affordabilityRatio: Number((grossIncome / baseRentFor(targetUnitContext.spec, targetUnitContext.unit.bedrooms, targetUnitContext.ordinal)).toFixed(2)),
        sourceChannel: i % 2 === 0 ? 'Private Property' : 'Referral',
        assignedReviewerId: pmUser.id,
        stage,
        decision,
        decisionReason:
          stage === ApplicationStage.DECLINED
            ? 'Income variability and adverse TPN recommendation.'
            : stage === ApplicationStage.WITHDRAWN
              ? 'Applicant accepted another property before approval.'
              : null,
        decidedAt:
          decision !== ApplicationDecision.PENDING
            ? addDays(SEED_REFERENCE_DATE, -intBetween(1, 14))
            : null,
        convertedTenantId: stage === ApplicationStage.CONVERTED ? targetLeaseContext?.primaryTenant.id : null,
        convertedLeaseId: stage === ApplicationStage.CONVERTED ? targetLeaseContext?.lease.id : null,
      },
    });

    await db.applicationNote.create({
      data: {
        applicationId: application.id,
        authorId: pmUser.id,
        body:
          stage === ApplicationStage.SUBMITTED
            ? 'Application received from listing channel and queued for initial screening.'
            : stage === ApplicationStage.VETTING
              ? 'Employment and affordability checks underway.'
              : stage === ApplicationStage.CONVERTED
                ? 'Applicant converted into upcoming tenancy after final acceptance.'
                : 'General screening note captured during seed generation.',
      },
    });

    if (i < 5) {
      await db.applicationDocument.create({
        data: {
          applicationId: application.id,
          storageKey: `seed/applications/${application.id}/bank-statement.pdf`,
          filename: 'bank-statement.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 184320,
          uploadedById: pmUser.id,
        },
      });
    }

    if (
      stage === ApplicationStage.VETTING ||
      stage === ApplicationStage.APPROVED ||
      stage === ApplicationStage.DECLINED ||
      stage === ApplicationStage.CONVERTED
    ) {
      await db.tpnCheck.create({
        data: {
          applicationId: application.id,
          status:
            stage === ApplicationStage.APPROVED || stage === ApplicationStage.CONVERTED || i === 2
              ? TpnCheckStatus.RECEIVED
              : stage === ApplicationStage.DECLINED
                ? TpnCheckStatus.RECEIVED
                : TpnCheckStatus.WAIVED,
          requestedAt: addDays(SEED_REFERENCE_DATE, -intBetween(6, 20)),
          receivedAt:
            stage === ApplicationStage.APPROVED || stage === ApplicationStage.CONVERTED || stage === ApplicationStage.DECLINED || i === 2
              ? addDays(SEED_REFERENCE_DATE, -intBetween(3, 12))
              : null,
          tpnReferenceId: `TPN-${application.id.slice(-8).toUpperCase()}`,
          recommendation:
            stage === ApplicationStage.DECLINED
              ? TpnRecommendation.DECLINE
              : i === 2
                ? TpnRecommendation.CAUTION
                : stage === ApplicationStage.APPROVED || stage === ApplicationStage.CONVERTED
                  ? TpnRecommendation.PASS
                  : null,
          summary:
            stage === ApplicationStage.DECLINED
              ? 'Prior payment delinquencies and multiple recent credit enquiries.'
              : i === 2
                ? 'Affordability acceptable but prior slow-payment marker noted.'
                : 'Clear report and affordability within policy.',
          reportPayload:
            stage === ApplicationStage.DECLINED
              ? { scoreBand: 'High Risk', delinquencies: 2 }
              : stage === ApplicationStage.APPROVED || stage === ApplicationStage.CONVERTED
                ? { scoreBand: 'Low Risk', delinquencies: 0 }
                : { scoreBand: 'Medium Risk', delinquencies: 1 },
          waivedReason: null,
          waivedById: null,
        },
      });
    }
  }

  const notifications = [];
  const notificationSeeds = [
    {
      userId: pmUser.id,
      type: 'maintenance.pending_approval',
      subject: 'Landlord approval required for roof leak repair',
      body: 'A high-cost waterproofing quote is waiting on owner approval before the vendor can be instructed.',
      entityType: 'Approval',
      entityId: (await db.approval.findFirstOrThrow({ where: { orgId: org.id, state: ApprovalState.PENDING } })).id,
    },
    {
      userId: tenantUser.id,
      type: 'lease.expiring',
      subject: 'Your lease is expiring soon',
      body: 'Thandi, your current lease ends within the next 45 days. Renewal terms are ready for review.',
      entityType: 'Lease',
      entityId: thandiLease.lease.id,
    },
    {
      userId: financeUser.id,
      type: 'payments.unallocated',
      subject: 'Imported receipt needs allocation',
      body: 'A bank receipt imported without a matching tenant reference needs manual follow-up.',
      entityType: 'PaymentReceipt',
      entityId: unappliedReceipt.id,
    },
    {
      userId: tenant2User.id,
      type: 'lease.review_request',
      subject: 'Lease clause response pending',
      body: 'Your question about professional cleaning has been logged and is awaiting PM feedback.',
      entityType: 'LeaseReviewRequest',
      entityId: (await db.leaseReviewRequest.findFirstOrThrow({ where: { leaseId: danielLease.lease.id } })).id,
    },
  ];

  for (const notificationSeed of notificationSeeds) {
    const notification = await db.notification.create({
      data: {
        orgId: org.id,
        userId: notificationSeed.userId,
        type: notificationSeed.type,
        subject: notificationSeed.subject,
        body: notificationSeed.body,
        entityType: notificationSeed.entityType,
        entityId: notificationSeed.entityId,
      },
    });
    notifications.push(notification);
    await db.notificationDelivery.createMany({
      data: [
        {
          notificationId: notification.id,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          lastAttemptAt: addDays(SEED_REFERENCE_DATE, -1),
          providerRef: `inapp-${notification.id.slice(-6)}`,
        },
        {
          notificationId: notification.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.SENT,
          lastAttemptAt: addDays(SEED_REFERENCE_DATE, -1),
          providerRef: `smtp-${notification.id.slice(-6)}`,
        },
      ],
    });
  }

  const notices = [
    {
      type: AreaNoticeType.POWER,
      title: 'Stage 4 load reduction in selected Cape Town areas',
      body: 'Properties tied to the Observatory and Sea Point feeders should expect two evening slots this weekend.',
      startsAt: addDays(SEED_REFERENCE_DATE, 1),
      endsAt: addDays(SEED_REFERENCE_DATE, 3),
      audienceQuery: { cities: ['Cape Town'], roles: ['TENANT', 'PROPERTY_MANAGER'] },
    },
    {
      type: AreaNoticeType.SECURITY,
      title: 'Access control upgrade window',
      body: 'Guardline will be testing remotes and pedestrian tags across Sandton, Lonehill, and Morningside schemes.',
      startsAt: addDays(SEED_REFERENCE_DATE, 4),
      endsAt: addDays(SEED_REFERENCE_DATE, 5),
      audienceQuery: { suburbs: ['Sandown', 'Lonehill', 'Morningside'], roles: ['TENANT', 'LANDLORD'] },
    },
    {
      type: AreaNoticeType.WATER,
      title: 'Municipal water pressure fluctuation alert',
      body: 'Tenants in Hillcrest, Ballito, and Umhlanga should expect intermittent low pressure overnight.',
      startsAt: addDays(SEED_REFERENCE_DATE, 2),
      endsAt: addDays(SEED_REFERENCE_DATE, 2),
      audienceQuery: { cities: ['Durban'], roles: ['TENANT', 'PROPERTY_MANAGER'] },
    },
  ];

  const usersForNotices = [adminUser, pmUser, tenantUser, tenant2User];
  for (const noticeSeed of notices) {
    const notice = await db.areaNotice.create({
      data: {
        orgId: org.id,
        type: noticeSeed.type,
        title: noticeSeed.title,
        body: noticeSeed.body,
        startsAt: noticeSeed.startsAt,
        endsAt: noticeSeed.endsAt,
        audienceQuery: noticeSeed.audienceQuery,
        createdById: pmUser.id,
        publishedAt: addDays(SEED_REFERENCE_DATE, -1),
      },
    });

    for (const user of usersForNotices) {
      await db.noticeDelivery.create({
        data: {
          noticeId: notice.id,
          userId: user.id,
          channel: user.id === adminUser.id ? NotificationChannel.IN_APP : NotificationChannel.EMAIL,
          status: NotificationStatus.SENT,
          lastAttemptAt: addDays(SEED_REFERENCE_DATE, -1),
        },
      });
    }
  }

  const outageProperties = propertyContexts.filter((context) =>
    ['Rose Court', 'Atlantic Terraces', 'Umhlanga Ridge Apartments', 'Sandton Gate'].includes(context.property.name),
  );
  for (const propertyContext of outageProperties) {
    await db.loadSheddingOutage.create({
      data: {
        orgId: org.id,
        propertyId: propertyContext.property.id,
        eskomAreaCode: propertyContext.property.eskomAreaCode,
        source: propertyContext.property.city === 'Durban' ? OutageSource.PM : OutageSource.ESKOM_SE_PUSH,
        startsAt: addDays(SEED_REFERENCE_DATE, intBetween(1, 5)),
        endsAt: addDays(SEED_REFERENCE_DATE, intBetween(6, 8)),
        stage: intBetween(2, 6),
        note: 'Seeded outage event to showcase notices and outage timelines.',
        externalEventId: `OUTAGE-${propertyContext.property.id.slice(-6)}`,
        createdById: pmUser.id,
      },
    });
  }

  const interimInspectionLease = currentOccupiedLeaseContexts.find((context) => context.spec.kind === 'ESTATE')!;
  const moveOutLease = terminatedLeaseContexts[0]!;
  const moveInLease = currentOccupiedLeaseContexts[1]!;

  async function createInspectionBundle(
    context: LeaseContext,
    type: InspectionType,
    status: InspectionStatus,
    summary: string,
  ) {
    const inspection = await db.inspection.create({
      data: {
        orgId: org.id,
        leaseId: context.lease.id,
        unitId: context.unit.id,
        type,
        status,
        scheduledAt: addDays(SEED_REFERENCE_DATE, type === InspectionType.MOVE_IN ? -320 : type === InspectionType.INTERIM ? -20 : -10),
        startedAt: addDays(SEED_REFERENCE_DATE, type === InspectionType.MOVE_IN ? -320 : type === InspectionType.INTERIM ? -19 : -10),
        completedAt: addDays(SEED_REFERENCE_DATE, type === InspectionType.MOVE_IN ? -320 : type === InspectionType.INTERIM ? -18 : -9),
        signedOffAt: status === InspectionStatus.SIGNED_OFF ? addDays(SEED_REFERENCE_DATE, type === InspectionType.MOVE_IN ? -319 : -8) : null,
        staffUserId: pmUser.id,
        agentId: context.assignedAgentId,
        summary,
        reportKey: `seed/inspections/${context.lease.id}/${type.toLowerCase()}.pdf`,
      },
    });

    const kitchenArea = await db.inspectionArea.create({
      data: { inspectionId: inspection.id, name: 'Kitchen', orderIndex: 1 },
    });
    const bathroomArea = await db.inspectionArea.create({
      data: { inspectionId: inspection.id, name: 'Bathroom', orderIndex: 2 },
    });

    const kitchenItem = await db.inspectionItem.create({
      data: {
        areaId: kitchenArea.id,
        label: 'Cabinetry and worktops',
        condition: type === InspectionType.MOVE_OUT ? ConditionRating.FAIR : ConditionRating.GOOD,
        note:
          type === InspectionType.MOVE_OUT
            ? 'Minor chip and wear to laminate edge near sink.'
            : 'Serviceable with ordinary wear and tear.',
        estimatedCostCents: type === InspectionType.MOVE_OUT ? 185000 : null,
        responsibility: type === InspectionType.MOVE_OUT ? ChargeResponsibility.TENANT : null,
      },
    });
    await db.inspectionItem.create({
      data: {
        areaId: bathroomArea.id,
        label: 'Sanitaryware and taps',
        condition: type === InspectionType.INTERIM ? ConditionRating.GOOD : ConditionRating.EXCELLENT,
        note: 'No leaks visible at inspection.',
      },
    });

    await db.inspectionSignature.create({
      data: {
        inspectionId: inspection.id,
        signerRole: Role.PROPERTY_MANAGER,
        signerUserId: pmUser.id,
        signedName: 'Priya Manager',
        signedAt: addDays(SEED_REFERENCE_DATE, type === InspectionType.MOVE_IN ? -319 : -8),
        ipAddress: '196.12.44.18',
        userAgent: 'Seeded Chrome',
      },
    });

    if (type !== InspectionType.INTERIM) {
      await db.inspectionSignature.create({
        data: {
          inspectionId: inspection.id,
          signerRole: Role.TENANT,
          signerUserId: context.primaryTenant.userId,
          signedName: `${context.primaryTenant.firstName} ${context.primaryTenant.lastName}`,
          signedAt: addDays(SEED_REFERENCE_DATE, type === InspectionType.MOVE_IN ? -319 : -8),
          ipAddress: '105.11.82.95',
          userAgent: 'Seeded Safari',
        },
      });
    }

    return { inspection, kitchenItem };
  }

  await createInspectionBundle(
    moveInLease,
    InspectionType.MOVE_IN,
    InspectionStatus.SIGNED_OFF,
    'Move-in completed with only standard wear noted.',
  );
  await createInspectionBundle(
    interimInspectionLease,
    InspectionType.INTERIM,
    InspectionStatus.COMPLETED,
    'Routine mid-term inspection completed with no major concerns.',
  );
  const moveOutInspection = await createInspectionBundle(
    moveOutLease,
    InspectionType.MOVE_OUT,
    InspectionStatus.SIGNED_OFF,
    'Move-out inspection completed; minor tenant-responsible damage identified.',
  );

  const openOffboardingLease = terminatedLeaseContexts[1] ?? terminatedLeaseContexts[0]!;
  const closedCase = await db.offboardingCase.create({
    data: {
      orgId: org.id,
      leaseId: moveOutLease.lease.id,
      status: 'CLOSED',
      openedAt: addDays(SEED_REFERENCE_DATE, -20),
      closedAt: addDays(SEED_REFERENCE_DATE, -6),
    },
  });

  await db.offboardingTask.createMany({
    data: [
      { caseId: closedCase.id, label: 'Confirm exit meter reads', orderIndex: 1, done: true, doneAt: addDays(SEED_REFERENCE_DATE, -10), doneById: pmUser.id },
      { caseId: closedCase.id, label: 'Complete move-out inspection', orderIndex: 2, done: true, doneAt: addDays(SEED_REFERENCE_DATE, -9), doneById: pmUser.id },
      { caseId: closedCase.id, label: 'Approve deposit refund', orderIndex: 3, done: true, doneAt: addDays(SEED_REFERENCE_DATE, -7), doneById: financeUser.id },
    ],
  });

  await db.moveOutCharge.create({
    data: {
      caseId: closedCase.id,
      label: 'Kitchen worktop repair',
      amountCents: 185000,
      responsibility: ChargeResponsibility.TENANT,
      sourceInspectionItemId: moveOutInspection.kitchenItem.id,
    },
  });

  await db.depositSettlement.create({
    data: {
      caseId: closedCase.id,
      depositHeldCents: moveOutLease.lease.depositAmountCents,
      chargesAppliedCents: 185000,
      refundDueCents: moveOutLease.lease.depositAmountCents - 185000,
      balanceOwedCents: 0,
      statementKey: `seed/offboarding/${closedCase.id}/settlement.pdf`,
      finalizedAt: addDays(SEED_REFERENCE_DATE, -6),
    },
  });

  const moveOutTrustAccount = trustAccountByLandlord.get(moveOutLease.landlordId)!;
  await db.trustLedgerEntry.create({
    data: {
      trustAccountId: moveOutTrustAccount.id,
      landlordId: moveOutLease.landlordId,
      tenantId: moveOutLease.primaryTenant.id,
      leaseId: moveOutLease.lease.id,
      occurredAt: addDays(SEED_REFERENCE_DATE, -6),
      type: LedgerEntryType.DEPOSIT_OUT,
      amountCents: -(moveOutLease.lease.depositAmountCents - 185000),
      sourceType: 'DepositSettlement',
      sourceId: closedCase.id,
      note: 'Deposit refund after approved move-out deductions.',
    },
  });

  const openCase = await db.offboardingCase.create({
    data: {
      orgId: org.id,
      leaseId: openOffboardingLease.lease.id,
      status: 'SETTLING',
      openedAt: addDays(SEED_REFERENCE_DATE, -8),
    },
  });

  await db.offboardingTask.createMany({
    data: [
      { caseId: openCase.id, label: 'Collect final municipal account', orderIndex: 1, done: true, doneAt: addDays(SEED_REFERENCE_DATE, -4), doneById: financeUser.id },
      { caseId: openCase.id, label: 'Review contractor quotations for repairs', orderIndex: 2, done: false },
      { caseId: openCase.id, label: 'Issue final settlement statement', orderIndex: 3, done: false },
    ],
  });

  await db.moveOutCharge.create({
    data: {
      caseId: openCase.id,
      label: 'Repaint bedroom wall after patching',
      amountCents: 92000,
      responsibility: ChargeResponsibility.SHARED,
    },
  });

  const usageAlertRules = [
    await db.usageAlertRule.create({
      data: {
        orgId: org.id,
        utilityType: UtilityType.WATER,
        thresholdPct: 30,
      },
    }),
    await db.usageAlertRule.create({
      data: {
        orgId: org.id,
        utilityType: UtilityType.ELECTRICITY,
        thresholdPct: 25,
      },
    }),
  ];

  const usageAlertCandidates = meteredLeases.slice(0, 2);
  for (const context of usageAlertCandidates) {
    const meters = meterMap.get(context.unit.id);
    const meter = meters?.electricity ?? meters?.water;
    if (!meter) continue;
    const notification = await db.notification.create({
      data: {
        orgId: org.id,
        userId: pmUser.id,
        type: 'usage.alert',
        subject: `${meter.type === UtilityType.ELECTRICITY ? 'Electricity' : 'Water'} usage spike detected`,
        body: `Usage for ${context.property.name} ${context.unit.label} is well above the trailing baseline.`,
        entityType: 'Meter',
        entityId: meter.id,
      },
    });
    await db.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        lastAttemptAt: addDays(SEED_REFERENCE_DATE, -1),
        providerRef: `usage-${notification.id.slice(-6)}`,
      },
    });
    await db.usageAlertEvent.create({
      data: {
        orgId: org.id,
        ruleId: meter.type === UtilityType.ELECTRICITY ? usageAlertRules[1]!.id : usageAlertRules[0]!.id,
        leaseId: context.lease.id,
        meterId: meter.id,
        notificationId: notification.id,
        periodStart: startOfMonth(SEED_REFERENCE_DATE),
        observedQty: new Prisma.Decimal(meter.type === UtilityType.ELECTRICITY ? '702.00' : '38.60'),
        baselineQty: new Prisma.Decimal(meter.type === UtilityType.ELECTRICITY ? '448.00' : '24.10'),
        deltaPct: meter.type === UtilityType.ELECTRICITY ? 57 : 60,
      },
    });
  }

  for (const landlord of landlords) {
    const previousMonthKey = `${landlord.id}:${addMonths(startOfMonth(SEED_REFERENCE_DATE), -1, 1).toISOString()}`;
    const previousMonthReceipts = receiptsByLandlordPeriod.get(previousMonthKey) ?? 0;
    const maintenanceSpend = maintenanceLedgerByLandlord.get(landlord.id) ?? 0;
    const disbursementAmount = Math.max(0, Math.round(previousMonthReceipts * 0.74) - Math.round(maintenanceSpend * 0.45));
    if (disbursementAmount === 0) continue;
    const trustAccount = trustAccountByLandlord.get(landlord.id)!;
    await db.trustLedgerEntry.create({
      data: {
        trustAccountId: trustAccount.id,
        landlordId: landlord.id,
        occurredAt: addDays(SEED_REFERENCE_DATE, -12),
        type: LedgerEntryType.DISBURSEMENT,
        amountCents: -disbursementAmount,
        sourceType: 'seed.disbursement',
        sourceId: landlord.id,
        note: 'Monthly owner draw after reserve retention.',
      },
    });
    bump(disbursementLedgerByLandlord, landlord.id, disbursementAmount);
  }

  const currentMonthStart = startOfMonth(SEED_REFERENCE_DATE);
  const currentMonthInvoices = createdInvoices.filter((invoice) => invoice.periodStart.getTime() === currentMonthStart.getTime());
  const currentMonthReceipts = await db.paymentReceipt.findMany({
    where: {
      orgId: org.id,
      receivedAt: {
        gte: currentMonthStart,
        lte: SEED_REFERENCE_DATE,
      },
    },
  });

  const propertyOpenMaintenance = new Map<string, number>();
  for (const item of maintenanceRequests) {
    if (
      item.request.status === MaintenanceStatus.OPEN ||
      item.request.status === MaintenanceStatus.IN_PROGRESS
    ) {
      bump(propertyOpenMaintenance, item.context.property.id, 1);
    }
  }

  const activeLeaseCount = currentOccupiedLeaseContexts.length;
  const totalUnits = propertyContexts.reduce((sum, context) => sum + context.units.length, 0);
  const expiringLeases30 = currentOccupiedLeaseContexts.filter((context) => context.lease.endDate <= addDays(SEED_REFERENCE_DATE, 30)).length;
  const blockedApprovals = await db.approval.count({ where: { orgId: org.id, state: ApprovalState.PENDING } });
  const trustBalanceCents =
    Array.from(receiptLedgerByLandlord.values()).reduce((sum, value) => sum + value, 0) +
    Array.from(depositLedgerByLandlord.values()).reduce((sum, value) => sum + value, 0) -
    Array.from(disbursementLedgerByLandlord.values()).reduce((sum, value) => sum + value, 0) -
    Array.from(maintenanceLedgerByLandlord.values()).reduce((sum, value) => sum + value, 0) -
    (moveOutLease.lease.depositAmountCents - 185000);

  await db.orgMonthlySnapshot.create({
    data: {
      orgId: org.id,
      periodStart: currentMonthStart,
      occupiedUnits: activeLeaseCount,
      totalUnits,
      vacantUnits: totalUnits - activeLeaseCount,
      activeLeases: activeLeaseCount,
      expiringLeases30,
      openMaintenance: Array.from(propertyOpenMaintenance.values()).reduce((sum, value) => sum + value, 0),
      blockedApprovals,
      billedCents: currentMonthInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0),
      collectedCents: currentMonthReceipts.reduce((sum, receipt) => sum + receipt.amountCents, 0),
      arrearsCents: Array.from(invoiceOutstandingByProperty.values()).reduce((sum, value) => sum + value, 0),
      trustBalanceCents,
      unallocatedCents: 125000,
    },
  });

  for (const propertyContext of propertyContexts) {
    const occupiedUnits = currentOccupiedLeaseContexts.filter((context) => context.property.id === propertyContext.property.id).length;
    await db.propertyMonthlySnapshot.create({
      data: {
        orgId: org.id,
        propertyId: propertyContext.property.id,
        periodStart: currentMonthStart,
        occupiedUnits,
        totalUnits: propertyContext.units.length,
        openMaintenance: propertyOpenMaintenance.get(propertyContext.property.id) ?? 0,
        arrearsCents: invoiceOutstandingByProperty.get(propertyContext.property.id) ?? 0,
        grossRentCents: grossRentByProperty.get(propertyContext.property.id) ?? 0,
      },
    });
  }

  for (const landlord of landlords) {
    const landlordProperties = propertyContexts.filter((context) => context.property.landlordId === landlord.id);
    const landlordPropertyIds = new Set(landlordProperties.map((context) => context.property.id));
    await db.landlordMonthlySnapshot.create({
      data: {
        orgId: org.id,
        landlordId: landlord.id,
        periodStart: currentMonthStart,
        grossRentCents: Array.from(grossRentByProperty.entries()).reduce(
          (sum, [propertyId, amount]) => (landlordPropertyIds.has(propertyId) ? sum + amount : sum),
          0,
        ),
        collectedCents: receiptLedgerByLandlord.get(landlord.id) ?? 0,
        disbursedCents: disbursementLedgerByLandlord.get(landlord.id) ?? 0,
        maintenanceSpendCents: maintenanceLedgerByLandlord.get(landlord.id) ?? 0,
        vacancyDragCents: landlordProperties.reduce((sum, context) => {
          const occupied = currentOccupiedLeaseContexts.filter((lease) => lease.property.id === context.property.id).length;
          const averageRent = landlordProperties.length ? Math.round((grossRentByProperty.get(context.property.id) ?? 0) / Math.max(occupied || 1, 1)) : 0;
          return sum + Math.max(0, context.units.length - occupied) * averageRent;
        }, 0),
        trustBalanceCents:
          (receiptLedgerByLandlord.get(landlord.id) ?? 0) +
          (depositLedgerByLandlord.get(landlord.id) ?? 0) -
          (disbursementLedgerByLandlord.get(landlord.id) ?? 0) -
          (maintenanceLedgerByLandlord.get(landlord.id) ?? 0),
      },
    });
  }

  for (const agent of managingAgents) {
    const agentPropertyIds = new Set(
      propertyContexts.filter((context) => context.property.assignedAgentId === agent.id).map((context) => context.property.id),
    );
    await db.agentMonthlySnapshot.create({
      data: {
        orgId: org.id,
        agentId: agent.id,
        periodStart: currentMonthStart,
        openTickets: maintenanceRequests.filter(
          (item) =>
            agentPropertyIds.has(item.context.property.id) &&
            (item.request.status === MaintenanceStatus.OPEN ||
              item.request.status === MaintenanceStatus.IN_PROGRESS),
        ).length,
        blockedApprovals: blockedApprovals,
        upcomingInspections: [moveOutLease, openOffboardingLease].filter((item) => agentPropertyIds.has(item.property.id)).length,
      },
    });
  }

  const tenantStatementLines: StatementLineSeed[] = [];
  const thandiInvoices = currentMonthInvoices
    .filter((invoice) => invoice.leaseId === thandiLease.lease.id)
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  for (const invoice of thandiInvoices) {
    tenantStatementLines.push({
      occurredAt: invoice.periodStart,
      description: `Invoice issued for ${invoice.periodStart.toISOString().slice(0, 7)}`,
      debitCents: invoice.totalCents,
      sourceType: 'Invoice',
      sourceId: invoice.id,
    });
    if (invoice.paidAmountCents) {
      tenantStatementLines.push({
        occurredAt: invoice.paidAt!,
        description: 'Payment received',
        creditCents: invoice.paidAmountCents,
        sourceType: 'Invoice',
        sourceId: invoice.id,
      });
    }
  }

  await createStatement(
    org.id,
    StatementType.TENANT,
    'Tenant',
    thandiLease.primaryTenant.id,
    addMonths(currentMonthStart, -1, 1),
    addDays(addMonths(currentMonthStart, 1, 1), -1),
    0,
    tenantStatementLines,
    `seed/statements/tenant-${thandiLease.primaryTenant.id}.pdf`,
  );

  const firstLandlord = landlords[0]!;
  await createStatement(
    org.id,
    StatementType.LANDLORD,
    'Landlord',
    firstLandlord.id,
    currentMonthStart,
    addDays(addMonths(currentMonthStart, 1, 1), -1),
    0,
    [
      {
        occurredAt: addDays(currentMonthStart, 2),
        description: 'Tenant collections transferred into trust',
        creditCents: receiptLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
      {
        occurredAt: addDays(currentMonthStart, 8),
        description: 'Contractor costs charged to trust',
        debitCents: maintenanceLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
      {
        occurredAt: addDays(currentMonthStart, 18),
        description: 'Owner disbursement processed',
        debitCents: disbursementLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
    ],
    `seed/statements/landlord-${firstLandlord.id}.pdf`,
  );

  const trustAccount = trustAccountByLandlord.get(firstLandlord.id)!;
  await createStatement(
    org.id,
    StatementType.TRUST,
    'TrustAccount',
    trustAccount.id,
    currentMonthStart,
    addDays(addMonths(currentMonthStart, 1, 1), -1),
    0,
    [
      {
        occurredAt: addDays(currentMonthStart, 1),
        description: 'Security deposits held',
        creditCents: depositLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
      {
        occurredAt: addDays(currentMonthStart, 6),
        description: 'Receipts collected',
        creditCents: receiptLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
      {
        occurredAt: addDays(currentMonthStart, 12),
        description: 'Maintenance contractor payments',
        debitCents: maintenanceLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
      {
        occurredAt: addDays(currentMonthStart, 18),
        description: 'Landlord disbursement',
        debitCents: disbursementLedgerByLandlord.get(firstLandlord.id) ?? 0,
      },
    ],
    `seed/statements/trust-${trustAccount.id}.pdf`,
  );

  console.log('Seed complete.');
  console.log(`  Properties: ${propertyContexts.length}`);
  console.log(`  Units: ${totalUnits}`);
  console.log(`  Current occupied units: ${activeLeaseCount}`);
  console.log(`  Draft leases: ${draftLeaseContexts.length}`);
  console.log(`  Upcoming leases: ${upcomingLeaseContexts.length}`);
  console.log(`  Vendors: ${vendors.length}`);
  console.log(`  Maintenance requests: ${maintenanceRequests.length}`);
  console.log(`  Applicants: ${applicants.length}`);
  console.log('  admin@acme.test / demo1234 (ADMIN)');
  console.log('  pm@acme.test / demo1234 (PROPERTY_MANAGER)');
  console.log('  finance@acme.test / demo1234 (FINANCE)');
  console.log('  tenant@acme.test / demo1234 (TENANT)');
  console.log('  tenant2@acme.test / demo1234 (TENANT - pending signature demo)');
  console.log('  landlord1@acme.test / demo1234 (LANDLORD)');
  console.log('  agent1@acme.test / demo1234 (MANAGING_AGENT)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
