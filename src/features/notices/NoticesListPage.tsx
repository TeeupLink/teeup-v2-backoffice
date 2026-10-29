import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Star } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { NOTICES_PATH, type NoticeRow } from './api';

// SCR-070 시스템 공지 목록 (화면설계서 4.8, F-070). 클럽 공지는 클럽 상세에서 관리한다
const DEFS: FilterDef[] = [
  {
    kind: 'select',
    key: 'is_important',
    label: '중요',
    options: [
      { value: 'true', label: '중요만' },
      { value: 'false', label: '일반만' },
    ],
  },
];
const CONFIG: ListConfig = { filters: filterKeys(DEFS, ['is_published']) };
const col = createColumnHelper<NoticeRow>();

export function NoticesListPage() {
  const { can } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<NoticeRow>('notices', NOTICES_PATH, list.state);

  const columns = useMemo(
    () => [
      col.accessor('title', {
        header: '제목',
        cell: ({ row: { original: n } }) => (
          <Link to={`/notices/${n.id}`} className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline">
            {n.is_important && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="중요" />}
            {n.title}
          </Link>
        ),
      }),
      col.accessor('is_published', {
        header: '상태',
        cell: (c) => (c.getValue() ? <Badge tone="success">게시</Badge> : <Badge>임시 저장</Badge>),
      }),
      col.accessor('author_name', { header: '작성자', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('view_count', { header: '조회', meta: { align: 'right' }, cell: (c) => <span className="tabular">{c.getValue()}</span> }),
      col.accessor('published_at', { header: '게시일', cell: (c) => formatDate(c.getValue()) }),
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="공지"
        description="앱 전체 회원에게 보이는 공지입니다. 게시하면 활성 회원에게 알림이 한 번 갑니다."
        actions={
          can('content', 'write') && (
            <Link to="/notices/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                공지 작성
              </Button>
            </Link>
          )
        }
      />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="제목·본문" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(n) => n.id}
        rowHref={(n) => `/notices/${n.id}`}
        empty={{ title: '공지가 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="is_published"
            options={[
              { value: '', label: '전체' },
              { value: 'true', label: '게시' },
              { value: 'false', label: '임시 저장' },
            ]}
          />
        }
      />
    </>
  );
}
