import { createContext, useContext } from 'react';
import type { Access, Resource } from '@/lib/auth/permissions';
import type { LoginInput, Me } from './session';

export type AuthState = {
  me: Me | null;
  /** 토큰은 있고 /me 를 기다리는 중 — 이 동안 메뉴를 그리지 않는다 (REQ-024) */
  loading: boolean;
  /** /me 가 인증 외 이유로 실패한 경우 */
  error: unknown;
  retry: () => void;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  can: (resource: Resource, need?: Access) => boolean;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 씁니다');
  return ctx;
}
