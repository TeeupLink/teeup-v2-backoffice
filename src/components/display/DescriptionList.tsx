import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type DescItem = { label: string; value: ReactNode; full?: boolean };

/** 개요 탭 정보 그리드 (화면설계서 3.3) */
export function DescriptionList({ items, columns = 2 }: { items: DescItem[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-2 xl:grid-cols-3')}>
      {items.map((it) => (
        <div key={it.label} className={cn('min-w-0', it.full && 'sm:col-span-full')}>
          <dt className="text-xs font-medium text-slate-500">{it.label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{it.value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
