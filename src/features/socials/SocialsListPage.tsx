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
import { LookupSelect } from '@/components/form/LookupSelect';
import { lookupLabel } from '@/components/form/lookupLabels';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { mapSocialsQuery, SOCIALS_PATH } from './api';
import { SOCIAL_TYPE } from './labels';
import type { SocialRow } from './types';

// SCR-060 소셜 목록 (화면설계서 4.7, F-060)
const DEFS: FilterDef[] = [
  {
    kind: 'custom',
    key: 'club_id',
    label: '클럽',
    render: (v, onChange) => <LookupSelect kind="clubs" value={v as string | undefined} onChange={(id) => onChange(id)} placeholder="클럽 전체" />,
    chipLabel: (v) => lookupLabel('clubs', String(v)),
  },
  { kind: 'select', key: 'social_type', label: '유형', options: toOptions(SOCIAL_TYPE) },
  { kind: 'select', key: 'date', label: '모임일', options: [{ value: 'today', label: '오늘' }] },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '기간' },
];
const CONFIG: ListConfig = {
  filters: filterKeys(DEFS, ['status']),
  defaultSort: '-meeting_time',
  sortable: ['meeting_time'],
};

// 클럽 상세 모임 탭: 클럽은 고정이라 클럽 필터·열이 없다
const CLUB_DEFS = DEFS.filter((d) => d.key !== 'club_id');
const CLUB_CONFIG: ListConfig = { ...CONFIG, filters: filterKeys(CLUB_DEFS, ['status']) };

const col = createColumnHelper<SocialRow>();

/** 소셜 목록 표. clubId 를 주면 그 클럽만 (클럽 상세 모임 탭) */
export function SocialsTable({ clubId }: { clubId?: number }) {
  const list = useListState(clubId ? CLUB_CONFIG : CONFIG);
  const query = useListQuery<SocialRow>('socials', SOCIALS_PATH, list.state, {
    mapQuery: mapSocialsQuery,
    extraQuery: clubId ? { club_id: clubId } : undefined,
  });

  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: '모임명',
        cell: ({ row: { original: r } }) => (
          <Link to={`/socials/${r.id}`} className="block font-medium text-slate-900 hover:underline">
            {r.name}
            {r.social_type && <span className="block text-xs font-normal text-slate-500">{SOCIAL_TYPE[r.social_type] ?? r.social_type}</span>}
          </Link>
        ),
      }),
      ...(clubId ? [] : [col.accessor('club_name', { header: '클럽' })]),
      col.accessor('meeting_time', {
        header: '일시',
        meta: { sortKey: 'meeting_time' },
        cell: (c) => formatDateTime(c.getValue()),
      }),
      col.accessor('venue_name', {
        header: '장소',
        cell: ({ row: { original: r } }) => r.venue_name || r.location || '-',
      }),
      col.display({
        id: 'count',
        header: '참가',
        meta: { align: 'right' },
        cell: ({ row: { original: r } }) => (
          <span className="tabular">
            {r.confirmed_count ?? r.participant_count}
            <span className="text-slate-400">/{r.max_participants || '제한 없음'}</span>
          </span>
        ),
      }),
      col.display({
        id: 'creator',
        header: '개설자',
        cell: ({ row: { original: r } }) => r.creator?.nickname ?? '-',
      }),
      col.accessor('status', {
        header: '상태',
        cell: (c) => <StatusBadge domain="meeting" value={c.getValue()} />,
      }),
    ],
    [clubId],
  );

  return (
    <>
      <div className="mb-3">
        <FilterBar list={list} defs={clubId ? CLUB_DEFS : DEFS} searchPlaceholder="모임명·장소" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/socials/${r.id}`}
        empty={{ title: '소셜 모임이 없습니다', description: '필터를 바꿔 보세요.' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="status"
            options={[
              { value: '', label: '전체' },
              { value: 'SCHEDULED', label: '예정' },
              { value: 'IN_PROGRESS', label: '진행중' },
              { value: 'COMPLETED', label: '완료' },
              { value: 'CANCELED', label: '취소' },
            ]}
          />
        }
      />
    </>
  );
}

export function SocialsListPage() {
  const { can } = useAuth();
  return (
    <>
      <PageHeader
        title="소셜"
        description="골프 외 친목 모임입니다 (캐주얼·식사·이벤트)."
        actions={
          can('meetings', 'write') && (
            <Link to="/socials/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                소셜 등록
              </Button>
            </Link>
          )
        }
      />
      <SocialsTable />
    </>
  );
}
