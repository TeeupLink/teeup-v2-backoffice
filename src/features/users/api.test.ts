import { mapUsersQuery } from './api';

describe('mapUsersQuery — 현행 /admin/users 파라미터', () => {
  it('q·status·sort 를 search·status_filter·sort_order 로', () => {
    expect(mapUsersQuery({ page: 2, size: 20, limit: 20, q: '김', status: 'ACTIVE', sort: '-created_at' })).toEqual({
      page: 2,
      size: 20,
      limit: 20,
      search: '김',
      status_filter: 'ACTIVE',
      sort_order: 'latest',
    });
    expect(mapUsersQuery({ sort: 'created_at' }).sort_order).toBe('oldest');
  });
});
