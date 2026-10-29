import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Card } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import { RichTextView } from '@/components/editor/RichTextView';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatNumber } from '@/lib/format';
import {
  deleteVersion,
  fetchVersion,
  fetchVersions,
  isTermsType,
  publishVersion,
  STATUS_LABEL,
  termsKey,
  TYPE_LABEL,
  type TermsType,
  type TermsVersion,
} from './api';

// SCR-076 약관 버전 (F-076) — 버전 목록, 버전 보기(게시·되돌리기·초안 삭제)

const TONE = { ACTIVE: 'success', DRAFT: 'warning', RETIRED: 'neutral' } as const;
const col = createColumnHelper<TermsVersion>();

function usePublish(type: TermsType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: TermsVersion) => {
      const back = v.status === 'RETIRED';
      const ok = await confirm({
        title: back ? `v${v.version}을(를) 다시 게시할까요?` : `v${v.version}을(를) 게시할까요?`,
        description: `앱에 바로 이 버전이 보이고 지금 게시중인 버전은 지난 버전이 됩니다. 이미 동의한 회원의 기록은 예전 버전에 그대로 남고, 재동의 화면은 뜨지 않습니다.`,
        confirmText: back ? '다시 게시' : '게시',
      });
      if (!ok) return null;
      return publishVersion(v.id);
    },
    onSuccess: async (r) => {
      if (!r) return;
      await qc.invalidateQueries({ queryKey: termsKey });
      toast.success(`${TYPE_LABEL[type]} v${r.version}을(를) 게시했습니다`);
    },
    onError: (e) => toast.error('게시하지 못했습니다', { description: errorMessage(e) }),
  });
}

function VersionList({ type }: { type: TermsType }) {
  const { can } = useAuth();
  const list = useListState({});
  const query = useQuery({
    queryKey: [...termsKey, type],
    queryFn: () => fetchVersions(type),
    select: (items): Page<TermsVersion> => ({ items, total: items.length, page: 1, size: Math.max(items.length, 1) }),
  });
  const columns = useMemo(
    () => [
      col.accessor('version', {
        header: '버전',
        cell: ({ row: { original: v } }) => (
          <Link to={`/terms/${type}/v/${v.id}`} className="font-medium text-slate-900 hover:underline">
            v{v.version}
          </Link>
        ),
      }),
      col.accessor('title', { header: '제목' }),
      col.accessor('status', { header: '상태', cell: (c) => <Badge tone={TONE[c.getValue()]}>{STATUS_LABEL[c.getValue()]}</Badge> }),
      col.accessor('is_required', { header: '필수', cell: (c) => (c.getValue() ? '필수' : '선택') }),
      col.accessor('agreement_count', { header: '동의', meta: { align: 'right' }, cell: (c) => <span className="tabular">{formatNumber(c.getValue())}</span> }),
      col.accessor('created_by_name', { header: '작성', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('published_at', { header: '게시일', cell: (c) => formatDateTime(c.getValue()) }),
    ],
    [type],
  );
  return (
    <>
      {can('content', 'write') && (
        <div className="mb-3 flex justify-end">
          <Link to={`/terms/new?type=${type}`}>
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />새 버전
            </Button>
          </Link>
        </div>
      )}
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(v) => v.id}
        rowHref={(v) => `/terms/${type}/v/${v.id}`}
        empty={{ title: '아직 버전이 없습니다' }}
      />
    </>
  );
}

function VersionView({ type }: { type: TermsType }) {
  const vid = Number(useParams().vid);
  const { can } = useAuth();
  const writable = can('content', 'write');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const publish = usePublish(type);
  const q = useQuery({ queryKey: [...termsKey, 'version', vid], queryFn: () => fetchVersion(vid), enabled: Number.isInteger(vid) });
  if (!Number.isInteger(vid) || (q.error instanceof ApiError && q.error.status === 404) || (q.data && q.data.type !== type))
    return <NotFoundPage title="버전을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  const v = q.data;
  const remove = async () => {
    const ok = await confirm({ title: `v${v.version} 초안을 삭제할까요?`, confirmText: '삭제', tone: 'danger' });
    if (!ok) return;
    try {
      await deleteVersion(v.id);
      await qc.invalidateQueries({ queryKey: termsKey });
      toast.success('초안을 삭제했습니다');
      navigate(`/terms/${type}`, { replace: true });
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          v{v.version} · {v.title} <Badge tone={TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
        </span>
      }
      actions={
        writable && (
          <div className="flex gap-1">
            {v.status === 'DRAFT' && (
              <>
                <Link to={`/terms/edit/${v.id}`}>
                  <Button size="sm">
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    수정
                  </Button>
                </Link>
                <Button size="sm" variant="danger-ghost" aria-label="초안 삭제" onClick={() => void remove()}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {v.status !== 'DRAFT' && (
              <Link to={`/terms/new?type=${type}&from=${v.id}`}>
                <Button size="sm">
                  <Copy className="h-3.5 w-3.5" aria-hidden />이 버전으로 새 초안
                </Button>
              </Link>
            )}
            {v.status !== 'ACTIVE' && (
              <Button size="sm" variant="primary" loading={publish.isPending} onClick={() => publish.mutate(v)}>
                {v.status === 'RETIRED' ? '다시 게시' : '게시'}
              </Button>
            )}
          </div>
        )
      }
    >
      <p className="mb-4 text-xs text-slate-500">
        {v.is_required ? '필수' : '선택'} · 작성 {v.created_by_name ?? '-'} · 게시 {formatDateTime(v.published_at)} · 동의 {formatNumber(v.agreement_count)}명
      </p>
      <RichTextView html={v.content} />
    </Card>
  );
}

export function TermsTypePage() {
  const type = useParams().id;
  const { pathname } = useLocation();
  if (!isTermsType(type)) return <NotFoundPage title="약관 종류를 찾을 수 없습니다" />;
  // 버전 보기에서는 그 종류의 버전 목록으로 돌아간다
  const inVersion = pathname.includes('/v/');
  return (
    <>
      <DetailHeader backTo={inVersion ? `/terms/${type}` : '/terms'} title={TYPE_LABEL[type]} />
      <Routes>
        <Route index element={<VersionList type={type} />} />
        <Route path="v/:vid" element={<VersionView type={type} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
