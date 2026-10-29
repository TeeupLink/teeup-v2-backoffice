import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import type { Page } from '@/lib/api/envelope';
import { formatDate } from '@/lib/format';
import { fetchHandicapHistory } from '../api';
import type { ScoreHistoryItem, UserDetail } from '../types';

const CONFIG = {};
const col = createColumnHelper<ScoreHistoryItem>();
const METHOD: Record<string, string> = { MANUAL: '수동 입력', AUTO: '자동 계산' };

/** 핸디캡·스코어 이력 (F-032 골프 탭) */
export function GolfTab({ user: u }: { user: UserDetail }) {
  const list = useListState(CONFIG);
  const { page, size } = list.state;
  const query = useQuery({
    queryKey: ['user', u.id, 'handicap-history', page, size],
    queryFn: () => fetchHandicapHistory(u.id, page, size),
    placeholderData: keepPreviousData,
    select: (d): Page<ScoreHistoryItem> => ({ items: d.score_history, total: d.total, page, size }),
  });
  const columns = useMemo(
    () => [
      col.accessor('played_at', { header: '경기일', cell: (c) => formatDate(c.getValue()) }),
      col.accessor('meeting_name', { header: '라운딩', cell: (c) => <span className="font-medium text-slate-900">{c.getValue() ?? '-'}</span> }),
      col.accessor('club_name', { header: '클럽', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('gross_score', { header: '스코어', meta: { align: 'right' } }),
      col.accessor('handicap_used', { header: '적용 핸디', meta: { align: 'right' } }),
      col.accessor('net_score', { header: '네트', meta: { align: 'right' }, cell: (c) => c.getValue() ?? '-' }),
    ],
    [],
  );
  return (
    <div className="space-y-4">
      <Card title="핸디캡">
        <DescriptionList
          columns={3}
          items={[
            { label: '평균스코어 (현재)', value: u.average_score ?? '-' },
            { label: '평균스코어 (가입 시)', value: u.average_score_init ?? '-' },
            { label: '핸디캡 (계산)', value: u.handicap ?? '-' },
            { label: '핸디캡 (초기)', value: u.handicap_init ?? '-' },
            { label: '산정 방식', value: u.handicap_update_method ? (METHOD[u.handicap_update_method] ?? u.handicap_update_method) : '-' },
            { label: '계산에 쓴 경기 수', value: u.handicap_calculation_count ?? 0 },
          ]}
        />
      </Card>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/rounds/${r.meeting_id}`}
        empty={{ title: '기록된 스코어가 없습니다' }}
      />
    </div>
  );
}
