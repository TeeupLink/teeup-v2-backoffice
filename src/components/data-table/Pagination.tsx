import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PAGE_SIZES } from './listState';
import { pageWindow } from './pageWindow';

type Props = {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
};

export function Pagination({ page, size, total, onPage, onSize }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const btn = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span className="tabular">총 {total.toLocaleString('ko-KR')}건</span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span className="sr-only">페이지당 건수</span>
          <select
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="h-8 rounded-md border border-slate-300 bg-white pl-2 pr-7 text-sm"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}개씩
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="페이지" className="flex items-center gap-0.5">
          <button type="button" className={cn(btn, 'hover:bg-slate-100')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="이전 페이지">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(btn, p === page ? 'bg-primary-800 font-semibold text-white' : 'hover:bg-slate-100')}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className={cn(btn, 'hover:bg-slate-100')}
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
