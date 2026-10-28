import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { setAuthErrorHandler } from '@/lib/api/client';
import { tokenStore } from '@/lib/auth/token';
import { can } from '@/lib/auth/permissions';
import { AuthContext, type AuthState } from './useAuth';
import { fetchMe, login as loginApi, logout as logoutApi, ME_KEY, type LoginInput } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = !!tokenStore.get();

  const meQuery = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, enabled: hasToken, retry: false, staleTime: 5 * 60_000 });

  const expire = useCallback(() => {
    tokenStore.clear();
    qc.clear();
    const here = location.pathname + location.search;
    if (!location.pathname.startsWith('/login')) {
      navigate(`/login?next=${encodeURIComponent(here)}&expired=1`, { replace: true });
    }
  }, [qc, navigate, location.pathname, location.search]);

  useEffect(() => {
    setAuthErrorHandler(expire);
    return () => setAuthErrorHandler(null);
  }, [expire]);

  const login = useCallback(
    async (input: LoginInput) => {
      const token = await loginApi(input);
      tokenStore.set(token);
      await qc.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe });
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      /* 서버 로그아웃 실패해도 로컬 세션은 끝낸다 */
    }
    tokenStore.clear();
    qc.clear();
    navigate('/login', { replace: true });
  }, [qc, navigate]);

  const me = hasToken ? (meQuery.data ?? null) : null;
  const value = useMemo<AuthState>(
    () => ({
      me,
      loading: hasToken && meQuery.isPending,
      error: meQuery.error,
      retry: () => void meQuery.refetch(),
      login,
      logout,
      can: (resource, need) => can(me?.role, resource, need),
    }),
    [me, hasToken, meQuery, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
