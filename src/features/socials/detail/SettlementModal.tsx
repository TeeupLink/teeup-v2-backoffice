import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/dialog/Modal';
import { FormField } from '@/components/form/Form';
import { Checkbox, TextInput, Textarea } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { formatMoneyInput, formatWon } from '@/lib/format';
import type { SocialSettlementInput } from '../api';

const schema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1, '항목명을 입력해주세요'),
        amount: z.string().regex(/^[1-9]\d*$/, '금액을 입력해주세요'),
        memo: z.string(),
        covered_by_fee: z.boolean(),
      }),
    )
    .min(1, '항목을 1개 이상 넣어주세요'),
  notes: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

/** 소셜 정산 입력 (F-063). 항목별 금액 합계에서 회비 처리 항목을 빼고 확정 참가자 전원 N분의 1 */
export function SettlementModal({
  defaults,
  targets,
  saving,
  onClose,
  onSave,
}: {
  defaults: SocialSettlementInput;
  targets: number;
  saving: boolean;
  onClose: () => void;
  onSave: (v: SocialSettlementInput) => void;
}) {
  const { control, register, handleSubmit, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: defaults.items.length
        ? defaults.items.map((i) => ({ title: i.title, amount: String(Math.round(i.amount)), memo: i.memo ?? '', covered_by_fee: i.covered_by_fee }))
        : [{ title: '', amount: '', memo: '', covered_by_fee: false }],
      notes: defaults.notes,
    },
  });
  const items = useFieldArray({ control, name: 'items' });
  const v = watch();
  const total = v.items.reduce((a, i) => a + (Number(i.amount) || 0), 0);
  const split = v.items.filter((i) => !i.covered_by_fee).reduce((a, i) => a + (Number(i.amount) || 0), 0);

  const submit = handleSubmit((x) =>
    onSave({
      items: x.items.map((i) => ({ title: i.title.trim(), amount: Number(i.amount), memo: i.memo.trim() || null, covered_by_fee: i.covered_by_fee })),
      notes: x.notes.trim(),
    }),
  );

  return (
    <Modal
      open
      size="lg"
      onOpenChange={(o) => !o && onClose()}
      title="정산 입력"
      description={`항목별 금액을 넣으면 회비 처리 항목을 뺀 금액을 확정 참가자 ${targets}명에게 10원 단위로 나눕니다. 저장하면 기존 정산을 덮어쓰고 참가자에게 알림이 갑니다.`}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" loading={saving} disabled={targets === 0} onClick={() => void submit()}>
            저장하고 알림 보내기
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="비용 항목" error={formState.errors.items?.root?.message ?? formState.errors.items?.message}>
          {() => (
            <div className="space-y-3">
              {items.fields.map((f, i) => {
                const e = formState.errors.items?.[i];
                return (
                  <div key={f.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-40 flex-1">
                        <TextInput
                          aria-label={`항목 ${i + 1} 이름`}
                          placeholder="항목 (예: 식사)"
                          aria-invalid={!!e?.title}
                          {...register(`items.${i}.title`)}
                        />
                        {e?.title && <p className="mt-1 text-xs text-red-600">{e.title.message}</p>}
                      </div>
                      <div>
                        <Controller
                          control={control}
                          name={`items.${i}.amount`}
                          render={({ field }) => (
                            <div className="relative w-44">
                              <TextInput
                                aria-label={`항목 ${i + 1} 금액`}
                                inputMode="numeric"
                                aria-invalid={!!e?.amount}
                                className="pr-8 text-right tabular"
                                value={formatMoneyInput(field.value)}
                                onChange={(ev) => field.onChange(ev.target.value.replace(/\D/g, ''))}
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">원</span>
                            </div>
                          )}
                        />
                        {e?.amount && <p className="mt-1 text-xs text-red-600">{e.amount.message}</p>}
                      </div>
                      {items.fields.length > 1 && (
                        <Button size="sm" variant="ghost" aria-label={`항목 ${i + 1} 삭제`} onClick={() => items.remove(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <TextInput aria-label={`항목 ${i + 1} 메모`} placeholder="메모 (선택)" className="min-w-40 flex-1" {...register(`items.${i}.memo`)} />
                      <Checkbox label="클럽 회비로 처리" {...register(`items.${i}.covered_by_fee`)} />
                    </div>
                  </div>
                );
              })}
              <Button size="sm" onClick={() => items.append({ title: '', amount: '', memo: '', covered_by_fee: false })}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                항목 추가
              </Button>
            </div>
          )}
        </FormField>
        <FormField label="메모">{(p) => <Textarea {...p} rows={2} {...register('notes')} />}</FormField>
        <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-600">
            총액 {formatWon(total)}
            {total !== split && ` · 회비 처리 ${formatWon(total - split)}`}
          </span>
          <span className="font-semibold text-slate-900">1인 약 {formatWon(targets ? split / targets : 0)}</span>
        </div>
      </div>
    </Modal>
  );
}
