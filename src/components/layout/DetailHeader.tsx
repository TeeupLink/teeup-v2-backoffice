import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

/**
 * 상세 화면 머리. "목록으로"는 들어올 때의 목록 URL(필터 포함)로 돌아간다 (정보구조도 5장).
 * 목록에서 상세로 갈 때 navigate(href, { state: { from: location } }) 를 쓰지 않아도
 * DataTable 행 이동은 브라우저 기록이 남으므로, state 가 없으면 기본 목록으로 간다.
 */
export function DetailHeader({
  backTo,
  title,
  badges,
  meta,
  actions,
}: {
  backTo: string;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return (
    <div className="mb-5">
      <Link to={from ?? backTo} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        목록으로
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
            {badges}
          </div>
          {meta && <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
