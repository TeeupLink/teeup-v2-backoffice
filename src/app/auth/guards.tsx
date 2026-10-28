import { Navigate, Outlet, useLocation } from 'react-router';
import type { Access, Resource } from '@/lib/auth/permissions';
import { tokenStore } from '@/lib/auth/token';
import { ForbiddenPage } from '@/app/pages/ForbiddenPage';
import { FullScreenError, FullScreenLoader } from '@/components/ui/FullScreenLoader';
import { errorMessage } from '@/lib/api/errors';
import { useAuth } from './useAuth';

/** 로그인 필요. /me 가 올 때까지 전체 로딩 (메뉴 노출 방지) */
export function RequireAuth() {
  const { me, loading, error, retry } = useAuth();
  const location = useLocation();
  if (!tokenStore.get()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (error && !me) return <FullScreenError message={errorMessage(error)} onRetry={retry} />;
  if (loading || !me) return <FullScreenLoader />;
  return <Outlet />;
}

/** 라우트 단위 권한 (REQ-023). 권한 없으면 403 화면 */
export function RequireAccess({ resource, need = 'read' }: { resource: Resource; need?: Access }) {
  const { can } = useAuth();
  if (!can(resource, need)) return <ForbiddenPage />;
  return <Outlet />;
}
