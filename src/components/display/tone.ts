import type { Tone } from '@/lib/status';

export const TONE_CLS: Record<Tone, string> = {
  success: 'bg-primary-50 text-primary-800',
  warning: 'bg-secondary-50 text-amber-800',
  info: 'bg-blue-50 text-blue-700',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-slate-100 text-slate-700',
};
