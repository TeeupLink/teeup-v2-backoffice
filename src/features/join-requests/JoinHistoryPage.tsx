import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { LookupSelect } from '@/components/form/LookupSelect';
import { lookupLabel } from '@/components/form/lookupLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { formatDateTime } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { JOIN_HISTORY_PATH, type JoinHistoryRow } from './api';
import { JOIN_TABS } from './tabs';

// SCR-020 가입신청 > 처리 이력 탭 (F-040)
const DEFS: FilterDef[] = [
  {
    kind: 'select',
    key: 'action',
    label: '결과',
    options: [
      { value: 'APPROVE', label: '승인' },
      { value: 'REJECT', label: '거절' },
    ],
  },
  {
    kind: 'custom',
    key: 'club_id',
    label: '클럽',
    render: (v, onChange) => <LookupSelect kind="clubs" value={v as string | undefined} onChange={(id) => onChange(id)} placeholder="클럽 전체" />,
    chipLabel: (v) => lookupLabel('clubs', String(v)),
  },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '처리일' },
];
const CONFIG: ListConfig = { filters: filterKeys(DEFS), defaultSort: '-processed_at', sortable: ['processed_at'] };

const col = createColumnHelper<JoinHistoryRow>();

export function JoinHistoryPage() {
  const { can } = useAuth();
  const pii = usePII();
  const list = useListState(CONFIG);
  const query = useListQuery<JoinHistoryRow>('join-requests-history', JOIN_HISTORY_PATH, list.state);
  const canSeeUser = can('users');

  const columns = useMemo(
    () => [
      col.accessor('processed_at', { header: '처리일', meta: { sortKey: 'processed_at' }, cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('action', {
        header: '결과',
        cell: (c) => (c.getValue() === 'APPROVE' ? <Badge tone="success">승인</Badge> : <Badge tone="danger">거절</Badge>),
      }),
      col.display({
        id: 'user',
        header: '신청자',
        cell: ({ row: { original: r } }) => {
          const label = (
            <>
              <span className="font-medium text-slate-900">{r.user.nickname ?? '-'}</span>
              {r.user.name && <span className="block text-xs text-slate-500">{pii.name(r.user.name)}</span>}
            </>
          );
          // 거절된 회원도 회원 자체는 남아 있으므로 상세로 갈 수 있다
          return canSeeUser && r.user.id ? (
            <Link to={`/users/${r.user.id}`} className="block hover:underline">
              {label}
            </Link>
          ) : (
            <div>{label}</div>
          );
        },
      }),
      col.display({ id: 'club', header: '클럽', cell: ({ row: { original: r } }) => r.club.name ?? '-' }),
      col.accessor('reason', {
        header: '사유',
        meta: { className: 'max-w-[280px]' },
        cell: (c) => <span className="block truncate text-slate-600">{c.getValue() || '-'}</span>,
      }),
      col.display({ id: 'by', header: '처리자', cell: ({ row: { original: r } }) => <span className="text-slate-600">{r.processed_by.email}</span> }),
      col.accessor('requested_at', { header: '신청일', cell: (c) => <span className="text-slate-500">{formatDateTime(c.getValue())}</span> }),
    ],
    [pii, canSeeUser],
  );

  return (
    <>
      <PageHeader title="가입신청" description="승인·거절된 신청 기록입니다. 거절된 신청도 처리 당시 정보로 남아 있습니다." />
      <RouteTabs tabs={JOIN_TABS} label="가입신청 탭" />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="신청자 닉네임·실명" />
      </div>
      <DataTable list={list} query={query} columns={columns} getRowId={(r) => r.id} empty={{ title: '처리 이력이 없습니다' }} />
    </>
  );
}
