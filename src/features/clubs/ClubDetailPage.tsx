import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { useAuth } from '@/app/auth/useAuth';
import { Badge, StatusBadge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { Button } from '@/components/ui/Button';
import { JoinRequestsTable } from '@/features/join-requests/JoinRequestsPage';
import { RoundsTable } from '@/features/rounds/RoundsListPage';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { deleteClub, fetchClub, setClubStatus } from './api';
import { FeesTab } from './detail/FeesTab';
import { MembersTab } from './detail/MembersTab';
import { NoticesTab } from './detail/NoticesTab';
import { OverviewTab } from './detail/OverviewTab';
import { RegulationsTab } from './detail/RegulationsTab';
import { CLUB_TYPE } from './labels';
import type { ClubDetail } from './types';

// SCR-042 클럽 상세 (화면설계서 4.5, F-043~047)

function Actions({ club }: { club: ClubDetail }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const active = club.status === 'ACTIVE';
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['club', club.id] });
    await qc.invalidateQueries({ queryKey: ['clubs'] });
  };

  const toggle = async () => {
    const r = await confirm({
      title: active ? '클럽을 비활성화할까요?' : '클럽을 다시 활성화할까요?',
      description: active ? '비활성 클럽은 앱 목록에서 숨겨지고 새 가입신청을 받지 않습니다.' : undefined,
      confirmText: active ? '비활성화' : '활성화',
      tone: active ? 'danger' : 'default',
      reason: { required: true, placeholder: '감사 로그에 남습니다' },
    });
    if (!r) return;
    try {
      await setClubStatus(club.id, active ? 'INACTIVE' : 'ACTIVE', r.reason);
      await refresh();
      toast.success(active ? '비활성화했습니다' : '활성화했습니다');
    } catch (e) {
      toast.error('상태를 바꾸지 못했습니다', { description: errorMessage(e) });
    }
  };

  const remove = async () => {
    // 예정 모임 경고 (F-042)
    const upcoming = await api<{ total: number }>('/admin/meetings/rounding', { query: { club_id: club.id, status: 'SCHEDULED', limit: 1 } })
      .then((x) => x.total)
      .catch(() => 0);
    const r = await confirm({
      title: `${club.name}을(를) 삭제할까요?`,
      description: [
        upcoming ? `예정된 라운딩이 ${upcoming}건 있습니다. 삭제해도 모임은 남지만 클럽 화면에서 찾기 어려워집니다.` : null,
        '리더 외 활동 멤버가 있으면 삭제할 수 없습니다. 되돌릴 수 없습니다.',
      ]
        .filter(Boolean)
        .join(' '),
      confirmText: '삭제',
      tone: 'danger',
      reason: { required: true, placeholder: '감사 로그에 남습니다' },
    });
    if (!r) return;
    try {
      await deleteClub(club.id, r.reason);
      await qc.invalidateQueries({ queryKey: ['clubs'] });
      toast.success('클럽을 삭제했습니다');
      navigate('/clubs', { replace: true });
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };

  return (
    <>
      <Button onClick={() => void toggle()}>{active ? '비활성화' : '활성화'}</Button>
      <Link to={`/clubs/${club.id}/edit`}>
        <Button variant="primary">
          <Pencil className="h-4 w-4" aria-hidden />
          수정
        </Button>
      </Link>
      <Button variant="danger-ghost" aria-label="클럽 삭제" onClick={() => void remove()}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}

export function ClubDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const writable = can('clubs', 'write');
  const q = useQuery({ queryKey: ['club', id], queryFn: () => fetchClub(id), enabled: Number.isInteger(id) });

  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="클럽을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const c = q.data;
  const base = `/clubs/${id}`;
  const deleted = !!c.deleted_at;
  return (
    <>
      <DetailHeader
        backTo="/clubs"
        title={c.name}
        badges={
          <>
            <StatusBadge domain="club" value={c.status} />
            {deleted && <Badge tone="danger">삭제됨</Badge>}
          </>
        }
        meta={
          <>
            <span>{CLUB_TYPE[c.type] ?? c.type}</span>
            <span>리더 {c.leader?.nickname ?? c.representative_name ?? '-'}</span>
            <span>멤버 {c.current_member_count}명</span>
          </>
        }
        actions={writable && !deleted && <Actions club={c} />}
      />
      <RouteTabs
        tabs={[
          { to: base, label: '개요', end: true },
          { to: `${base}/members`, label: '멤버', count: c.current_member_count },
          { to: `${base}/join-requests`, label: '가입신청', count: c.pending_count || null },
          { to: `${base}/notices`, label: '공지' },
          { to: `${base}/regulations`, label: '규정' },
          { to: `${base}/fees`, label: '회비' },
          { to: `${base}/meetings`, label: '모임' },
        ]}
      />
      <Routes>
        <Route index element={<OverviewTab club={c} />} />
        <Route path="members" element={<MembersTab club={c} writable={writable && !deleted} />} />
        <Route path="join-requests" element={can('joinRequests') ? <JoinRequestsTable clubId={id} /> : <NotFoundPage />} />
        <Route path="notices" element={<NoticesTab clubId={id} writable={writable && !deleted} />} />
        <Route path="regulations" element={<RegulationsTab clubId={id} writable={writable && !deleted} />} />
        <Route path="fees" element={<FeesTab clubId={id} writable={writable && !deleted} />} />
        <Route path="meetings" element={can('meetings') ? <RoundsTable clubId={id} /> : <NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
