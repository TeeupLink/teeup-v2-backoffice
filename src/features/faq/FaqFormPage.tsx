import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField, FormSection, FormShell } from '@/components/form/Form';
import { Switch } from '@/components/form/Switch';
import { Select, TextInput, Textarea } from '@/components/form/controls';
import { applyServerErrors } from '@/components/form/serverErrors';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiError } from '@/lib/api/errors';
import { categoriesKey, createFaq, fetchCategories, fetchFaq, updateFaq, type Faq } from './api';

// SCR-073 FAQ 작성·수정 (F-072). 답변은 앱이 글자 그대로 보여 주므로 리치텍스트가 아니라 일반 텍스트

const schema = z.object({
  question: z.string().trim().min(1, '질문을 입력해주세요').max(300, '질문은 300자 이하로 입력해주세요'),
  answer: z.string().trim().min(1, '답변을 입력해주세요'),
  category_id: z.string(),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

function FaqForm({ faq, defaultCategory }: { faq?: Faq; defaultCategory?: string }) {
  const editing = !!faq;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: categoriesKey, queryFn: fetchCategories });
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const back = faq?.category_id ? `/faq?category_id=${faq.category_id}` : defaultCategory ? `/faq?category_id=${defaultCategory}` : '/faq';
  const { register, control, handleSubmit, reset, setError, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: faq
      ? { question: faq.question, answer: faq.answer, category_id: faq.category_id ? String(faq.category_id) : '', is_active: faq.is_active }
      : { question: '', answer: '', category_id: defaultCategory ?? '', is_active: true },
  });
  const answer = watch('answer');
  const categoryId = watch('category_id');

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { question: v.question.trim(), answer: v.answer.trim(), category_id: v.category_id ? Number(v.category_id) : null, is_active: v.is_active };
      if (!editing) return createFaq(body);
      const changed = Object.fromEntries(Object.entries(body).filter(([k]) => formState.dirtyFields[k as keyof Values]));
      return updateFaq(faq.id, changed);
    },
    onSuccess: async (_, v) => {
      reset(v);
      await qc.invalidateQueries({ queryKey: ['faq'] });
      await qc.invalidateQueries({ queryKey: categoriesKey });
      toast.success(editing ? 'FAQ 를 저장했습니다' : 'FAQ 를 등록했습니다');
      setSaved(true);
    },
    onError: (e) => setFormError(applyServerErrors(e, setError, ['question', 'answer', 'category_id'])),
  });

  useEffect(() => {
    if (saved && !formState.isDirty) navigate(back, { replace: true });
  }, [saved, formState.isDirty, navigate, back]);

  return (
    <>
      <PageHeader title={editing ? 'FAQ 수정' : 'FAQ 작성'} />
      <FormShell
        onSubmit={handleSubmit((v) => {
          setFormError(null);
          save.mutate(v);
        })}
        submitting={save.isPending}
        dirty={formState.isDirty}
        requireDirty={editing}
        submitText={editing ? '저장' : '등록'}
        onCancel={() => navigate(back)}
        error={formError}
      >
        <FormSection title="FAQ">
          <FormField label="카테고리" hint={editing ? '다른 카테고리로 옮기면 그 카테고리의 순서가 바뀔 수 있습니다' : '새 FAQ 는 카테고리 맨 뒤에 붙습니다'}>
            {(p) => (
              <Select
                {...p}
                className="max-w-60"
                placeholder="미분류"
                options={(cats.data ?? []).map((c) => ({ value: String(c.id), label: c.is_active ? c.title : `${c.title} (숨김)` }))}
                {...register('category_id')}
                // 옵션이 늦게 와도 폼 값이 보이도록 화면 값을 폼 값에 묶는다
                value={categoryId}
              />
            )}
          </FormField>
          <FormField label="질문" required error={formState.errors.question?.message}>
            {(p) => <TextInput {...p} maxLength={300} {...register('question')} />}
          </FormField>
          <FormField label="답변" required error={formState.errors.answer?.message} hint={`${answer.length}자`}>
            {(p) => <Textarea {...p} rows={10} {...register('answer')} />}
          </FormField>
          <FormField label="공개">
            {(p) => (
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => <Switch id={p.id} checked={field.value} onCheckedChange={field.onChange} />}
              />
            )}
          </FormField>
        </FormSection>
      </FormShell>
    </>
  );
}

export function FaqFormPage() {
  const param = useParams().id;
  const [sp] = useSearchParams();
  const id = param ? Number(param) : null;
  const q = useQuery({ queryKey: ['faq', 'detail', id], queryFn: () => fetchFaq(id!), enabled: id != null && Number.isInteger(id) });
  if (id == null) return <FaqForm defaultCategory={sp.get('category_id') ?? undefined} />;
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="FAQ 를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <FaqForm faq={q.data} />;
}
