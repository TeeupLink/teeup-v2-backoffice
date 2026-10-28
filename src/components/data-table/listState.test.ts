import { ALL, applyPatch, hasActiveFilters, parseListState, serializeListState, toApiQuery, type ListConfig } from './listState';

const cfg: ListConfig = {
  filters: { status: 'single', type: 'multi', from: 'single' },
  defaultSort: '-created_at',
  sortable: ['created_at', 'name'],
  defaults: { status: 'PENDING' },
};
const sp = (s: string) => new URLSearchParams(s);

describe('parseListState', () => {
  it('비어 있으면 기본값', () => {
    expect(parseListState(sp(''), cfg)).toEqual({ page: 1, size: 20, sort: '-created_at', q: undefined, filters: { status: 'PENDING' } });
  });

  it('URL 값을 읽고 다중 필터는 배열로', () => {
    const s = parseListState(sp('q=김&status=ACTIVE&type=A&type=B&page=3&size=50&sort=name'), cfg);
    expect(s).toMatchObject({ q: '김', page: 3, size: 50, sort: 'name', filters: { status: 'ACTIVE', type: ['A', 'B'] } });
  });

  it.each([
    ['page=0', { page: 1 }],
    ['page=abc', { page: 1 }],
    ['size=33', { size: 20 }],
    ['sort=password', { sort: '-created_at' }],
  ])('잘못된 값 %s 는 기본값으로', (q, expected) => {
    expect(parseListState(sp(q), cfg)).toMatchObject(expected);
  });

  it('설정에 없는 키는 무시', () => {
    expect(parseListState(sp('evil=1'), cfg).filters).toEqual({ status: 'PENDING' });
  });
});

describe('serialize — 기본값은 URL 에 쓰지 않는다', () => {
  it('왕복해도 같은 상태', () => {
    const s = parseListState(sp('q=a&status=ACTIVE&type=X&page=2&size=100&sort=name'), cfg);
    expect(parseListState(serializeListState(s, cfg), cfg)).toEqual(s);
  });

  it('기본 상태면 빈 쿼리', () => {
    expect(serializeListState(parseListState(sp(''), cfg), cfg).toString()).toBe('');
  });
});

describe('applyPatch', () => {
  const base = parseListState(sp('page=4&status=ACTIVE'), cfg);

  it('필터·검색·정렬·크기를 바꾸면 1페이지로', () => {
    expect(applyPatch(base, { q: 'x' }).page).toBe(1);
    expect(applyPatch(base, { filters: { type: ['A'] } }).page).toBe(1);
    expect(applyPatch(base, { sort: 'name' }).page).toBe(1);
    expect(applyPatch(base, { size: 50 }).page).toBe(1);
  });

  it('페이지만 바꾸면 필터 유지', () => {
    expect(applyPatch(base, { page: 5 })).toMatchObject({ page: 5, filters: { status: 'ACTIVE' } });
  });

  it('undefined·빈 배열은 필터 제거', () => {
    expect(applyPatch(base, { filters: { status: undefined } }).filters.status).toBeUndefined();
    expect(applyPatch({ ...base, filters: { type: ['A'] } }, { filters: { type: [] } }).filters.type).toBeUndefined();
  });
});

describe('기본 탭이 있는 필터의 "전체"', () => {
  it('ALL 은 URL 에 남고 API 로는 보내지 않는다', () => {
    const s = applyPatch(parseListState(sp(''), cfg), { filters: { status: ALL } });
    expect(serializeListState(s, cfg).get('status')).toBe(ALL);
    expect(toApiQuery(s).status).toBeUndefined();
  });
});

describe('hasActiveFilters', () => {
  it('기본값만 있으면 false, 검색이나 다른 값이 있으면 true', () => {
    expect(hasActiveFilters(parseListState(sp(''), cfg), cfg)).toBe(false);
    expect(hasActiveFilters(parseListState(sp('q=a'), cfg), cfg)).toBe(true);
    expect(hasActiveFilters(parseListState(sp('status=ACTIVE'), cfg), cfg)).toBe(true);
  });
});
