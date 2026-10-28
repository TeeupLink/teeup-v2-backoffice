export type Page<T> = { items: T[]; total: number; page: number; size: number };

type Loose = Record<string, unknown>;

const ARRAY_KEYS = ['items', 'data', 'users', 'members', 'categories', 'expenses', 'results'];

/**
 * 목록 응답을 공통 envelope 으로 바꾼다.
 * 백엔드 정규화(BE#46) 전까지 기존 9종 형식을 여기 한 곳에서 흡수한다.
 * page 는 항상 1-base 로 돌려준다.
 */
export function toPage<T>(raw: unknown, requested: { page: number; size: number }): Page<T> {
  if (Array.isArray(raw)) {
    return { items: raw as T[], total: raw.length, page: 1, size: raw.length || requested.size };
  }
  const r = (raw ?? {}) as Loose;
  const key = ARRAY_KEYS.find((k) => Array.isArray(r[k]));
  const items = (key ? r[key] : []) as T[];
  const total = num(r.total) ?? num(r.total_count) ?? num(r.total_members) ?? items.length;
  const size = num(r.size) ?? num(r.limit) ?? requested.size;
  return { items, total, page: requested.page, size };
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
