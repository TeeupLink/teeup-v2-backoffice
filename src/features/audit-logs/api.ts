import { api, download, type Query } from '@/lib/api/client';
import { toApiQuery, type ListState } from '@/components/data-table/listState';

export const AUDIT_PATH = '/admin/audit-logs';

export type AuditActor = { id: number | null; email: string; role: string | null };

export type AuditRow = {
  id: number;
  request_id: string;
  actor: AuditActor;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  method: string;
  path: string;
  status_code: number;
  result: 'SUCCESS' | 'FAIL';
  ip: string;
  created_at: string;
};

export type AuditDetail = AuditRow & {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  user_agent: string | null;
  related: AuditRow[];
};

export type MonthlyAdmin = {
  admin_id: number;
  email: string;
  view_pii: number;
  export: number;
  changes: number;
  max_daily_view_pii: number;
  flagged: boolean;
};

export type Monthly = {
  month: string;
  totals: { view_pii: number; export: number; login_fail: number; changes: number };
  by_admin: MonthlyAdmin[];
  review: { reviewer_admin_id: number; memo: string | null; reviewed_at: string } | null;
};

export const fetchAuditLog = (id: number) => api<AuditDetail>(`${AUDIT_PATH}/${id}`);

export const fetchMonthly = (month: string) => api<Monthly>(`${AUDIT_PATH}/monthly`, { query: { month } });

export const reviewMonth = (month: string, memo: string | undefined) =>
  api<Monthly>(`${AUDIT_PATH}/monthly/${month}/review`, { method: 'POST', body: { memo } });

/** 지금 보고 있는 필터 그대로 내려받는다 (페이지·정렬 제외). 사유는 백엔드 감사 로그(EXPORT)에 남는다 */
export function exportAuditLogs(state: ListState, reason: string) {
  const query: Query = { ...toApiQuery(state), page: undefined, size: undefined, sort: undefined, reason };
  return download(`${AUDIT_PATH}/export`, { query, filename: 'audit-logs.csv' });
}
