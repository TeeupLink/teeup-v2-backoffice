import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Badge } from '@/components/display/StatusBadge';
import { FormField, FormSection } from '@/components/form/Form';
import { LookupSelect } from '@/components/form/LookupSelect';
import { Select, TextInput } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { toOptions } from '@/lib/labels';
import { GENDER } from '@/features/users/labels';
import type { RoundValues } from '../roundForm';

/** ③ 참가자 — 프라이빗일 때만. 예정 상태가 아니면 읽기 전용 (F-051) */
export function ParticipantsSection() {
  const { control, register, watch, formState } = useFormContext<RoundValues>();
  const members = useFieldArray({ control, name: 'members' });
  const guests = useFieldArray({ control, name: 'guests' });
  const editable = watch('participantsEditable');
  const [picker, setPicker] = useState(0);
  const err = formState.errors;

  return (
    <FormSection
      id="participants"
      title="참가자"
      description={
        editable
          ? '클럽 활성 멤버와 게스트를 지정합니다. 저장하면 이 명단으로 맞춰집니다.'
          : '예정 상태가 아니어서 참가자를 바꿀 수 없습니다. 참가자 탭에서 확인하세요.'
      }
    >
      <FormField label="클럽 멤버" error={err.members?.message ?? err.members?.root?.message}>
        {(p) => (
          <div className="space-y-2">
            {members.fields.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="지정한 멤버">
                {members.fields.map((m, i) => (
                  <li key={m.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm">
                    {m.nickname}
                    {editable && (
                      <button
                        type="button"
                        aria-label={`${m.nickname} 빼기`}
                        className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        onClick={() => members.remove(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <LookupSelect
                key={picker}
                id={p.id}
                kind="users"
                value={undefined}
                placeholder="닉네임·이름으로 회원 찾기"
                onChange={(v, label) => {
                  if (v && !members.fields.some((m) => m.user_id === Number(v))) members.append({ user_id: Number(v), nickname: label ?? `회원 #${v}` });
                  setPicker((n) => n + 1);
                }}
              />
            )}
          </div>
        )}
      </FormField>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">
            게스트 <span className="text-slate-400">{guests.fields.length}</span>
          </h3>
          {editable && (
            <Button size="sm" onClick={() => guests.append({ name: '', birthdate: '', gender: '', average_score: '' })}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              게스트 추가
            </Button>
          )}
        </div>
        {guests.fields.map((g, i) => {
          const e = err.guests?.[i];
          return (
            <fieldset key={g.id} disabled={!editable} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]">
              <legend className="sr-only">게스트 {i + 1}</legend>
              <div>
                <TextInput aria-label={`게스트 ${i + 1} 이름`} placeholder="이름" aria-invalid={!!e?.name} {...register(`guests.${i}.name`)} />
                {e?.name && <p className="mt-1 text-xs text-red-600">{e.name.message}</p>}
              </div>
              <TextInput aria-label={`게스트 ${i + 1} 생년월일`} type="date" {...register(`guests.${i}.birthdate`)} />
              <Select
                aria-label={`게스트 ${i + 1} 성별`}
                placeholder="성별"
                options={toOptions(GENDER).filter((o) => o.value !== 'OTHER')}
                {...register(`guests.${i}.gender`)}
              />
              <div>
                <TextInput
                  aria-label={`게스트 ${i + 1} 평균타수`}
                  placeholder="평균타수"
                  inputMode="numeric"
                  aria-invalid={!!e?.average_score}
                  {...register(`guests.${i}.average_score`)}
                />
                {e?.average_score && <p className="mt-1 text-xs text-red-600">{e.average_score.message}</p>}
              </div>
              {editable ? (
                <Button size="sm" variant="danger-ghost" aria-label={`게스트 ${i + 1} 삭제`} onClick={() => guests.remove(i)}>
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Badge>게스트</Badge>
              )}
            </fieldset>
          );
        })}
      </div>
    </FormSection>
  );
}
