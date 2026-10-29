import { api } from '@/lib/api/client';
import type { ClubDetail, ClubMember, ClubStatus, Region } from './types';

export const CLUBS_PATH = '/admin/clubs';

/** 공통 목록 파라미터 → 현행 /admin/clubs (BE#46 정규화 전, BE#62 필터·정렬). 삭제된 클럽은 뺀다 */
export function mapClubsQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { q: search, status, ...rest } = q;
  return { ...rest, search, status_filter: status, include_deleted: false };
}

export const fetchClub = (id: number) => api<ClubDetail>(`${CLUBS_PATH}/${id}`);
export const setClubStatus = (id: number, status: ClubStatus, reason: string) => api(`${CLUBS_PATH}/${id}`, { method: 'PUT', body: { status, reason } });
export const deleteClub = (id: number, reason: string) => api(`${CLUBS_PATH}/${id}`, { method: 'DELETE', query: { reason } });

export const fetchMembers = (id: number) => api<{ members: ClubMember[]; total_members: number }>(`${CLUBS_PATH}/${id}/members`);
export const setMemberRole = (id: number, userId: number, role: 'MEMBER' | 'MANAGER') =>
  api(`${CLUBS_PATH}/${id}/members/${userId}/role`, { method: 'PUT', body: { new_role: role } });
export const changeLeader = (id: number, userId: number, reason?: string) => api(`${CLUBS_PATH}/${id}/leader`, { method: 'POST', body: { new_leader_id: userId, reason } });
export const removeMember = (id: number, userId: number, reason: string) => api(`${CLUBS_PATH}/${id}/members/${userId}`, { method: 'DELETE', query: { reason } });

export const fetchSidoList = () => api<Region[]>('/sido-list');
export const fetchGunguList = (sido: string) => api<Region[]>('/gungu-list', { query: { sido_code: sido } });
