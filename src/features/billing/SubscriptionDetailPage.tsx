import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { StatusBadge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { DetailHeader } from '@/components/layout/DetailHeader';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { formatDate, formatDateTime, formatWon } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { BillingStatusBanner } from './BillingStatusBanner';
import { ChargesTable } from './ChargesTable';
import { cancelSubscription, fetchSubscription, PLAN_CYCLE, subscriptionKey } from './api';

// SCR-083 구독 상세 (F-121) — 구독 정보·결제 수단·청구 이력, 해지(사유)

export function SubscriptionDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const { can } = useAuth();
  const pii = usePII();
  const q = useQuery({ queryKey: subscriptionKey(id), queryFn: () => fetchSubscription(id), enabled: Number.isInteger(id) });
  const cancel = useMutation({
    mutationFn: (reason: string) => cancelSubscription(id, reason),
    onSuccess: async (d) => {
      qc.setQueryData(subscriptionKey(id), d);
      await qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('구독을 해지했습니다');
    },
    onError: (e) => toast.error('해지하지 못했습니다', { description: errorMessage(e) }),
  });
  if (!Number.isInteger(id) || (q.error instanceof ApiError && q.error.status === 404)) return <NotFoundPage title="구독을 찾을 수 없습니다" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  const s = q.data;
  const k = s.billing_key;
  const onCancel = async () => {
    const ok = await confirm({
      title: '구독을 해지할까요?',
      description: '다음 결제일부터 청구하지 않고, 재시도 대기 중인 청구도 멈춥니다. 이미 결제된 금액은 환불되지 않습니다 — 환불은 결제 상세에서 합니다.',
      confirmText: '해지',
      tone: 'danger',
      reason: { label: '사유', placeholder: '예: 회원 요청 (문의 #123)', required: true },
    });
    if (ok) cancel.mutate(ok.reason);
  };
  return (
    <>
      <DetailHeader
        backTo="/subscriptions"
        title={`${s.user?.nickname ?? '회원'} · ${s.plan?.name ?? '요금제'}`}
        badges={<StatusBadge domain="subscription" value={s.status} />}
        meta={<span>시작 {formatDate(s.start_date)}</span>}
        actions={
          can('payments', 'write') && s.status !== 'CANCELED' ? (
            <Button variant="danger" loading={cancel.isPending} onClick={() => void onCancel()}>
              해지
            </Button>
          ) : undefined
        }
      />
      <BillingStatusBanner />
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="구독 정보">
            <DescriptionList
              items={[
                {
                  label: '회원',
                  value: s.user ? (
                    can('users') ? (
                      <Link to={`/users/${s.user.id}`} className="hover:underline">
                        {s.user.nickname} <span className="text-slate-500">{pii.name(s.user.realname)}</span>
                      </Link>
                    ) : (
                      s.user.nickname
                    )
                  ) : (
                    '-'
                  ),
                },
                { label: '요금제', value: s.plan ? `${s.plan.name} (${formatWon(s.plan.price)} / ${PLAN_CYCLE[s.plan.billing_cycle] ?? s.plan.billing_cycle})` : '-' },
                { label: '다음 결제일', value: s.status === 'CANCELED' ? '-' : formatDate(s.next_billing_date) },
                { label: '종료일', value: formatDate(s.end_date) },
                ...(s.status === 'CANCELED' ? [{ label: '해지', value: `${formatDateTime(s.canceled_at)} · ${s.cancel_reason ?? ''}`, full: true }] : []),
              ]}
            />
          </Card>
          <Card title="결제 수단">
            {k ? (
              <DescriptionList
                items={[
                  { label: '카드', value: `${k.card_company ?? '-'} ${k.card_number_masked ?? ''}` },
                  { label: '상태', value: k.status === 'ACTIVE' ? '사용 중' : '해지됨' },
                  { label: '종류', value: k.mode === 'TEST' ? '테스트 키' : '운영 키' },
                  { label: '등록일', value: formatDate(k.created_at) },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500">등록된 결제 수단이 없습니다. 회원이 카드를 등록해야 청구할 수 있습니다.</p>
            )}
          </Card>
        </div>
        <Card title="청구 이력">
          <ChargesTable subscriptionId={s.id} />
        </Card>
      </div>
    </>
  );
}
