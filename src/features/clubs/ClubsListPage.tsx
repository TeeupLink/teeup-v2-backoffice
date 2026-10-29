import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { StatusBadge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { CLUBS_PATH, fetchSidoList, mapClubsQuery } from './api';
import { CLUB_TYPE } from './labels';
import type { ClubRow, Region } from './types';

// SCR-040 클럽 목록 (화면설계서 4.5, F-041)
const col = createColumnHelper<ClubRow>();
const CONFIG: ListConfig = {
  filters: filterKeys([], ['status', 'type', 'sido_code']),
  defaultSort: '-created_at',
  sortable: ['name', 'member_count', 'created_at'],
};

export function ClubsListPage() {
  const { can } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<ClubRow>('clubs', CLUBS_PATH, list.state, { mapQuery: mapClubsQuery });
  const sido = useQuery({ queryKey: ['sido-list'], queryFn: fetchSidoList, staleTime: Infinity });
  const sidoName = useMemo(() => new Map((sido.data ?? []).map((r: Region) => [r.code, r.name])), [sido.data]);

  const defs: FilterDef[] = useMemo(
    () => [
      { kind: 'select', key: 'type', label: '유형', options: toOptions(CLUB_TYPE) },
      { kind: 'select', key: 'sido_code', label: '지역', options: (sido.data ?? []).map((r) => ({ value: r.code, label: r.name })) },
    ],
    [sido.data],
  );

  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: '클럽명',
        meta: { sortKey: 'name' },
        cell: ({ row: { original: c } }) => (
          <Link to={`/clubs/${c.id}`} className="block font-medium text-slate-900 hover:underline">
            {c.name}
            {c.display_id && <span className="block text-xs font-normal text-slate-500">{c.display_id}</span>}
          </Link>
        ),
      }),
      col.accessor('type', { header: '유형', cell: (c) => CLUB_TYPE[c.getValue()] ?? c.getValue() }),
      col.accessor('sido_code', { header: '지역', cell: (c) => sidoName.get(c.getValue()) ?? '-' }),
      col.display({ id: 'leader', header: '리더', cell: ({ row: { original: c } }) => c.leader_nickname ?? c.leader_name ?? '-' }),
      col.accessor('member_count', { header: '멤버', meta: { align: 'right', sortKey: 'member_count' }, cell: (c) => <span className="tabular">{c.getValue()}</span> }),
      col.accessor('pending_count', {
        header: '대기',
        meta: { align: 'right' },
        cell: ({ row: { original: c } }) =>
          c.pending_count ? (
            <Link to={`/clubs/${c.id}/join-requests`} className="font-medium tabular text-amber-700 hover:underline">
              {c.pending_count}
            </Link>
          ) : (
            <span className="tabular text-slate-400">0</span>
          ),
      }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="club" value={c.getValue()} /> }),
      col.accessor('created_at', { header: '생성일', meta: { sortKey: 'created_at' }, cell: (c) => formatDate(c.getValue()) }),
    ],
    [sidoName],
  );

  return (
    <>
      <PageHeader
        title="클럽"
        actions={
          can('clubs', 'write') && (
            <Link to="/clubs/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                클럽 등록
              </Button>
            </Link>
          )
        }
      />
      <div className="mb-3">
        <FilterBar list={list} defs={defs} searchPlaceholder="클럽명·설명" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(c) => c.id}
        rowHref={(c) => `/clubs/${c.id}`}
        empty={{ title: '클럽이 없습니다', description: '필터를 바꿔 보세요.' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="status"
            options={[
              { value: '', label: '전체' },
              { value: 'ACTIVE', label: '활성' },
              { value: 'INACTIVE', label: '비활성' },
            ]}
          />
        }
      />
    </>
  );
}
