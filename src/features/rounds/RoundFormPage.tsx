import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { LookupSelect } from '@/components/form/LookupSelect';
import { Checkbox, Select, TextInput, Textarea } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { toOptions } from '@/lib/labels';
import { fetchParticipants, fetchRound } from './api';
import { ParticipantsSection } from './form/ParticipantsSection';
import { FORMATION_MODE, SETTLEMENT_METHOD, SUBTYPE } from './labels';
import { formatMoneyInput, ROUND_FIELDS, roundSchema, toRoundBody, toRoundValues, type RoundValues } from './roundForm';
import type { Participant, RoundDetail } from './types';

// SCR-051 라운딩 등록·수정 (화면설계서 4.6, F-051)

const SECTIONS = [
  ['basic', '기본 정보'],
  ['schedule', '일정·클럽'],
  ['participants', '참가자'],
  ['course', '골프장·티타임'],
  ['formation', '편성'],
  ['cost', '비용·정산'],
] as const;

function MoneyField({ name, label }: { name: 'green_fee' | 'caddy_fee' | 'cart_fee'; label: string }) {
  return (
    <FormField label={label}>
      {(p) => (
        <Controller
          name={name}
          render={({ field }) => (
            <div className="relative max-w-48">
              <TextInput
                {...p}
                inputMode="numeric"
                className="pr-8 text-right tabular"
                value={formatMoneyInput(field.value as string)}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                onBlur={field.onBlur}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">원</span>
            </div>
          )}
        />
      )}
    </FormField>
  );
}

