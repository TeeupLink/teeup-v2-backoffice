import type { ListState } from '@/components/data-table/listState';
import { toApiQuery } from '@/components/data-table/listState';
import { api, download, type Query } from '@/lib/api/client';

// 결제·구독·요금제·정기결제 (BE#77, API스펙 API-120~133)
export const PAYMENTS_PATH = '/admin/payments';
export const SUBSCRIPTIONS_PATH = '/admin/subscriptions';
export const PLANS_PATH = '/admin/plans';
export const FAILURES_PATH = '/admin/billing/failures';

export type Person = { id: number; nickname: string; realname: string | null };
export type PaymentStatus = 'SUCCEEDED' | 'PARTIAL_CANCELED' | 'CANCELED' | 'FAILED' | 'PENDING';

export type PaymentRow = {
  id: number;
  order_id: string | null;
  order_name: string | null;
  amount: number;
  canceled_amount: number;
  balance: number;
  status: PaymentStatus;
  method: string | null;
  user: Person | null;
  approved_at: string | null;
  created_at: string | null;
};
export type PaymentCancel = { id: number; amount: number; reason: string; transaction_key: string | null; admin_email: string | null; created_at: string | null };
export type PaymentDetail = PaymentRow & { payment_key: string | null; requested_at: string | null; subscription_id: number | null; cancels: PaymentCancel[] };

export type BillingKey = { id: number; card_company: string | null; card_number_masked: string | null; status: string; mode: string; created_at: string | null };
export type SubscriptionRow = {
  id: number;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  user: Person | null;
  plan: { id: number; name: string; price: number; billing_cycle: string } | null;
  billing_key: BillingKey | null;
  start_date: string | null;
  next_billing_date: string | null;
  end_date: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  created_at: string | null;
};
export type ChargeRow = {
  id: number;
  subscription_id: number;
  period_start: string;
  period_end: string;
  amount: number;
  order_id: string;
  attempt: number;
  max_attempt: number;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'GAVE_UP';
  failure_code: string | null;
  failure_message: string | null;
  next_retry_at: string | null;
  payment_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};
export type SubscriptionDetail = SubscriptionRow & { charges: ChargeRow[] };
export type FailureRow = ChargeRow & { subscription_status: string; user: Person | null; plan: { id: number; name: string } | null };

export type Plan = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  price: number;
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  is_active: boolean;
  subscribers: number;
  created_at: string | null;
  updated_at: string | null;
};
export type PlanInput = Pick<Plan, 'name' | 'description' | 'price' | 'billing_cycle' | 'is_active'>;

export type BillingStatus = { enabled: boolean; mode: 'test' | 'live' | 'unset'; encryption_ready: boolean; max_attempt: number; retry_days: number[] };

export const PLAN_CYCLE: Record<string, string> = { MONTHLY: '매월', QUARTERLY: '분기', YEARLY: '매년' };
export const CHARGE_STATUS: Record<string, string> = { PENDING: '진행중', SUCCEEDED: '성공', FAILED: '재시도 대기', GAVE_UP: '최종 실패' };

/** 화면 탭 → status (전체 탭은 조건 없음) */
export function mapTabQuery(q: Record<string, unknown>): Record<string, unknown> {
  const { tab, ...rest } = q;
  return { ...rest, status: typeof tab === 'string' && tab ? tab : undefined };
}

export const billingStatusKey = ['billing', 'status'] as const;
export const fetchBillingStatus = () => api<BillingStatus>('/admin/billing/status');

export const paymentKey = (id: number) => ['payment', id] as const;
export const fetchPayment = (id: number) => api<PaymentDetail>(`${PAYMENTS_PATH}/${id}`);
export const cancelPayment = (id: number, amount: number | null, reason: string) =>
  api<PaymentDetail>(`${PAYMENTS_PATH}/${id}/cancel`, { method: 'POST', body: { amount, reason } });

/** 지금 보고 있는 필터 그대로 (페이지·정렬 제외). 사유는 감사 로그(EXPORT)에 남는다 */
export function exportPayments(state: ListState, reason: string) {
  const query: Query = { ...(mapTabQuery(toApiQuery(state)) as Query), page: undefined, size: undefined, sort: undefined, reason };
  return download(`${PAYMENTS_PATH}/export`, { query, filename: 'payments.csv' });
}

export const subscriptionKey = (id: number) => ['subscription', id] as const;
export const fetchSubscription = (id: number) => api<SubscriptionDetail>(`${SUBSCRIPTIONS_PATH}/${id}`);
export const cancelSubscription = (id: number, reason: string) =>
  api<SubscriptionDetail>(`${SUBSCRIPTIONS_PATH}/${id}/cancel`, { method: 'POST', body: { reason } });

export const retryCharge = (id: number) => api<ChargeRow>(`/admin/billing/charges/${id}/retry`, { method: 'POST' });

export const plansKey = ['plans'] as const;
export const fetchPlans = () => api<{ items: Plan[]; total: number }>(PLANS_PATH);
export const savePlan = (id: number | null, body: PlanInput) =>
  id ? api<Plan>(`${PLANS_PATH}/${id}`, { method: 'PUT', body }) : api<Plan>(PLANS_PATH, { method: 'POST', body });
export const deletePlan = (id: number) => api(`${PLANS_PATH}/${id}`, { method: 'DELETE' });

// 샌드박스 (SUPER 전용, 테스트 키 전용)
export type SandboxIssued = { token: string; customer_key: string; card_company: string | null; card_number_masked: string | null; billing_key_hint: string };
export type SandboxCharged = { payment_key: string; order_id: string; amount: number; status: string; approved_at: string | null; idempotency_key: string };
export const sandboxIssue = (auth_key: string, customer_key: string) =>
  api<SandboxIssued>('/admin/billing/sandbox/issue', { method: 'POST', body: { auth_key, customer_key } });
export const sandboxCharge = (token: string, customer_key: string) =>
  api<SandboxCharged>('/admin/billing/sandbox/charge', { method: 'POST', body: { token, customer_key } });
export const sandboxCancel = (payment_key: string) => api<{ status: string }>('/admin/billing/sandbox/cancel', { method: 'POST', body: { payment_key } });
