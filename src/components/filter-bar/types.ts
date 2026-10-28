import type { ReactNode } from 'react';
import type { FilterValue, ListConfig } from '@/components/data-table/listState';

export type Option = { value: string; label: string };

export type FilterDef =
  | { kind: 'select'; key: string; label: string; options: Option[] }
  | { kind: 'multi'; key: string; label: string; options: Option[] }
  | { kind: 'dateRange'; key: string; toKey: string; label: string }
  | {
      kind: 'custom';
      key: string;
      label: string;
      render: (value: FilterValue | undefined, onChange: (v: FilterValue | undefined) => void) => ReactNode;
      chipLabel: (value: FilterValue) => string;
    };

/** 필터 정의에서 useListState 설정의 filters 항목을 만든다 */
export function filterKeys(defs: FilterDef[], extra: string[] = []): NonNullable<ListConfig['filters']> {
  const out: NonNullable<ListConfig['filters']> = {};
  for (const d of defs) {
    out[d.key] = d.kind === 'multi' ? 'multi' : 'single';
    if (d.kind === 'dateRange') out[d.toKey] = 'single';
  }
  for (const k of extra) out[k] = 'single';
  return out;
}
