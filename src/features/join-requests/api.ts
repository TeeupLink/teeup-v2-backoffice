import type { BulkResult, RowId } from '@/components/data-table/bulk';
import { api } from '@/lib/api/client';

export const JOIN_REQUESTS_PATH = '/admin/join-requests';

export type JoinRequestRow = {
  membership_id: number;
  club: { id: number; display_id: string | null; name: string };
  user: { id: number; nickname: string; name: string | null; average_score: number | null };
  created_at: string | null;
};

export function processJoinRequests(ids: RowId[], action: 'approve' | 'reject', reason?: string) {
  return api<BulkResult>(`${JOIN_REQUESTS_PATH}/bulk`, { method: 'POST', body: { ids, action, reason } });
}

export const JOIN_HISTORY_PATH = '/admin/join-requests/history';

/** 처리 이력 행 — 거절된 신청은 행이 지워지므로 감사 로그 스냅샷에서 온다 (BE#49) */
export type JoinHistoryRow = {
  id: number;
  membership_id: number | string;
  action: 'APPROVE' | 'REJECT';
  club: { id: number | null; name: string | null };
  user: { id: number | null; nickname: string | null; name: string | null };
  reason: string | null;
  processed_by: { id: number | null; email: string };
  requested_at: string | null;
  processed_at: string | null;
};
