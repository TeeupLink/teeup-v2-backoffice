import { cn } from '@/lib/cn';
import { ALL } from '@/components/data-table/listState';
import type { ListController } from '@/components/data-table/useListState';

export type TabOption = { value: string; label: string; count?: number | null };

/**
 * 목록 상단 상태 탭 (REQ-006). value '' 는 "전체".
 * 탭 값은 URL 필터 키(filterKey)에 저장한다.
 */
export function StatusTabs({ list, filterKey, options }: { list: ListController; filterKey: string; options: TabOption[] }) {
  // 기본 탭이 "전체"가 아니면(예: 미답변) "전체"를 URL 에 명시해야 기본값으로 되돌아가지 않는다
  const hasDefault = list.config.defaults?.[filterKey] !== undefined;
  const raw = (list.state.filters[filterKey] as string | undefined) ?? '';
  const current = raw === ALL ? '' : raw;
  return (
    <div role="tablist" aria-label="상태" className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200">
      {options.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value || 'all'}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => list.update({ filters: { [filterKey]: o.value || (hasDefault ? ALL : undefined) } })}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'border-primary-600 text-primary-800' : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {o.label}
            {o.count != null && (
              <span className={cn('rounded-full px-1.5 text-xs tabular', active ? 'bg-primary-50 text-primary-800' : 'bg-slate-100 text-slate-600')}>
                {o.count.toLocaleString('ko-KR')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
