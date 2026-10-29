import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/display/Card';
import { RichTextView } from '@/components/editor/RichTextView';
import { confirm } from '@/components/dialog/confirm-store';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { TextInput } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { createCategory, deleteCategory, deleteRegulation, fetchRegulations, regulationsKey, renameCategory } from '../api';
import type { Regulation, RegulationCategory } from '../types';

function RegulationItem({ clubId, r, writable, onDelete }: { clubId: number; r: Regulation; writable: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-t border-slate-100 first:border-0">
      <div className="flex items-center gap-2 px-1 py-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-slate-900">
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
          <span className="truncate">{r.title}</span>
        </button>
        {writable && (
          <>
            <Link to={`/clubs/${clubId}/regulations/${r.id}/edit`} aria-label={`${r.title} 수정`} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Pencil className="h-4 w-4" />
            </Link>
            <Button size="sm" variant="danger-ghost" aria-label={`${r.title} 삭제`} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {open && (
        <div className="pb-3 pl-7">
          <RichTextView html={r.content} />
        </div>
      )}
    </li>
  );
}

/** 클럽 규정 (F-046) — 카테고리별 묶음. 카테고리는 인라인 추가·이름 변경, 규정이 남은 카테고리는 삭제 불가(BE 409) */
export function RegulationsTab({ clubId, writable }: { clubId: number; writable: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: regulationsKey(clubId), queryFn: () => fetchRegulations(clubId) });
  const [newName, setNewName] = useState('');
  const run = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; ok: string }) => fn(),
    onSuccess: async (_, v) => {
      await qc.invalidateQueries({ queryKey: regulationsKey(clubId) });
      toast.success(v.ok);
    },
    onError: (e) => toast.error('처리하지 못했습니다', { description: errorMessage(e) }),
  });

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-48 w-full rounded-xl" />;
  const cats = q.data;

  const rename = async (c: RegulationCategory) => {
    const r = await confirm({ title: '카테고리 이름 바꾸기', confirmText: '저장', reason: { label: '새 이름', placeholder: c.name, required: true } });
    if (r) run.mutate({ fn: () => renameCategory(clubId, c.id, r.reason.trim()), ok: '이름을 바꿨습니다' });
  };
  const removeCat = async (c: RegulationCategory) => {
    const ok = await confirm({ title: `"${c.name}" 카테고리를 삭제할까요?`, description: '규정이 남아 있으면 삭제되지 않습니다.', confirmText: '삭제', tone: 'danger' });
    if (ok) run.mutate({ fn: () => deleteCategory(clubId, c.id), ok: '카테고리를 삭제했습니다' });
  };
  const removeReg = async (r: Regulation) => {
    const ok = await confirm({ title: `"${r.title}" 규정을 삭제할까요?`, confirmText: '삭제', tone: 'danger' });
    if (ok) run.mutate({ fn: () => deleteRegulation(clubId, r.id), ok: '규정을 삭제했습니다' });
  };

  return (
    <div className="space-y-4">
      {writable && (
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (name) run.mutate({ fn: () => createCategory(clubId, name).then(() => setNewName('')), ok: '카테고리를 추가했습니다' });
            }}
          >
            <TextInput aria-label="새 카테고리 이름" placeholder="새 카테고리" className="w-48" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button type="submit" disabled={!newName.trim() || run.isPending}>
              <Plus className="h-4 w-4" aria-hidden />
              카테고리
            </Button>
          </form>
          {cats.length > 0 && (
            <Link to={`/clubs/${clubId}/regulations/new`} className="ml-auto">
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                규정 작성
              </Button>
            </Link>
          )}
        </div>
      )}
      {cats.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title="규정이 없습니다" description={writable ? '카테고리를 먼저 만들고 규정을 작성하세요.' : undefined} />
        </Card>
      ) : (
        cats.map((c) => (
          <Card
            key={c.id}
            title={
              <span>
                {c.name} <span className="text-sm font-normal text-slate-500">{c.regulations.length}</span>
              </span>
            }
            actions={
              writable && (
                <>
                  <Button size="sm" variant="ghost" aria-label={`${c.name} 이름 바꾸기`} onClick={() => void rename(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="danger-ghost" aria-label={`${c.name} 카테고리 삭제`} onClick={() => void removeCat(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )
            }
            bodyClassName="px-4 py-2"
          >
            {c.regulations.length ? (
              <ul>
                {c.regulations.map((r) => (
                  <RegulationItem key={r.id} clubId={clubId} r={r} writable={writable} onDelete={() => void removeReg(r)} />
                ))}
              </ul>
            ) : (
              <p className="py-2 text-sm text-slate-400">규정이 없습니다</p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
