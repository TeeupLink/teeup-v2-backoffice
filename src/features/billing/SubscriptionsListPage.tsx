import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge, StatusBadge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate, formatWon } from '@/lib/format';
import { BillingStatusBanner } from './BillingStatusBanner';
import { mapTabQuery, PLAN_CYCLE, SUBSCRIPTIONS_PATH, type SubscriptionRow } from './api';

// SCR-082 구독 목록 (F-121)
const DEFS: FilterDef[] = [];
const CONFIG: ListConfig = {
  filters: filterKeys(DEFS, ['tab', 'user_id', 'plan_id']),
  defaults: { tab: 'ACTIVE' },
  defaultSort: '-created_at',
  sortable: ['next_billing_date', 'created_at'],
};
const col = createColumnHelper<SubscriptionRow>();

export function SubscriptionsListPage() {
  const list = useListState(CONFIG);
  const query = useListQuery<SubscriptionRow>('subscriptions', SUBSCRIPTIONS_PATH, list.state, { mapQuery: mapTabQuery });
  const columns = useMemo(
    () => [
      col.display({
        id: 'user',
        header: '회원',
        cell: ({ row: { original: s } }) => (
          <Link to={`/subscriptions/${s.id}`} className="font-medium text-slate-900 hover:underline">
            {s.user?.nickname ?? `구독 #${s.id}`}
          </Link>
        ),
      }),
      col.display({ id: 'plan', header: '요금제', cell: ({ row }) => row.original.plan?.name ?? '-' }),
      col.display({
        id: 'amount',
        header: '금액',
        meta: { align: 'right' },
        cell: ({ row: { original: s } }) => (s.plan ? `${formatWon(s.plan.price)} / ${PLAN_CYCLE[s.plan.billing_cycle] ?? s.plan.billing_cycle}` : '-'),
      }),
      col.accessor('next_billing_date', { header: '다음 결제일', meta: { sortKey: 'next_billing_date' }, cell: (c) => formatDate(c.getValue()) }),
      col.display({
        id: 'key',
        header: '결제 수단',
        cell: ({ row: { original: s } }) =>
          s.billing_key && s.billing_key.status === 'ACTIVE' ? <Badge tone="success">등록</Badge> : <Badge tone="warning">없음</Badge>,
      }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="subscription" value={c.getValue()} /> }),
    ],
    [],
  );
  return (
    <>
      <PageHeader title="구독" description="회원의 정기결제 구독입니다. 연체는 청구가 실패해 재시도를 기다리는 구독입니다." />
      <BillingStatusBanner />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="닉네임" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/subscriptions/${r.id}`}
        empty={{ title: '이 상태의 구독이 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="tab"
            options={[
              { value: 'ACTIVE', label: '활성' },
              { value: 'PAST_DUE', label: '연체' },
              { value: 'CANCELED', label: '해지' },
              { value: '', label: '전체' },
            ]}
          />
        }
      />
    </>
  );
}
