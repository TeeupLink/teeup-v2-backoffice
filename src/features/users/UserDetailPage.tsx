import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { useAuth } from '@/app/auth/useAuth';
import { StatusBadge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDate, formatDateTime } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { deleteUser, fetchUser, updateUser } from './api';
import { ActivityTab } from './detail/ActivityTab';
import { ClubsTab } from './detail/ClubsTab';
import { GolfTab } from './detail/GolfTab';
import { MeetingsTab } from './detail/MeetingsTab';
import { OverviewTab } from './detail/OverviewTab';
import { DEVICE } from './labels';
import type { UserDetail } from './types';

// SCR-032 회원 상세 (화면설계서 4.4, F-032). 결제·약관 탭은 #31·#30 에서 붙인다.

function Actions({ user }: { user: UserDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const active = user.status === 'ACTIVE';

  const toggle = async () => {
    const r = await confirm({
      title: active ? '이 회원을 비활성화할까요?' : '이 회원을 다시 활성화할까요?',
      description: active ? '비활성화된 회원은 앱에 로그인할 수 없습니다.' : undefined,
      confirmText: active ? '비활성화' : '활성화',
      tone: active ? 'danger' : 'default',
      reason: { required: active, placeholder: '감사 로그에 남습니다' },
    });
    if (!r) return;
    try {
      await updateUser(user.id, { status: active ? 'DEACTIVATED' : 'ACTIVE', reason: r.reason || undefined });
      await qc.invalidateQueries({ queryKey: ['user', user.id] });
      await qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(active ? '비활성화했습니다' : '활성화했습니다');
    } catch (e) {
      toast.error('상태를 바꾸지 못했습니다', { description: errorMessage(e) });
    }
  };

  const remove = async () => {
    const r = await confirm({
      title: `${user.nickname} 회원을 삭제할까요?`,
      description: '탈퇴 처리되어 목록에서 사라지고, 닉네임은 7일간 다시 쓸 수 없습니다. 되돌릴 수 없습니다.',
      confirmText: '삭제',
      tone: 'danger',
      reason: { required: true, placeholder: '감사 로그에 남습니다' },
    });
    if (!r) return;
    try {
      await deleteUser(user.id, r.reason);
      await qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('회원을 삭제했습니다');
      navigate('/users', { replace: true });
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };

  return (
    <>
      <Button onClick={() => void toggle()}>{active ? '비활성화' : '활성화'}</Button>
      <Link to={`/users/${user.id}/edit`}>
        <Button variant="primary">
          <Pencil className="h-4 w-4" aria-hidden />
          수정
        </Button>
      </Link>
      <Button variant="danger-ghost" aria-label="회원 삭제" onClick={() => void remove()}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}

export function UserDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const pii = usePII();
  const q = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id), enabled: Number.isInteger(id) });

  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="회원을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const u = q.data;
  const base = `/users/${id}`;
  return (
    <>
      <DetailHeader
        backTo="/users"
        title={
          <>
            {u.nickname}
            <span className="ml-2 text-sm font-normal text-slate-500">{pii.name(u.realname)}</span>
          </>
        }
        badges={<StatusBadge domain="user" value={u.status} />}
        meta={
          <>
            <span>평균 {u.average_score ?? u.average_score_init ?? '-'} · 핸디 {u.handicap ?? u.handicap_init ?? '-'}</span>
            <span>가입 {formatDate(u.created_at)}</span>
            <span>
              최근 로그인 {u.last_login_at ? formatDateTime(u.last_login_at) : '-'}
              {u.last_login_device && ` ${DEVICE[u.last_login_device] ?? u.last_login_device}`}
            </span>
          </>
        }
        actions={can('users', 'write') && u.status !== 'DELETED' && <Actions user={u} />}
      />
      <RouteTabs
        tabs={[
          { to: base, label: '기본정보', end: true },
          { to: `${base}/golf`, label: '골프' },
          { to: `${base}/clubs`, label: '클럽', count: u.club_count },
          { to: `${base}/meetings`, label: '모임' },
          { to: `${base}/activity`, label: '활동' },
        ]}
      />
      <Routes>
        <Route index element={<OverviewTab user={u} />} />
        <Route path="golf" element={<GolfTab user={u} />} />
        <Route path="clubs" element={<ClubsTab userId={id} />} />
        <Route path="meetings" element={<MeetingsTab userId={id} />} />
        <Route path="activity" element={<ActivityTab userId={id} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
