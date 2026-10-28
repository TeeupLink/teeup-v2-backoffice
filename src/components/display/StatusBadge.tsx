import { cn } from '@/lib/cn';
import { statusOf, type StatusDomain, type Tone } from '@/lib/status';
import { TONE_CLS } from './tone';

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', TONE_CLS[tone], className)}>{children}</span>;
}

export function StatusBadge({ domain, value }: { domain: StatusDomain; value: string | null | undefined }) {
  const s = statusOf(domain, value);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
