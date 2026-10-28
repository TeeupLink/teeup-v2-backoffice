import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Page } from '@/lib/api/envelope';
import { cn } from '@/lib/cn';
import { lookupLabel, rememberLabel, type LookupKind } from './lookupLabels';

export type { LookupKind };

export type LookupOption = { value: string; label: string; hint?: string };

type ClubItem = { id: number; name: string; status: string | null };
type UserItem = { id: number; nickname: string; name_masked: string | null; email_masked: string | null };

async function fetchOptions(kind: LookupKind, q: string): Promise<LookupOption[]> {
  if (kind === 'users') {
    if (q.trim().length < 2) return [];
    const res = await api<Page<UserItem>>('/admin/lookup/users', { query: { q, size: 20 } });
    return res.items.map((u) => ({ value: String(u.id), label: u.nickname, hint: [u.name_masked, u.email_masked].filter(Boolean).join(' · ') }));
  }
  const res = await api<Page<ClubItem>>('/admin/lookup/clubs', { query: { q: q || undefined, size: 50 } });
  return res.items.map((c) => ({ value: String(c.id), label: c.name }));
}

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * 선택용 조회 콤보박스 (F-008). 역할과 무관하게 /admin/lookup/* 를 쓰므로 교차 403 이 없다.
 */
export function LookupSelect({
  kind,
  value,
  onChange,
  placeholder,
  id,
  invalid,
  className,
}: {
  kind: LookupKind;
  value: string | undefined;
  onChange: (value: string | undefined, label?: string) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, isFetching } = useQuery({
    queryKey: ['lookup', kind, dq],
    queryFn: () => fetchOptions(kind, dq),
    enabled: open,
    staleTime: 60_000,
  });
  const text = placeholder ?? (kind === 'clubs' ? '클럽 선택' : '회원 선택');

  const pick = (o: LookupOption | undefined) => {
    if (o) rememberLabel(kind, o.value, o.label);
    onChange(o?.value, o?.label);
    setOpen(false);
    setQ('');
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative inline-flex', className)}>
        <Popover.Trigger
          id={id}
          aria-invalid={invalid}
          className={cn(
            'inline-flex h-9 w-full min-w-40 items-center justify-between gap-2 rounded-lg border bg-white pl-3 pr-8 text-left text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            invalid ? 'border-red-500' : 'border-slate-300',
            value ? 'text-slate-900' : 'text-slate-500',
          )}
        >
          <span className="truncate">{value ? lookupLabel(kind, value) : text}</span>
        </Popover.Trigger>
        {value ? (
          <button type="button" aria-label="선택 해제" onClick={() => pick(undefined)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        )}
      </div>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="z-[130] w-72 rounded-lg bg-white p-1 shadow-xl ring-1 ring-slate-200">
          <div className="relative mb-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={`${text} 검색`}
              placeholder={kind === 'users' ? '닉네임·실명·이메일 2자 이상' : '클럽 이름'}
              className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-8 text-sm focus:border-primary-500 focus:outline-none"
            />
            {isFetching && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />}
          </div>
          <ul role="listbox" aria-label={text} className="max-h-64 overflow-y-auto">
            {(data ?? []).map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => pick(o)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-slate-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-slate-500">{o.hint}</span>}
                  </span>
                  {o.value === value && <Check className="h-4 w-4 text-primary-800" aria-hidden />}
                </button>
              </li>
            ))}
            {data && data.length === 0 && (
              <li className="px-2.5 py-3 text-center text-sm text-slate-500">
                {kind === 'users' && dq.trim().length < 2 ? '2자 이상 입력하세요' : '결과가 없습니다'}
              </li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
