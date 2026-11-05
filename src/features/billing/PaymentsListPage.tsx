import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { StatusBadge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { LookupSelect } from '@/components/form/LookupSelect';
import { lookupLabel } from '@/components/form/lookupLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatWon } from '@/lib/format';
import { BillingStatusBanner } from './BillingStatusBanner';
import { exportPayments, mapTabQuery, PAYMENTS_PATH, type PaymentRow } from './api';

// SCR-080 결제 내역 (화면설계서 4.8, F-122)
const DEFS: FilterDef[] = [
  {
    kind: 'custom',
    key: 'user_id',
    label: '회원',
    render: (v, onChange) => <LookupSelect kind="users" value={v as string | undefined} onChange={(id) => onChange(id)} placeholder="회원 전체" />,
    chipLabel: (v) => lookupLabel('users', String(v)),
  },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '결제일' },
];
const CONFIG: ListConfig = {
  filters: filterKeys(DEFS, ['tab']),
  defaultSort: '-created_at',
  sortable: ['created_at', 'approved_at', 'amount'],
};
const col = createColumnHelper<PaymentRow>();

export function PaymentsListPage() {
  const list = useListState(CONFIG);
  const query = useListQuery<PaymentRow>('payments', PAYMENTS_PATH, list.state, { mapQuery: mapTabQuery });
  const [exporting, setExporting] = useState(false);

  const columns = useMemo(
    () => [
      col.accessor('order_id', {
        header: '주문번호',
        cell: ({ row: { original: p } }) => (
          <Link to={`/payments/${p.id}`} className="font-mono text-xs text-slate-900 hover:underline">
            {p.order_id ?? `#${p.id}`}
          </Link>
        ),
      }),
      col.display({ id: 'user', header: '회원', cell: ({ row }) => row.original.user?.nickname ?? '-' }),
      col.accessor('order_name', { header: '상품', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('amount', {
        header: '금액',
        meta: { align: 'right', sortKey: 'amount' },
        cell: ({ row: { original: p } }) => (
          <span className="tabular">
            {formatWon(p.amount)}
            {p.canceled_amount > 0 && <span className="block text-xs text-slate-500">잔액 {formatWon(p.balance)}</span>}
          </span>
        ),
      }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="payment" value={c.getValue()} /> }),
      col.accessor('approved_at', { header: '결제일', meta: { sortKey: 'approved_at' }, cell: (c) => formatDateTime(c.getValue()) }),
    ],
    [],
  );

  const onExport = async () => {
    const ok = await confirm({
      title: '결제 내역을 내보낼까요?',
      description: '지금 필터의 결제를 CSV로 받습니다. 내보내기도 감사 로그에 남습니다.',
      confirmText: '내보내기',
      reason: { label: '사유', placeholder: '예: 11월 정산', required: true },
    });
    if (!ok) return;
    setExporting(true);
    try {
      await exportPayments(list.state, ok.reason);
    } catch (e) {
      toast.error('내보내지 못했습니다', { description: errorMessage(e) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="결제 내역"
        description="토스페이먼츠로 결제된 내역입니다. 취소·환불은 결제 상세에서 합니다."
        actions={
          <Button onClick={onExport} loading={exporting}>
            <Download className="h-4 w-4" aria-hidden />
            CSV 내보내기
          </Button>
        }
      />
      <BillingStatusBanner />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="주문번호·상품·닉네임" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/payments/${r.id}`}
        empty={{ title: '결제 내역이 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="tab"
            options={[
              { value: '', label: '전체' },
              { value: 'SUCCEEDED', label: '완료' },
              { value: 'CANCELED', label: '취소' },
              { value: 'PARTIAL_CANCELED', label: '부분취소' },
              { value: 'FAILED', label: '실패' },
            ]}
          />
        }
      />
    </>
  );
}
