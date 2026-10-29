import * as Popover from '@radix-ui/react-popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';

// 헤더 알림 벨 (F-016). 웹소켓 없이 1분마다 안 읽은 수만 확인하고, 목록은 열 때 가져온다

type AdminNotice = {
  id: number;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  status: 'UNREAD' | 'READ';
  created_at: string | null;
};

const COUNT_KEY = ['admin-notifications', 'count'] as const;
const LIST_KEY = ['admin-notifications', 'list'] as const;

const TYPE_LABEL: Record<string, string> = { JOIN_REQUEST: '가입신청', INQUIRY: '문의', REPORT: '신고', BILLING_FAILURE: '결제 실패' };

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const count = useQuery({
    queryKey: COUNT_KEY,
    queryFn: () => api<{ count: number }>('/admin/notifications/unread-count').then((r) => r.count),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const list = useQuery({ queryKey: LIST_KEY, queryFn: () => api<AdminNotice[]>('/admin/notifications', { query: { limit: 20 } }), enabled: open });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-notifications'] });
  const readAll = useMutation({ mutationFn: () => api('/admin/notifications/read-all', { method: 'PUT' }), onSuccess: refresh });

  const openItem = async (n: AdminNotice) => {
    setOpen(false);
    if (n.status === 'UNREAD') {
      // 읽음 실패는 이동을 막지 않는다
      await api(`/admin/notifications/${n.id}/read`, { method: 'PUT' }).catch(() => undefined);
      void refresh();
    }
    if (n.link) navigate(n.link);
  };

  const unread = count.data ?? 0;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={unread ? `알림 ${unread}개 안 읽음` : '알림'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
            aria-hidden
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-[100] w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-900">알림</span>
            <button
              type="button"
              disabled={!unread || readAll.isPending}
              onClick={() => readAll.mutate()}
              className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              모두 읽음
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto" aria-label="알림 목록">
            {list.isPending ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">불러오는 중…</li>
            ) : list.isError ? (
              <li className="px-4 py-6 text-center text-sm text-red-700">알림을 불러오지 못했습니다</li>
            ) : list.data.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">새 알림이 없습니다</li>
            ) : (
              list.data.map((n) => (
                <li key={n.id} className="border-b border-slate-50 last:border-0">
                  <button
                    type="button"
                    onClick={() => void openItem(n)}
                    className={cn('block w-full px-4 py-3 text-left hover:bg-slate-50', n.status === 'UNREAD' && 'bg-primary-50/40')}
                  >
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      {n.status === 'UNREAD' && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" aria-label="안 읽음" />}
                      {TYPE_LABEL[n.type] ?? n.type} · {formatDateTime(n.created_at)}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-slate-900">{n.title}</span>
                    {n.content && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{n.content}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
