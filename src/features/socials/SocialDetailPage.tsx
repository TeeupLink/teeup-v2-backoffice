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
import { ParticipantsTab } from '@/features/rounds/detail/ParticipantsTab';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { deleteSocial, fetchSocial } from './api';
import { OverviewTab } from './detail/OverviewTab';
import { SettlementTab } from './detail/SettlementTab';
import { SOCIAL_TYPE } from './labels';
import type { SocialDetail } from './types';

// SCR-062 소셜 상세 (화면설계서 4.7, F-062~063)

function DeleteButton({ social }: { social: SocialDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const remove = async () => {
    const r = await confirm({
      title: `${social.name}을(를) 삭제할까요?`,
      description: '참가자·정산 기록이 함께 지워지며 되돌릴 수 없습니다. 취소만 필요하면 상태를 "취소"로 바꾸세요.',
      confirmText: '삭제',
      tone: 'danger',
    });
    if (!r) return;
    try {
      await deleteSocial(social.id);
      await qc.invalidateQueries({ queryKey: ['socials'] });
      toast.success('소셜 모임을 삭제했습니다');
      navigate('/socials', { replace: true });
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };
  return (
    <Button variant="danger-ghost" aria-label="소셜 삭제" onClick={() => void remove()}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function SocialDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const writable = can('meetings', 'write');
  const q = useQuery({ queryKey: ['social', id], queryFn: () => fetchSocial(id), enabled: Number.isInteger(id) });

  const notSocial = q.data && q.data.meeting_type !== 'SOCIAL';
  if (!Number.isInteger(id) || notSocial || (q.error instanceof ApiError && q.error.status === 404))
    return <NotFoundPage title="소셜 모임을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const s = q.data;
  const base = `/socials/${id}`;
  return (
    <>
      <DetailHeader
        backTo="/socials"
        title={s.name}
        badges={
          <>
            <StatusBadge domain="meeting" value={s.status} />
            {s.social_type && <Badge>{SOCIAL_TYPE[s.social_type] ?? s.social_type}</Badge>}
          </>
        }
        meta={
          <>
            <span>{formatDateTime(s.meeting_time)}</span>
            <span>{s.club_name}</span>
            {s.venue_name && <span>{s.venue_name}</span>}
          </>
        }
        actions={
          writable && (
            <>
              <Link to={`/socials/${id}/edit`}>
                <Button variant="primary">
                  <Pencil className="h-4 w-4" aria-hidden />
                  수정
                </Button>
              </Link>
              <DeleteButton social={s} />
            </>
          )
        }
      />
      <RouteTabs
        tabs={[
          { to: base, label: '개요', end: true },
          { to: `${base}/participants`, label: '참가자', count: s.participant_count },
          { to: `${base}/settlement`, label: '정산' },
        ]}
      />
      <Routes>
        <Route index element={<OverviewTab social={s} writable={writable} />} />
        <Route path="participants" element={<ParticipantsTab roundId={id} />} />
        <Route path="settlement" element={<SettlementTab social={s} writable={writable} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
