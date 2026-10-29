import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListState } from '@/components/data-table/useListState';
import { StatusBadge } from '@/components/display/StatusBadge';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import type { Page } from '@/lib/api/envelope';
import { formatDateTime } from '@/lib/format';
import { fetchUserMeetings } from '../api';
import type { UserMeeting } from '../types';

const CONFIG: ListConfig = { filters: { type: 'single' }, defaults: { type: 'round' } };
const col = createColumnHelper<UserMeeting>();

/** 참가 모임. API 는 라운딩·소셜을 같은 page/limit 으로 함께 준다 → 탭으로 하나만 보여 준다 */
export function MeetingsTab({ userId }: { userId: number }) {
  const list = useListState(CONFIG);
  const round = list.state.filters.type !== 'social';
  const { page, size } = list.state;
  const query = useQuery({
    queryKey: ['user', userId, 'meetings', page, size],
    queryFn: () => fetchUserMeetings(userId, page, size),
    placeholderData: keepPreviousData,
    select: (d): Page<UserMeeting> =>
      round ? { items: d.rounding_meetings, total: d.total_rounding, page, size } : { items: d.social_meetings, total: d.total_social, page, size },
  });
  const columns = useMemo(
    () => [
      col.accessor('meeting_name', { header: '모임', cell: (c) => <span className="font-medium text-slate-900">{c.getValue()}</span> }),
      col.accessor('club_name', { header: '클럽' }),
      col.accessor('meeting_time', { header: '일시', cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="meeting" value={c.getValue()} /> }),
      ...(round
        ? [
            col.accessor('gross_score', { header: '스코어', meta: { align: 'right' }, cell: (c) => c.getValue() ?? '-' }),
            col.accessor('net_score', { header: '네트', meta: { align: 'right' }, cell: (c) => c.getValue() ?? '-' }),
          ]
        : []),
      col.accessor('joined_at', { header: '참가 신청', cell: (c) => formatDateTime(c.getValue()) }),
    ],
    [round],
  );
  return (
    <DataTable
      list={list}
      query={query}
      columns={columns}
      getRowId={(r) => r.meeting_id}
      rowHref={(r) => `/${round ? 'rounds' : 'socials'}/${r.meeting_id}`}
      empty={{ title: round ? '참가한 라운딩이 없습니다' : '참가한 소셜 모임이 없습니다' }}
      toolbar={
        <StatusTabs
          list={list}
          filterKey="type"
          options={[
            { value: 'round', label: '라운딩', count: query.data && round ? query.data.total : undefined },
            { value: 'social', label: '소셜', count: query.data && !round ? query.data.total : undefined },
          ]}
        />
      }
    />
  );
}
