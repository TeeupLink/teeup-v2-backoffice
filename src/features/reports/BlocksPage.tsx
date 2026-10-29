import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { BLOCKS_PATH, deleteBlock, type BlockRow, type Person } from './api';
import { ReportTabs } from './ReportsListPage';

// SCR-025 회원 차단 (F-025). 조회하고, 회원 요청이 있을 때만 사유를 남겨 해제한다
const CONFIG = { filters: { user_id: 'single' as const } };
const col = createColumnHelper<BlockRow>();

export function BlocksPage() {
  const { can } = useAuth();
  const pii = usePII();
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const query = useListQuery<BlockRow>('blocks', BLOCKS_PATH, list.state);
  const unblock = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => deleteBlock(id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['blocks'] });
      toast.success('차단을 해제했습니다');
    },
    onError: (e) => toast.error('해제하지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(() => {
    const person = (p: Person) => {
      const label = (
        <>
          <span className="font-medium text-slate-900">{p.nickname}</span>
          <span className="block text-xs text-slate-500">{pii.name(p.realname)}</span>
        </>
      );
      return can('users') ? (
        <Link to={`/users/${p.id}`} className="block hover:underline">
          {label}
        </Link>
      ) : (
        <div>{label}</div>
      );
    };
    const ask = async (b: BlockRow) => {
      const r = await confirm({
        title: `${b.blocker.nickname} → ${b.blocked.nickname} 차단을 해제할까요?`,
        description: '회원이 직접 해제할 수 없을 때만 사용하세요. 차단한 회원에게는 알리지 않습니다.',
        confirmText: '해제',
        tone: 'danger',
        reason: { required: true, placeholder: '예: 차단한 회원이 1:1 문의로 해제 요청' },
      });
      if (r) unblock.mutate({ id: b.id, reason: r.reason });
    };
    return [
      col.display({ id: 'blocker', header: '차단한 회원', cell: ({ row }) => person(row.original.blocker) }),
      col.display({ id: 'blocked', header: '차단당한 회원', cell: ({ row }) => person(row.original.blocked) }),
      col.accessor('created_at', { header: '차단일', cell: (c) => formatDateTime(c.getValue()) }),
      ...(can('reports', 'write')
        ? [
            col.display({
              id: 'actions',
              header: () => <span className="sr-only">작업</span>,
              meta: { align: 'right' },
              cell: ({ row }) => (
                <Button size="sm" variant="danger-ghost" disabled={unblock.isPending} onClick={() => void ask(row.original)}>
                  해제
                </Button>
              ),
            }),
          ]
        : []),
    ];
  }, [pii, can, unblock]);

  return (
    <>
      <PageHeader title="신고" description="회원이 앱에서 신고한 내용입니다. 대상에 대한 조치는 대상 화면에서 하고, 여기서 처리 결과를 남깁니다." />
      <ReportTabs />
      <div className="mb-3">
        <FilterBar list={list} searchPlaceholder="두 회원의 닉네임" />
      </div>
      <DataTable list={list} query={query} columns={columns} getRowId={(b) => b.id} empty={{ title: '차단 기록이 없습니다' }} />
    </>
  );
}
