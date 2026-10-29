import { api } from '@/lib/api/client';

export const FAQ_PATH = '/admin/faq';
const CATS = '/admin/faq-categories';

export type FaqCategory = { id: number; title: string; order: number; is_active: boolean; faq_count: number };

export type Faq = {
  id: number;
  question: string;
  answer: string;
  category_id: number | null;
  category_title: string | null;
  order: number;
  is_active: boolean;
  view_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type FaqInput = { question: string; answer: string; category_id: number | null; is_active: boolean };

/** 공통 목록 파라미터 → 현행 /admin/faq (검색어 이름이 search) */
export function mapFaqQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { q: search, ...rest } = q;
  return { ...rest, search };
}

export const categoriesKey = ['faq-categories'] as const;
export const fetchCategories = () => api<FaqCategory[]>(CATS);
export const createCategory = (title: string, order: number) => api(CATS, { method: 'POST', body: { title, order } });
export const updateCategory = (id: number, body: Partial<Pick<FaqCategory, 'title' | 'order' | 'is_active'>>) => api(`${CATS}/${id}`, { method: 'PUT', body });
export const deleteCategory = (id: number) => api(`${CATS}/${id}`, { method: 'DELETE' });

export const fetchFaq = (id: number) => api<Faq>(`${FAQ_PATH}/${id}`);
/** 한 카테고리 전체 (순서 바꾸기용). 카테고리당 100개를 넘지 않는다고 본다 */
export const fetchCategoryFaqs = (categoryId: string) =>
  api<{ items: Faq[] }>(FAQ_PATH, { query: { category_id: categoryId, limit: 100 } }).then((r) => r.items);
export const createFaq = (body: FaqInput) => api(FAQ_PATH, { method: 'POST', body });
export const updateFaq = (id: number, body: Partial<FaqInput>) => api(`${FAQ_PATH}/${id}`, { method: 'PUT', body });
export const deleteFaq = (id: number) => api(`${FAQ_PATH}/${id}`, { method: 'DELETE' });
export const toggleFaq = (id: number) => api(`${FAQ_PATH}/${id}/toggle-active`, { method: 'PATCH' });
export const reorderFaqs = (ids: number[]) => api('/admin/faq-order', { method: 'PUT', body: { ids } });
