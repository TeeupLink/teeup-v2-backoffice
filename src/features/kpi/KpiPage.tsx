import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { BarChart, type BarPoint } from '@/components/charts/BarChart';
import { Card } from '@/components/display/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Select } from '@/components/form/controls';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';

// SCR-011 KPI 대시보드 (화면설계서 4.2, F-130). 최고 관리자 전용. 기간·단위는 URL 에 둔다

type Totals = { dau: number | null; mau: number | null; signups: number; clubs: number; rounds: number; socials: number; revenue: number | null };
type Point = {
  start: string;
  active_users: number | null;
  dau: number | null;
  signups: number;
  clubs: number;
  rounds: number;
  socials: number;
  revenue: number | null;
};
type Kpi = {
  from: string;
  to: string;
  interval: 'day' | 'week' | 'month';
  data_since: string | null;
  totals: Totals;
  previous: Totals;
  clubs_total: number;
  series: Point[];
  retention: { week_start: string; size: number; weeks: (number | null)[] }[];
};

const RANGES = {
  '30d': { days: 30, interval: 'day', label: '최근 30일' },
  '90d': { days: 90, interval: 'week', label: '최근 90일' },
  '12m': { days: 365, interval: 'month', label: '최근 12개월' },
} as const;
type Range = keyof typeof RANGES;
const INTERVAL_LABEL = { day: '일', week: '주', month: '월' } as const;

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function bucketLabel(start: string, interval: Kpi['interval']) {
  const [, m, d] = start.split('-');
  return interval === 'month' ? `${Number(m)}월` : `${Number(m)}/${Number(d)}`;
}

function Delta({ now, before }: { now: number | null; before: number | null }) {
  if (now == null || before == null) return <span className="text-xs text-slate-400">이전 기간 비교 없음</span>;
  if (before === 0) return <span className="text-xs text-slate-500">이전 기간 0</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center text-xs font-medium', up ? 'text-primary-800' : 'text-red-700')}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {up ? '+' : ''}
      {pct}% <span className="ml-1 font-normal text-slate-500">이전 기간 대비</span>
    </span>
  );
}

function Tile({ label, value, unit = '', before, hint }: { label: string; value: number | null; unit?: string; before?: number | null; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold tabular', value == null ? 'text-slate-300' : 'text-slate-900')}>
        {value == null ? '데이터 없음' : `${formatNumber(value)}${unit}`}
      </p>
      <div className="mt-2 min-h-5">
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : before !== undefined && <Delta now={value} before={before} />}
      </div>
    </div>
  );
}

/** 리텐션 셀: 한 색의 밝기로 크기를 보여 주고 숫자를 항상 같이 쓴다 */
function RetentionCell({ v }: { v: number | null }) {
  if (v == null) return <td className="bg-slate-50 px-2 py-1.5 text-center text-xs text-slate-300">-</td>;
  const bg =
    v >= 60
      ? 'bg-primary-700 text-white'
      : v >= 40
        ? 'bg-primary-500 text-white'
        : v >= 20
          ? 'bg-primary-200 text-primary-900'
          : v > 0
            ? 'bg-primary-50 text-primary-900'
            : 'bg-white text-slate-500';
  return <td className={cn('px-2 py-1.5 text-center text-xs tabular', bg)}>{v}%</td>;
}

