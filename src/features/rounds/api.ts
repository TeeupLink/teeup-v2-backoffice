import type { BulkResult } from '@/components/data-table/bulk';
import { api } from '@/lib/api/client';
import type { MeetingStatus, Participant, RoundDetail, ScoreRow, Settlement, Team } from './types';

export const ROUNDS_PATH = '/admin/meetings/rounding';
const M = '/admin/meetings';

/** 공통 목록 파라미터 → 현행 /admin/meetings/rounding (BE#46 정규화 전, BE#59 기간·정렬) */
export function mapRoundsQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { q: search, ...rest } = q;
  return { ...rest, search };
}

export const fetchRound = (id: number) => api<RoundDetail>(`${M}/${id}`);
export const updateRoundStatus = (id: number, status: MeetingStatus) => api(`${M}/${id}`, { method: 'PUT', body: { status } });
export const deleteRound = (id: number) => api(`${M}/${id}`, { method: 'DELETE' });

export const fetchParticipants = (id: number) => api<Participant[]>(`${M}/${id}/participants`);

export const fetchTeams = (id: number) => api<Team[]>(`${M}/${id}/teams`);
export const createTeam = (id: number, name: string) => api<{ id: number }>(`${M}/${id}/teams`, { method: 'POST', body: { name } });
export const renameTeam = (id: number, teamId: number, name: string) => api(`${M}/${id}/teams/${teamId}`, { method: 'PUT', body: { name } });
export const deleteTeam = (id: number, teamId: number) => api(`${M}/${id}/teams/${teamId}`, { method: 'DELETE' });
export const setTeamMembers = (id: number, teamId: number, participantIds: number[]) =>
  api(`${M}/${id}/teams/${teamId}/members`, {
    method: 'PUT',
    body: { participant_ids: participantIds },
  });
export const autoFormTeams = (id: number, formation_mode: string, team_size: number) =>
  api(`${M}/${id}/teams/auto-formation`, {
    method: 'POST',
    body: { formation_mode, team_size },
  });

export const fetchScores = (id: number) => api<{ scores: ScoreRow[] }>(`${M}/${id}/scores`);
export const saveScores = (id: number, items: { participant_id: number; score: number }[]) =>
  api<BulkResult>(`${M}/${id}/scores/bulk`, { method: 'PUT', body: { items } });

export const fetchSettlement = (id: number) => api<{ settlement: Settlement | null }>(`${M}/${id}/settlement`).then((r) => r.settlement);

export type SettlementInput = { green_fee: number; caddy_fee: number; cart_fee: number; others: { title: string; amount: number }[]; notes: string };

/**
 * 라운딩 정산 저장 (덮어쓰기). 이 화면은 확정 참가자 전원 N분의 1 만 다룬다.
 * 대상은 참가자 id(participant_ids)로 보낸다 — user_id·guest_id 를 한 칸에 섞어 보내면 번호가 겹칠 수 있다.
 * 기타 항목은 백엔드 검증이 participants 를 요구해 둘 다 보낸다.
 */
export function saveSettlement(id: number, input: SettlementInput, confirmed: Participant[]) {
  const pids = confirmed.map((p) => p.id);
  const legacy = confirmed.map((p) => p.user_id ?? p.guest_id);
  const other = input.others.reduce((a, o) => a + o.amount, 0);
  return api(`${M}/${id}/settlement/rounding`, {
    method: 'POST',
    body: {
      green_fee: input.green_fee,
      caddy_fee: input.caddy_fee,
      cart_fee: input.cart_fee,
      other_fee: other,
      total_cost: input.green_fee + input.caddy_fee + input.cart_fee + other,
      notes: input.notes,
      settlement_method: 'EQUAL_SPLIT',
      green_fee_participant_ids: pids,
      caddy_fee_participant_ids: pids,
      cart_fee_participant_ids: pids,
      other_expense_items: input.others.map((o) => ({ title: o.title, amount: o.amount, participant_ids: pids, participants: legacy })),
    },
  });
}

export const markPaid = (id: number, expenseId: number, person: { user_id: number | null; guest_id: number | null }, isPaid: boolean) =>
  api(`${M}/${id}/expenses/${expenseId}/participants/mark-paid`, {
    method: 'PATCH',
    body: person.guest_id ? { guest_id: person.guest_id, is_paid: isPaid } : { user_id: person.user_id, is_paid: isPaid },
  });
