import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate, formatNumber } from '@/lib/format';
import { fetchSummary, termsKey, TYPE_LABEL } from './api';

// SCR-075 약관 (화면설계서 4.8, F-075) — 종류별 게시중 버전과 동의 수
export function TermsPage() {
  const q = useQuery({ queryKey: [...termsKey, 'summary'], queryFn: fetchSummary });
  return (
    <>
      <PageHeader
        title="약관"
        description="게시된 버전의 본문은 바꾸지 않습니다. 고치려면 새 버전을 만들어 게시하세요 — 회원이 동의한 문구가 그대로 남습니다."
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {q.data.map((s) => (
            <li key={s.type}>
              <Link to={`/terms/${s.type}`} className="block rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary-400">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary-700" aria-hidden />
                    <h2 className="font-semibold text-slate-900">{TYPE_LABEL[s.type]}</h2>
                  </div>
                  {s.draft_count > 0 && <Badge tone="warning">초안 {s.draft_count}</Badge>}
                </div>
                {s.active ? (
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">게시 버전</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">
                        v{s.active.version}
                        {s.active.is_required && <span className="ml-1 text-xs font-normal text-red-700">필수</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">게시일</dt>
                      <dd className="mt-0.5 text-slate-900">{formatDate(s.active.published_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">동의</dt>
                      <dd className="mt-0.5 tabular text-slate-900">{formatNumber(s.active.agreement_count)}명</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-red-700">게시된 버전이 없습니다. 앱에 이 약관이 보이지 않습니다.</p>
                )}
                <p className="mt-3 text-xs text-slate-500">버전 {s.version_count}개</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
