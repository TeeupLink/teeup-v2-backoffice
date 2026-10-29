import { api } from '@/lib/api/client';
import type { AdminRole } from '@/lib/auth/permissions';

export const ADMINS_PATH = '/admin/admins';

/** GET /admin/admins 행·상세 (BE#66: last_login_at, 역할이 비면 null) */
export type AdminAccount = {
  id: number;
  email: string;
  name: string;
  phone_number: string | null;
  status: 'ACTIVE' | 'DEACTIVATED' | 'DELETED';
  role: AdminRole | null;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminCreateInput = { email: string; name: string; phone_number: string | null; role: AdminRole; password: string };
export type AdminUpdateInput = Partial<{ name: string; phone_number: string | null; role: AdminRole; status: 'ACTIVE' | 'DEACTIVATED' }>;

export const adminKey = (id: number) => ['admin-account', id] as const;
export const fetchAdmin = (id: number) => api<AdminAccount>(`${ADMINS_PATH}/${id}`);
export const createAdmin = (body: AdminCreateInput) => api<AdminAccount>(ADMINS_PATH, { method: 'POST', body });
export const updateAdmin = (id: number, body: AdminUpdateInput) => api<AdminAccount>(`${ADMINS_PATH}/${id}`, { method: 'PUT', body });
export const resetAdminPassword = (id: number, new_password: string) => api(`${ADMINS_PATH}/${id}/password`, { method: 'PUT', body: { new_password } });
export const deleteAdmin = (id: number, reason?: string) => api(`${ADMINS_PATH}/${id}`, { method: 'DELETE', query: { reason } });
