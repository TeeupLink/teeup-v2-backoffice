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
import { toOptions } from '@/lib/labels';
import { formatMoneyInput } from '@/lib/format';
import { createClub, fetchClub, fetchGunguList, fetchSidoList, updateClub } from './api';
import { CLUB_FIELDS, clubSchema, toClubBody, toClubValues, type ClubValues } from './clubForm';
import { CLUB_TYPE } from './labels';
import type { ClubDetail } from './types';

// SCR-041 클럽 등록·수정 (화면설계서 4.5, F-042). 승인 단계 없음 — 저장 즉시 활성.
// 상태(활성/비활성)는 폼이 아니라 상세의 상태 변경(사유 필수)으로만 바꾼다.

function ClubForm({ club }: { club?: ClubDetail }) {
  const editing = !!club;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const { register, control, handleSubmit, watch, setValue, setError, reset, formState } = useForm<ClubValues>({
    resolver: zodResolver(clubSchema),
    defaultValues: toClubValues(club),
  });
  const { errors, dirtyFields, isDirty } = formState;
  const sidoCode = watch('sido_code');
  const gungu = watch('gungu_codes');
  const hasFee = watch('has_regular_fee');
  const sido = useQuery({ queryKey: ['sido-list'], queryFn: fetchSidoList, staleTime: Infinity });
  const gunguList = useQuery({ queryKey: ['gungu-list', sidoCode], queryFn: () => fetchGunguList(sidoCode), enabled: !!sidoCode, staleTime: Infinity });

  const save = useMutation({
    mutationFn: (v: ClubValues) =>
      editing ? updateClub(club.id, toClubBody(v, dirtyFields)).then(() => club.id) : createClub(toClubBody(v)).then((r) => r.id),
    onSuccess: async (id, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['clubs'] });
      await qc.invalidateQueries({ queryKey: ['club', id] });
      toast.success(editing ? '클럽 정보를 저장했습니다' : '클럽을 등록했습니다');
      setSavedId(id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, CLUB_FIELDS)),
  });

  // reset 이 반영된 뒤 이동해야 미저장 확인(F-004)이 뜨지 않는다
  useEffect(() => {
    if (savedId != null && !isDirty) navigate(`/clubs/${savedId}`, { replace: true });
  }, [savedId, isDirty, navigate]);

  const toggleGungu = (code: string) =>
    setValue('gungu_codes', gungu.includes(code) ? gungu.filter((g) => g !== code) : [...gungu, code], { shouldDirty: true, shouldValidate: true });

  return (
    <>
      <PageHeader title={editing ? `클럽 수정 · ${club.name}` : '클럽 등록'} description={editing ? undefined : '등록하면 바로 활성 클럽이 됩니다.'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={isDirty}
        requireDirty={editing}
        submitText={editing ? '저장' : '등록'}
        onCancel={() => navigate(editing ? `/clubs/${club.id}` : '/clubs')}
        error={formError}
      >
        <FormSection title="기본 정보">
          <FormField label="클럽명" required error={errors.name?.message}>
            {(p) => <TextInput {...p} {...register('name')} />}
          </FormField>
          <FormField label="설명" required error={errors.description?.message} hint="10자 이상">
            {(p) => <Textarea {...p} rows={4} {...register('description')} />}
          </FormField>
          <FormField label="유형" required>
            {(p) => <Select {...p} className="max-w-40" options={toOptions(CLUB_TYPE)} {...register('type')} />}
          </FormField>
          <FormField label="예상 인원" error={errors.member_count?.message}>
            {(p) => <TextInput {...p} inputMode="numeric" className="max-w-32" {...register('member_count')} />}
          </FormField>
        </FormSection>

        <FormSection title="지역 · 연락처">
          <FormField label="시도" required error={errors.sido_code?.message}>
            {(p) => (
              <Select
                {...p}
                className="max-w-48"
                placeholder="선택"
                options={(sido.data ?? []).map((r) => ({ value: r.code, label: r.name }))}
                {...register('sido_code', { onChange: () => setValue('gungu_codes', [], { shouldDirty: true }) })}
                // 시도 목록이 늦게 와도 수정 화면에서 저장된 값이 보이도록 화면 값을 폼 값에 묶는다
                value={sidoCode}
              />
            )}
          </FormField>
          <FormField label="군구" required error={errors.gungu_codes?.message} hint={`${gungu.length}/4 선택`}>
            {() =>
              sidoCode ? (
                <div
                  className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-3"
                  role="group"
                  aria-label="군구"
                >
                  {(gunguList.data ?? []).map((g) => (
                    <Checkbox
                      key={g.code}
                      label={g.name}
                      checked={gungu.includes(g.code)}
                      disabled={!gungu.includes(g.code) && gungu.length >= 4}
                      onChange={() => toggleGungu(g.code)}
                    />
                  ))}
                </div>
              ) : (
                <p className="pt-2 text-sm text-slate-400">시도를 먼저 선택하세요</p>
              )
            }
          </FormField>
          <FormField label="연락처">{(p) => <TextInput {...p} className="max-w-60" {...register('contact_info')} />}</FormField>
          <FormField label="장소">{(p) => <TextInput {...p} {...register('location')} />}</FormField>
          <FormField label="추가 정보">{(p) => <Textarea {...p} rows={3} {...register('additional_info')} />}</FormField>
        </FormSection>

        {!editing && (
          <>
            <FormSection title="대표자" description="선택한 회원이 클럽 리더가 됩니다. 나중에 상세의 멤버 탭에서 바꿀 수 있습니다.">
              <FormField label="대표자" required error={errors.representative_id?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="representative_id"
                    render={({ field }) => (
                      <LookupSelect
                        id={p.id}
                        invalid={p['aria-invalid']}
                        kind="users"
                        value={field.value || undefined}
                        onChange={(v) => field.onChange(v ?? '')}
                      />
                    )}
                  />
                )}
              </FormField>
            </FormSection>
            <FormSection title="정기 회비" description="다른 회비 항목은 등록 후 회비 탭에서 추가합니다.">
              <FormField label="사용">{() => <Checkbox label="정기 회비를 받습니다" {...register('has_regular_fee')} />}</FormField>
              {hasFee && (
                <>
                  <FormField label="금액" required error={errors.fee_amount?.message}>
                    {(p) => (
                      <Controller
                        control={control}
                        name="fee_amount"
                        render={({ field }) => (
                          <TextInput
                            {...p}
                            inputMode="numeric"
                            className="max-w-48 text-right tabular"
                            value={formatMoneyInput(field.value)}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="주기">
                    {(p) => (
                      <Select
                        {...p}
                        className="max-w-32"
                        options={[
                          { value: 'MONTHLY', label: '월' },
                          { value: 'QUARTERLY', label: '분기' },
                          { value: 'YEARLY', label: '연' },
                        ]}
                        {...register('fee_cycle')}
                      />
                    )}
                  </FormField>
                  <FormField label="설명">{(p) => <TextInput {...p} {...register('fee_description')} />}</FormField>
                </>
              )}
            </FormSection>
          </>
        )}
      </FormShell>
    </>
  );
}

export function ClubFormPage() {
  const param = useParams().id;
  const id = param ? Number(param) : null;
  const q = useQuery({ queryKey: ['club', id], queryFn: () => fetchClub(id!), enabled: id != null && Number.isInteger(id) });
  if (id == null) return <ClubForm />;
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="클럽을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <ClubForm club={q.data} />;
}
