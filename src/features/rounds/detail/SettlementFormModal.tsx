import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/dialog/Modal';
import { FormField } from '@/components/form/Form';
import { TextInput, Textarea } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { formatWon } from '@/lib/format';
import type { SettlementInput } from '../api';
import { formatMoneyInput } from '@/lib/format';

const amount = z.string().regex(/^\d*$/);
const schema = z.object({
  green_fee: amount,
  caddy_fee: amount,
  cart_fee: amount,
  others: z.array(z.object({ title: z.string().trim().min(1, '항목명을 입력해주세요'), amount: z.string().regex(/^\d+$/, '금액을 입력해주세요') })),
  notes: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

const n = (s: string) => (s ? Number(s) : 0);

function Money({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative max-w-48">
      <TextInput aria-label={label} inputMode="numeric" className="pr-8 text-right tabular" value={formatMoneyInput(value)} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">원</span>
    </div>
  );
}

/** 정산 입력 (F-055). 금액은 모임 전체 합계, 확정 참가자 전원 N분의 1 */
export function SettlementFormModal({
  defaults,
  targets,
  saving,
  onClose,
  onSave,
}: {
  defaults: SettlementInput;
  targets: number;
  saving: boolean;
  onClose: () => void;
  onSave: (v: SettlementInput) => void;
}) {
  const { control, register, handleSubmit, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      green_fee: defaults.green_fee ? String(defaults.green_fee) : '',
      caddy_fee: defaults.caddy_fee ? String(defaults.caddy_fee) : '',
      cart_fee: defaults.cart_fee ? String(defaults.cart_fee) : '',
      others: defaults.others.map((o) => ({ title: o.title, amount: String(o.amount) })),
      notes: defaults.notes,
    },
  });
  const others = useFieldArray({ control, name: 'others' });
  const v = watch();
  const total = n(v.green_fee) + n(v.caddy_fee) + n(v.cart_fee) + v.others.reduce((a, o) => a + n(o.amount), 0);

  const submit = handleSubmit((x) =>
    onSave({
      green_fee: n(x.green_fee),
      caddy_fee: n(x.caddy_fee),
      cart_fee: n(x.cart_fee),
      others: x.others.map((o) => ({ title: o.title.trim(), amount: n(o.amount) })),
      notes: x.notes.trim(),
    }),
  );

  return (
    <Modal
      open
      size="lg"
      onOpenChange={(o) => !o && onClose()}
      title="정산 입력"
      description={`모임 전체 금액을 넣으면 확정 참가자 ${targets}명에게 10원 단위로 나눕니다. 저장하면 기존 정산을 덮어쓰고 참가자에게 알림이 갑니다.`}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" loading={saving} disabled={targets === 0 || total === 0} onClick={() => void submit()}>
            저장하고 알림 보내기
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {(['green_fee', 'caddy_fee', 'cart_fee'] as const).map((k) => (
          <FormField key={k} label={{ green_fee: '그린피', caddy_fee: '캐디피', cart_fee: '카트비' }[k]}>
            {() => <Controller control={control} name={k} render={({ field }) => <Money label={k} value={field.value} onChange={field.onChange} />} />}
          </FormField>
        ))}
        <FormField label="기타 비용">
          {() => (
            <div className="space-y-2">
              {others.fields.map((f, i) => {
                const e = formState.errors.others?.[i];
                return (
                  <div key={f.id} className="flex flex-wrap items-start gap-2">
                    <div className="min-w-40 flex-1">
                      <TextInput aria-label={`기타 ${i + 1} 항목`} placeholder="항목 (예: 식사)" aria-invalid={!!e?.title} {...register(`others.${i}.title`)} />
                      {e?.title && <p className="mt-1 text-xs text-red-600">{e.title.message}</p>}
                    </div>
                    <Controller control={control} name={`others.${i}.amount`} render={({ field }) => <Money label={`기타 ${i + 1} 금액`} value={field.value} onChange={field.onChange} />} />
                    <Button size="sm" variant="ghost" aria-label={`기타 ${i + 1} 삭제`} onClick={() => others.remove(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <Button size="sm" onClick={() => others.append({ title: '', amount: '' })}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                항목 추가
              </Button>
            </div>
          )}
        </FormField>
        <FormField label="메모">{(p) => <Textarea {...p} rows={2} {...register('notes')} />}</FormField>
        <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-600">총액 {formatWon(total)}</span>
          <span className="font-semibold text-slate-900">1인 약 {formatWon(targets ? total / targets : 0)}</span>
        </div>
      </div>
    </Modal>
  );
}
