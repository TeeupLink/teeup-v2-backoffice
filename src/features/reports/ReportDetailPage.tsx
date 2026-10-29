import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { Badge, StatusBadge } from '@/components/display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { Select, Textarea } from '@/components/form/controls';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { statusOptions } from '@/lib/status';
import { usePII } from '@/lib/usePII';
import { fetchReport, REASON, reportKey, TARGET, updateReport, type ReportDetail, type ReportStatus } from './api';

// SCR-024 신고 상세 (F-024) — 대상 확인(링크), 같은 대상 신고, 상태·메모

const TARGET_STATUS: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  DEACTIVATED: '비활성',
  DELETED: '삭제됨',
  SCHEDULED: '예정',
  COMPLETED: '완료',
  CANCELED: '취소',
};

function Handle({ r }: { r: ReportDetail }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>(r.status);
  const [note, setNote] = useState(r.admin_note ?? '');
  const [noteError, setNoteError] = useState<string | null>(null);
  const closing = status === 'RESOLVED' || status === 'DISMISSED';
  const save = useMutation({
    mutationFn: () => updateReport(r.id, status, note.trim() || null),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: reportKey(r.id) });
      await qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('처리 결과를 저장했습니다');
    },
    onError: (e) => toast.error('저장하지 못했습니다', { description: errorMessage(e) }),
  });
  const submit = () => {
    if (closing && !note.trim()) return setNoteError('해결·기각은 메모를 남겨야 합니다');
    setNoteError(null);
    save.mutate();
  };
  const unchanged = status === r.status && note.trim() === (r.admin_note ?? '');
  return (
    <div className="space-y-3">
      <FormField stacked label="상태">
        {(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)} options={statusOptions('report')} />}
      </FormField>
      <FormField
        stacked
        label="처리 메모"
        required={closing}
        error={noteError ?? undefined}
        hint="어떤 조치를 했는지 남기세요 (예: 회원 비활성화, 경고 후 유지)"
      >
        {(p) => <Textarea {...p} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />}
      </FormField>
      <div className="flex justify-end">
        <Button variant="primary" loading={save.isPending} disabled={unchanged} onClick={submit}>
          저장
        </Button>
      </div>
    </div>
  );
}

export function ReportDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const pii = usePII();
  const q = useQuery({ queryKey: reportKey(id), queryFn: () => fetchReport(id), enabled: Number.isInteger(id) });
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="신고를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const r = q.data;
  const t = r.target;
  return (
    <>
      <DetailHeader
        backTo="/reports"
        title={`${TARGET[t.type] ?? t.type} 신고 · ${REASON[r.reason] ?? r.reason}`}
        badges={<StatusBadge domain="report" value={r.status} />}
        meta={
          <>
            <span>신고 {formatDateTime(r.created_at)}</span>
            {r.same_target_count > 1 && <span className="font-medium text-red-700">같은 대상 누적 {r.same_target_count}건</span>}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card
            title="신고 대상"
            actions={
              t.exists && t.link ? (
                <Link to={t.link}>
                  <Button size="sm">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    대상 화면에서 조치
                  </Button>
                </Link>
              ) : undefined
            }
          >
            {t.exists ? (
              <DescriptionList
                items={[
                  { label: '종류', value: TARGET[t.type] ?? t.type },
                  { label: '이름', value: t.name ?? '-' },
                  { label: '현재 상태', value: t.status ? (TARGET_STATUS[t.status] ?? t.status) : '-' },
                  { label: 'ID', value: `#${t.id}` },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500">대상이 이미 삭제됐습니다 (#{t.id}). 조치할 것이 없으면 기각하세요.</p>
            )}
          </Card>
          <Card title="신고 내용">
            <DescriptionList
              items={[
                {
                  label: '신고자',
                  value: r.reporter ? (
                    can('users') ? (
                      <Link to={`/users/${r.reporter.id}`} className="hover:underline">
                        {r.reporter.nickname} <span className="text-slate-500">{pii.name(r.reporter.realname)}</span>
                      </Link>
                    ) : (
                      r.reporter.nickname
                    )
                  ) : (
                    '탈퇴 회원'
                  ),
                },
                { label: '사유', value: REASON[r.reason] ?? r.reason },
                { label: '설명', value: <span className="whitespace-pre-line">{r.description || '(설명 없음)'}</span>, full: true },
              ]}
            />
          </Card>
          {r.same_target.length > 0 && (
            <Card title={`같은 대상의 다른 신고 ${r.same_target.length}건`}>
              <ul className="divide-y divide-slate-100">
                {r.same_target.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link to={`/reports/${o.id}`} className="min-w-0 hover:underline">
                      <Badge>{REASON[o.reason] ?? o.reason}</Badge>
                      <span className="ml-2 text-slate-700">{o.description || '(설명 없음)'}</span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                      {formatDateTime(o.created_at)}
                      <StatusBadge domain="report" value={o.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <Card title="처리">
          {can('reports', 'write') ? (
            <Handle key={`${r.id}-${r.updated_at}`} r={r} />
          ) : (
            <DescriptionList items={[{ label: '메모', value: r.admin_note || '-', full: true }]} />
          )}
        </Card>
      </div>
    </>
  );
}
