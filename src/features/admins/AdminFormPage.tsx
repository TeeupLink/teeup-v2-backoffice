import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/app/auth/useAuth';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { Select, TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiError } from '@/lib/api/errors';
import { ADMIN_ROLES, ROLE_LABEL, type AdminRole } from '@/lib/auth/permissions';
import { passwordStrength } from '@/features/users/userForm';
import { adminKey, createAdmin, fetchAdmin, updateAdmin, type AdminAccount } from './api';
import { adminPassword } from './password';

// SCR-092 관리자 등록·수정 (F-092). 상태·비밀번호는 상세에서 바꾼다

const base = {
  name: z.string().trim().min(1, '이름을 입력해주세요').max(50),
  phone_number: z.string().regex(/^[\d-]*$/, '숫자와 - 만 입력해주세요'),
  role: z.string().refine((v) => (ADMIN_ROLES as readonly string[]).includes(v), '역할을 선택해주세요'),
};
const createSchema = z.object({ ...base, email: z.string().trim().email('이메일 형식이 올바르지 않습니다'), password: adminPassword });
const editSchema = z.object({ ...base, email: z.string(), password: z.string() });
type Values = z.infer<typeof createSchema>;
const FIELDS = ['email', 'name', 'phone_number', 'role', 'password'];

const ROLE_HINT: Record<AdminRole, string> = {
  SUPER_ADMIN: '모든 메뉴와 관리자·감사 로그까지 다룹니다. 꼭 필요한 사람에게만 주세요.',
  CLUB_ADMIN: '클럽·가입신청을 관리하고 라운딩·소셜을 조회합니다.',
  MEETING_ADMIN: '라운딩·소셜을 관리하고 클럽을 조회합니다.',
  USER_ADMIN: '회원을 관리합니다.',
  CONTENT_ADMIN: '공지·FAQ·약관을 관리합니다.',
  SUPPORT_ADMIN: '1:1 문의·신고를 처리하고 회원·결제를 조회합니다.',
};

function AdminForm({ account }: { account?: AdminAccount }) {
  const editing = !!account;
  const { me } = useAuth();
  const self = account?.id === me?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const { register, handleSubmit, watch, reset, setError, formState } = useForm<Values>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: {
      email: account?.email ?? '',
      name: account?.name ?? '',
      phone_number: account?.phone_number ?? '',
      role: account?.role ?? '',
      password: '',
    },
  });
  const role = watch('role') as AdminRole | '';
  const pw = watch('password');
  const strength = passwordStrength(pw);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { name: v.name.trim(), phone_number: v.phone_number.trim() || null, role: v.role as AdminRole };
      if (!editing) return createAdmin({ ...body, email: v.email.trim(), password: v.password }).then((r) => r.id);
      const changed = Object.fromEntries(Object.entries(body).filter(([k]) => formState.dirtyFields[k as keyof Values]));
      return updateAdmin(account.id, changed).then(() => account.id);
    },
    onSuccess: async (id, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      await qc.invalidateQueries({ queryKey: adminKey(id) });
      toast.success(
        editing ? '관리자 정보를 저장했습니다' : '관리자를 등록했습니다',
        editing ? undefined : { description: '비밀번호는 당사자에게 직접 전달하세요.' },
      );
      setSavedId(id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, FIELDS)),
  });

  useEffect(() => {
    if (savedId != null && !formState.isDirty) navigate(`/admins/${savedId}`, { replace: true });
  }, [savedId, formState.isDirty, navigate]);

  const { errors } = formState;
  return (
    <>
      <PageHeader title={editing ? `관리자 수정 · ${account.name}` : '관리자 등록'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={formState.isDirty}
        requireDirty={editing}
        submitText={editing ? '저장' : '등록'}
        onCancel={() => navigate(editing ? `/admins/${account.id}` : '/admins')}
        error={formError}
      >
        <FormSection title="계정">
          <FormField label="이메일" required={!editing} error={errors.email?.message} hint={editing ? '이메일은 바꿀 수 없습니다' : '로그인 아이디입니다'}>
            {(p) => <TextInput {...p} type="email" autoComplete="off" disabled={editing} {...register('email')} />}
          </FormField>
          <FormField label="이름" required error={errors.name?.message}>
            {(p) => <TextInput {...p} className="max-w-60" {...register('name')} />}
          </FormField>
          <FormField label="전화번호" error={errors.phone_number?.message}>
            {(p) => <TextInput {...p} inputMode="tel" className="max-w-60" {...register('phone_number')} />}
          </FormField>
          {!editing && (
            <FormField label="비밀번호" required error={errors.password?.message} hint={pw ? `강도: ${strength.label}` : '8자 이상, 영문·숫자·특수문자'}>
              {(p) => <TextInput {...p} type="password" autoComplete="new-password" className="max-w-80" {...register('password')} />}
            </FormField>
          )}
        </FormSection>
        <FormSection title="역할">
          <FormField
            label="역할"
            required
            error={errors.role?.message}
            hint={self ? '자기 자신의 역할은 바꿀 수 없습니다' : role ? ROLE_HINT[role] : undefined}
          >
            {(p) => (
              <Select
                {...p}
                className="max-w-60"
                placeholder="선택"
                disabled={self}
                options={ADMIN_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                {...register('role')}
              />
            )}
          </FormField>
        </FormSection>
      </FormShell>
    </>
  );
}

export function AdminFormPage() {
  const param = useParams().id;
  const id = param ? Number(param) : null;
  const q = useQuery({ queryKey: adminKey(id ?? 0), queryFn: () => fetchAdmin(id!), enabled: id != null && Number.isInteger(id) });
  if (id == null) return <AdminForm />;
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="관리자를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <AdminForm account={q.data} />;
}
