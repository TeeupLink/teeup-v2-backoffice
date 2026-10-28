import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { BulkActionBar } from '@/components/bulk-action-bar/BulkActionBar';
import { confirm } from '@/components/dialog/confirm-store';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import type { BulkAction, BulkResult, RowId } from './bulk';
import { BulkFailureDialog } from './BulkFailureDialog';
import { Pagination } from './Pagination';
import type { ListController } from './useListState';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** 서버 정렬 필드. 있으면 헤더 클릭으로 정렬 (REQ-005) */
    sortKey?: string;
    align?: 'left' | 'right' | 'center';
    /** 헤더·셀 추가 클래스 (너비 등) */
    className?: string;
  }
}

type Props<T> = {
  list: ListController;
  query: UseQueryResult<Page<T>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => RowId;
  /** 행 클릭 이동 경로. Ctrl/Cmd 클릭은 새 탭 */
  rowHref?: (row: T) => string;
  bulkActions?: BulkAction[];
  empty?: { title: string; description?: string; action?: ReactNode };
  /** 상태 탭 등 테이블 위에 붙는 요소 */
  toolbar?: ReactNode;
};

function nextSort(current: string | undefined, key: string): string {
  if (current === key) return `-${key}`;
  return key;
}

const INTERACTIVE = 'a,button,input,select,textarea,label,[role="checkbox"],[role="menuitem"]';

export function DataTable<T>({ list, query, columns, getRowId, rowHref, bulkActions, empty, toolbar }: Props<T>) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [failures, setFailures] = useState<BulkResult['failed'] | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const page = query.data;
  const rows = useMemo(() => page?.items ?? [], [page]);
  const selectable = !!bulkActions?.length;

  // 페이지·필터가 바뀌면 선택 해제 (선택 범위 = 현재 페이지)
  const stateKey = JSON.stringify(list.state);
  useEffect(() => setSelection({}), [stateKey]);

  const allColumns = useMemo<ColumnDef<T>[]>(() => {
    if (!selectable) return columns;
    const select: ColumnDef<T> = {
      id: '_select',
      meta: { className: 'w-10' },
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="현재 페이지 전체 선택"
          className="h-4 w-4 rounded border-slate-300 accent-primary-800"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="행 선택"
          className="h-4 w-4 rounded border-slate-300 accent-primary-800"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    };
    return [select, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId: (r) => String(getRowId(r)),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: selectable,
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
  });

  const selectedIds = table.getSelectedRowModel().rows.map((r) => getRowId(r.original));

  const runBulk = async (action: BulkAction) => {
    let reason: string | undefined;
    if (action.confirm) {
      const r = await confirm(action.confirm(selectedIds.length));
      if (!r) return;
      reason = r.reason || undefined;
    }
    setRunning(action.key);
    try {
      const res = await action.run(selectedIds, reason);
      setSelection({});
      await qc.invalidateQueries();
      if (res.failed.length === 0) toast.success(`${res.succeeded.length}건 ${action.label} 완료`);
      else
        toast.error(`${res.succeeded.length}건 완료, ${res.failed.length}건 실패`, {
          action: { label: '실패 보기', onClick: () => setFailures(res.failed) },
        });
    } catch (e) {
      toast.error(`${action.label}에 실패했습니다`, { description: errorMessage(e) });
    } finally {
      setRunning(null);
    }
  };

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!rowHref) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    const href = rowHref(row);
    if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener');
    else navigate(href);
  };

  const sort = list.state.sort;
  const colCount = allColumns.length;

  let body: ReactNode;
  if (query.isPending) {
    body = Array.from({ length: 10 }, (_, i) => (
      <tr key={i} className="border-b border-slate-100">
        {Array.from({ length: colCount }, (_, j) => (
          <td key={j} className="px-4 py-3">
            <Skeleton className="h-4 w-full max-w-[160px]" />
          </td>
        ))}
      </tr>
    ));
  } else if (query.isError && !page) {
    body = (
      <tr>
        <td colSpan={colCount}>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </td>
      </tr>
    );
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={colCount}>
          {list.filtered ? (
            <EmptyState
              icon={SearchX}
              title="조건에 맞는 결과가 없습니다"
              action={
                <Button size="sm" onClick={list.reset}>
                  필터 해제
                </Button>
              }
            />
          ) : (
            <EmptyState title={empty?.title ?? '데이터가 없습니다'} description={empty?.description} action={empty?.action} />
          )}
        </td>
      </tr>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <tr
        key={row.id}
        onClick={(e) => onRowClick(e, row.original)}
        aria-selected={selectable ? row.getIsSelected() : undefined}
        className={cn(
          'border-b border-slate-100 transition-colors',
          rowHref && 'cursor-pointer',
          // 가로 스크롤 시 고정 첫 칸이 배경을 물려받도록 행에 불투명 배경을 준다
          row.getIsSelected() ? 'bg-primary-50' : 'bg-white hover:bg-slate-50',
        )}
      >
        {row.getVisibleCells().map((cell, i) => {
          const meta = cell.column.columnDef.meta;
          return (
            <td
              key={cell.id}
              className={cn(
                'whitespace-nowrap px-4 py-2.5 text-slate-700',
                meta?.align === 'right' && 'text-right tabular',
                meta?.align === 'center' && 'text-center',
                i === 0 && 'sticky left-0 bg-inherit',
                meta?.className,
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          );
        })}
      </tr>
    ));
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      {toolbar && <div className="px-4 pt-1">{toolbar}</div>}
      <div className="relative overflow-x-auto">
        {query.isFetching && !query.isPending && (
          <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary-500" role="progressbar" aria-label="불러오는 중" />
        )}
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-200 bg-slate-50">
                {hg.headers.map((h, i) => {
                  const meta = h.column.columnDef.meta;
                  const key = meta?.sortKey;
                  const dir = key && sort === key ? 'asc' : key && sort === `-${key}` ? 'desc' : null;
                  const label = h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext());
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                      className={cn(
                        'whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-slate-500',
                        meta?.align === 'right' && 'text-right',
                        meta?.align === 'center' && 'text-center',
                        i === 0 && 'sticky left-0 bg-slate-50',
                        meta?.className,
                      )}
                    >
                      {key ? (
                        <button
                          type="button"
                          onClick={() => list.update({ sort: nextSort(sort, key) })}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          {label}
                          {dir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {page && page.total > 0 && (
        <Pagination
          page={list.state.page}
          size={list.state.size}
          total={page.total}
          onPage={(p) => list.update({ page: p })}
          onSize={(s) => list.update({ size: s })}
        />
      )}
      {selectable && (
        <BulkActionBar count={selectedIds.length} onClear={() => setSelection({})}>
          {bulkActions!.map((a) => (
            <Button
              key={a.key}
              size="sm"
              loading={running === a.key}
              disabled={!!running}
              variant={a.tone === 'danger' ? 'danger' : a.tone === 'primary' ? 'primary' : 'secondary'}
              onClick={() => void runBulk(a)}
            >
              {a.label}
            </Button>
          ))}
        </BulkActionBar>
      )}
      <BulkFailureDialog failures={failures} onClose={() => setFailures(null)} />
    </div>
  );
}
