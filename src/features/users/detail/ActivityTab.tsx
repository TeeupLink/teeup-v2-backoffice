import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight, History } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import type { ListConfig } from '@/components/data-table/listState';
import { useListState } from '@/components/data-table/useListState';
import { Card } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import type { Tone } from '@/lib/status';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { fetchActivities } from '../api';
import { activityHref, DEVICE, EVENT_TYPE } from '../labels';
import type { ActivityItem } from '../types';

// F-033 활동 타임라인 — 날짜별 묶음, 커서로 "더 보기"

const DEFS: FilterDef[] = [
  { kind: 'multi', key: 'types', label: '유형', options: toOptions(EVENT_TYPE) },
  { kind: 'dateRange', key: 'from', toKey: 'to', label: '기간' },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

const TONE: Record<string, Tone> = {
  WITHDRAW: 'danger',
  REPORT: 'danger',
  PAYMENT: 'info',
  SIGNUP: 'success',
  CLUB_JOIN: 'success',
  MEETING_JOIN: 'success',
  CLUB_JOIN_REQUEST: 'warning',
  MEETING_CANCEL: 'warning',
  CLUB_LEAVE: 'warning',
};

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (v: string) => {
  const d = new Date(v);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function metaText(a: ActivityItem): string {
  const device = typeof a.meta?.device === 'string' ? (DEVICE[a.meta.device] ?? a.meta.device) : null;
  const version = typeof a.meta?.app_version === 'string' ? `v${a.meta.app_version}` : null;
  return [device, version, a.ip_masked].filter(Boolean).join(' · ');
}

function Row({ a }: { a: ActivityItem }) {
  const href = activityHref(a.target_type, a.target_id);
  const meta = metaText(a);
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="w-12 shrink-0 pt-0.5 text-sm tabular text-slate-500">{timeOf(a.created_at)}</span>
      <Badge tone={TONE[a.event_type] ?? 'neutral'} className="mt-0.5 w-20 justify-center">
        {EVENT_TYPE[a.event_type] ?? a.event_type}
      </Badge>
      <div className="min-w-0 flex-1">
        {href ? (
          <Link to={href} className="text-sm text-slate-900 hover:underline">
            {a.summary} <ChevronRight className="inline h-3.5 w-3.5 text-slate-400" aria-hidden />
          </Link>
        ) : (
          <p className="text-sm text-slate-900">{a.summary}</p>
        )}
        {meta && <p className="mt-0.5 text-xs text-slate-500">{meta}</p>}
      </div>
    </li>
  );
}

export function ActivityTab({ userId }: { userId: number }) {
  const config = useMemo<ListConfig>(() => ({ filters: filterKeys(DEFS), defaults: { from: daysAgo(30) } }), []);
  const list = useListState(config);
  const f = list.state.filters;
  const types = ([] as string[]).concat(f.types ?? []);
  const from = typeof f.from === 'string' && f.from !== 'all' ? f.from : undefined;
  const to = typeof f.to === 'string' ? f.to : undefined;

  const q = useInfiniteQuery({
    queryKey: ['user', userId, 'activities', types, from, to],
    queryFn: ({ pageParam }) => fetchActivities(userId, { types, from, to, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });

  const groups = useMemo(() => {
    const out: { day: string; items: ActivityItem[] }[] = [];
    for (const a of q.data?.pages.flatMap((p) => p.items) ?? []) {
      const day = formatDate(a.created_at);
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1]!.items.push(a);
    }
    return out;
  }, [q.data]);

  return (
    <div className="space-y-3">
      <FilterBar list={list} defs={DEFS} search={false} />
      <Card>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : q.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState icon={History} title="이 기간의 활동이 없습니다" description="기간을 넓혀 보세요. 활동 기록은 1년간 보관합니다." />
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.day} className="border-b border-slate-100 pb-2 last:border-0">
                <h3 className="pt-2 text-sm font-semibold text-slate-700">{g.day}</h3>
                <ul>
                  {g.items.map((a) => (
                    <Row key={a.id} a={a} />
                  ))}
                </ul>
              </section>
            ))}
            <div className="pt-3 text-center">
              {q.hasNextPage ? (
                <Button onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>
                  더 보기
                </Button>
              ) : (
                <p className="text-xs text-slate-400">마지막 기록입니다. 1년이 지난 활동은 보관하지 않습니다.</p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
