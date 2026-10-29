import { toPage } from './envelope';

const req = { page: 2, size: 20 };

describe('toPage — 기존 응답 형식 흡수', () => {
  it.each([
    ['공통 envelope', { items: [1, 2], total: 42, page: 2, size: 20 }, 42],
    ['data/limit', { data: [1, 2], total: 42, page: 2, limit: 20, total_pages: 3 }, 42],
    ['faq items', { items: [1, 2], total: 42 }, 42],
    ['클럽 멤버', { members: [1, 2], total_members: 42 }, 42],
    ['회원 검색', { success: true, users: [1, 2], total: 42 }, 42],
  ])('%s', (_name, raw, total) => {
    const p = toPage<number>(raw, req);
    expect(p.items).toEqual([1, 2]);
    expect(p.total).toBe(total);
    expect(p.page).toBe(2);
  });

  it('배열만 오면 전체를 한 페이지로', () => {
    expect(toPage([1, 2, 3], req)).toEqual({ items: [1, 2, 3], total: 3, page: 1, size: 3 });
  });

  it('total 이 없으면 items 길이', () => {
    expect(toPage({ data: [1] }, req).total).toBe(1);
  });
});
