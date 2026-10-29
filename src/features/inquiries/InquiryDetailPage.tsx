import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Lock, Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { useAuth } from '@/app/auth/useAuth';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { Badge, StatusBadge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { Checkbox, Select, Textarea } from '@/components/form/controls';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { INQUIRY_TYPE } from '@/lib/labels';
import { statusOptions } from '@/lib/status';
import {
  createResponse,
  deleteResponse,
  fetchInquiry,
  nextUnanswered,
  updateInquiryStatus,
  updateResponse,
  type InquiryResponseItem,
} from './api';

// SCR-022 1:1 문의 상세 (화면설계서 4.3) — 목록 → 상세 → 답변 등록 3클릭

function ResponseItem({ inquiryId, item, writable }: { inquiryId: number; item: InquiryResponseItem; writable: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.content);
  const save = useMutation({
    mutationFn: () => updateResponse(inquiryId, item.id, text.trim()),
    onSuccess: async () => {
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
      toast.success('답변을 수정했습니다');
    },
    onError: (e) => toast.error('수정하지 못했습니다', { description: errorMessage(e) }),
  });
  const remove = async () => {
    const ok = await confirm({ title: '답변을 삭제할까요?', description: '회원 화면에서도 사라집니다.', confirmText: '삭제', tone: 'danger' });
    if (!ok) return;
    try {
      await deleteResponse(inquiryId, item.id);
      await qc.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
      toast.success('답변을 삭제했습니다');
    } catch (e) {
      toast.error('삭제하지 못했습니다', { description: errorMessage(e) });
    }
  };

  return (
    <li className={cn('rounded-lg p-4', item.is_internal ? 'bg-slate-100' : 'bg-primary-50/60 ring-1 ring-primary-100')}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {item.is_internal ? (
          <Badge tone="neutral">
            <Lock className="mr-1 h-3 w-3" aria-hidden />
            내부 메모
          </Badge>
        ) : (
          <Badge tone="success">답변</Badge>
        )}
        <span className="font-medium text-slate-700">{item.admin_name ?? '운영자'}</span>
        <span>{formatDateTime(item.created_at)}</span>
        {writable && !editing && (
          <span className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" aria-label="답변 수정" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="danger-ghost" aria-label="답변 삭제" onClick={() => void remove()}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </span>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="답변 수정" />
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => { setText(item.content); setEditing(false); }}>취소</Button>
            <Button size="sm" variant="primary" loading={save.isPending} disabled={!text.trim()} onClick={() => save.mutate()}>저장</Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-800">{item.content}</p>
      )}
    </li>
  );
}

function ReplyBox({ inquiryId }: { inquiryId: number }) {
  const qc = useQueryClient();
  const id = useId();
  const [content, setContent] = useState('');
  const [internal, setInternal] = useState(false);
  const [complete, setComplete] = useState(true);
  const send = useMutation({
    mutationFn: () => createResponse(inquiryId, { content: content.trim(), is_internal: internal, set_status: !internal && complete ? 'COMPLETED' : undefined }),
    onSuccess: async () => {
      setContent('');
      await qc.invalidateQueries();
      toast.success(internal ? '내부 메모를 남겼습니다' : '답변을 등록했습니다');
    },
    onError: (e) => toast.error('등록하지 못했습니다', { description: errorMessage(e) }),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (content.trim()) send.mutate();
      }}
    >
      <label htmlFor={id} className="sr-only">
        답변 입력
      </label>
      <Textarea id={id} rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder={internal ? '운영자끼리만 보는 메모입니다. 회원에게 보이지 않고 알림도 가지 않습니다.' : '회원에게 보낼 답변'} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Checkbox label="내부 메모" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
        <Checkbox label="답변완료로 전환" checked={complete && !internal} disabled={internal} onChange={(e) => setComplete(e.target.checked)} />
        <Button type="submit" variant="primary" className="ml-auto" loading={send.isPending} disabled={!content.trim()}>
          {internal ? '메모 남기기' : '답변 등록'}
        </Button>
      </div>
    </form>
  );
}

export function InquiryDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const writable = can('inquiries', 'write');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['inquiry', id], queryFn: () => fetchInquiry(id), enabled: Number.isInteger(id) });

  const setStatus = useMutation({
    mutationFn: (status: string) => updateInquiryStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success('상태를 바꿨습니다');
    },
    onError: (e) => toast.error('상태를 바꾸지 못했습니다', { description: errorMessage(e) }),
  });

  const goNext = async () => {
    const next = await nextUnanswered(id).catch(() => null);
    if (next) navigate(`/inquiries/${next}`);
    else toast.info('남은 미답변 문의가 없습니다');
  };

  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="문의를 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const { inquiry, responses } = q.data;
  const meta = (
    <Card title="문의 정보">
      <DescriptionList
        columns={1}
        items={[
          {
            label: '작성자',
            value: can('users') ? (
              <Link to={`/users/${inquiry.user_id}/activity`} className="font-medium text-primary-800 hover:underline">
                {inquiry.user_nickname} <ChevronRight className="inline h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              inquiry.user_nickname
            ),
          },
          { label: '유형', value: INQUIRY_TYPE[inquiry.type] ?? inquiry.type },
          {
            label: '상태',
            value: writable ? (
              <Select
                aria-label="상태 변경"
                value={inquiry.status}
                disabled={setStatus.isPending}
                onChange={(e) => setStatus.mutate(e.target.value)}
                options={statusOptions('inquiry').filter((o) => o.value !== 'SUBMITTED' && o.value !== 'RESOLVED')}
              />
            ) : (
              <StatusBadge domain="inquiry" value={inquiry.status} />
            ),
          },
          { label: '등록', value: formatDateTime(inquiry.created_at) },
          { label: '최근 변경', value: formatDateTime(inquiry.updated_at) },
        ]}
      />
    </Card>
  );

  return (
    <>
      <DetailHeader
        backTo="/inquiries"
        title={inquiry.title}
        badges={<StatusBadge domain="inquiry" value={inquiry.status} />}
        meta={<span>{INQUIRY_TYPE[inquiry.type] ?? inquiry.type} · {inquiry.user_nickname} · {formatDateTime(inquiry.created_at)}</span>}
        actions={
          <Button onClick={() => void goNext()}>
            다음 미답변 <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <Card title="문의 내용">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{inquiry.content}</p>
          </Card>
          <Card title={`답변 ${responses.filter((r) => !r.is_internal).length}`}>
            {responses.length ? (
              <ul className="space-y-3">
                {responses.map((r) => (
                  <ResponseItem key={r.id} inquiryId={id} item={r} writable={writable} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">아직 답변이 없습니다.</p>
            )}
            {writable && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <ReplyBox inquiryId={id} />
              </div>
            )}
          </Card>
        </div>
        {/* 폰에서는 본문·답변이 먼저 — 급한 답변 처리 (NFR-009) */}
        <div>{meta}</div>
      </div>
    </>
  );
}
