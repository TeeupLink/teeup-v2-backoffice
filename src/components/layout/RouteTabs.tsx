import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

export type RouteTab = { to: string; label: string; count?: number | null; end?: boolean };

/** 상세 탭 — 탭 = URL 경로 세그먼트 (REQ-014, /x/:id/{tab}) */
export function RouteTabs({ tabs }: { tabs: RouteTab[] }) {
  return (
    <nav aria-label="상세 탭" className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          replace
          className={({ isActive }) =>
            cn(
              'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'border-primary-600 text-primary-800' : 'border-transparent text-slate-500 hover:text-slate-800',
            )
          }
        >
          {t.label}
          {t.count != null && <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular text-slate-600">{t.count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
