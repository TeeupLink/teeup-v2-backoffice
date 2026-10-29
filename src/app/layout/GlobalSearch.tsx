import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { usePII } from '@/lib/usePII';

// 헤더 통합 검색 (F-015). 서버가 역할 권한 영역만 돌려준다 (BE#66). 회원 실명·이메일은 마스킹 모드를 따른다

type Hit = { id: number; link: string; title: string; sub: string };
type Raw = {
  users: { id: number; nickname: string; realname: string | null; email: string; link: string }[];
  clubs: { id: number; name: string; link: string }[];
  meetings: { id: number; name: string; meeting_type: string; meeting_time: string | null; link: string }[];
  admins: { id: number; name: string; email: string; link: string }[];
};

function useDebounced(v: string, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const pii = usePII();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = useDebounced(text.trim());
  const res = useQuery({
    queryKey: ['global-search', q],
    queryFn: () => api<Raw>('/admin/search', { query: { q, limit: 5 } }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });

  // Ctrl/⌘ + K 로 검색칸으로
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups: [string, Hit[]][] = res.data
    ? (
        [
          [
            '회원',
            res.data.users.map((u) => ({
              id: u.id,
              link: u.link,
              title: u.nickname,
              sub: [pii.name(u.realname), pii.email(u.email)].filter((x) => x && x !== '-').join(' · '),
            })),
          ],
          ['클럽', res.data.clubs.map((c) => ({ id: c.id, link: c.link, title: c.name, sub: '' }))],
          [
            '모임',
            res.data.meetings.map((m) => ({
              id: m.id,
              link: m.link,
              title: m.name,
              sub: `${m.meeting_type === 'SOCIAL' ? '소셜' : '라운딩'} · ${formatDate(m.meeting_time)}`,
            })),
          ],
          ['관리자', res.data.admins.map((a) => ({ id: a.id, link: a.link, title: a.name, sub: a.email }))],
        ] as [string, Hit[]][]
      ).filter(([, hits]) => hits.length > 0)
    : [];
  const flat = groups.flatMap(([, hits]) => hits);

  const go = (h: Hit) => {
    setOpen(false);
    setText('');
    navigate(h.link);
  };

  let index = -1;
  return (
    <Popover.Root open={open && q.length >= 2} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="relative hidden w-full max-w-xs md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open && q.length >= 2}
            aria-controls="global-search-results"
            aria-label="통합 검색"
            placeholder="회원·클럽·모임 검색 (Ctrl K)"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, flat.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && flat[active]) {
                e.preventDefault();
                go(flat[active]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-80 rounded-lg bg-white py-1 shadow-xl ring-1 ring-slate-200"
        >
          <div id="global-search-results" role="listbox" aria-label="검색 결과">
            {res.isFetching && !res.data ? (
              <p className="px-4 py-4 text-sm text-slate-400">찾는 중…</p>
            ) : res.isError ? (
              <p className="px-4 py-4 text-sm text-red-700">검색하지 못했습니다</p>
            ) : flat.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-400">"{q}" 결과가 없습니다</p>
            ) : (
              groups.map(([label, hits]) => (
                <div key={label} role="group" aria-label={label}>
                  <p className="px-4 pb-1 pt-2 text-xs font-medium text-slate-400">{label}</p>
                  {hits.map((h) => {
                    index += 1;
                    const i = index;
                    return (
                      <button
                        key={`${label}-${h.id}`}
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(h)}
                        className={cn('block w-full px-4 py-2 text-left text-sm', i === active ? 'bg-primary-50' : 'hover:bg-slate-50')}
                      >
                        <span className="font-medium text-slate-900">{h.title}</span>
                        {h.sub && <span className="ml-2 text-xs text-slate-500">{h.sub}</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
