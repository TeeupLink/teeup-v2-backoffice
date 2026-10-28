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
import { cn } from '@/lib/cn';
import { elapsedHours, formatDateTime } from '@/lib/format';
import { INQUIRY_TYPE, toOptions } from '@/lib/labels';
import { bulkInquiryStatus, INQUIRIES_PATH, mapInquiriesQuery, type InquiryRow } from './api';

// SCR-021 1:1 문의 목록 (화면설계서 4.3)
const DEFS: FilterDef[] = [
  { kind: 'select', key: 'type', label: '유형', options: toOptions(INQUIRY_TYPE) },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '등록일' },
];
const CONFIG: ListConfig = {
  filters: filterKeys(DEFS, ['tab']),
  defaults: { tab: 'unanswered' },
  defaultSort: '-created_at',
  sortable: ['created_at'],
};

function Elapsed({ at, status }: { at: string | null; status: string }) {
  const h = elapsedHours(at);
  if (h === null) return <>-</>;
  const waiting = status === 'PENDING' || status === 'SUBMITTED';
  const text = h < 1 ? '1시간 미만' : h < 24 ? `${Math.floor(h)}시간` : `${Math.floor(h / 24)}일`;
  return <span className={cn(waiting && h >= 72 ? 'font-semibold text-red-700' : waiting && h >= 24 ? 'font-medium text-amber-700' : 'text-slate-500')}>{text}</span>;
}

const col = createColumnHelper<InquiryRow>();

export function InquiriesListPage() {
  const { can } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<InquiryRow>('inquiries', INQUIRIES_PATH, list.state, { mapQuery: mapInquiriesQuery });

  const columns = useMemo(
    () => [
      col.accessor('title', {
        header: '제목',
        meta: { className: 'max-w-[360px]' },
        cell: ({ row: { original: r } }) => (
          <Link to={`/inquiries/${r.id}`} className="block truncate font-medium text-slate-900 hover:underline">
            {r.title}
          </Link>
        ),
      }),
      col.accessor('type', { header: '유형', cell: (c) => <Badge>{INQUIRY_TYPE[c.getValue()] ?? c.getValue()}</Badge> }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="inquiry" value={c.getValue()} /> }),
      col.display({ id: 'user', header: '작성자', cell: ({ row }) => row.original.user.nickname }),
      col.accessor('response_count', { header: '답변', meta: { align: 'right' } }),
      col.accessor('created_at', { header: '등록일', meta: { sortKey: 'created_at' }, cell: (c) => formatDateTime(c.getValue()) }),
      col.display({ id: 'elapsed', header: '경과', cell: ({ row }) => <Elapsed at={row.original.created_at} status={row.original.status} /> }),
    ],
    [],
  );

  const bulkActions: BulkAction[] = can('inquiries', 'write')
    ? [
        { key: 'progress', label: '처리중으로', run: (ids) => bulkInquiryStatus(ids, 'IN_PROGRESS') },
        {
          key: 'close',
          label: '종료',
          confirm: (n) => ({ title: `${n}건을 종료할까요?`, description: '종료한 문의는 "종료" 탭으로 이동합니다.', confirmText: '종료' }),
          run: (ids) => bulkInquiryStatus(ids, 'CLOSED'),
        },
      ]
    : [];

  return (
    <>
      <PageHeader title="1:1 문의" />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="제목·작성자" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/inquiries/${r.id}`}
        bulkActions={bulkActions}
        empty={{ title: '이 상태의 문의가 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="tab"
            options={[
              { value: 'unanswered', label: '미답변' },
              { value: 'in_progress', label: '처리중' },
              { value: 'answered', label: '답변완료' },
              { value: 'closed', label: '종료' },
              { value: '', label: '전체' },
            ]}
          />
        }
      />
    </>
  );
}
