import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { StatusBadge } from '@/components/display/StatusBadge';
import type { Page } from '@/lib/api/envelope';
import { formatDate } from '@/lib/format';
import { fetchUserClubs } from '../api';
import { CLUB_ROLE, CLUB_TYPE } from '@/features/clubs/labels';
import type { UserClub } from '../types';

const col = createColumnHelper<UserClub>();
const CONFIG = {};

/** 소속 클럽 (활동 중인 멤버십). API 가 전체를 한 번에 준다 */
export function ClubsTab({ userId }: { userId: number }) {
  const list = useListState(CONFIG);
  const query = useQuery({
    queryKey: ['user', userId, 'clubs'],
    queryFn: () => fetchUserClubs(userId),
    select: (d): Page<UserClub> => ({ items: d.clubs, total: d.clubs.length, page: 1, size: Math.max(d.clubs.length, 1) }),
  });
  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: '클럽',
        cell: ({ row }) => (
          <Link to={`/clubs/${row.original.id}`} className="font-medium text-slate-900 hover:underline">
            {row.original.name}
          </Link>
        ),
      }),
      col.accessor('type', { header: '유형', cell: (c) => CLUB_TYPE[c.getValue()] ?? c.getValue() }),
      col.accessor('location', { header: '지역', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('member_role', { header: '역할', cell: (c) => CLUB_ROLE[c.getValue()] ?? c.getValue() }),
      col.accessor('status', { header: '클럽 상태', cell: (c) => <StatusBadge domain="club" value={c.getValue()} /> }),
      col.accessor('joined_at', { header: '가입일', cell: (c) => formatDate(c.getValue()) }),
    ],
    [],
  );
  return <DataTable list={list} query={query} columns={columns} getRowId={(r) => r.id} rowHref={(r) => `/clubs/${r.id}`} empty={{ title: '소속 클럽이 없습니다' }} />;
}
