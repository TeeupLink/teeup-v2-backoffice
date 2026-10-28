/**
 * 목록 상태(검색·필터·정렬·페이지)를 URL 쿼리스트링과 동기화한다 (REQ-002).
 * 새로고침·뒤로가기·링크 공유 시 같은 결과가 나와야 한다.
 */
export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_SIZE = 20;
/** 기본값이 있는 필터에서 "전체"를 뜻하는 URL 값. API 로는 보내지 않는다 */
export const ALL = 'all';

export type FilterValue = string | string[];

export type ListState = {
  page: number;
  size: number;
  /** `field` 오름차순, `-field` 내림차순 */
  sort?: string;
  q?: string;
  filters: Record<string, FilterValue>;
};

export type ListConfig = {
  /** URL 에서 읽을 필터 키. 배열이면 다중 값 */
  filters?: Record<string, 'single' | 'multi'>;
  defaultSort?: string;
  /** 탭 등 기본값이 있는 필터 (URL 에 없을 때 적용, 기본값과 같으면 URL 에서 뺀다) */
  defaults?: Record<string, FilterValue>;
  /** 정렬 허용 필드. 그 외 값이 URL 에 오면 무시한다 */
  sortable?: string[];
};

const RESERVED = new Set(['page', 'size', 'sort', 'q']);

function positiveInt(v: string | null): number | undefined {
  if (!v || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n >= 1 ? n : undefined;
}

export function parseListState(sp: URLSearchParams, config: ListConfig = {}): ListState {
  const page = positiveInt(sp.get('page')) ?? 1;
  const sizeRaw = positiveInt(sp.get('size'));
  const size = sizeRaw && (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : DEFAULT_SIZE;

  const sortRaw = sp.get('sort') ?? undefined;
  const sortField = sortRaw?.replace(/^-/, '');
  const sort =
    sortRaw && sortField && (!config.sortable || config.sortable.includes(sortField)) ? sortRaw : config.defaultSort;

  const q = sp.get('q')?.trim() || undefined;

  const filters: Record<string, FilterValue> = {};
  for (const [key, kind] of Object.entries(config.filters ?? {})) {
    if (RESERVED.has(key)) continue;
    const values = sp.getAll(key).filter(Boolean);
    if (values.length) filters[key] = kind === 'multi' ? values : values[0]!;
    else if (config.defaults?.[key] !== undefined) filters[key] = config.defaults[key]!;
  }
  return { page, size, sort, q, filters };
}

function sameValue(a: FilterValue | undefined, b: FilterValue | undefined): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = ([] as string[]).concat(a ?? []).sort();
    const y = ([] as string[]).concat(b ?? []).sort();
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }
  return a === b;
}

/** 기본값과 같은 항목은 URL 에 쓰지 않는다 — URL 을 짧고 안정적으로 */
export function serializeListState(state: ListState, config: ListConfig = {}): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.q) sp.set('q', state.q);
  for (const [key, value] of Object.entries(state.filters)) {
    if (sameValue(value, config.defaults?.[key])) continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else if (value !== '') sp.set(key, value);
  }
  if (state.sort && state.sort !== config.defaultSort) sp.set('sort', state.sort);
  if (state.page > 1) sp.set('page', String(state.page));
  if (state.size !== DEFAULT_SIZE) sp.set('size', String(state.size));
  return sp;
}

export type ListPatch = Partial<Omit<ListState, 'filters'>> & { filters?: Record<string, FilterValue | undefined> };

/** 검색·필터·정렬·크기가 바뀌면 1페이지로 돌아간다 */
export function applyPatch(state: ListState, patch: ListPatch): ListState {
  const filters = { ...state.filters };
  for (const [k, v] of Object.entries(patch.filters ?? {})) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete filters[k];
    else filters[k] = v;
  }
  const resetsPage = patch.q !== undefined || patch.filters !== undefined || patch.sort !== undefined || patch.size !== undefined;
  return {
    ...state,
    ...patch,
    q: patch.q !== undefined ? patch.q.trim() || undefined : state.q,
    filters,
    page: patch.page ?? (resetsPage ? 1 : state.page),
  };
}

/** API 쿼리 객체로 변환 */
export function toApiQuery(state: ListState): Record<string, string | number | string[] | undefined> {
  const filters = Object.fromEntries(Object.entries(state.filters).filter(([, v]) => v !== ALL));
  return { page: state.page, size: state.size, sort: state.sort, q: state.q, ...filters };
}

/** 기본값이 아닌 필터가 하나라도 있는가 (빈 상태 문구 구분용) */
export function hasActiveFilters(state: ListState, config: ListConfig = {}): boolean {
  if (state.q) return true;
  return Object.entries(state.filters).some(([k, v]) => !sameValue(v, config.defaults?.[k]));
}
