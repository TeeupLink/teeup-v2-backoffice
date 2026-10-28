import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** 행을 선택하면 화면 하단에 고정으로 나타난다 (REQ-007) */
export function BulkActionBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="일괄 작업"
      className={cn(
        'fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 py-2.5 pl-4 pr-2.5 text-sm text-white shadow-xl',
        'max-w-[calc(100vw-2rem)]',
      )}
    >
      <span className="whitespace-nowrap font-medium tabular">{count}건 선택됨</span>
      <button type="button" onClick={onClear} aria-label="선택 해제" className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <span className="h-5 w-px bg-white/20" aria-hidden />
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}
