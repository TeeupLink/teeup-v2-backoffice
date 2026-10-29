import { cn } from '@/lib/cn';

type Obj = Record<string, unknown> | null | undefined;

function show(v: unknown): string {
  if (v === undefined) return '';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 변경 전후 필드 비교 (화면설계서 3.4 JsonDiff). 바뀐 필드를 강조하고, 바뀌지 않은 필드는 흐리게 */
export function JsonDiff({ before, after }: { before: Obj; after: Obj }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (keys.length === 0) return <p className="text-sm text-slate-500">기록된 변경 내용이 없습니다.</p>;
  return (
    <div role="table" aria-label="변경 전후" className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      <div role="row" className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] bg-slate-50 text-xs font-medium text-slate-500">
        <span role="columnheader" className="px-3 py-2">필드</span>
        <span role="columnheader" className="px-3 py-2">이전</span>
        <span role="columnheader" className="px-3 py-2">{after == null ? '이후 (기록 없음 · 삭제 포함)' : '이후'}</span>
      </div>
      {keys.map((k) => {
        const b = before?.[k];
        const a = after?.[k];
        const changed = after != null && show(b) !== show(a);
        return (
          <div
            role="row"
            key={k}
            data-changed={changed || undefined}
            className={cn('grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] border-t border-slate-100 text-sm', !changed && 'text-slate-500')}
          >
            <span role="cell" className="break-all px-3 py-2 font-mono text-xs">{k}</span>
            <span role="cell" className={cn('break-all px-3 py-2', changed && 'bg-red-50 text-red-800')}>{show(b) || '-'}</span>
            <span role="cell" className={cn('break-all px-3 py-2', changed && 'bg-primary-50 text-primary-900')}>{after == null ? '' : show(a) || '-'}</span>
          </div>
        );
      })}
    </div>
  );
}
