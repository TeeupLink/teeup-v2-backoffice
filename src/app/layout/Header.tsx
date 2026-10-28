import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { findNav } from './nav';

export function Header({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { me, logout } = useAuth();
  const { pathname } = useLocation();
  const nav = findNav(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav aria-label="현재 위치" className="min-w-0 flex-1 truncate text-sm text-slate-500">
        {nav ? (
          <>
            <span>{nav.section.label}</span>
            {nav.section.label !== nav.item.label && (
              <>
                <span className="mx-1.5 text-slate-300">/</span>
                <Link to={nav.item.to} className="font-medium text-slate-900 hover:underline">
                  {nav.item.label}
                </Link>
              </>
            )}
          </>
        ) : null}
      </nav>

      {/* 통합 검색·알림 벨·마스킹 토글은 #17 후속 커밋과 #27·#32 에서 이 자리에 들어온다 */}

      {me && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-800">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block font-medium leading-tight text-slate-900">{me.name || me.email}</span>
              <span className="block text-xs leading-tight text-slate-500">{me.role ? ROLE_LABEL[me.role] : '역할 없음'}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-[100] min-w-44 rounded-lg bg-white p-1 text-sm shadow-xl ring-1 ring-slate-200"
            >
              <DropdownMenu.Item asChild>
                <Link to="/profile" className="flex items-center gap-2 rounded-md px-2.5 py-2 outline-none data-[highlighted]:bg-slate-100">
                  <UserRound className="h-4 w-4 text-slate-500" aria-hidden />내 프로필
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
              <DropdownMenu.Item
                onSelect={() => void logout()}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-red-700 outline-none data-[highlighted]:bg-red-50"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                로그아웃
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </header>
  );
}