export function KpiPage() {
  const [sp, setSp] = useSearchParams();
  const range = (sp.get('range') as Range) in RANGES ? (sp.get('range') as Range) : '30d';
  const interval = (['day', 'week', 'month'] as const).find((i) => i === sp.get('interval')) ?? RANGES[range].interval;
  const to = new Date();
  const from = new Date(to.getTime() - (RANGES[range].days - 1) * 86_400_000);
  const q = useQuery({
    queryKey: ['kpi', range, interval],
    queryFn: () => api<Kpi>('/admin/kpi', { query: { from: ymd(from), to: ymd(to), interval } }),
    staleTime: 5 * 60_000,
  });
  const set = (k: string, v: string | null) =>
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set(k, v);
      else next.delete(k);
      if (k === 'range') next.delete('interval');
      return next;
    });

  const series = (pick: (p: Point) => number | null): BarPoint[] =>
    (q.data?.series ?? []).map((p) => ({ key: p.start, label: bucketLabel(p.start, q.data!.interval), value: pick(p) }));

  return (
    <>
      <PageHeader
        title="KPI"
        description="활성 회원은 로그인 기록으로, 라운딩·소셜은 모임일로 셉니다. 기록을 모으기 전 기간은 0 이 아니라 '데이터 없음'입니다."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label="기간"
          className="w-36"
          value={range}
          onChange={(e) => set('range', e.target.value)}
          options={Object.entries(RANGES).map(([value, r]) => ({ value, label: r.label }))}
        />
        <Select
          aria-label="단위"
          className="w-24"
          value={interval}
          onChange={(e) => set('interval', e.target.value)}
          options={Object.entries(INTERVAL_LABEL).map(([value, label]) => ({ value, label }))}
        />
        {q.data?.data_since && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5" aria-hidden />
            로그인 기록은 {formatDate(q.data.data_since)}부터 있습니다
          </span>
        )}
      </div>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Tile label="DAU (일평균)" value={q.data.totals.dau} before={q.data.previous.dau} />
            <Tile label="MAU (최근 30일)" value={q.data.totals.mau} before={q.data.previous.mau} />
            <Tile label="신규 가입" value={q.data.totals.signups} unit="명" before={q.data.previous.signups} />
            <Tile label="신규 클럽" value={q.data.totals.clubs} unit="개" hint={`전체 ${formatNumber(q.data.clubs_total)}개`} />
            <Tile label="라운딩" value={q.data.totals.rounds} unit="회" before={q.data.previous.rounds} />
            <Tile label="매출" value={q.data.totals.revenue} hint="결제 연동 후 표시" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`활성 회원 (${INTERVAL_LABEL[q.data.interval]}별)`}>
              <BarChart ariaLabel="기간별 활성 회원 수" data={series((p) => p.active_users)} unit="명" />
            </Card>
            <Card title={`신규 가입 (${INTERVAL_LABEL[q.data.interval]}별)`}>
              <BarChart ariaLabel="기간별 신규 가입 수" data={series((p) => p.signups)} unit="명" />
            </Card>
            <Card title={`라운딩 (${INTERVAL_LABEL[q.data.interval]}별)`}>
              <BarChart ariaLabel="기간별 라운딩 수" data={series((p) => p.rounds)} unit="회" />
            </Card>
            <Card title={`소셜 모임 (${INTERVAL_LABEL[q.data.interval]}별)`}>
              <BarChart ariaLabel="기간별 소셜 모임 수" data={series((p) => p.socials)} unit="회" />
            </Card>
          </div>
          <Card title="4주 리텐션">
            <p className="mb-3 text-xs text-slate-500">
              가입한 주별로, 가입 후 1~4주차에 한 번 이상 로그인한 회원 비율입니다. 아직 지나지 않았거나 기록이 없는 칸은 - 입니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-separate border-spacing-0.5 text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="px-2 py-1 text-left font-medium">가입 주</th>
                    <th className="px-2 py-1 text-right font-medium">가입</th>
                    {[1, 2, 3, 4].map((w) => (
                      <th key={w} className="px-2 py-1 font-medium">
                        {w}주차
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {q.data.retention.map((c) => (
                    <tr key={c.week_start}>
                      <th scope="row" className="px-2 py-1.5 text-left font-normal text-slate-700">
                        {formatDate(c.week_start)} 주
                      </th>
                      <td className="px-2 py-1.5 text-right tabular text-slate-900">{formatNumber(c.size)}명</td>
                      {c.weeks.map((v, i) => (
                        <RetentionCell key={i} v={v} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
