import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListState } from '@/components/data-table/useListState';
import { confirm } from '@/components/dialog/confirm-store';
import { StatCard } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { toast } from '@/components/feedback/toast-store';
import { TextInput } from '@/components/form/controls';
import { PageHeader } from '@/components/layout/PageHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber } from '@/lib/format';
import { fetchMonthly, reviewMonth, type MonthlyAdmin } from './api';
import { AUDIT_TABS } from './tabs';

// SCR-094 월간 점검 (F-091). 개인정보 안전성 확보조치 기준 제8조: 접속기록 월 1회 이상 점검

function monthOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function previousMonth(now = new Date()) {
  return monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}
function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate();
  return { date_from: `${month}-01`, date_to: `${month}-${String(last).padStart(2, '0')}` };
}

const DAILY_LIMIT = 100;
const col = createColumnHelper<MonthlyAdmin>();

export function AuditMonthlyPage() {
  const config = useMemo<ListConfig>(() => ({ filters: { month: 'single' }, defaults: { month: previousMonth() } }), []);
  const list = useListState(config);
  const month = String(list.state.filters.month);
  const qc = useQueryClient();

  const monthly = useQuery({ queryKey: ['audit-logs', 'monthly', month], queryFn: () => fetchMonthly(month) });
  // 관리자별 표도 공통 DataTable 로 그린다 (같은 응답을 Page 모양으로 변환, 요청은 한 번)
  const table = useQuery({
    queryKey: ['audit-logs', 'monthly', month],
    queryFn: () => fetchMonthly(month),
    select: (d): Page<MonthlyAdmin> => ({ items: d.by_admin, total: d.by_admin.length, page: 1, size: 100 }),
  });

  const review = useMutation({
    mutationFn: (memo: string | undefined) => reviewMonth(month, memo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success(`${month} 점검 완료를 기록했습니다`);
    },
    onError: (e) => toast.error('기록하지 못했습니다', { description: errorMessage(e) }),
  });

  const bounds = monthBounds(month);
  const columns = useMemo(
    () => [
      col.accessor('email', { header: '관리자' }),
      col.accessor('view_pii', {
        header: '개인정보 열람',
        meta: { align: 'right' },
        cell: ({ row: { original: a } }) => (
          <Link
            to={`/audit-logs?${new URLSearchParams({ actor_id: String(a.admin_id), action: 'VIEW_PII', ...bounds })}`}
            className="tabular text-primary-800 underline-offset-2 hover:underline"
          >
            {formatNumber(a.view_pii)}
          </Link>
        ),
      }),
      col.accessor('max_daily_view_pii', {
        header: '1일 최대 열람',
        meta: { align: 'right' },
        cell: ({ row: { original: a } }) => (
          <span className={cn('inline-flex items-center gap-1.5 tabular', a.flagged && 'font-semibold text-red-700')}>
            {a.flagged && <Badge tone="danger">{DAILY_LIMIT}건 초과</Badge>}
            {formatNumber(a.max_daily_view_pii)}
          </span>
        ),
      }),
      col.accessor('export', { header: '내보내기', meta: { align: 'right' }, cell: (c) => <span className="tabular">{formatNumber(c.getValue())}</span> }),
      col.accessor('changes', { header: '변경', meta: { align: 'right' }, cell: (c) => <span className="tabular">{formatNumber(c.getValue())}</span> }),
    ],
    [bounds],
  );

  const m = monthly.data;
  const ended = month < monthOf(new Date());
  const flaggedCount = m?.by_admin.filter((a) => a.flagged).length ?? 0;

  const onReview = async () => {
    const ok = await confirm({
      title: `${month} 접속기록 점검을 완료로 기록할까요?`,
      description: flaggedCount ? `1일 ${DAILY_LIMIT}건을 넘게 열람한 관리자가 ${flaggedCount}명 있습니다. 확인한 내용을 메모로 남겨 주세요.` : '점검 시점의 집계가 함께 저장되고, 이 기록도 감사 로그에 남습니다.',
      confirmText: '점검 완료',
      reason: { label: '메모', placeholder: '확인한 내용', required: flaggedCount > 0 },
    });
    if (ok) review.mutate(ok.reason || undefined);
  };

  return (
    <>
      <PageHeader
        title="감사 로그"
        description="월 1회 관리자 접속기록을 점검하고 완료를 기록합니다."
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            점검 월
            <TextInput type="month" value={month} max={monthOf(new Date())} onChange={(e) => e.target.value && list.update({ filters: { month: e.target.value } })} className="w-40" />
          </label>
        }
      />
      <RouteTabs tabs={AUDIT_TABS} label="감사 로그 탭" />
      {monthly.isError ? (
        <ErrorState error={monthly.error} onRetry={() => void monthly.refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="개인정보 열람" value={m ? formatNumber(m.totals.view_pii) : '-'} />
            <StatCard label="내보내기" value={m ? formatNumber(m.totals.export) : '-'} />
            <StatCard label="로그인 실패" value={m ? formatNumber(m.totals.login_fail) : '-'} />
            <StatCard label="변경" value={m ? formatNumber(m.totals.changes) : '-'} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
            {m?.review ? (
              <p className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-primary-700" aria-hidden />
                점검 완료 · 관리자 #{m.review.reviewer_admin_id} · {formatDateTime(m.review.reviewed_at)}
                {m.review.memo && <span className="text-slate-500">— {m.review.memo}</span>}
              </p>
            ) : (
              <p className="text-sm text-slate-600">{ended ? '아직 점검 완료 기록이 없습니다.' : '진행 중인 달은 끝난 뒤 점검할 수 있습니다.'}</p>
            )}
            {m && !m.review && ended && (
              <Button variant="primary" onClick={onReview} loading={review.isPending}>
                점검 완료 기록
              </Button>
            )}
          </div>

          <DataTable list={list} query={table} columns={columns} getRowId={(a) => a.admin_id} empty={{ title: '이 달의 관리자 기록이 없습니다' }} />
        </div>
      )}
    </>
  );
}
