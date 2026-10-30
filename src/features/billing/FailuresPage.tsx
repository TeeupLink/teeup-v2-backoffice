import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDateTime, formatWon } from '@/lib/format';
import { BillingStatusBanner } from './BillingStatusBanner';
import { ChargeStatus, RetryButton } from './ChargesTable';
import { FAILURES_PATH, mapTabQuery, type FailureRow } from './api';

// SCR-085 청구 실패 (F-123)
const CONFIG: ListConfig = {
  filters: { tab: 'single' },
  defaultSort: '-updated_at',
  sortable: ['updated_at', 'next_retry_at', 'amount'],
};
const col = createColumnHelper<FailureRow>();

export function FailuresPage() {
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const query = useListQuery<FailureRow>('billing-failures', FAILURES_PATH, list.state, { mapQuery: mapTabQuery });
  const columns = useMemo(
    () => [
      col.display({
        id: 'user',
        header: '회원',
        cell: ({ row: { original: c } }) => (
          <Link to={`/subscriptions/${c.subscription_id}`} className="font-medium text-slate-900 hover:underline">
            {c.user?.nickname ?? `구독 #${c.subscription_id}`}
          </Link>
        ),
      }),
      col.display({ id: 'plan', header: '요금제', cell: ({ row }) => row.original.plan?.name ?? '-' }),
      col.accessor('amount', { header: '금액', meta: { align: 'right', sortKey: 'amount' }, cell: (c) => formatWon(c.getValue()) }),
      col.display({
        id: 'failure',
        header: '실패 사유',
        meta: { className: 'max-w-[320px]' },
        cell: ({ row: { original: c } }) => (
          <span className="text-sm text-slate-700">
            {c.failure_message ?? '-'}
            {c.failure_code && <span className="block font-mono text-xs text-slate-500">{c.failure_code}</span>}
          </span>
        ),
      }),
      col.display({ id: 'attempt', header: '시도', cell: ({ row: { original: c } }) => `${c.attempt}/${c.max_attempt}` }),
      col.accessor('status', { header: '상태', cell: (c) => <ChargeStatus value={c.getValue()} /> }),
      col.accessor('next_retry_at', { header: '다음 재시도', meta: { sortKey: 'next_retry_at' }, cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('updated_at', { header: '최종 시도', meta: { sortKey: 'updated_at' }, cell: (c) => formatDateTime(c.getValue()) }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">작업</span>,
        meta: { align: 'right' },
        cell: ({ row: { original: c } }) => <RetryButton charge={c} onDone={() => qc.invalidateQueries({ queryKey: ['billing-failures'] })} />,
      }),
    ],
    [qc],
  );
  return (
    <>
      <PageHeader title="청구 실패" description="정기결제 청구가 실패한 건입니다. 1·3·7일 뒤 자동으로 다시 청구하고, 마지막 시도까지 실패하면 최종 실패로 바뀌며 알림이 갑니다." />
      <BillingStatusBanner />
      <div className="mb-3">
        <FilterBar list={list} defs={[]} searchPlaceholder="닉네임·실패 코드" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        empty={{ title: '실패한 청구가 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="tab"
            options={[
              { value: '', label: '전체' },
              { value: 'FAILED', label: '재시도 대기' },
              { value: 'GAVE_UP', label: '최종 실패' },
            ]}
          />
        }
      />
    </>
  );
}
