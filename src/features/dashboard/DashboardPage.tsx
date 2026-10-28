import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDot, Flag, MessageSquare, RefreshCw, UserPlus, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { Card, StatCard } from '@/components/display/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

// SCR-010 대시보드 (화면설계서 4.2)
type Todo = { join_requests: number | null; unanswered_inquiries: number | null; today_rounds: number | null; pending_reports: number | null };
type Stats = { total_users: number; total_clubs: number; total_meetings: number; weekly_rounds: number };

type TodoCardDef = { key: keyof Todo; label: string; to: string; icon: LucideIcon; verb: string };

// 카드 링크의 필터는 /dashboard/todo 건수 계산과 같아야 한다 (REQ-060·061)
const TODO_CARDS: TodoCardDef[] = [
  { key: 'join_requests', label: '가입신청 대기', to: '/join-requests', icon: UserPlus, verb: '바로 처리' },
  { key: 'unanswered_inquiries', label: '미답변 문의', to: '/inquiries', icon: MessageSquare, verb: '바로 처리' },
  { key: 'today_rounds', label: '오늘 라운딩', to: '/rounds?date=today', icon: CircleDot, verb: '보기' },
  { key: 'pending_reports', label: '신고 대기', to: '/reports', icon: Flag, verb: '바로 처리' },
];

function TodoCard({ def, count }: { def: TodoCardDef; count: number }) {
  const hot = count > 0;
  return (
    <Link
      to={def.to}
      className={cn(
        'group rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        hot ? 'ring-2 ring-primary-500' : 'ring-1 ring-slate-200',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{def.label}</span>
        <def.icon className={cn('h-5 w-5', hot ? 'text-primary-600' : 'text-slate-300')} aria-hidden />
      </div>
      <p className={cn('mt-2 text-3xl font-bold tabular', hot ? 'text-slate-900' : 'text-slate-400')}>{formatNumber(count)}</p>
      <p className={cn('mt-2 text-sm', hot ? 'font-medium text-primary-800 group-hover:underline' : 'text-slate-400')}>
        {hot ? `${def.verb} →` : '처리할 일 없음'}
      </p>
    </Link>
  );
}

export function DashboardPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const todo = useQuery({ queryKey: ['dashboard', 'todo'], queryFn: () => api<Todo>('/admin/dashboard/todo'), refetchInterval: 60_000 });
  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: () => api<Stats>('/admin/dashboard/stats') });

  const cards = TODO_CARDS.filter((c) => todo.data?.[c.key] != null);
  const refreshing = todo.isFetching || stats.isFetching;

  return (
    <>
      <PageHeader
        title="대시보드"
        description={me ? `${me.name || me.email}님, 오늘 처리할 일을 확인하세요.` : undefined}
        actions={
          <Button onClick={() => void qc.invalidateQueries({ queryKey: ['dashboard'] })} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
            새로고침
          </Button>
        }
      />

      <section aria-labelledby="todo-title" className="mb-6">
        <h2 id="todo-title" className="mb-3 text-base font-semibold text-slate-900">
          오늘 처리할 일
        </h2>
        {todo.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[132px] rounded-xl" />
            ))}
          </div>
        ) : todo.isError ? (
          <Card>
            <ErrorState error={todo.error} onRetry={() => void todo.refetch()} />
          </Card>
        ) : (
          <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', cards.length >= 4 ? 'xl:grid-cols-4' : cards.length === 3 ? 'xl:grid-cols-3' : '')}>
            {cards.map((c) => (
              <TodoCard key={c.key} def={c} count={todo.data[c.key] ?? 0} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="mb-3 text-base font-semibold text-slate-900">
          운영 요약
        </h2>
        {stats.isError ? (
          <Card>
            <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="전체 회원" value={stats.data ? formatNumber(stats.data.total_users) : <Skeleton className="h-9 w-20" />} />
            <StatCard label="전체 클럽" value={stats.data ? formatNumber(stats.data.total_clubs) : <Skeleton className="h-9 w-20" />} />
            <StatCard label="전체 모임" value={stats.data ? formatNumber(stats.data.total_meetings) : <Skeleton className="h-9 w-20" />} />
            <StatCard label="이번주 라운딩" value={stats.data ? formatNumber(stats.data.weekly_rounds) : <Skeleton className="h-9 w-20" />} />
          </div>
        )}
      </section>
    </>
  );
}
