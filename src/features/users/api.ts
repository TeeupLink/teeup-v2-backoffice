import { runSequential, type RowId } from '@/components/data-table/bulk';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

export const USERS_PATH = '/admin/users';

/**
 * 공통 목록 파라미터 → 현행 /admin/users 파라미터 (BE#46 정규화 전까지).
 * 현행 정렬은 id 오름·내림만 있으므로 가입일 정렬을 그것으로 대신한다.
 */
export function mapUsersQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { q: search, status, sort, ...rest } = q;
  return {
    ...rest,
    search,
    status_filter: status,
    sort_order: sort === 'created_at' ? 'oldest' : 'latest',
  };
}

export function setUsersStatus(ids: RowId[], status: 'ACTIVE' | 'DEACTIVATED') {
  // 일괄 API(/users/bulk, BE#46) 전까지 건별 호출
  return runSequential(ids, (id) => api(`${USERS_PATH}/${id}`, { method: 'PUT', body: { status } }), errorMessage);
}
