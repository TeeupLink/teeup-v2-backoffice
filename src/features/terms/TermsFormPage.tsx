import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { RichTextEditor } from '@/components/editor/LazyRichTextEditor';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { Switch } from '@/components/form/Switch';
import { TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { createVersion, fetchVersion, isTermsType, termsKey, TYPE_LABEL, updateVersion, type TermsType, type VersionInput } from './api';

// SCR-076 약관 초안 작성·수정 (F-076). 초안은 게시 전까지 앱에 보이지 않는다

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요').max(255),
  content: z.string().refine((v) => v.replace(/<[^>]*>/g, '').trim().length > 0, '본문을 입력해주세요'),
  is_required: z.boolean(),
});

function TermsForm({ type, editId, initial }: { type: TermsType; editId: number | null; initial: VersionInput }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const { register, control, handleSubmit, reset, setError, formState } = useForm<VersionInput>({ resolver: zodResolver(schema), defaultValues: initial });
  const save = useMutation({
    mutationFn: (v: VersionInput) => {
      const body = { ...v, title: v.title.trim() };
      if (!editId) return createVersion(type, body);
      const changed = Object.fromEntries(Object.entries(body).filter(([k]) => formState.dirtyFields[k as keyof VersionInput]));
      return updateVersion(editId, changed);
    },
    onSuccess: async (r, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: termsKey });
      toast.success(editId ? '초안을 저장했습니다' : '초안을 만들었습니다', { description: '게시 전까지 앱에 보이지 않습니다.' });
      setSavedId(r.id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['title', 'content'])),
  });
  useEffect(() => {
    if (savedId != null && !formState.isDirty) navigate(`/terms/${type}/v/${savedId}`, { replace: true });
  }, [savedId, formState.isDirty, navigate, type]);

  return (
    <>
      <PageHeader
        title={`${TYPE_LABEL[type]} · ${editId ? '초안 수정' : '새 버전'}`}
        description="저장하면 초안이 됩니다. 버전 화면에서 게시해야 앱에 보입니다."
      />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={formState.isDirty}
        requireDirty={!!editId}
        submitText="초안 저장"
        onCancel={() => navigate(`/terms/${type}`)}
        error={formError}
      >
        <FormSection title="약관">
          <FormField label="제목" required error={formState.errors.title?.message}>
            {(p) => <TextInput {...p} {...register('title')} />}
          </FormField>
          <FormField label="필수 동의" hint="필수는 가입할 때 반드시 동의해야 합니다">
            {(p) => (
              <Controller
                control={control}
                name="is_required"
                render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />}
              />
            )}
          </FormField>
          <FormField label="본문" required error={formState.errors.content?.message}>
            {(p) => (
              <Controller
                control={control}
                name="content"
                render={({ field }) => <RichTextEditor id={p.id} invalid={p['aria-invalid']} value={field.value} onChange={field.onChange} />}
              />
            )}
          </FormField>
        </FormSection>
      </FormShell>
    </>
  );
}

export function TermsFormPage() {
  const vid = useParams().vid;
  const [sp] = useSearchParams();
  const editId = vid ? Number(vid) : null;
  const from = sp.get('from');
  const sourceId = editId ?? (from ? Number(from) : null);
  const q = useQuery({
    queryKey: [...termsKey, 'version', sourceId],
    queryFn: () => fetchVersion(sourceId!),
    enabled: sourceId != null && Number.isInteger(sourceId),
  });

  if (sourceId == null) {
    const type = sp.get('type') ?? undefined;
    if (!isTermsType(type)) return <NotFoundPage title="약관 종류를 찾을 수 없습니다" />;
    return <TermsForm type={type} editId={null} initial={{ title: TYPE_LABEL[type], content: '', is_required: type !== 'MARKETING' }} />;
  }
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const v = q.data;
  if (editId && v.status !== 'DRAFT') return <NotFoundPage title="게시된 적 있는 버전은 고칠 수 없습니다" />;
  return <TermsForm type={v.type} editId={editId} initial={{ title: v.title, content: v.content, is_required: v.is_required }} />;
}
