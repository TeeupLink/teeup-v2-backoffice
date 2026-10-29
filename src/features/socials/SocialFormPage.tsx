import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { ApiError } from '@/lib/api/errors';
import { formatMoneyInput } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { createSocial, fetchSocial, updateSocial } from './api';
import { SOCIAL_SETTLEMENT, SOCIAL_TYPE } from './labels';
import { SOCIAL_FIELDS, socialSchema, toSocialBody, toSocialValues, type SocialValues } from './socialForm';
import type { SocialDetail } from './types';

// SCR-061 소셜 등록·수정 (화면설계서 4.7, F-061)

function SocialForm({ social }: { social?: SocialDetail }) {
  const editing = !!social;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const { register, control, handleSubmit, watch, setError, reset, formState } = useForm<SocialValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: toSocialValues(social),
  });
  const { errors, dirtyFields, isDirty } = formState;
  const unlimited = watch('unlimited');

  const save = useMutation({
    mutationFn: (v: SocialValues) =>
      editing ? updateSocial(social.id, toSocialBody(v, dirtyFields)).then(() => social.id) : createSocial(toSocialBody(v)).then((r) => r.id),
    onSuccess: async (id, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['socials'] });
      await qc.invalidateQueries({ queryKey: ['social', id] });
      toast.success(editing ? '소셜 모임을 저장했습니다' : '소셜 모임을 등록했습니다');
      setSavedId(id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, SOCIAL_FIELDS)),
  });

  // reset 이 반영된 뒤 이동해야 미저장 확인(F-004)이 뜨지 않는다
  useEffect(() => {
    if (savedId != null && !isDirty) navigate(`/socials/${savedId}`, { replace: true });
  }, [savedId, isDirty, navigate]);

  return (
    <>
      <PageHeader title={editing ? `소셜 수정 · ${social.name}` : '소셜 등록'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={isDirty}
        requireDirty={editing}
        submitText={editing ? '저장' : '등록'}
        onCancel={() => navigate(editing ? `/socials/${social.id}` : '/socials')}
        error={formError}
      >
        <FormSection title="기본 정보">
          <FormField label="유형" required>
            {(p) => <Select {...p} className="max-w-40" options={toOptions(SOCIAL_TYPE)} {...register('social_type')} />}
          </FormField>
          <FormField label="모임명" required error={errors.name?.message}>
            {(p) => <TextInput {...p} {...register('name')} />}
          </FormField>
          <FormField label="설명">{(p) => <Textarea {...p} rows={3} {...register('description')} />}</FormField>
        </FormSection>

        <FormSection title="일정·클럽">
          <FormField label="클럽" required error={errors.club_id?.message} hint={editing ? '등록 후에는 클럽을 바꿀 수 없습니다' : undefined}>
            {(p) =>
              editing ? (
                <p className="pt-2 text-sm text-slate-900">{social.club_name}</p>
              ) : (
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
              )
            }
          </FormField>
          <FormField label="일시" required error={errors.meeting_time?.message}>
            {(p) => <TextInput {...p} type="datetime-local" className="max-w-60" {...register('meeting_time')} />}
          </FormField>
          <FormField label="신청 마감" error={errors.application_deadline?.message}>
            {(p) => <TextInput {...p} type="datetime-local" className="max-w-60" {...register('application_deadline')} />}
          </FormField>
          <FormField label="장소명">{(p) => <TextInput {...p} placeholder="예: 역삼 고깃집" {...register('venue_name')} />}</FormField>
          <FormField label="주소">{(p) => <TextInput {...p} {...register('location')} />}</FormField>
          <FormField label="최대 인원" required={!unlimited} error={errors.max_participants?.message}>
            {(p) => (
              <div className="flex items-center gap-4">
                <TextInput {...p} inputMode="numeric" className="max-w-32" disabled={unlimited} {...register('max_participants')} />
                <Checkbox label="제한 없음" {...register('unlimited')} />
              </div>
            )}
          </FormField>
        </FormSection>

        <FormSection title="비용·정산" description="1인 참가비 안내용입니다. 실제 분담은 정산 탭에서 확정합니다.">
          <FormField label="참가비" error={errors.social_cost?.message}>
            {(p) => (
              <Controller
                name="social_cost"
                control={control}
                render={({ field }) => (
                  <div className="relative max-w-48">
                    <TextInput
                      {...p}
                      inputMode="numeric"
                      className="pr-8 text-right tabular"
                      value={formatMoneyInput(field.value)}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                      onBlur={field.onBlur}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">원</span>
                  </div>
                )}
              />
            )}
          </FormField>
          <FormField label="정산 방식">
            {(p) => <Select {...p} className="max-w-48" options={toOptions(SOCIAL_SETTLEMENT)} {...register('settlement_method')} />}
          </FormField>
          <FormField label="안내 사항">{(p) => <Textarea {...p} rows={3} placeholder="준비물, 복장 등" {...register('social_notes')} />}</FormField>
        </FormSection>
      </FormShell>
    </>
  );
}

export function SocialFormPage() {
  const param = useParams().id;
  const id = param ? Number(param) : null;
  const q = useQuery({ queryKey: ['social', id], queryFn: () => fetchSocial(id!), enabled: id != null && Number.isInteger(id) });
  if (id == null) return <SocialForm />;
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404) || (q.data && q.data.meeting_type !== 'SOCIAL'))
    return <NotFoundPage title="소셜 모임을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <SocialForm social={q.data} />;
}
