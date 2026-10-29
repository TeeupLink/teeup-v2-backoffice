import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/display/Card';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { TextInput } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { categoriesKey, createCategory, deleteCategory, fetchCategories, updateCategory, type FaqCategory } from './api';

/** FAQ 카테고리 (F-073) — 선택하면 오른쪽 목록이 그 카테고리로 걸러진다. 값은 URL(category_id) */
export function CategoryPanel({
  selected,
  onSelect,
  writable,
}: {
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
  writable: boolean;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: categoriesKey, queryFn: fetchCategories });
  const [name, setName] = useState('');
  const run = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; ok: string }) => fn(),
    onSuccess: async (_, v) => {
      await qc.invalidateQueries({ queryKey: categoriesKey });
      toast.success(v.ok);
    },
    onError: (e) => toast.error('처리하지 못했습니다', { description: errorMessage(e) }),
  });

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  const cats = q.data;
  const total = cats.reduce((a, c) => a + c.faq_count, 0);

  const rename = async (c: FaqCategory) => {
    const r = await confirm({ title: '카테고리 이름 바꾸기', confirmText: '저장', reason: { label: '새 이름', placeholder: c.title, required: true } });
    if (r) run.mutate({ fn: () => updateCategory(c.id, { title: r.reason.trim() }), ok: '이름을 바꿨습니다' });
  };
  const remove = async (c: FaqCategory) => {
    const ok = await confirm({
      title: `"${c.title}" 카테고리를 삭제할까요?`,
      description: 'FAQ 가 남아 있으면 삭제되지 않습니다.',
      confirmText: '삭제',
      tone: 'danger',
    });
    if (ok)
      run.mutate({
        fn: () => deleteCategory(c.id).then(() => selected === String(c.id) && onSelect(undefined)),
        ok: '카테고리를 삭제했습니다',
      });
  };

  const item = (id: string | undefined, label: string, count?: number) => (
    <button
      type="button"
      aria-pressed={selected === id}
      onClick={() => onSelect(id)}
      className={cn(
        'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm',
        selected === id ? 'bg-primary-50 font-semibold text-primary-800' : 'text-slate-700 hover:bg-slate-50',
      )}
    >
      <span className="truncate">{label}</span>
      <span className="tabular text-xs text-slate-500">{count}</span>
    </button>
  );

  return (
    <Card title="카테고리" bodyClassName="p-2">
      <ul className="space-y-0.5">
        <li className="flex">{item(undefined, '전체', total)}</li>
        {cats.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-0.5">
            {item(String(c.id), c.title, c.faq_count)}
            {/* 작업 버튼은 고른 카테고리에만 — 이름이 잘리지 않도록 */}
            {writable && selected === String(c.id) && (
              <span className="flex w-full justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`${c.title} 위로`}
                  disabled={i === 0 || run.isPending}
                  onClick={() => run.mutate({ fn: () => updateCategory(c.id, { order: c.order - 1 }), ok: '순서를 바꿨습니다' })}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`${c.title} 아래로`}
                  disabled={i === cats.length - 1 || run.isPending}
                  onClick={() => run.mutate({ fn: () => updateCategory(c.id, { order: c.order + 1 }), ok: '순서를 바꿨습니다' })}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" aria-label={`${c.title} 이름 바꾸기`} onClick={() => void rename(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="danger-ghost" aria-label={`${c.title} 카테고리 삭제`} onClick={() => void remove(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            )}
          </li>
        ))}
        <li className="flex">{item('none', '미분류')}</li>
      </ul>
      {writable && (
        <form
          className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = name.trim();
            // 맨 뒤에 붙인다 (order 0 이면 백엔드가 맨 앞에 넣는다)
            if (t) run.mutate({ fn: () => createCategory(t, cats.length + 1).then(() => setName('')), ok: '카테고리를 추가했습니다' });
          }}
        >
          <TextInput aria-label="새 카테고리 이름" placeholder="새 카테고리" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" size="sm" aria-label="카테고리 추가" disabled={!name.trim() || run.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}
    </Card>
  );
}
