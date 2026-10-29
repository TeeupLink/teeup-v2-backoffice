import { api } from '@/lib/api/client';

export const NOTICES_PATH = '/admin/notices';

/** GET /admin/notices 행 (BE#65) */
export type NoticeRow = {
  id: number;
  title: string;
  is_important: boolean;
  is_published: boolean;
  view_count: number;
  author_name: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type NoticeDetail = NoticeRow & { content: string; attachment_file: string | null; web_view_link: string | null };

export type NoticeInput = { title: string; content: string; is_important: boolean; is_published: boolean };

export const fetchNotice = (id: number) => api<NoticeDetail>(`${NOTICES_PATH}/${id}`);
export const createNotice = (body: NoticeInput) => api<{ id: number }>(NOTICES_PATH, { method: 'POST', body });
export const updateNotice = (id: number, body: Partial<NoticeInput>) => api(`${NOTICES_PATH}/${id}`, { method: 'PUT', body });
export const deleteNotice = (id: number, reason?: string) => api(`${NOTICES_PATH}/${id}`, { method: 'DELETE', query: { reason } });
