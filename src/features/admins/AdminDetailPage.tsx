import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/app/auth/useAuth';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { Badge } from '@/components/display/StatusBadge';
import { Modal } from '@/components/dialog/Modal';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { accessFor, ROLE_LABEL, type Resource } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { adminKey, deleteAdmin, fetchAdmin, resetAdminPassword, updateAdmin, type AdminAccount } from './api';
import { adminPassword } from './password';

// SCR-091 관리자 상세 (F-091) — 역할별 권한 표, 비밀번호 재설정, 활성·비활성, 삭제

const RESOURCES: [Resource, string][] = [
  ['joinRequests', '가입신청'],
  ['inquiries', '1:1 문의'],
  ['reports', '신고'],
  ['users', '회원'],
  ['clubs', '클럽'],
  ['meetings', '라운딩·소셜'],
  ['content', '공지·FAQ·약관'],
  ['payments', '결제'],
  ['admins', '관리자'],
  ['auditLogs', '감사 로그'],
];

function PermissionTable({ a }: { a: AdminAccount }) {
  if (!a.role) return <p className="text-sm text-red-700">역할이 없어 어떤 메뉴도 볼 수 없습니다.</p>;
  return (
    <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
      {RESOURCES.map(([r, label]) => {
        const access = accessFor(a.role, r);
        return (
          <li key={r} className="flex items-center justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-700">{label}</span>
            {access === 'write' ? (
              <Badge tone="success">관리</Badge>
            ) : access === 'read' ? (
              <Badge tone="info">조회</Badge>
            ) : (
              <span className="text-xs text-slate-400">없음</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const pwSchema = z
  .object({ new_password: adminPassword, confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: '비밀번호가 일치하지 않습니다' });

function PasswordModal({ a, onClose }: { a: AdminAccount; onClose: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof pwSchema>>({
    resolver: zodResolver(pwSchema),
    defaultValues: { new_password: '', confirm: '' },
  });
  const save = useMutation({
    mutationFn: (pw: string) => resetAdminPassword(a.id, pw),
    onSuccess: () => {
      toast.success('비밀번호를 재설정했습니다', { description: '새 비밀번호는 당사자에게 직접 전달하세요.' });
      onClose();
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['new_password'])),
  });
  const submit = handleSubmit((v) => save.mutate(v.new_password));
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${a.name} 비밀번호 재설정`}
      description="감사 로그에는 재설정했다는 사실만 남고 비밀번호는 남지 않습니다."
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" loading={save.isPending} onClick={() => void submit()}>
            재설정
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {formError && <p className="text-sm text-red-700">{formError}</p>}
        <FormField label="새 비밀번호" required error={formState.errors.new_password?.message}>
          {(p) => <TextInput {...p} type="password" autoComplete="new-password" {...register('new_password')} />}
        </FormField>
        <FormField label="새 비밀번호 확인" required error={formState.errors.confirm?.message}>
          {(p) => <TextInput {...p} type="password" autoComplete="new-password" {...register('confirm')} />}
        </FormField>
      </div>
    </Modal>
  );
}

export function AdminDetailPage() {
  const id = Number(useParams().id);
  const { me } = useAuth();
  const pii = usePII();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const q = useQuery({ queryKey: adminKey(id), queryFn: () => fetchAdmin(id), enabled: Number.isInteger(id) });
  const status = useMutation({
    mutationFn: (next: 'ACTIVE' | 'DEACTIVATED') => updateAdmin(id, { status: next }),
    onSuccess: async (_, next) => {
      await qc.invalidateQueries({ queryKey: adminKey(id) });
      await qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success(next === 'ACTIVE' ? '활성화했습니다' : '비활성화했습니다. 바로 로그인할 수 없습니다');
    },
    onError: (e) => toast.error('상태를 바꾸지 못했습니다', { description: errorMessage(e) }),
  });

  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="관리자를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const a = q.data;
  const self = a.id === me?.id;

  const toggle = async () => {
    const next = a.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    const ok = await confirm(
      next === 'DEACTIVATED'
        ? {
            title: `${a.name} 계정을 비활성화할까요?`,
            description: '로그인과 모든 작업이 바로 막힙니다. 퇴사·휴직 시 사용하세요.',
            confirmText: '비활성화',
            tone: 'danger',
          }
        : { title: `${a.name} 계정을 다시 활성화할까요?`, confirmText: '활성화' },
    );
    if (ok) status.mutate(next);
  };
  const remove = async () => {
    const r = await confirm({
      title: `${a.name} 계정을 삭제할까요?`,
      description: '목록에서 사라지고 되살릴 수 없습니다. 이 계정이 남긴 감사 로그는 그대로 남습니다.',
      confirmText: '삭제',
      tone: 'danger',
      reason: { required: true, placeholder: '예: 퇴사' },
    });
    if (!r) return;
    try {
      await deleteAdmin(a.id, r.reason);
      await qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('관리자를 삭제했습니다');
      navigate('/admins', { replace: true });
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };

  return (
    <>
      <DetailHeader
        backTo="/admins"
        title={a.name}
        badges={
          <>
            {a.role ? <Badge tone={a.role === 'SUPER_ADMIN' ? 'info' : 'neutral'}>{ROLE_LABEL[a.role]}</Badge> : <Badge tone="danger">역할 없음</Badge>}
            {a.status === 'ACTIVE' ? <Badge tone="success">활성</Badge> : <Badge>비활성</Badge>}
            {self && <Badge>나</Badge>}
          </>
        }
        meta={
          <>
            <span>{a.email}</span>
            <span>최근 로그인 {formatDateTime(a.last_login_at)}</span>
          </>
        }
        actions={
          <>
            <Button onClick={() => setResetting(true)}>
              <KeyRound className="h-4 w-4" aria-hidden />
              비밀번호 재설정
            </Button>
            {!self && (
              <Button loading={status.isPending} onClick={() => void toggle()}>
                {a.status === 'ACTIVE' ? '비활성화' : '활성화'}
              </Button>
            )}
            <Link to={`/admins/${a.id}/edit`}>
              <Button variant="primary">
                <Pencil className="h-4 w-4" aria-hidden />
                수정
              </Button>
            </Link>
            {!self && (
              <Button variant="danger-ghost" aria-label="관리자 삭제" onClick={() => void remove()}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="계정">
          <DescriptionList
            items={[
              { label: '이메일', value: a.email },
              { label: '이름', value: a.name },
              { label: '전화번호', value: pii.phone(a.phone_number) },
              { label: '등록일', value: formatDateTime(a.created_at) },
              { label: '최근 변경', value: formatDateTime(a.updated_at) },
            ]}
          />
        </Card>
        <Card title="역할 권한">
          <PermissionTable a={a} />
          <p className="mt-3 text-xs text-slate-500">관리는 조회와 변경을 모두 할 수 있다는 뜻입니다. 권한 검사는 서버에서도 똑같이 합니다.</p>
        </Card>
      </div>
      {resetting && <PasswordModal a={a} onClose={() => setResetting(false)} />}
    </>
  );
}
