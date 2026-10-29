import type { BulkResult, RowId } from '@/components/data-table/bulk';
import { api } from '@/lib/api/client';

export const REPORTS_PATH = '/admin/reports';
export const BLOCKS_PATH = '/admin/blocks';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
export type Person = { id: number; nickname: string; realname: string | null };

/** GET /admin/reports 행 (BE#68) */
export type ReportRow = {
  id: number;
  status: ReportStatus;
  reason: string;
  description: string | null;
  admin_note: string | null;
  reporter: Person | null;
  target: { type: string; id: number; name: string | null; link: string | null; status: string | null; club_id: number | null; exists: boolean };
  same_target_count: number;
  created_at: string | null;
  updated_at: string | null;
};
export type ReportDetail = ReportRow & { same_target: ReportRow[] };

export type BlockRow = { id: number; blocker: Person; blocked: Person; created_at: string | null };

export const REASON: Record<string, string> = {
  SPAM: '스팸·광고',
  ABUSE: '욕설·비방·괴롭힘',
  INAPPROPRIATE: '부적절한 콘텐츠',
  FRAUD: '사기·허위 정보',
  PRIVACY: '개인정보 노출',
  OTHER: '기타',
};
export const TARGET: Record<string, string> = { USER: '회원', CLUB: '클럽', MEETING: '모임', CLUB_NOTICE: '클럽 공지', REGULATION: '클럽 규정' };

/** 화면 탭 → 상태. 대기 탭은 대시보드 "신고 대기" 숫자와 같은 기준 */
export function mapReportsQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { tab, ...rest } = q;
  return { ...rest, status: typeof tab === 'string' && tab ? tab : undefined };
}

export const reportKey = (id: number) => ['report', id] as const;
export const fetchReport = (id: number) => api<ReportDetail>(`${REPORTS_PATH}/${id}`);
export const updateReport = (id: number, status: ReportStatus, admin_note: string | null) =>
  api<ReportRow>(`${REPORTS_PATH}/${id}`, { method: 'PUT', body: { status, admin_note } });
export const bulkReports = (ids: RowId[], status: ReportStatus, note?: string) =>
  api<BulkResult>(`${REPORTS_PATH}/bulk`, { method: 'POST', body: { ids, action: status, status, reason: note } });
export const deleteBlock = (id: number, reason: string) => api(`${BLOCKS_PATH}/${id}`, { method: 'DELETE', query: { reason } });
