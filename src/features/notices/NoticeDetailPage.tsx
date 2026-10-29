import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Pencil, Star, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { useAuth } from '@/app/auth/useAuth';
import { Card } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import { RichTextView } from '@/components/editor/RichTextView';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { deleteNotice, fetchNotice, updateNotice, type NoticeDetail } from './api';

// SCR-071 시스템 공지 상세 (F-071) — 미리보기, 게시·내리기, 수정, 삭제

function Actions({ n }: { n: NoticeDetail }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['notice', n.id] });
    await qc.invalidateQueries({ queryKey: ['notices'] });
  };
  const publish = useMutation({
    mutationFn: (on: boolean) => updateNotice(n.id, { is_published: on }),
    onSuccess: async (_, on) => {
      await refresh();
      toast.success(on ? '게시했습니다. 활성 회원에게 알림이 갑니다' : '게시를 내렸습니다');
    },
    onError: (e) => toast.error('처리하지 못했습니다', { description: errorMessage(e) }),
  });
  const togglePublish = async () => {
    const on = !n.is_published;
    const ok = await confirm(
      on
        ? {
            title: '공지를 게시할까요?',
            description: n.published_at ? '이미 한 번 게시됐던 공지도 다시 게시하면 알림이 갑니다.' : '활성 회원 전체에게 알림이 갑니다.',
            confirmText: '게시',
          }
        : { title: '게시를 내릴까요?', description: '앱에서 더 이상 보이지 않습니다.', confirmText: '내리기', tone: 'danger' },
    );
    if (ok) publish.mutate(on);
  };
  const remove = async () => {
    const r = await confirm({
      title: `"${n.title}" 공지를 삭제할까요?`,
      description: '영구 삭제되며 되돌릴 수 없습니다. 앱에서만 숨기려면 게시를 내리세요.',
      confirmText: '삭제',
      tone: 'danger',
      reason: { label: '사유 (선택)', placeholder: '감사 로그에 남습니다' },
    });
    if (!r) return;
    try {
      await deleteNotice(n.id, r.reason || undefined);
      await qc.invalidateQueries({ queryKey: ['notices'] });
      toast.success('공지를 삭제했습니다');
      navigate('/notices', { replace: true });
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };
  return (
    <>
      <Button loading={publish.isPending} onClick={() => void togglePublish()}>
        {n.is_published ? '게시 내리기' : '게시하기'}
      </Button>
      <Link to={`/notices/${n.id}/edit`}>
        <Button variant="primary">
          <Pencil className="h-4 w-4" aria-hidden />
          수정
        </Button>
      </Link>
      <Button variant="danger-ghost" aria-label="공지 삭제" onClick={() => void remove()}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}

export function NoticeDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const q = useQuery({ queryKey: ['notice', id], queryFn: () => fetchNotice(id), enabled: Number.isInteger(id) });
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="공지를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const n = q.data;
  return (
    <>
      <DetailHeader
        backTo="/notices"
        title={n.title}
        badges={
          <>
            {n.is_published ? <Badge tone="success">게시</Badge> : <Badge>임시 저장</Badge>}
            {n.is_important && (
              <Badge tone="warning">
                <Star className="mr-1 h-3 w-3" aria-hidden />
                중요
              </Badge>
            )}
          </>
        }
        meta={
          <>
            <span>작성 {n.author_name ?? '-'}</span>
            <span>게시 {formatDateTime(n.published_at)}</span>
            <span>조회 {n.view_count}</span>
          </>
        }
        actions={can('content', 'write') && <Actions n={n} />}
      />
      <Card>
        <RichTextView html={n.content} />
        {n.web_view_link && (
          <a href={n.web_view_link} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary-700 hover:underline">
            <Paperclip className="h-4 w-4" aria-hidden />
            {n.attachment_file || '첨부 파일'}
          </a>
        )}
      </Card>
    </>
  );
}
