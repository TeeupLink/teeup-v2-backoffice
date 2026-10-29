import { api } from '@/lib/api/client';
import { isAdminRole, type Access, type AdminRole, type Resource } from '@/lib/auth/permissions';

export const ME_KEY = ['me'] as const;

export type Me = {
  id: number;
  email: string;
  name: string;
  phone_number: string | null;
  role: AdminRole | null;
  status: string;
  /** 백엔드 권한 표(BE#46). 없으면 프론트 표로 판단 */
  permissions?: Partial<Record<Resource, Access | null>>;
};

type MeResponse = Omit<Me, 'role'> & { role?: unknown };

export async function fetchMe(): Promise<Me> {
  const raw = await api<MeResponse>('/admin/me');
  return { ...raw, role: isAdminRole(raw.role) ? raw.role : null };
}

export type LoginInput = { email: string; password: string };

export async function login(input: LoginInput): Promise<string> {
  const res = await api<{ access_token: string }>('/admin/login', { method: 'POST', body: input, auth: false });
  return res.access_token;
}

export async function logout(): Promise<void> {
  await api('/admin/logout', { method: 'POST' });
}
