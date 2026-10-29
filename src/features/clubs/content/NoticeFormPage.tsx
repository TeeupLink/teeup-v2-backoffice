import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { RichTextEditor } from '@/components/editor/LazyRichTextEditor';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { Switch } from '@/components/form/Switch';
import { TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchNotice, saveNotice, type NoticeInput } from '../api';

// SCR-043 클럽 공지 작성·수정 (F-045). 저장 후 클럽 상세 공지 탭으로

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요').max(200),
  content: z.string().refine((v) => v.replace(/<[^>]*>/g, '').trim().length > 0, '본문을 입력해주세요'),
  is_important: z.boolean(),
  is_private: z.boolean(),
});

function NoticeForm({ clubId, noticeId, initial }: { clubId: number; noticeId: number | null; initial: NoticeInput }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const back = `/clubs/${clubId}/notices`;
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { register, control, handleSubmit, reset, setError, formState } = useForm<NoticeInput>({ resolver: zodResolver(schema), defaultValues: initial });
  const save = useMutation({
    mutationFn: (v: NoticeInput) => saveNotice(clubId, noticeId, { ...v, title: v.title.trim() }),
    onSuccess: async (_, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['club-notices'] });
      toast.success(noticeId ? '공지를 저장했습니다' : '공지를 등록했습니다');
      setSaved(true);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['title', 'content'])),
  });
  useEffect(() => {
    if (saved && !formState.isDirty) navigate(back, { replace: true });
  }, [saved, formState.isDirty, navigate, back]);

  return (
    <>
      <PageHeader title={noticeId ? '클럽 공지 수정' : '클럽 공지 작성'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={formState.isDirty}
        requireDirty={!!noticeId}
        submitText={noticeId ? '저장' : '등록'}
        onCancel={() => navigate(back)}
        error={formError}
      >
        <FormSection title="공지">
          <FormField label="제목" required error={formState.errors.title?.message}>
            {(p) => <TextInput {...p} {...register('title')} />}
          </FormField>
          <FormField label="중요" hint="목록 맨 위에 고정됩니다">
            {(p) => <Controller control={control} name="is_important" render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />} />}
          </FormField>
          <FormField label="비공개" hint="클럽 운영진만 봅니다">
            {(p) => <Controller control={control} name="is_private" render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />} />}
          </FormField>
          <FormField label="본문" required error={formState.errors.content?.message}>
            {(p) => (
              <Controller control={control} name="content" render={({ field }) => <RichTextEditor id={p.id} invalid={p['aria-invalid']} value={field.value} onChange={field.onChange} />} />
            )}
          </FormField>
        </FormSection>
      </FormShell>
    </>
  );
}

export function NoticeFormPage() {
  const params = useParams();
  const clubId = Number(params.id);
  const noticeId = params.nid ? Number(params.nid) : null;
  const q = useQuery({ queryKey: ['club-notice', clubId, noticeId], queryFn: () => fetchNotice(clubId, noticeId!), enabled: noticeId != null });
  if (noticeId == null) return <NoticeForm clubId={clubId} noticeId={null} initial={{ title: '', content: '', is_important: false, is_private: false }} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const n = q.data;
  return <NoticeForm clubId={clubId} noticeId={noticeId} initial={{ title: n.title, content: n.content, is_important: n.is_important, is_private: n.is_private }} />;
}
