import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatDateTime, formatWon } from '@/lib/format';
import { useBillingStatus } from './useBillingStatus';
import { CHARGE_STATUS, fetchSubscription, retryCharge, subscriptionKey, type ChargeRow } from './api';

const TONE = { PENDING: 'info', SUCCEEDED: 'success', FAILED: 'warning', GAVE_UP: 'danger' } as const;

export function ChargeStatus({ value }: { value: ChargeRow['status'] }) {
  return <Badge tone={TONE[value] ?? 'neutral'}>{CHARGE_STATUS[value] ?? value}</Badge>;
}

/** 수동 재청구 버튼 (F-123). 정기결제가 꺼져 있으면 비활성 + 이유 */
export function RetryButton({ charge, onDone }: { charge: ChargeRow; onDone: () => Promise<unknown> }) {
  const { can } = useAuth();
  const { data: status } = useBillingStatus();
  const run = useMutation({
    mutationFn: () => retryCharge(charge.id),
    onSuccess: async (r) => {
      await onDone();
      if (r.status === 'SUCCEEDED') toast.success(`${formatWon(r.amount)}을 청구했습니다`);
      else toast.error('재청구가 실패했습니다', { description: `${r.failure_message ?? ''} (${r.failure_code ?? ''})` });
    },
    onError: (e) => toast.error('재청구하지 못했습니다', { description: errorMessage(e) }),
  });
  if (!can('payments', 'write') || (charge.status !== 'FAILED' && charge.status !== 'GAVE_UP')) return null;
  const disabled = !status?.enabled;
  const go = async () => {
    const ok = await confirm({ title: `${formatWon(charge.amount)}을 지금 다시 청구할까요?`, description: '회원 카드로 바로 결제를 시도합니다.', confirmText: '재청구' });
    if (ok) run.mutate();
  };
  return (
    <Button size="sm" disabled={disabled} loading={run.isPending} title={disabled ? '정기결제가 비활성 상태라 재청구할 수 없습니다' : undefined} onClick={() => void go()}>
      재청구
    </Button>
  );
}

const col = createColumnHelper<ChargeRow>();

/** 구독 상세의 청구 이력 (상세 응답과 같은 캐시를 쓴다) */
export function ChargesTable({ subscriptionId }: { subscriptionId: number }) {
  const qc = useQueryClient();
  const list = useListState({});
  const query = useQuery({
    queryKey: subscriptionKey(subscriptionId),
    queryFn: () => fetchSubscription(subscriptionId),
    select: (d): Page<ChargeRow> => ({ items: d.charges, total: d.charges.length, page: 1, size: Math.max(d.charges.length, 1) }),
  });
  const columns = useMemo(
    () => [
      col.display({ id: 'period', header: '기간', cell: ({ row: { original: c } }) => `${formatDate(c.period_start)} ~ ${formatDate(c.period_end)}` }),
      col.accessor('amount', { header: '금액', meta: { align: 'right' }, cell: (c) => formatWon(c.getValue()) }),
      col.accessor('status', { header: '상태', cell: (c) => <ChargeStatus value={c.getValue()} /> }),
      col.display({ id: 'attempt', header: '시도', cell: ({ row: { original: c } }) => `${c.attempt}/${c.max_attempt}` }),
      col.display({
        id: 'failure',
        header: '실패 사유',
        cell: ({ row: { original: c } }) => (c.failure_code ? <span className="text-sm text-slate-600">{c.failure_message} ({c.failure_code})</span> : '-'),
      }),
      col.accessor('updated_at', { header: '최종 시도', cell: (c) => formatDateTime(c.getValue()) }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">작업</span>,
        meta: { align: 'right' },
        cell: ({ row: { original: c } }) =>
          c.payment_id ? (
            <Link to={`/payments/${c.payment_id}`} className="text-sm hover:underline">
              결제 보기
            </Link>
          ) : (
            <RetryButton charge={c} onDone={() => qc.invalidateQueries({ queryKey: subscriptionKey(subscriptionId) })} />
          ),
      }),
    ],
    [qc, subscriptionId],
  );
  return <DataTable list={list} query={query} columns={columns} getRowId={(r) => r.id} empty={{ title: '청구 이력이 없습니다' }} />;
}
