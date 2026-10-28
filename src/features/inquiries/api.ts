import type { BulkResult, RowId } from '@/components/data-table/bulk';
import { api } from '@/lib/api/client';

export const INQUIRIES_PATH = '/admin/inquiries';

export type InquiryRow = {
  id: number;
  title: string;
  type: string;
  status: string;
  user: { id: number; nickname: string };
  response_count: number;
  created_at: string | null;
};

export type InquiryResponseItem = {
  id: number;
  content: string;
  is_internal: boolean;
  admin_name: string | null;
  created_at: string | null;
};

export type InquiryDetail = {
  inquiry: {
    id: number;
    title: string;
    content: string;
    type: string;
    status: string;
    user_id: number;
    user_nickname: string;
    created_at: string | null;
    updated_at: string | null;
  };
  responses: InquiryResponseItem[];
};

/** 화면 탭 → 백엔드 상태값 (DB설계서 6장: 문의 6종을 탭 4개로 묶음) */
export const TAB_STATUSES: Record<string, string[]> = {
  unanswered: ['PENDING', 'SUBMITTED'],
  in_progress: ['IN_PROGRESS'],
  answered: ['RESOLVED', 'COMPLETED'],
  closed: ['CLOSED'],
};

export function mapInquiriesQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { tab, ...rest } = q;
  return { ...rest, status: typeof tab === 'string' ? TAB_STATUSES[tab] : undefined };
}

export const fetchInquiry = (id: number) => api<InquiryDetail>(`${INQUIRIES_PATH}/${id}`);

export const updateInquiryStatus = (id: number, status: string) =>
  api(`${INQUIRIES_PATH}/${id}/status`, { method: 'PUT', body: { status } });

export const createResponse = (id: number, body: { content: string; is_internal: boolean; set_status?: string }) =>
  api<{ id: number; status: string }>(`${INQUIRIES_PATH}/${id}/responses`, { method: 'POST', body });

export const updateResponse = (id: number, rid: number, content: string) =>
  api(`${INQUIRIES_PATH}/${id}/responses/${rid}`, { method: 'PUT', body: { content } });

export const deleteResponse = (id: number, rid: number) => api(`${INQUIRIES_PATH}/${id}/responses/${rid}`, { method: 'DELETE' });

export const bulkInquiryStatus = (ids: RowId[], status: string) =>
  api<BulkResult>(`${INQUIRIES_PATH}/bulk`, { method: 'POST', body: { ids, action: 'status', status } });

/** 현재 목록 다음의 미답변 문의 id */
export async function nextUnanswered(currentId: number): Promise<number | null> {
  const res = await api<{ items: InquiryRow[] }>(INQUIRIES_PATH, {
    query: { status: TAB_STATUSES.unanswered, size: 100, sort: 'created_at' },
  });
  return res.items.find((i) => i.id !== currentId)?.id ?? null;
}
