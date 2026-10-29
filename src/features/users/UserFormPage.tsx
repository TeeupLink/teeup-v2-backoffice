import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { Select, TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiError } from '@/lib/api/errors';
import { toOptions } from '@/lib/labels';
import { createUser, fetchUser, updateUser } from './api';
import { GENDER } from './labels';
import type { UserDetail } from './types';
import { createSchema, editSchema, FIELDS, handicapFrom, passwordStrength, toBody, toValues, type Values } from './userForm';

// SCR-031 회원 등록·수정 (화면설계서 4.4, F-031)


function UserForm({ user }: { user?: UserDetail }) {
  const editing = !!user;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [handicapTouched, setHandicapTouched] = useState(user?.handicap_init != null);
  const { register, handleSubmit, formState, watch, setValue, setError, reset } = useForm<Values>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: toValues(user),
  });
  const { errors, dirtyFields, isDirty } = formState;
  const avg = watch('average_score_init');
  const pw = watch('password');

  // 평균스코어 입력 시 핸디캡 자동 계산 (직접 고친 뒤에는 덮지 않는다)
  useEffect(() => {
    if (handicapTouched || !avg || !Number.isFinite(Number(avg))) return;
    setValue('handicap_init', handicapFrom(avg), { shouldDirty: true });
  }, [avg, handicapTouched, setValue]);

  const save = useMutation({
    mutationFn: (v: Values) => (editing ? updateUser(user.id, toBody(v, dirtyFields)) : createUser(toBody(v))),
    onSuccess: async (saved, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['users'] });
      await qc.invalidateQueries({ queryKey: ['user', saved.id] });
      toast.success(editing ? '회원 정보를 저장했습니다' : '회원을 등록했습니다');
      setSavedId(saved.id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, FIELDS)),
  });

  // reset 이 반영돼 dirty 가 풀린 뒤에 이동해야 저장 안 한 변경 확인(F-004)이 뜨지 않는다
  useEffect(() => {
    if (savedId != null && !isDirty) navigate(`/users/${savedId}`, { replace: true });
  }, [savedId, isDirty, navigate]);

  const strength = passwordStrength(pw);

  return (
    <>
      <PageHeader title={editing ? `회원 수정 · ${user.nickname}` : '회원 등록'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={isDirty}
        requireDirty={editing}
        submitText={editing ? '저장' : '등록'}
        onCancel={() => navigate(editing ? `/users/${user.id}` : '/users')}
        error={formError}
      >
        <FormSection title="계정">
          <FormField label="이메일" required error={errors.email?.message}>
            {(p) => <TextInput {...p} type="email" autoComplete="off" {...register('email')} />}
          </FormField>
          {!editing && (
            <FormField label="비밀번호" required error={errors.password?.message} hint={pw ? `강도: ${strength.label}` : '8자 이상, 영문·숫자·특수문자 포함'}>
              {(p) => (
                <>
                  <TextInput {...p} type="password" autoComplete="new-password" {...register('password')} />
                  {pw && (
                    <div className="mt-1.5 flex gap-1" aria-hidden>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`h-1 flex-1 rounded ${i <= strength.score ? (strength.score >= 5 ? 'bg-primary-600' : strength.score === 4 ? 'bg-amber-500' : 'bg-red-500') : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </FormField>
          )}
        </FormSection>

        <FormSection title="인적 사항">
          <FormField label="실명" required error={errors.realname?.message}>
            {(p) => <TextInput {...p} {...register('realname')} />}
          </FormField>
          <FormField label="닉네임" required error={errors.nickname?.message}>
            {(p) => <TextInput {...p} {...register('nickname')} />}
          </FormField>
          <FormField label="전화" error={errors.phone_number?.message}>
            {(p) => <TextInput {...p} type="tel" placeholder="010-0000-0000" {...register('phone_number')} />}
          </FormField>
          <FormField label="생년월일" error={errors.birthdate?.message}>
            {(p) => <TextInput {...p} type="date" className="max-w-48" {...register('birthdate')} />}
          </FormField>
          <FormField label="성별" error={errors.gender?.message}>
            {(p) => <Select {...p} className="max-w-48" placeholder="선택 안 함" options={toOptions(GENDER)} {...register('gender')} />}
          </FormField>
        </FormSection>

        <FormSection title="골프" description="가입 시 초기값입니다. 라운딩 점수가 쌓이면 핸디캡은 자동 계산값으로 바뀝니다.">
          <FormField label="평균스코어" error={errors.average_score_init?.message} hint="55~144">
            {(p) => <TextInput {...p} inputMode="numeric" className="max-w-32" {...register('average_score_init')} />}
          </FormField>
          <FormField label="핸디캡" error={errors.handicap_init?.message} hint={handicapTouched ? '0~72' : '평균스코어 − 72 로 자동 계산, 직접 고칠 수 있습니다'}>
            {(p) => <TextInput {...p} inputMode="decimal" className="max-w-32" {...register('handicap_init', { onChange: () => setHandicapTouched(true) })} />}
          </FormField>
        </FormSection>

        {editing && (
          <FormSection title="상태">
            <FormField label="상태" error={errors.status?.message} hint="비활성 회원은 앱에 로그인할 수 없습니다. 탈퇴는 상세 화면의 삭제로 처리합니다.">
              {(p) => (
                <Select
                  {...p}
                  className="max-w-48"
                  options={[
                    { value: 'ACTIVE', label: '활성' },
                    { value: 'DEACTIVATED', label: '비활성' },
                  ]}
                  {...register('status')}
                />
              )}
            </FormField>
            <FormField label="변경 사유" error={errors.reason?.message} hint="감사 로그에 남습니다">
              {(p) => <TextInput {...p} {...register('reason')} />}
            </FormField>
          </FormSection>
        )}
      </FormShell>
    </>
  );
}

export function UserFormPage() {
  const param = useParams().id;
  const id = param ? Number(param) : null;
  const q = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id!), enabled: id != null && Number.isInteger(id) });

  if (id == null) return <UserForm />;
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="회원을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <UserForm user={q.data} />;
}
