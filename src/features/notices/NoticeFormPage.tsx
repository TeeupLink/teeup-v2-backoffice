import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
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
import { ApiError } from '@/lib/api/errors';
import { createNotice, fetchNotice, updateNotice, type NoticeDetail, type NoticeInput } from './api';

// SCR-071 시스템 공지 작성·수정 (F-071). 게시 여부는 작성 시에만 고르고, 이후에는 상세의 게시·내리기로 바꾼다

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요').max(255),
  content: z.string().refine((v) => v.replace(/<[^>]*>/g, '').trim().length > 0, '본문을 입력해주세요'),
  is_important: z.boolean(),
  is_published: z.boolean(),
});

function NoticeForm({ notice }: { notice?: NoticeDetail }) {
  const editing = !!notice;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const { register, control, handleSubmit, reset, setError, watch, formState } = useForm<NoticeInput>({
    resolver: zodResolver(schema),
    defaultValues: notice
      ? { title: notice.title, content: notice.content, is_important: notice.is_important, is_published: notice.is_published }
      : { title: '', content: '', is_important: false, is_published: false },
  });
  const publishing = watch('is_published');

  const save = useMutation({
    mutationFn: (v: NoticeInput) => {
      const body = { ...v, title: v.title.trim() };
      if (!editing) return createNotice(body).then((r) => r.id);
      // 수정은 바뀐 항목만 (게시 여부는 상세에서)
      const changed = Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'is_published' && formState.dirtyFields[k as keyof NoticeInput]));
      return updateNotice(notice.id, changed).then(() => notice.id);
    },
    onSuccess: async (id, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['notices'] });
      await qc.invalidateQueries({ queryKey: ['notice', id] });
      toast.success(editing ? '공지를 저장했습니다' : v.is_published ? '공지를 게시했습니다' : '임시 저장했습니다');
      setSavedId(id);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['title', 'content'])),
  });

  // reset 이 반영된 뒤 이동해야 미저장 확인(F-004)이 뜨지 않는다
  useEffect(() => {
    if (savedId != null && !formState.isDirty) navigate(`/notices/${savedId}`, { replace: true });
  }, [savedId, formState.isDirty, navigate]);

  return (
    <>
      <PageHeader title={editing ? '공지 수정' : '공지 작성'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={formState.isDirty}
        requireDirty={editing}
        submitText={editing ? '저장' : publishing ? '게시' : '임시 저장'}
        onCancel={() => navigate(editing ? `/notices/${notice.id}` : '/notices')}
        error={formError}
      >
        <FormSection title="공지">
          <FormField label="제목" required error={formState.errors.title?.message}>
            {(p) => <TextInput {...p} {...register('title')} />}
          </FormField>
          <FormField label="중요" hint="목록 맨 위에 고정됩니다">
            {(p) => (
              <Controller
                control={control}
                name="is_important"
                render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />}
              />
            )}
          </FormField>
          {!editing && (
            <FormField label="바로 게시" hint={publishing ? '저장하면 활성 회원 전체에게 알림이 갑니다' : '임시 저장 후 상세에서 게시할 수 있습니다'}>
              {(p) => (
                <Controller
                  control={control}
                  name="is_published"
                  render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />}
                />
              )}
            </FormField>
          )}
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

export function NoticeFormPage() {
  const param = useParams().id;
  const id = param ? Number(param) : null;
  const q = useQuery({ queryKey: ['notice', id], queryFn: () => fetchNotice(id!), enabled: id != null && Number.isInteger(id) });
  if (id == null) return <NoticeForm />;
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="공지를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <NoticeForm notice={q.data} />;
}
