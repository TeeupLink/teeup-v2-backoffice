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
