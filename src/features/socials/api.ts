import { api } from '@/lib/api/client';
import type { Participant } from '@/features/rounds/types';
import type { SocialDetail, SocialItem, SocialSettlement } from './types';

export const SOCIALS_PATH = '/admin/meetings/event';
const M = '/admin/meetings';

/** 공통 목록 파라미터 → 현행 /admin/meetings/event (BE#64 기간·정렬·유형) */
export function mapSocialsQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { q: search, ...rest } = q;
  return { ...rest, search };
}

export const fetchSocial = (id: number) => api<SocialDetail>(`${M}/${id}`);
export const createSocial = (body: Record<string, unknown>) => api<{ id: number }>(SOCIALS_PATH, { method: 'POST', body });
export const updateSocial = (id: number, body: Record<string, unknown>) => api(`${M}/${id}`, { method: 'PUT', body });
export const deleteSocial = (id: number) => api(`${M}/${id}`, { method: 'DELETE' });

export const fetchSocialSettlement = (id: number) => api<{ settlement: SocialSettlement | null }>(`${M}/${id}/settlement`).then((r) => r.settlement);

export type SocialSettlementInput = { items: Omit<SocialItem, 'id'>[]; notes: string };

/**
 * 소셜 정산 저장 (덮어쓰기). 회비 처리 항목을 뺀 금액을 확정 참가자 전원에게 10원 단위로 나눈다.
 * 대상은 참가자 id 로만 보낸다 — 회원·게스트 id 는 번호가 겹칠 수 있다 (BE#61).
 */
export function saveSocialSettlement(id: number, input: SocialSettlementInput, confirmed: Participant[]) {
  return api(`${M}/${id}/settlement/social`, {
    method: 'POST',
    body: {
      expense_items: input.items,
      total_cost: input.items.reduce((a, i) => a + i.amount, 0),
      settlement_targets: confirmed.map((p) => p.id),
      notes: input.notes,
    },
  });
}
