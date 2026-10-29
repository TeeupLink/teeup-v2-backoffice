import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { Modal } from '@/components/dialog/Modal';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { Switch } from '@/components/form/Switch';
import { Select, TextInput } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatMoneyInput, formatWon } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { deleteFee, fetchFees, saveFee, type FeeInput } from '../api';
import { BILLING_CYCLE } from '../labels';
import type { BillingCycle, ClubFee } from '../types';

const CONFIG = {};
const col = createColumnHelper<ClubFee>();
const schema = z.object({
  name: z.string().trim().min(1, '항목명을 입력해주세요').max(100),
  amount: z.string().regex(/^\d+$/, '금액을 입력해주세요'),
  cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']),
  description: z.string().max(500),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

/** 회비 항목 입력 모달 (SCR-042-M1) */
function FeeModal({ fee, saving, onClose, onSave }: { fee: ClubFee | null; saving: boolean; onClose: () => void; onSave: (v: FeeInput) => void }) {
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: fee?.name ?? '',
      amount: fee ? String(Math.round(fee.amount)) : '',
      cycle: (fee?.cycle ?? 'MONTHLY') as BillingCycle,
      description: fee?.description ?? '',
      is_active: fee?.is_active ?? true,
    },
  });
  const e = formState.errors;
  const submit = handleSubmit((v) => onSave({ name: v.name.trim(), amount: Number(v.amount), cycle: v.cycle, description: v.description.trim(), is_active: v.is_active }));
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={fee ? '회비 항목 수정' : '회비 항목 추가'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" loading={saving} onClick={() => void submit()}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="항목명" required error={e.name?.message}>
          {(p) => <TextInput {...p} {...register('name')} />}
        </FormField>
        <FormField label="금액" required error={e.amount?.message}>
          {(p) => (
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <TextInput {...p} inputMode="numeric" className="max-w-48 text-right tabular" value={formatMoneyInput(field.value)} onChange={(ev) => field.onChange(ev.target.value.replace(/\D/g, ''))} />
              )}
            />
          )}
        </FormField>
        <FormField label="주기">{(p) => <Select {...p} className="max-w-32" options={toOptions(BILLING_CYCLE)} {...register('cycle')} />}</FormField>
        <FormField label="설명">{(p) => <TextInput {...p} {...register('description')} />}</FormField>
        <FormField label="사용">
          {(p) => <Controller control={control} name="is_active" render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />} />}
        </FormField>
      </div>
    </Modal>
  );
}

/** 클럽 회비 항목 (F-047) */
export function FeesTab({ clubId, writable }: { clubId: number; writable: boolean }) {
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const key = ['club', clubId, 'fees'];
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchFees(clubId),
    select: (rows): Page<ClubFee> => ({ items: rows, total: rows.length, page: 1, size: Math.max(rows.length, 1) }),
  });
  const [editing, setEditing] = useState<ClubFee | null | 'new'>(null);
  const save = useMutation({
    mutationFn: (v: FeeInput) => saveFee(clubId, editing === 'new' || !editing ? null : editing.id, v),
    onSuccess: async () => {
      setEditing(null);
      await qc.invalidateQueries({ queryKey: key });
      toast.success('회비 항목을 저장했습니다');
    },
    onError: (e) => toast.error('저장하지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(() => {
    const remove = async (f: ClubFee) => {
      const ok = await confirm({ title: `"${f.name}" 항목을 삭제할까요?`, description: '사용만 멈추려면 수정에서 "사용"을 끄세요.', confirmText: '삭제', tone: 'danger' });
      if (!ok) return;
      try {
        await deleteFee(clubId, f.id);
        await qc.invalidateQueries({ queryKey: ['club', clubId, 'fees'] });
        toast.success('삭제했습니다');
      } catch (e) {
        toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
      }
    };
    return [
      col.accessor('name', { header: '항목명', cell: (c) => <span className="font-medium text-slate-900">{c.getValue()}</span> }),
      col.accessor('amount', { header: '금액', meta: { align: 'right' }, cell: (c) => formatWon(c.getValue()) }),
      col.accessor('cycle', { header: '주기', cell: (c) => (c.getValue() ? (BILLING_CYCLE[c.getValue()!] ?? c.getValue()) : '-') }),
      col.accessor('is_active', { header: '사용', cell: (c) => (c.getValue() ? <Badge tone="success">사용</Badge> : <Badge>중지</Badge>) }),
      col.accessor('description', { header: '설명', cell: (c) => <span className="text-slate-600">{c.getValue() || '-'}</span> }),
      ...(writable
        ? [
            col.display({
              id: 'actions',
              header: () => <span className="sr-only">작업</span>,
              meta: { align: 'right' },
              cell: ({ row: { original: f } }) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" aria-label={`${f.name} 수정`} onClick={() => setEditing(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="danger-ghost" aria-label={`${f.name} 삭제`} onClick={() => void remove(f)}>
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
      {writable && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            회비 항목
          </Button>
        </div>
      )}
      <DataTable list={list} query={query} columns={columns} getRowId={(f) => f.id} empty={{ title: '회비 항목이 없습니다' }} />
      {editing && <FeeModal fee={editing === 'new' ? null : editing} saving={save.isPending} onClose={() => setEditing(null)} onSave={(v) => save.mutate(v)} />}
    </div>
  );
}
