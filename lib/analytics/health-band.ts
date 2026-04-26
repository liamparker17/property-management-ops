export type HealthBand = 'green' | 'gold' | 'orange' | 'red' | 'neutral';

export function healthBandColor(score: number | null | undefined): HealthBand {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 80) return 'green';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'orange';
  return 'red';
}

export const HEALTH_BAND_HEX: Record<HealthBand, string> = {
  green: '#2f9461',
  gold: '#c9a44c',
  orange: '#d68a3e',
  red: '#c45a4f',
  neutral: '#5c6680',
};
