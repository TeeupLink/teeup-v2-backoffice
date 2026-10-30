import type { BulkResult, RowId } from '@/components/data-table/bulk';
import { api } from '@/lib/api/client';
import type { ActivityPage, HandicapHistory, UserClub, UserDetail, UserMeetings, UserTermsAgreements } from './types';

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

export function setUsersStatus(ids: RowId[], action: 'activate' | 'deactivate', reason?: string) {
  return api<BulkResult>(`${USERS_PATH}/bulk`, { method: 'POST', body: { ids, action, reason } });
}

export const fetchUser = (id: number) => api<UserDetail>(`${USERS_PATH}/${id}`);

/** 등록·수정 본문 (BE#58). 수정은 바뀐 항목만 보낸다 */
export type UserInput = Partial<{
  email: string;
  password: string;
  realname: string;
  nickname: string;
  phone_number: string | null;
  birthdate: string | null;
  gender: string | null;
  average_score_init: number | null;
  handicap_init: number | null;
  status: 'ACTIVE' | 'DEACTIVATED';
  reason: string;
}>;

export const createUser = (body: UserInput) => api<UserDetail>(USERS_PATH, { method: 'POST', body });
export const updateUser = (id: number, body: UserInput) => api<UserDetail>(`${USERS_PATH}/${id}`, { method: 'PUT', body });
export const deleteUser = (id: number, reason: string) => api(`${USERS_PATH}/${id}`, { method: 'DELETE', query: { reason } });

export const fetchUserClubs = (id: number) => api<{ clubs: UserClub[]; total_clubs: number }>(`${USERS_PATH}/${id}/clubs`);
export const updateMemberNote = (id: number, clubId: number, note: string) =>
  api<{ note: string | null }>(`${USERS_PATH}/${id}/clubs/${clubId}/note`, { method: 'PUT', body: { note } });
export const fetchUserTermsAgreements = (id: number) => api<UserTermsAgreements>(`${USERS_PATH}/${id}/terms-agreements`);
export const fetchUserMeetings = (id: number, page: number, limit: number) => api<UserMeetings>(`${USERS_PATH}/${id}/meetings`, { query: { page, limit } });
export const fetchHandicapHistory = (id: number, page: number, limit: number) =>
  api<HandicapHistory>(`${USERS_PATH}/${id}/handicap-history`, { query: { page, limit } });

export function fetchActivities(id: number, opts: { types?: string[]; from?: string; to?: string; cursor?: string | null }) {
  return api<ActivityPage>(`${USERS_PATH}/${id}/activities`, {
    query: { types: opts.types?.length ? opts.types : undefined, from: opts.from, to: opts.to, cursor: opts.cursor ?? undefined, size: 30 },
  });
}
