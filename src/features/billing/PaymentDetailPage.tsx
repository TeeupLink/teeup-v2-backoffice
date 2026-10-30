import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { StatusBadge } from '@/components/display/StatusBadge';
import { Modal } from '@/components/dialog/Modal';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { Textarea, TextInput } from '@/components/form/controls';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatMoneyInput, formatWon } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { BillingStatusBanner } from './BillingStatusBanner';
import { cancelPayment, fetchPayment, paymentKey, type PaymentDetail } from './api';

// SCR-081 결제 상세 (F-122) — 취소 이력, 전액 취소·부분 환불 (최고 관리자)

function CancelModal({ p, partial, onClose }: { p: PaymentDetail; partial: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(partial ? '' : String(p.balance));
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const n = Number(amount);
  const amountError = !amount || n < 1 ? '금액을 입력해주세요' : n > p.balance ? `잔액 ${formatWon(p.balance)} 이하로 입력해주세요` : undefined;
  const reasonError = reason.trim() ? undefined : '사유를 입력해주세요';
  const save = useMutation({
    mutationFn: () => cancelPayment(p.id, partial ? n : null, reason.trim()),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: paymentKey(p.id) });
      await qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success(partial ? `${formatWon(n)}을 환불했습니다` : '결제를 취소했습니다');
      onClose();
    },
    onError: (e) => toast.error('취소하지 못했습니다', { description: errorMessage(e) }),
  });
  const submit = () => {
    setTouched(true);
    if ((partial && amountError) || reasonError) return;
    save.mutate();
  };
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={partial ? '부분 환불' : '전액 취소'}
      description={`토스페이먼츠에 바로 취소를 요청합니다. 되돌릴 수 없습니다. 현재 잔액 ${formatWon(p.balance)}`}
      footer={
        <>
          <Button onClick={onClose}>닫기</Button>
          <Button variant="danger" loading={save.isPending} onClick={submit}>
            {partial ? '환불' : '전액 취소'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {partial ? (
          <FormField label="환불 금액" required error={touched ? amountError : undefined}>
            {(f) => (
              <TextInput {...f} inputMode="numeric" className="max-w-48 text-right tabular" value={formatMoneyInput(amount)} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
            )}
          </FormField>
        ) : (
          <p className="text-sm text-slate-700">
            잔액 <strong className="tabular">{formatWon(p.balance)}</strong>을 모두 취소합니다.
          </p>
        )}
        <FormField label="사유" required error={touched ? reasonError : undefined} hint="결제 취소 이력과 감사 로그에 남습니다">
          {(f) => <Textarea {...f} rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </FormField>
      </div>
    </Modal>
  );
}

export function PaymentDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const pii = usePII();
  const [modal, setModal] = useState<'full' | 'partial' | null>(null);
  const q = useQuery({ queryKey: paymentKey(id), queryFn: () => fetchPayment(id), enabled: Number.isInteger(id) });
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="결제 내역을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const p = q.data;
  const cancelable = can('payments', 'write') && (p.status === 'SUCCEEDED' || p.status === 'PARTIAL_CANCELED') && p.balance > 0;
  return (
    <>
      <DetailHeader
        backTo="/payments"
        title={p.order_name ?? `결제 #${p.id}`}
        badges={<StatusBadge domain="payment" value={p.status} />}
        meta={<span>결제 {formatDateTime(p.approved_at)}</span>}
        actions={
          cancelable ? (
            <>
              <Button onClick={() => setModal('partial')}>부분 환불</Button>
              <Button variant="danger" onClick={() => setModal('full')}>
                전액 취소
              </Button>
            </>
          ) : undefined
        }
      />
      <BillingStatusBanner />
      <div className="space-y-4">
        <Card title="결제 정보">
          <DescriptionList
            items={[
              { label: '주문번호', value: <span className="font-mono text-xs">{p.order_id ?? '-'}</span> },
              { label: 'paymentKey', value: <span className="break-all font-mono text-xs">{p.payment_key ?? '-'}</span> },
              {
                label: '회원',
                value: p.user ? (
                  can('users') ? (
                    <Link to={`/users/${p.user.id}`} className="hover:underline">
                      {p.user.nickname} <span className="text-slate-500">{pii.name(p.user.realname)}</span>
                    </Link>
                  ) : (
                    p.user.nickname
                  )
                ) : (
                  '-'
                ),
              },
              { label: '수단', value: p.method ?? '-' },
              { label: '금액', value: formatWon(p.amount) },
              { label: '취소 합계', value: formatWon(p.canceled_amount) },
              { label: '잔액', value: <strong>{formatWon(p.balance)}</strong> },
              { label: '승인일시', value: formatDateTime(p.approved_at) },
              {
                label: '구독',
                value: p.subscription_id ? (
                  <Link to={`/subscriptions/${p.subscription_id}`} className="hover:underline">
                    구독 #{p.subscription_id}
                  </Link>
                ) : (
                  '-'
                ),
              },
            ]}
          />
        </Card>
        <Card title={`취소 이력 ${p.cancels.length}건`}>
          {p.cancels.length === 0 ? (
            <p className="text-sm text-slate-500">취소한 적이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {p.cancels.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <strong className="tabular">{formatWon(c.amount)}</strong>
                    <span className="ml-2 text-slate-700">{c.reason}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(c.created_at)} · {c.admin_email ?? '-'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {modal && <CancelModal p={p} partial={modal === 'partial'} onClose={() => setModal(null)} />}
    </>
  );
}
