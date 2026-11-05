import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { Modal } from '@/components/dialog/Modal';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { Switch } from '@/components/form/Switch';
import { Select, Textarea, TextInput } from '@/components/form/controls';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatMoneyInput, formatNumber, formatWon } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { BillingStatusBanner } from './BillingStatusBanner';
import { deletePlan, fetchPlans, PLAN_CYCLE, plansKey, savePlan, type Plan, type PlanInput } from './api';

// SCR-084 요금제 (F-120) — 목록 + 모달 폼
const schema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요').max(100),
  price: z.string().regex(/^\d+$/, '금액을 입력해주세요'),
  billing_cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  description: z.string().max(1000),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

function PlanModal({ plan, saving, onClose, onSave }: { plan: Plan | null; saving: boolean; onClose: () => void; onSave: (v: PlanInput) => void }) {
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: plan?.name ?? '',
      price: plan ? String(plan.price) : '',
      billing_cycle: plan?.billing_cycle ?? 'MONTHLY',
      description: plan?.description ?? '',
      is_active: plan?.is_active ?? true,
    },
  });
  const e = formState.errors;
  const submit = handleSubmit((v) =>
    onSave({ name: v.name.trim(), price: Number(v.price), billing_cycle: v.billing_cycle, description: v.description.trim() || null, is_active: v.is_active }),
  );
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={plan ? '요금제 수정' : '요금제 추가'}
      description={plan && plan.subscribers > 0 ? `구독 중인 회원 ${plan.subscribers}명 — 금액을 바꾸면 다음 청구부터 새 금액이 적용됩니다.` : undefined}
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
        <FormField label="이름" required error={e.name?.message}>
          {(p) => <TextInput {...p} {...register('name')} />}
        </FormField>
        <FormField label="금액" required error={e.price?.message}>
          {(p) => (
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <TextInput {...p} inputMode="numeric" className="max-w-48 text-right tabular" value={formatMoneyInput(field.value)} onChange={(ev) => field.onChange(ev.target.value.replace(/\D/g, ''))} />
              )}
            />
          )}
        </FormField>
        <FormField label="주기">{(p) => <Select {...p} className="max-w-32" options={toOptions(PLAN_CYCLE)} {...register('billing_cycle')} />}</FormField>
        <FormField label="설명">{(p) => <Textarea {...p} rows={3} {...register('description')} />}</FormField>
        <FormField label="판매">
          {(p) => <Controller control={control} name="is_active" render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />} />}
        </FormField>
      </div>
    </Modal>
  );
}

const col = createColumnHelper<Plan>();

export function PlansPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const writable = can('payments', 'write');
  const list = useListState({});
  const query = useQuery({ queryKey: plansKey, queryFn: fetchPlans, select: (d): Page<Plan> => ({ items: d.items, total: d.total, page: 1, size: Math.max(d.total, 1) }) });
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const save = useMutation({
    mutationFn: (v: PlanInput) => savePlan(editing && editing !== 'new' ? editing.id : null, v),
    onSuccess: async () => {
      setEditing(null);
      await qc.invalidateQueries({ queryKey: plansKey });
      toast.success('요금제를 저장했습니다');
    },
    onError: (e) => toast.error('저장하지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(() => {
    const remove = async (p: Plan) => {
      const ok = await confirm({ title: `"${p.name}" 요금제를 삭제할까요?`, description: '판매만 멈추려면 수정에서 "판매"를 끄세요.', confirmText: '삭제', tone: 'danger' });
      if (!ok) return;
      try {
        await deletePlan(p.id);
        await qc.invalidateQueries({ queryKey: plansKey });
        toast.success('삭제했습니다');
      } catch (e) {
        toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
      }
    };
    return [
      col.accessor('name', {
        header: '이름',
        cell: ({ row: { original: p } }) => (
          <span>
            <span className="font-medium text-slate-900">{p.name}</span>
            {p.description && <span className="block text-xs text-slate-500">{p.description}</span>}
          </span>
        ),
      }),
      col.accessor('price', { header: '금액', meta: { align: 'right' }, cell: (c) => formatWon(c.getValue()) }),
      col.accessor('billing_cycle', { header: '주기', cell: (c) => PLAN_CYCLE[c.getValue()] ?? c.getValue() }),
      col.accessor('is_active', { header: '판매', cell: (c) => (c.getValue() ? <Badge tone="success">판매 중</Badge> : <Badge>중지</Badge>) }),
      col.accessor('subscribers', { header: '구독자', meta: { align: 'right' }, cell: (c) => formatNumber(c.getValue()) }),
      ...(writable
        ? [
            col.display({
              id: 'actions',
              header: () => <span className="sr-only">작업</span>,
              meta: { align: 'right' },
              cell: ({ row: { original: p } }) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" aria-label={`${p.name} 수정`} onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    aria-label={`${p.name} 삭제`}
                    disabled={p.subscribers > 0}
                    title={p.subscribers > 0 ? '구독자가 있어 삭제할 수 없습니다. 판매를 끄세요' : undefined}
                    onClick={() => void remove(p)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            }),
          ]
        : []),
    ];
  }, [qc, writable]);

  return (
    <>
      <PageHeader
        title="요금제"
        description="정기결제 요금제입니다. 구독 기록이 있는 요금제는 삭제할 수 없고 판매만 멈출 수 있습니다."
        actions={
          writable ? (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" aria-hidden />
              요금제
            </Button>
          ) : undefined
        }
      />
      <BillingStatusBanner />
      <DataTable list={list} query={query} columns={columns} getRowId={(r) => r.id} empty={{ title: '요금제가 없습니다' }} />
      {editing && <PlanModal plan={editing === 'new' ? null : editing} saving={save.isPending} onClose={() => setEditing(null)} onSave={(v) => save.mutate(v)} />}
    </>
  );
}
