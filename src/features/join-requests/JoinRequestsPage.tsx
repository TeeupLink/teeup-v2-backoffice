import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import type { BulkAction } from '@/components/data-table/bulk';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { confirm, type ConfirmOptions } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { LookupSelect } from '@/components/form/LookupSelect';
import { lookupLabel } from '@/components/form/lookupLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { JOIN_REQUESTS_PATH, processJoinRequests, type JoinRequestRow } from './api';
import { JOIN_TABS } from './tabs';

// SCR-020 가입신청 목록 (화면설계서 4.3) — 대시보드 카드 → 전체 선택 → 승인 = 3클릭
const DEFS: FilterDef[] = [
  {
    kind: 'custom',
    key: 'club_id',
    label: '클럽',
    render: (v, onChange) => <LookupSelect kind="clubs" value={v as string | undefined} onChange={(id) => onChange(id)} placeholder="클럽 전체" />,
    chipLabel: (v) => lookupLabel('clubs', String(v)),
  },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '신청일' },
];
const CONFIG: ListConfig = { filters: filterKeys(DEFS), defaultSort: '-created_at', sortable: ['created_at'] };
// 클럽 상세 가입신청 탭: 클럽은 고정이라 클럽 필터·열이 없다
const CLUB_DEFS = DEFS.filter((d) => d.key !== 'club_id');
const CLUB_CONFIG: ListConfig = { ...CONFIG, filters: filterKeys(CLUB_DEFS) };

const rejectConfirm = (count: number): ConfirmOptions => ({
  title: count > 1 ? `${count}건을 거절할까요?` : '가입신청을 거절할까요?',
  description: '거절하면 신청이 삭제됩니다.',
  confirmText: '거절',
  tone: 'danger',
  reason: { label: '사유 (선택)', placeholder: '처리 이력에 남습니다' },
});

const col = createColumnHelper<JoinRequestRow>();

/** 가입 대기 목록 + 승인·거절. clubId 를 주면 그 클럽만 (클럽 상세 탭) */
export function JoinRequestsTable({ clubId }: { clubId?: number }) {
  const { can } = useAuth();
  const pii = usePII();
  const qc = useQueryClient();
  const list = useListState(clubId ? CLUB_CONFIG : CONFIG);
  const query = useListQuery<JoinRequestRow>('join-requests', JOIN_REQUESTS_PATH, list.state, { extraQuery: clubId ? { club_id: clubId } : undefined });
  const canSeeUser = can('users');

  const single = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) => processJoinRequests([id], action, reason),
    onSuccess: async (res, v) => {
      await qc.invalidateQueries();
      if (res.failed.length) toast.error(res.failed[0]!.message);
      else toast.success(v.action === 'approve' ? '가입을 승인했습니다' : '가입신청을 거절했습니다');
    },
    onError: (e) => toast.error('처리하지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(
    () => [
      col.display({
        id: 'user',
        header: '신청자',
        cell: ({ row: { original: r } }) => {
          const label = (
            <>
              <span className="font-medium text-slate-900">{r.user.nickname}</span>
              <span className="block text-xs text-slate-500">
                {pii.name(r.user.name)} · 평균 {r.user.average_score ?? '-'}
              </span>
            </>
          );
          return canSeeUser ? (
            <Link to={`/users/${r.user.id}`} className="block hover:underline">
              {label}
            </Link>
          ) : (
            <div>{label}</div>
          );
        },
      }),
      ...(clubId
        ? []
        : [
            col.display({
              id: 'club',
              header: '클럽',
              cell: ({ row: { original: r } }) => (
                <Link to={`/clubs/${r.club.id}`} className="text-slate-700 hover:underline">
                  {r.club.name}
                </Link>
              ),
            }),
          ]),
      col.accessor('created_at', { header: '신청일', meta: { sortKey: 'created_at' }, cell: (c) => formatDateTime(c.getValue()) }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">처리</span>,
        meta: { align: 'right' },
        cell: ({ row: { original: r } }) => {
          const busy = single.isPending && single.variables?.id === r.membership_id;
          return (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" disabled={busy} onClick={async () => {
                const ok = await confirm(rejectConfirm(1));
                if (ok) single.mutate({ id: r.membership_id, action: 'reject', reason: ok.reason || undefined });
              }}>
                거절
              </Button>
              <Button size="sm" variant="primary" loading={busy && single.variables?.action === 'approve'} disabled={busy} onClick={() => single.mutate({ id: r.membership_id, action: 'approve' })}>
                승인
              </Button>
            </div>
          );
        },
      }),
    ],
    [pii, canSeeUser, single, clubId],
  );

  const bulkActions: BulkAction[] = [
    { key: 'reject', label: '거절', confirm: rejectConfirm, run: (ids, reason) => processJoinRequests(ids, 'reject', reason) },
    // 승인은 되돌릴 수 있고 가장 잦은 작업이라 확인 없이 바로 처리 (정보구조도 4.1)
    { key: 'approve', label: '승인', tone: 'primary', run: (ids) => processJoinRequests(ids, 'approve') },
  ];

  return (
    <>
      <div className="mb-3">
        <FilterBar list={list} defs={clubId ? CLUB_DEFS : DEFS} searchPlaceholder="신청자 닉네임·실명" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.membership_id}
        bulkActions={bulkActions}
        empty={{ title: '처리할 가입신청이 없습니다' }}
      />
    </>
  );
}

export function JoinRequestsPage() {
  return (
    <>
      <PageHeader title="가입신청" description="전체 클럽의 가입 대기 신청입니다. 여러 건을 선택해 한 번에 처리할 수 있습니다." />
      <RouteTabs tabs={JOIN_TABS} label="가입신청 탭" />
      <JoinRequestsTable />
    </>
  );
}
