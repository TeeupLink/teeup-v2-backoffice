import { api } from '@/lib/api/client';
import type { BillingCycle, ClubDetail, ClubFee, ClubMember, ClubNotice, ClubStatus, Region, Regulation, RegulationCategory } from './types';

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

export const createClub = (body: Record<string, unknown>) => api<{ id: number }>(CLUBS_PATH, { method: 'POST', body });
export const updateClub = (id: number, body: Record<string, unknown>) => api(`${CLUBS_PATH}/${id}`, { method: 'PUT', body });

export const noticesPath = (id: number) => `${CLUBS_PATH}/${id}/notices`;
export const fetchNotice = (id: number, nid: number) => api<ClubNotice>(`${noticesPath(id)}/${nid}`);
export type NoticeInput = { title: string; content: string; is_important: boolean; is_private: boolean };
export const saveNotice = (id: number, nid: number | null, body: NoticeInput) =>
  nid ? api(`${noticesPath(id)}/${nid}`, { method: 'PUT', body }) : api(noticesPath(id), { method: 'POST', body });
export const deleteNotice = (id: number, nid: number) => api(`${noticesPath(id)}/${nid}`, { method: 'DELETE' });

const reg = (id: number) => `${CLUBS_PATH}/${id}/regulations`;
export const regulationsKey = (id: number) => ['club', id, 'regulations'] as const;
export const fetchRegulations = (id: number) => api<{ categories: RegulationCategory[] }>(reg(id)).then((r) => r.categories);
export const fetchRegulation = (id: number, rid: number) => api<Regulation & { category_id: number }>(`${reg(id)}/${rid}`);
export type RegulationInput = { category_id: number; title: string; content: string };
export const saveRegulation = (id: number, rid: number | null, body: RegulationInput) =>
  rid ? api(`${reg(id)}/${rid}`, { method: 'PUT', body }) : api(reg(id), { method: 'POST', body });
export const deleteRegulation = (id: number, rid: number) => api(`${reg(id)}/${rid}`, { method: 'DELETE' });
export const createCategory = (id: number, name: string) => api(`${reg(id)}/categories`, { method: 'POST', body: { name } });
export const renameCategory = (id: number, cid: number, name: string) => api(`${reg(id)}/categories/${cid}`, { method: 'PUT', body: { name } });
export const deleteCategory = (id: number, cid: number) => api(`${reg(id)}/categories/${cid}`, { method: 'DELETE' });

export const fetchFees = (id: number) => api<ClubFee[]>(`${CLUBS_PATH}/${id}/fees`);
export type FeeInput = { name: string; amount: number; cycle: BillingCycle; description: string; is_active: boolean };
export const saveFee = (id: number, fid: number | null, body: FeeInput) =>
  fid ? api(`${CLUBS_PATH}/${id}/fees/${fid}`, { method: 'PUT', body }) : api(`${CLUBS_PATH}/${id}/fees`, { method: 'POST', body });
export const deleteFee = (id: number, fid: number) => api(`${CLUBS_PATH}/${id}/fees/${fid}`, { method: 'DELETE' });
