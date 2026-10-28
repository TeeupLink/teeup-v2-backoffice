import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { Link, NavLink, useMatch, useResolvedPath } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { cn } from '@/lib/cn';
import { NAV, type NavItem } from './nav';

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

// 구조·클래스: shortcrew admin layout.html (디자인스타일가이드 2.2), 색만 teeup 토큰
export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: Props) {
  const { can } = useAuth();
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => can(i.resource)) })).filter(
    (s) => s.items.length > 0,
  );

  return (
    <>
      <div
        data-open={mobileOpen}
        onClick={onCloseMobile}
        className="pointer-events-none fixed inset-0 z-[85] bg-slate-900/50 opacity-0 transition-opacity duration-200 data-[open=true]:pointer-events-auto data-[open=true]:opacity-100 lg:hidden"
        aria-hidden
      />
      <aside
        data-open={mobileOpen}
        data-collapsed={collapsed}
        className="group/sidebar fixed left-0 top-0 z-[90] flex h-full min-h-0 w-60 shrink-0 -translate-x-full flex-col bg-surface-card shadow-xl transition-[width,transform] duration-300 ease-out data-[open=true]:translate-x-0 lg:relative lg:z-auto lg:translate-x-0 lg:data-[collapsed=true]:w-[4.25rem]"
        aria-label="주 메뉴"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-3 lg:px-4 lg:group-data-[collapsed=true]/sidebar:justify-center lg:group-data-[collapsed=true]/sidebar:px-2">
          <NavLink
            to="/dashboard"
            className="flex min-w-0 items-center gap-2.5 text-white hover:text-primary-50 lg:group-data-[collapsed=true]/sidebar:hidden"
          >
            <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-white/20" />
            <span className="truncate text-base font-bold tracking-tight">티업링크</span>
          </NavLink>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/90 hover:bg-white/20 lg:inline-flex"
            aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          >
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
        </div>

        <Tooltip.Provider delayDuration={150}>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4 pb-6 [scrollbar-width:thin]">
          {sections.map((section, idx) => (
            <div key={section.label}>
              <p
                className={cn(
                  'mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider text-white/55 lg:group-data-[collapsed=true]/sidebar:sr-only',
                  idx > 0 && 'mt-5',
                )}
              >
                {section.label}
              </p>
              {section.items.map((item) => (
                <Tooltip.Root key={item.to} open={collapsed ? undefined : false}>
                  <Tooltip.Trigger asChild>
                    <SidebarLink item={item} onClick={onCloseMobile} />
                  </Tooltip.Trigger>
                  {/* 접힌 사이드바 툴팁. 메뉴 스크롤 영역에 잘리지 않도록 포털로 띄운다 */}
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="z-[100] hidden rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg lg:block"
                    >
                      {item.label}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ))}
            </div>
          ))}
        </nav>
        </Tooltip.Provider>
      </aside>
    </>
  );
}

type SidebarLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'to' | 'className'> & { item: NavItem };

// Tooltip.Trigger(asChild)가 className 을 문자열로 합치므로 NavLink 의 함수형 className 대신 활성 여부를 직접 계산한다
const SidebarLink = forwardRef<HTMLAnchorElement, SidebarLinkProps>(function SidebarLink({ item, ...rest }, ref) {
  const resolved = useResolvedPath(item.to);
  const isActive = !!useMatch({ path: resolved.pathname, end: item.to === '/dashboard' });
  return (
    <Link
      ref={ref}
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative mb-0.5 flex items-center justify-start rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        'lg:group-data-[collapsed=true]/sidebar:justify-center lg:group-data-[collapsed=true]/sidebar:px-2',
        isActive && 'bg-primary-500/25 ring-1 ring-primary-300/40',
      )}
      {...rest}
    >
      <item.icon className="mr-3 h-5 w-5 shrink-0 text-primary-50 lg:group-data-[collapsed=true]/sidebar:mr-0" aria-hidden />
      <span className="truncate lg:group-data-[collapsed=true]/sidebar:sr-only">{item.label}</span>
    </Link>
  );
});