function RoundForm({ round, participants }: { round?: RoundDetail; participants?: Participant[] }) {
  const editing = !!round;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const form = useForm<RoundValues>({ resolver: zodResolver(roundSchema), defaultValues: toRoundValues(round, participants) });
  const { register, control, handleSubmit, formState, watch, setError, reset } = form;
  const { errors, dirtyFields, isDirty } = formState;
  const tees = useFieldArray({ control, name: 'tee_times' });
  const isPrivate = watch('is_private');

  const save = useMutation({
    mutationFn: (v: RoundValues) =>
      editing
        ? api(`/admin/meetings/${round.id}`, { method: 'PUT', body: toRoundBody(v, dirtyFields) }).then(() => round.id)
        : api<{ id: number }>('/admin/meetings/rounding', { method: 'POST', body: toRoundBody(v) }).then((r) => r.id),
    onSuccess: async (id, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['rounds'] });
      await qc.invalidateQueries({ queryKey: ['round', id] });
      toast.success(editing ? '라운딩을 저장했습니다' : '라운딩을 등록했습니다');
      setSavedId(id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ROUND_FIELDS)),
  });

  // reset 이 반영된 뒤 이동해야 미저장 확인(F-004)이 뜨지 않는다
  useEffect(() => {
    if (savedId != null && !isDirty) navigate(`/rounds/${savedId}`, { replace: true });
  }, [savedId, isDirty, navigate]);

  return (
    <FormProvider {...form}>
      <PageHeader title={editing ? `라운딩 수정 · ${round.name}` : '라운딩 등록'} />
      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="폼 섹션" className="hidden lg:block">
          <ol className="sticky top-4 space-y-1 text-sm">
            {SECTIONS.filter(([id]) => id !== 'participants' || isPrivate).map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-md px-2 py-1.5 text-slate-600 hover:bg-white hover:text-slate-900">
                  {i + 1} {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <FormShell
          onSubmit={handleSubmit((v) => {
            setFormError(null);
            save.mutate(v);
          })}
          submitting={save.isPending}
          dirty={isDirty}
          requireDirty={editing}
          submitText={editing ? '저장' : '등록'}
          onCancel={() => navigate(editing ? `/rounds/${round.id}` : '/rounds')}
          error={formError}
        >
          <FormSection id="basic" title="기본 정보">
            <FormField label="구분" required>
              {(p) => <Select {...p} className="max-w-48" options={toOptions(SUBTYPE)} {...register('meeting_subtype')} />}
            </FormField>
            <FormField label="공개 범위" hint="프라이빗은 지정한 참가자만 참여합니다">
              {() => <Checkbox label="프라이빗" {...register('is_private')} />}
            </FormField>
            <FormField label="모임명" required error={errors.name?.message}>
              {(p) => <TextInput {...p} {...register('name')} />}
            </FormField>
            <FormField label="설명">{(p) => <Textarea {...p} rows={3} {...register('description')} />}</FormField>
            <FormField label="장소">{(p) => <TextInput {...p} {...register('location')} />}</FormField>
          </FormSection>

          <FormSection id="schedule" title="일정·클럽">
            <FormField label="클럽" required error={errors.club_id?.message}>
              {(p) => (
                <Controller
                  name="club_id"
                  control={control}
                  render={({ field }) => (
                    <LookupSelect
                      id={p.id}
                      invalid={p['aria-invalid']}
                      kind="clubs"
                      value={field.value || undefined}
                      onChange={(v) => field.onChange(v ?? '')}
                    />
                  )}
                />
              )}
            </FormField>
            <FormField label="일시" required error={errors.meeting_time?.message}>
              {(p) => <TextInput {...p} type="datetime-local" className="max-w-60" {...register('meeting_time')} />}
            </FormField>
            <FormField label="신청 마감" required error={errors.application_deadline?.message}>
              {(p) => <TextInput {...p} type="datetime-local" className="max-w-60" {...register('application_deadline')} />}
            </FormField>
          </FormSection>

          {isPrivate && <ParticipantsSection />}

          <FormSection id="course" title="골프장·티타임">
            <FormField label="골프장">{(p) => <TextInput {...p} {...register('course_name')} />}</FormField>
            <FormField label="예약자">{(p) => <TextInput {...p} className="max-w-60" {...register('reservation_name')} />}</FormField>
            <FormField label="홀">
              {(p) => (
                <Select {...p} className="max-w-32" options={['9', '18', '27', '36'].map((v) => ({ value: v, label: `${v}홀` }))} {...register('hole_count')} />
              )}
            </FormField>
            <FormField label="티타임" required error={errors.tee_times?.message ?? errors.tee_times?.root?.message}>
              {() => (
                <div className="space-y-2">
                  {tees.fields.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <TextInput aria-label={`티타임 ${i + 1}`} type="time" className="max-w-36" {...register(`tee_times.${i}.value`)} />
                      {tees.fields.length > 1 && (
                        <Button size="sm" variant="ghost" aria-label={`티타임 ${i + 1} 삭제`} onClick={() => tees.remove(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" onClick={() => tees.append({ value: '' })}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    티타임 추가
                  </Button>
                </div>
              )}
            </FormField>
          </FormSection>

          <FormSection id="formation" title="편성">
            <FormField label="최대 인원" required error={errors.max_participants?.message}>
              {(p) => <TextInput {...p} inputMode="numeric" className="max-w-32" {...register('max_participants')} />}
            </FormField>
            <FormField label="조당 인원">
              {(p) => <Select {...p} className="max-w-32" options={['2', '3', '4'].map((v) => ({ value: v, label: `${v}명` }))} {...register('team_size')} />}
            </FormField>
            <FormField label="편성 방식">{(p) => <Select {...p} options={toOptions(FORMATION_MODE)} {...register('team_formation_mode')} />}</FormField>
          </FormSection>

          <FormSection id="cost" title="비용·정산" description="1인 기준 금액입니다. 실제 분담은 정산 탭에서 확정합니다.">
            <MoneyField name="green_fee" label="그린피" />
            <MoneyField name="caddy_fee" label="캐디피" />
            <MoneyField name="cart_fee" label="카트비" />
            <FormField label="정산 방식">
              {(p) => <Select {...p} className="max-w-48" options={toOptions(SETTLEMENT_METHOD)} {...register('settlement_method')} />}
            </FormField>
          </FormSection>
        </FormShell>
      </div>
    </FormProvider>
  );
}

export function RoundFormPage() {
  const param = useParams().id;
  const id = param ? Number(param) : null;
  const enabled = id != null && Number.isInteger(id);
  const round = useQuery({ queryKey: ['round', id], queryFn: () => fetchRound(id!), enabled });
  const parts = useQuery({ queryKey: ['round', id, 'participants'], queryFn: () => fetchParticipants(id!), enabled });

  if (id == null) return <RoundForm />;
  const err = round.error ?? parts.error;
  if (!enabled || (round.error instanceof ApiError && round.error.status === 404) || (round.data && round.data.meeting_type !== 'ROUND'))
    return <NotFoundPage title="라운딩을 찾을 수 없습니다" />;
  if (err) return <ErrorState error={err} onRetry={() => void Promise.all([round.refetch(), parts.refetch()])} />;
  if (!round.data || !parts.data) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <RoundForm round={round.data} participants={parts.data} />;
}
