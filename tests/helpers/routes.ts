import path from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const APP_ROOT = path.resolve(process.cwd(), 'app');

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    if (entry === 'page.tsx') out.push(fullPath);
  }
}

function normalizeRoute(filePath: string) {
  const relative = path.relative(APP_ROOT, filePath).replace(/\\/g, '/');
  const segments = relative.split('/').slice(0, -1).filter((segment) => !segment.startsWith('('));
  const route = `/${segments.join('/')}`;
  return route === '/' ? route : route.replace(/\/+/g, '/');
}

export function collectRoutes() {
  const files: string[] = [];
  walk(APP_ROOT, files);
  return new Set(files.map(normalizeRoute));
}
