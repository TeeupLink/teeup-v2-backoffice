import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Lock, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format';
import { deleteNotice, noticesPath } from '../api';
import type { ClubNotice } from '../types';

const CONFIG = {};
const col = createColumnHelper<ClubNotice>();

/** 클럽 공지 (F-045). 작성·수정은 전체 화면 폼 (SCR-043) */
export function NoticesTab({ clubId, writable }: { clubId: number; writable: boolean }) {
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const query = useListQuery<ClubNotice>('club-notices', noticesPath(clubId), list.state);

  const columns = useMemo(() => {
    const remove = async (n: ClubNotice) => {
      const ok = await confirm({ title: `"${n.title}" 공지를 삭제할까요?`, description: '앱 클럽 화면에서도 사라집니다.', confirmText: '삭제', tone: 'danger' });
      if (!ok) return;
      try {
        await deleteNotice(clubId, n.id);
        await qc.invalidateQueries({ queryKey: ['club-notices'] });
        toast.success('공지를 삭제했습니다');
      } catch (e) {
        toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
      }
    };
    return [
      col.accessor('title', {
        header: '제목',
        cell: ({ row: { original: n } }) => (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
            {n.is_important && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="중요" />}
            {n.title}
            {n.is_private && (
              <Badge>
                <Lock className="mr-1 h-3 w-3" aria-hidden />
                비공개
              </Badge>
            )}
          </span>
        ),
      }),
      col.accessor('author_name', { header: '작성자' }),
      col.accessor('view_count', { header: '조회', meta: { align: 'right' }, cell: (c) => <span className="tabular">{c.getValue()}</span> }),
      col.accessor('created_at', { header: '등록일', cell: (c) => formatDate(c.getValue()) }),
      ...(writable
        ? [
            col.display({
              id: 'actions',
              header: () => <span className="sr-only">작업</span>,
              meta: { align: 'right' },
              cell: ({ row: { original: n } }) => (
                <div className="flex justify-end gap-1">
                  <Link to={`/clubs/${clubId}/notices/${n.id}/edit`} aria-label={`${n.title} 수정`} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button size="sm" variant="danger-ghost" aria-label={`${n.title} 삭제`} onClick={() => void remove(n)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            }),
          ]
        : []),
    ];
  }, [clubId, writable, qc]);

  return (
    <div className="space-y-3">
      <FilterBar
        list={list}
        searchPlaceholder="제목·본문"
        trailing={
          writable && (
            <Link to={`/clubs/${clubId}/notices/new`}>
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                공지 작성
              </Button>
            </Link>
          )
        }
      />
      <DataTable list={list} query={query} columns={columns} getRowId={(n) => n.id} empty={{ title: '공지가 없습니다' }} />
    </div>
  );
}
