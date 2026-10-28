import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ListController } from '@/components/data-table/useListState';
import type { FilterValue } from '@/components/data-table/listState';
import { MultiSelect } from './MultiSelect';
import { SearchInput } from './SearchInput';
import type { FilterDef } from './types';

const selectCls =
  'h-9 rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';
const dateCls =
  'h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

type Props = {
  list: ListController;
  defs?: FilterDef[];
  searchPlaceholder?: string;
  /** false 면 검색창 없음 */
  search?: boolean;
  /** 필터 오른쪽 끝 (보조 작업) */
  trailing?: ReactNode;
};

function labelOf(def: FilterDef, value: FilterValue): string {
  switch (def.kind) {
    case 'select':
      return def.options.find((o) => o.value === value)?.label ?? String(value);
    case 'multi':
      return ([] as string[])
        .concat(value)
        .map((v) => def.options.find((o) => o.value === v)?.label ?? v)
        .join(', ');
    case 'dateRange':
      return String(value);
    case 'custom':
      return def.chipLabel(value);
  }
}

/** 검색 → select → 기간 순서, 적용 필터는 칩으로 (REQ-003) */
export function FilterBar({ list, defs = [], searchPlaceholder, search = true, trailing }: Props) {
  const { state, update, config } = list;
  const set = (key: string, v: FilterValue | undefined) => update({ filters: { [key]: v } });

  const chips: { key: string; text: string; clear: () => void }[] = [];
  if (state.q) chips.push({ key: 'q', text: `검색: ${state.q}`, clear: () => update({ q: '' }) });
  for (const def of defs) {
    if (def.kind === 'dateRange') {
      const from = state.filters[def.key] as string | undefined;
      const to = state.filters[def.toKey] as string | undefined;
      if (from || to)
        chips.push({
          key: def.key,
          text: `${def.label}: ${from ?? ''} ~ ${to ?? ''}`,
          clear: () => update({ filters: { [def.key]: undefined, [def.toKey]: undefined } }),
        });
      continue;
    }
    const v = state.filters[def.key];
    const isDefault = JSON.stringify(v) === JSON.stringify(config.defaults?.[def.key]);
    if (v !== undefined && !isDefault) chips.push({ key: def.key, text: `${def.label}: ${labelOf(def, v)}`, clear: () => set(def.key, undefined) });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <SearchInput value={state.q ?? ''} placeholder={searchPlaceholder} onChange={(v, opts) => update({ q: v }, opts)} />
        )}
        {defs.map((def) => {
          switch (def.kind) {
            case 'select':
              return (
                <select
                  key={def.key}
                  aria-label={def.label}
                  value={(state.filters[def.key] as string | undefined) ?? ''}
                  onChange={(e) => set(def.key, e.target.value || undefined)}
                  className={selectCls}
                >
                  <option value="">{def.label}: 전체</option>
                  {def.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              );
            case 'multi':
              return (
                <MultiSelect
                  key={def.key}
                  label={def.label}
                  options={def.options}
                  value={([] as string[]).concat(state.filters[def.key] ?? [])}
                  onChange={(v) => set(def.key, v)}
                />
              );
            case 'dateRange':
              return (
                <div key={def.key} className="flex items-center gap-1" role="group" aria-label={def.label}>
                  <input
                    type="date"
                    aria-label={`${def.label} 시작`}
                    value={(state.filters[def.key] as string | undefined) ?? ''}
                    max={(state.filters[def.toKey] as string | undefined) ?? undefined}
                    onChange={(e) => set(def.key, e.target.value || undefined)}
                    className={dateCls}
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="date"
                    aria-label={`${def.label} 끝`}
                    value={(state.filters[def.toKey] as string | undefined) ?? ''}
                    min={(state.filters[def.key] as string | undefined) ?? undefined}
                    onChange={(e) => set(def.toKey, e.target.value || undefined)}
                    className={dateCls}
                  />
                </div>
              );
            case 'custom':
              return <div key={def.key}>{def.render(state.filters[def.key], (v) => set(def.key, v))}</div>;
          }
        })}
        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500">적용:</span>
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-0.5 pl-2.5 pr-1 font-medium text-primary-800">
              {c.text}
              <button type="button" onClick={c.clear} aria-label={`${c.text} 해제`} className="rounded-full p-0.5 hover:bg-primary-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={() =>
                update({
                  q: '',
                  filters: Object.fromEntries(
                    defs.flatMap((d) => (d.kind === 'dateRange' ? [[d.key, undefined], [d.toKey, undefined]] : [[d.key, undefined]])),
                  ),
                })
              }
              className="ml-1 text-slate-500 underline-offset-2 hover:underline"
            >
              모두 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
