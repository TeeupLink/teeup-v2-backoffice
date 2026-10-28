import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ title, actions, children, className, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('rounded-xl bg-white shadow-sm ring-1 ring-slate-200', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('px-5 py-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'highlight' }) {
  return (
    <div className={cn('rounded-xl bg-white p-5 shadow-sm ring-1', tone === 'highlight' ? 'ring-2 ring-primary-500' : 'ring-slate-200')}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular text-slate-900">{value}</p>
      {hint && <div className="mt-2 text-sm">{hint}</div>}
    </div>
  );
}
