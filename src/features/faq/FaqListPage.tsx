import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { Switch } from '@/components/form/Switch';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format';
import { categoriesKey, deleteFaq, FAQ_PATH, fetchCategoryFaqs, mapFaqQuery, reorderFaqs, toggleFaq, type Faq } from './api';
import { CategoryPanel } from './CategoryPanel';

// SCR-072 FAQ 관리 (화면설계서 4.8, F-072~073). 카테고리 선택·공개 탭·검색은 모두 URL 에 둔다
const CONFIG: ListConfig = { filters: { category_id: 'single', is_active: 'single' } };
const col = createColumnHelper<Faq>();

export function FaqListPage() {
  const { can } = useAuth();
  const writable = can('content', 'write');
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const categoryId = list.state.filters.category_id as string | undefined;
  const query = useListQuery<Faq>('faq', FAQ_PATH, list.state, { mapQuery: mapFaqQuery });
  // 순서 바꾸기는 카테고리 하나를 골랐고 검색·공개 필터가 없을 때만 (전체 순서를 알아야 한다)
  const reorderable = writable && !!categoryId && categoryId !== 'none' && !list.state.q && !list.state.filters.is_active;
  const siblings = useQuery({ queryKey: ['faq', 'category', categoryId], queryFn: () => fetchCategoryFaqs(categoryId!), enabled: reorderable });

  const run = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; ok?: string }) => fn(),
    onSuccess: async (_, v) => {
      await qc.invalidateQueries({ queryKey: ['faq'] });
      await qc.invalidateQueries({ queryKey: categoriesKey });
      if (v.ok) toast.success(v.ok);
    },
    onError: (e) => toast.error('처리하지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(() => {
    const ids = siblings.data?.map((f) => f.id) ?? [];
    const move = (f: Faq, dir: -1 | 1) => {
      const i = ids.indexOf(f.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      const next = [...ids];
      [next[i], next[j]] = [next[j]!, next[i]!];
      run.mutate({ fn: () => reorderFaqs(next) });
    };
    const remove = async (f: Faq) => {
      const ok = await confirm({ title: 'FAQ 를 삭제할까요?', description: f.question, confirmText: '삭제', tone: 'danger' });
      if (ok) run.mutate({ fn: () => deleteFaq(f.id), ok: 'FAQ 를 삭제했습니다' });
    };
    return [
      ...(reorderable
        ? [
            col.display({
              id: 'order',
              header: () => <span className="sr-only">순서</span>,
              cell: ({ row: { original: f } }) => (
                <div className="flex">
                  <Button size="sm" variant="ghost" aria-label={`${f.question} 위로`} disabled={run.isPending || ids[0] === f.id} onClick={() => move(f, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${f.question} 아래로`}
                    disabled={run.isPending || ids[ids.length - 1] === f.id}
                    onClick={() => move(f, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            }),
          ]
        : []),
      col.accessor('question', {
        header: '질문',
        cell: ({ row: { original: f } }) => (
          <div className="max-w-xl">
            <span className="font-medium text-slate-900">{f.question}</span>
            <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-xs text-slate-500">{f.answer}</span>
          </div>
        ),
      }),
      ...(categoryId
        ? []
        : [col.accessor('category_title', { header: '카테고리', cell: (c) => c.getValue() ?? <span className="text-slate-400">미분류</span> })]),
      col.accessor('is_active', {
        header: '공개',
        cell: ({ row: { original: f } }) =>
          writable ? (
            <Switch
              checked={f.is_active}
              disabled={run.isPending}
              label={`${f.question} 공개`}
              onCheckedChange={() => run.mutate({ fn: () => toggleFaq(f.id) })}
            />
          ) : f.is_active ? (
            <Badge tone="success">공개</Badge>
          ) : (
            <Badge>비공개</Badge>
          ),
      }),
      col.accessor('view_count', { header: '조회', meta: { align: 'right' }, cell: (c) => <span className="tabular">{c.getValue()}</span> }),
      col.accessor('updated_at', { header: '수정일', cell: (c) => formatDate(c.getValue()) }),
      ...(writable
        ? [
            col.display({
              id: 'actions',
              header: () => <span className="sr-only">작업</span>,
              meta: { align: 'right' },
              cell: ({ row: { original: f } }) => (
                <div className="flex justify-end gap-1">
                  <Link
                    to={`/faq/${f.id}/edit`}
                    aria-label={`${f.question} 수정`}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button size="sm" variant="danger-ghost" aria-label={`${f.question} 삭제`} onClick={() => void remove(f)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            }),
          ]
        : []),
    ];
  }, [categoryId, reorderable, siblings.data, writable, run]);

  return (
    <>
      <PageHeader
        title="FAQ"
        description="앱 고객센터의 자주 묻는 질문입니다."
        actions={
          writable && (
            <Link to={categoryId && categoryId !== 'none' ? `/faq/new?category_id=${categoryId}` : '/faq/new'}>
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                FAQ 작성
              </Button>
            </Link>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CategoryPanel selected={categoryId} onSelect={(id) => list.update({ filters: { category_id: id } })} writable={writable} />
        <div className="min-w-0">
          <div className="mb-3">
            <FilterBar list={list} searchPlaceholder="질문·답변" />
          </div>
          <DataTable
            list={list}
            query={query}
            columns={columns}
            getRowId={(f) => f.id}
            empty={{ title: 'FAQ 가 없습니다' }}
            toolbar={
              <StatusTabs
                list={list}
                filterKey="is_active"
                options={[
                  { value: '', label: '전체' },
                  { value: 'true', label: '공개' },
                  { value: 'false', label: '비공개' },
                ]}
              />
            }
          />
          {reorderable && <p className="mt-2 text-xs text-slate-500">화살표로 앱에 보이는 순서를 바꿉니다.</p>}
        </div>
      </div>
    </>
  );
}
