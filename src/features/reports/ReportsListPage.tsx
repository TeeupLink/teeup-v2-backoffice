import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import type { BulkAction } from '@/components/data-table/bulk';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge, StatusBadge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { formatDateTime } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { bulkReports, mapReportsQuery, REASON, REPORTS_PATH, TARGET, type ReportRow } from './api';

// SCR-023 신고 목록 (화면설계서 4.3, F-023)
const DEFS: FilterDef[] = [
  { kind: 'select', key: 'target_type', label: '대상', options: toOptions(TARGET) },
  { kind: 'select', key: 'reason', label: '사유', options: toOptions(REASON) },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '신고일' },
];
const CONFIG: ListConfig = {
  filters: filterKeys(DEFS, ['tab', 'target_id']),
  defaults: { tab: 'PENDING' },
  defaultSort: '-created_at',
  sortable: ['created_at'],
};
const col = createColumnHelper<ReportRow>();

export function ReportTabs() {
  return (
    <RouteTabs
      tabs={[
        { to: '/reports', label: '신고', end: true },
        { to: '/reports/blocks', label: '차단' },
      ]}
    />
  );
}

export function ReportsListPage() {
  const { can } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<ReportRow>('reports', REPORTS_PATH, list.state, { mapQuery: mapReportsQuery });

  const columns = useMemo(
    () => [
      col.display({
        id: 'target',
        header: '대상',
        cell: ({ row: { original: r } }) => (
          <Link to={`/reports/${r.id}`} className="block hover:underline">
            <span className="text-xs text-slate-500">{TARGET[r.target.type] ?? r.target.type}</span>
            <span className="block font-medium text-slate-900">
              {r.target.exists ? r.target.name : <span className="text-slate-400">삭제됨 #{r.target.id}</span>}
            </span>
          </Link>
        ),
      }),
      col.accessor('reason', { header: '사유', cell: (c) => <Badge>{REASON[c.getValue()] ?? c.getValue()}</Badge> }),
      col.accessor('description', {
        header: '내용',
        meta: { className: 'max-w-[320px]' },
        cell: (c) => <span className="line-clamp-2 text-sm text-slate-600">{c.getValue() || '-'}</span>,
      }),
      col.accessor('same_target_count', {
        header: '누적',
        meta: { align: 'right' },
        cell: (c) => <span className={c.getValue() >= 3 ? 'font-semibold text-red-700' : 'tabular'}>{c.getValue()}</span>,
      }),
      col.display({ id: 'reporter', header: '신고자', cell: ({ row }) => row.original.reporter?.nickname ?? '-' }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="report" value={c.getValue()} /> }),
      col.accessor('created_at', { header: '신고일', meta: { sortKey: 'created_at' }, cell: (c) => formatDateTime(c.getValue()) }),
    ],
    [],
  );

  const note = { required: true, label: '처리 메모', placeholder: '감사 로그와 신고 기록에 남습니다' };
  const bulkActions: BulkAction[] = can('reports', 'write')
    ? [
        { key: 'review', label: '검토중으로', run: (ids) => bulkReports(ids, 'REVIEWING') },
        {
          key: 'dismiss',
          label: '기각',
          confirm: (n) => ({ title: `${n}건을 기각할까요?`, description: '대상에 대한 조치 없이 신고를 닫습니다.', confirmText: '기각', reason: note }),
          run: (ids, reason) => bulkReports(ids, 'DISMISSED', reason),
        },
      ]
    : [];

  return (
    <>
      <PageHeader title="신고" description="회원이 앱에서 신고한 내용입니다. 대상에 대한 조치는 대상 화면에서 하고, 여기서 처리 결과를 남깁니다." />
      <ReportTabs />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="신고 내용" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/reports/${r.id}`}
        bulkActions={bulkActions}
        empty={{ title: '이 상태의 신고가 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="tab"
            options={[
              { value: 'PENDING', label: '대기' },
              { value: 'REVIEWING', label: '검토중' },
              { value: 'RESOLVED', label: '해결' },
              { value: 'DISMISSED', label: '기각' },
              { value: '', label: '전체' },
            ]}
          />
        }
      />
    </>
  );
}
