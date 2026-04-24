import type {
  ChargeResponsibility,
  ConditionRating,
  InspectionStatus,
  InspectionType,
  Role,
} from '@prisma/client';

import { formatDate, formatZar } from '@/lib/format';

export type InspectionPhotoInput = {
  id: string;
  storageKey: string;
  caption: string | null;
  publicUrl?: string | null;
};

export type InspectionItemInput = {
  id: string;
  label: string;
  condition: ConditionRating;
  note: string | null;
  estimatedCostCents: number | null;
  responsibility: ChargeResponsibility | null;
  photos: InspectionPhotoInput[];
};

export type InspectionAreaInput = {
  id: string;
  name: string;
  orderIndex: number;
  items: InspectionItemInput[];
};

export type InspectionSignatureInput = {
  id: string;
  signerRole: Role;
  signedName: string;
  signedAt: Date | string;
};

export type InspectionReportData = {
  inspection: {
    id: string;
    type: InspectionType;
    status: InspectionStatus;
    scheduledAt: Date | string;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    signedOffAt: Date | string | null;
    summary: string | null;
    staffName: string | null;
  };
  org: { name: string };
  lease: { id: string };
  unit: { label: string; propertyName: string };
  areas: InspectionAreaInput[];
  signatures: InspectionSignatureInput[];
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString();
}

function sortAreas(areas: InspectionAreaInput[]): InspectionAreaInput[] {
  return [...areas].sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return a.id.localeCompare(b.id);
  });
}

function sortItems(items: InspectionItemInput[]): InspectionItemInput[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function sortPhotos(photos: InspectionPhotoInput[]): InspectionPhotoInput[] {
  return [...photos].sort((a, b) => a.id.localeCompare(b.id));
}

function sortSignatures(signatures: InspectionSignatureInput[]): InspectionSignatureInput[] {
  return [...signatures].sort((a, b) => {
    const ta = typeof a.signedAt === 'string' ? Date.parse(a.signedAt) : a.signedAt.getTime();
    const tb = typeof b.signedAt === 'string' ? Date.parse(b.signedAt) : b.signedAt.getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

function photoList(photos: InspectionPhotoInput[]): string {
  if (photos.length === 0) return '';
  const links = sortPhotos(photos)
    .map((p) => {
      const url = p.publicUrl ?? p.storageKey;
      const caption = p.caption ? ` ${escapeHtml(p.caption)}` : '';
      return `<li>${escapeHtml(url)}${caption}</li>`;
    })
    .join('');
  return `<ul class="photos">${links}</ul>`;
}

function itemRow(item: InspectionItemInput): string {
  const cost = item.estimatedCostCents != null ? formatZar(item.estimatedCostCents) : '';
  const resp = item.responsibility ?? '';
  const note = item.note ? escapeHtml(item.note) : '';
  return `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.condition)}</td><td>${note}</td><td class="num">${cost}</td><td>${escapeHtml(resp)}</td><td>${photoList(item.photos)}</td></tr>`;
}

function areaSection(area: InspectionAreaInput): string {
  const rows = sortItems(area.items).map(itemRow).join('');
  return `<section class="area"><h2>${escapeHtml(area.name)}</h2><table><thead><tr><th>Item</th><th>Condition</th><th>Note</th><th class="num">Est. cost</th><th>Responsibility</th><th>Photos</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function metaBlock(data: InspectionReportData): string {
  const i = data.inspection;
  const scheduled = formatDate(i.scheduledAt);
  const started = i.startedAt ? toIso(i.startedAt) : '';
  const completed = i.completedAt ? toIso(i.completedAt) : '';
  const signedOff = i.signedOffAt ? toIso(i.signedOffAt) : '';
  const staff = i.staffName ? escapeHtml(i.staffName) : '';
  const summary = i.summary ? escapeHtml(i.summary) : '';
  return `<section class="meta"><p>Type: <strong>${escapeHtml(i.type)}</strong></p><p>Status: <strong>${escapeHtml(i.status)}</strong></p><p>Unit: ${escapeHtml(data.unit.propertyName)} &middot; ${escapeHtml(data.unit.label)}</p><p>Scheduled: ${scheduled}</p><p>Started: ${started}</p><p>Completed: ${completed}</p><p>Signed off: ${signedOff}</p><p>Staff: ${staff}</p><p>Summary: ${summary}</p></section>`;
}

function signaturesBlock(signatures: InspectionSignatureInput[]): string {
  const rows = sortSignatures(signatures)
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.signerRole)}</td><td>${escapeHtml(s.signedName)}</td><td>${toIso(s.signedAt)}</td></tr>`,
    )
    .join('');
  return `<section class="signatures"><h2>Signatures</h2><table><thead><tr><th>Role</th><th>Name</th><th>Signed at</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

const STYLES = `body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;margin:32px;}h1{margin:0 0 8px 0;font-size:20px;}h2{margin:16px 0 8px 0;font-size:14px;}.meta p{margin:2px 0;color:#222;font-size:12px;}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;}.num{text-align:right;font-variant-numeric:tabular-nums;}ul.photos{margin:0;padding-left:16px;}`;

function wrap(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLES}</style></head><body>${body}</body></html>`;
}

export async function renderInspectionReport(data: InspectionReportData): Promise<Buffer> {
  const header = `<header><h1>${escapeHtml(data.org.name)}</h1><p class="meta">Inspection Report</p></header>`;
  const meta = metaBlock(data);
  const areas = sortAreas(data.areas).map(areaSection).join('');
  const signatures = signaturesBlock(data.signatures);
  const html = wrap('Inspection Report', `${header}${meta}${areas}${signatures}`);
  return Buffer.from(html, 'utf8');
}
