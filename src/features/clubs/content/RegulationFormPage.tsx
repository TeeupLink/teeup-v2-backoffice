import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { RichTextEditor } from '@/components/editor/LazyRichTextEditor';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { Select, TextInput } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchRegulation, fetchRegulations, regulationsKey, saveRegulation } from '../api';
import type { RegulationCategory } from '../types';

// SCR-044 클럽 규정 작성·수정 (F-046). 저장 후 클럽 상세 규정 탭으로

const schema = z.object({
  category_id: z.string().min(1, '카테고리를 선택해주세요'),
  title: z.string().trim().min(1, '제목을 입력해주세요').max(255),
  content: z.string().refine((v) => v.replace(/<[^>]*>/g, '').trim().length > 0, '본문을 입력해주세요'),
});
type Values = z.infer<typeof schema>;

function RegulationForm({ clubId, regId, cats, initial }: { clubId: number; regId: number | null; cats: RegulationCategory[]; initial: Values }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const back = `/clubs/${clubId}/regulations`;
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { register, control, handleSubmit, reset, setError, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });
  const save = useMutation({
    mutationFn: (v: Values) => saveRegulation(clubId, regId, { category_id: Number(v.category_id), title: v.title.trim(), content: v.content }),
    onSuccess: async (_, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: regulationsKey(clubId) });
      toast.success(regId ? '규정을 저장했습니다' : '규정을 등록했습니다');
      setSaved(true);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['category_id', 'title', 'content'])),
  });
  useEffect(() => {
    if (saved && !formState.isDirty) navigate(back, { replace: true });
  }, [saved, formState.isDirty, navigate, back]);

  return (
    <>
      <PageHeader title={regId ? '클럽 규정 수정' : '클럽 규정 작성'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={formState.isDirty}
        requireDirty={!!regId}
        submitText={regId ? '저장' : '등록'}
        onCancel={() => navigate(back)}
        error={formError}
      >
        <FormSection title="규정">
          <FormField label="카테고리" required error={formState.errors.category_id?.message}>
            {(p) => <Select {...p} className="max-w-60" placeholder="선택" options={cats.map((c) => ({ value: String(c.id), label: c.name }))} {...register('category_id')} />}
          </FormField>
          <FormField label="제목" required error={formState.errors.title?.message}>
            {(p) => <TextInput {...p} {...register('title')} />}
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

export function RegulationFormPage() {
  const params = useParams();
  const clubId = Number(params.id);
  const regId = params.rid ? Number(params.rid) : null;
  const cats = useQuery({ queryKey: regulationsKey(clubId), queryFn: () => fetchRegulations(clubId) });
  const reg = useQuery({ queryKey: ['club-regulation', clubId, regId], queryFn: () => fetchRegulation(clubId, regId!), enabled: regId != null });
  const err = cats.error ?? reg.error;
  if (err) return <ErrorState error={err} onRetry={() => void Promise.all([cats.refetch(), reg.refetch()])} />;
  if (!cats.data || (regId != null && !reg.data)) return <Skeleton className="h-96 w-full rounded-xl" />;
  const r = reg.data;
  const initial = r ? { category_id: String(r.category_id), title: r.title, content: r.content } : { category_id: cats.data.length === 1 ? String(cats.data[0]!.id) : '', title: '', content: '' };
  return <RegulationForm clubId={clubId} regId={regId} cats={cats.data} initial={initial} />;
}
