import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ME_KEY } from '@/app/auth/session';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/format';
import type { AdminAccount } from '@/features/admins/api';
import { adminPassword } from '@/features/admins/password';

// SCR-093 내 프로필 (F-093). 이름·전화번호와 비밀번호만 바꾼다 — 역할·이메일은 최고 관리자가 관리자 화면에서
const PROFILE_KEY = ['profile'] as const;

const infoSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요').max(50),
  phone_number: z.string().regex(/^[\d-]*$/, '숫자와 - 만 입력해주세요'),
});
type Info = z.infer<typeof infoSchema>;

function InfoForm({ me }: { me: AdminAccount }) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState } = useForm<Info>({
    resolver: zodResolver(infoSchema),
    defaultValues: { name: me.name, phone_number: me.phone_number ?? '' },
  });
  const save = useMutation({
    mutationFn: (v: Info) => api<AdminAccount>('/admin/profile', { method: 'PUT', body: { name: v.name.trim(), phone_number: v.phone_number.trim() || null } }),
    onSuccess: async (_, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: PROFILE_KEY });
      await qc.invalidateQueries({ queryKey: ME_KEY });
      toast.success('프로필을 저장했습니다');
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['name', 'phone_number'])),
  });
  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        save.mutate(v);
      })}
    >
      {formError && <p className="text-sm text-red-700">{formError}</p>}
      <FormField label="이름" required error={formState.errors.name?.message}>
        {(p) => <TextInput {...p} className="max-w-60" {...register('name')} />}
      </FormField>
      <FormField label="전화번호" error={formState.errors.phone_number?.message}>
        {(p) => <TextInput {...p} inputMode="tel" className="max-w-60" {...register('phone_number')} />}
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={save.isPending} disabled={!formState.isDirty}>
          저장
        </Button>
      </div>
    </form>
  );
}

const pwSchema = z
  .object({ current_password: z.string().min(1, '현재 비밀번호를 입력해주세요'), new_password: adminPassword, confirm_password: z.string() })
  .refine((v) => v.new_password === v.confirm_password, { path: ['confirm_password'], message: '새 비밀번호와 확인이 일치하지 않습니다' })
  .refine((v) => v.new_password !== v.current_password, { path: ['new_password'], message: '지금 비밀번호와 다른 비밀번호를 입력해주세요' });
type Pw = z.infer<typeof pwSchema>;

function PasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const empty = { current_password: '', new_password: '', confirm_password: '' };
  const { register, handleSubmit, reset, setError, formState } = useForm<Pw>({ resolver: zodResolver(pwSchema), defaultValues: empty });
  const save = useMutation({
    mutationFn: (v: Pw) => api('/admin/password', { method: 'PUT', body: v }),
    onSuccess: () => {
      reset(empty);
      toast.success('비밀번호를 바꿨습니다');
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['current_password', 'new_password', 'confirm_password'])),
  });
  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((v) => {
        setFormError(null);
        save.mutate(v);
      })}
    >
      {formError && <p className="text-sm text-red-700">{formError}</p>}
      <FormField label="현재 비밀번호" required error={formState.errors.current_password?.message}>
        {(p) => <TextInput {...p} type="password" autoComplete="current-password" className="max-w-80" {...register('current_password')} />}
      </FormField>
      <FormField label="새 비밀번호" required error={formState.errors.new_password?.message} hint="8자 이상, 영문·숫자·특수문자">
        {(p) => <TextInput {...p} type="password" autoComplete="new-password" className="max-w-80" {...register('new_password')} />}
      </FormField>
      <FormField label="새 비밀번호 확인" required error={formState.errors.confirm_password?.message}>
        {(p) => <TextInput {...p} type="password" autoComplete="new-password" className="max-w-80" {...register('confirm_password')} />}
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={save.isPending}>
          비밀번호 변경
        </Button>
      </div>
    </form>
  );
}

export function ProfilePage() {
  const q = useQuery({ queryKey: PROFILE_KEY, queryFn: () => api<AdminAccount>('/admin/profile') });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const me = q.data;
  return (
    <>
      <PageHeader title="내 프로필" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="계정">
          <DescriptionList
            items={[
              { label: '이메일', value: me.email },
              { label: '역할', value: me.role ? ROLE_LABEL[me.role] : '역할 없음' },
              { label: '최근 로그인', value: formatDateTime(me.last_login_at) },
              { label: '등록일', value: formatDateTime(me.created_at) },
            ]}
          />
          <p className="mt-3 text-xs text-slate-500">역할이나 이메일을 바꾸려면 최고 관리자에게 요청하세요.</p>
        </Card>
        <Card title="기본 정보">
          <InfoForm me={me} />
        </Card>
        <Card title="비밀번호 변경">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
