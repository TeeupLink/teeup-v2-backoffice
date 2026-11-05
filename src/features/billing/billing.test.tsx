import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const user = { id: 7, nickname: '결제회원', realname: '김결제' };
const status = (extra: object = {}) => ({ enabled: false, mode: 'test', encryption_ready: true, max_attempt: 4, retry_days: [1, 3, 7], ...extra });
const payment = (extra: object = {}) => ({
  id: 1,
  order_id: 'sub3_20261101_a1',
  order_name: '티업링크 프로',
  amount: 9900,
  canceled_amount: 0,
  balance: 9900,
  status: 'SUCCEEDED',
  method: '카드',
  user,
  approved_at: '2026-11-01T04:00:01',
  created_at: '2026-11-01T04:00:00',
  ...extra,
});
const charge = (extra: object = {}) => ({
  id: 5,
  subscription_id: 3,
  period_start: '2026-11-01',
  period_end: '2026-12-01',
  amount: 9900,
  order_id: 'sub3_20261101',
  attempt: 1,
  max_attempt: 4,
  status: 'FAILED',
  failure_code: 'REJECT_CARD_PAYMENT',
  failure_message: '한도초과',
  next_retry_at: '2026-11-02T04:00:00',
  payment_id: null,
  created_at: '2026-11-01T04:00:00',
  updated_at: '2026-11-01T04:00:01',
  ...extra,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  sessionStorage.clear();
});

describe('SCR-080 결제 내역', () => {
  it('정기결제 비활성 배너, 탭은 status 로 보낸다', async () => {
    const u = userEvent.setup();
    const { calls } = renderApp('/payments', 'SUPPORT_ADMIN', {
      'GET /admin/billing/status': status(),
      'GET /admin/payments': { items: [payment(), payment({ id: 2, order_id: 'o2', status: 'PARTIAL_CANCELED', canceled_amount: 3000, balance: 6900 })], total: 2, page: 1, size: 20 },
    });
    expect(await screen.findByText('sub3_20261101_a1')).toBeInTheDocument();
    expect(screen.getByText(/정기결제 비활성/)).toBeInTheDocument();
    expect(screen.getByText('잔액 6,900원')).toBeInTheDocument();
    await u.click(screen.getByRole('tab', { name: '부분취소' }));
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/payments').pop()!.query.getAll('status')).toEqual(['PARTIAL_CANCELED']));
  });

  it('권한이 없으면 403', async () => {
    renderApp('/payments', 'CLUB_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});

describe('SCR-081 결제 상세', () => {
  const detail = payment({ payment_key: 'pk_1', requested_at: null, subscription_id: 3, cancels: [] });

  it('고객지원은 취소 버튼이 없다', async () => {
    renderApp('/payments/1', 'SUPPORT_ADMIN', { 'GET /admin/payments/1': detail, 'GET /admin/billing/status': status() });
    expect(await screen.findByText('pk_1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '전액 취소' })).not.toBeInTheDocument();
  });

  it('부분 환불은 잔액 초과를 막고, 금액·사유를 보낸다', async () => {
    const u = userEvent.setup();
    const { calls } = renderApp('/payments/1', 'SUPER_ADMIN', {
      'GET /admin/payments/1': detail,
      'GET /admin/billing/status': status(),
      'POST /admin/payments/1/cancel': { ...detail, status: 'PARTIAL_CANCELED', balance: 6900, canceled_amount: 3000 },
    });
    await u.click(await screen.findByRole('button', { name: '부분 환불' }));
    const dialog = await screen.findByRole('dialog');
    const [amount, reason] = within(dialog).getAllByRole('textbox') as [HTMLElement, HTMLElement];
    await u.type(amount, '10000');
    await u.type(reason, '일부 환불');
    await u.click(within(dialog).getByRole('button', { name: '환불' }));
    expect(within(dialog).getByText('잔액 9,900원 이하로 입력해주세요')).toBeInTheDocument();
    await u.clear(amount);
    await u.type(amount, '3000');
    await u.click(within(dialog).getByRole('button', { name: '환불' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ amount: 3000, reason: '일부 환불' }));
  });

  it('전액 취소는 금액 없이 보낸다', async () => {
    const u = userEvent.setup();
    const { calls } = renderApp('/payments/1', 'SUPER_ADMIN', {
      'GET /admin/payments/1': detail,
      'GET /admin/billing/status': status(),
      'POST /admin/payments/1/cancel': { ...detail, status: 'CANCELED', balance: 0 },
    });
    await u.click(await screen.findByRole('button', { name: '전액 취소' }));
    const dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByRole('textbox'), '회원 요청');
    await u.click(within(dialog).getByRole('button', { name: '전액 취소' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ amount: null, reason: '회원 요청' }));
  });
});

describe('SCR-083 구독 상세', () => {
  const sub = {
    id: 3,
    status: 'PAST_DUE',
    user,
    plan: { id: 1, name: '프로', price: 9900, billing_cycle: 'MONTHLY' },
    billing_key: { id: 1, card_company: '신한', card_number_masked: '1234****', status: 'ACTIVE', mode: 'TEST', created_at: '2026-10-01T00:00:00' },
    start_date: '2026-10-01T00:00:00',
    next_billing_date: '2026-11-01T00:00:00',
    end_date: null,
    canceled_at: null,
    cancel_reason: null,
    created_at: '2026-10-01T00:00:00',
    charges: [charge()],
  };

  it('비활성이면 재청구 버튼이 비활성, 해지는 사유를 받는다', async () => {
    const u = userEvent.setup();
    const { calls } = renderApp('/subscriptions/3', 'SUPER_ADMIN', {
      'GET /admin/subscriptions/3': sub,
      'GET /admin/billing/status': status(),
      'POST /admin/subscriptions/3/cancel': { ...sub, status: 'CANCELED' },
    });
    expect(await screen.findByText('신한 1234****')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '재청구' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: '해지' }));
    const dialog = await screen.findByRole('alertdialog');
    await u.type(within(dialog).getByRole('textbox'), '회원 요청');
    await u.click(within(dialog).getByRole('button', { name: '해지' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ reason: '회원 요청' }));
  });
});

describe('SCR-085 청구 실패', () => {
  it('활성이면 재청구를 확인 후 보낸다', async () => {
    const u = userEvent.setup();
    const { calls } = renderApp('/billing/failures', 'SUPER_ADMIN', {
      'GET /admin/billing/status': status({ enabled: true }),
      'GET /admin/billing/failures': { items: [{ ...charge(), subscription_status: 'PAST_DUE', user, plan: { id: 1, name: '프로' } }], total: 1, page: 1, size: 20 },
      'POST /admin/billing/charges/5/retry': charge({ status: 'SUCCEEDED', attempt: 2, payment_id: 9 }),
    });
    expect(await screen.findByText('한도초과')).toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '재청구' })).toBeEnabled());
    await u.click(screen.getByRole('button', { name: '재청구' }));
    await u.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '재청구' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/billing/charges/5/retry')).toBe(true));
  });
});

describe('SCR-084 요금제', () => {
  it('추가 모달에서 금액을 숫자로 보낸다', async () => {
    const u = userEvent.setup();
    const { calls } = renderApp('/plans', 'SUPER_ADMIN', {
      'GET /admin/billing/status': status(),
      'GET /admin/plans': { items: [{ id: 1, name: '프로', description: null, type: 'PRO', price: 9900, billing_cycle: 'MONTHLY', is_active: true, subscribers: 2 }], total: 1 },
      'POST /admin/plans': { id: 2 },
    });
    expect(await screen.findByRole('button', { name: '프로 삭제' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: '요금제' }));
    const dialog = await screen.findByRole('dialog');
    const [name, price] = within(dialog).getAllByRole('textbox') as [HTMLElement, HTMLElement];
    await u.type(name, '연간');
    await u.type(price, '99000');
    await u.selectOptions(within(dialog).getByRole('combobox'), 'YEARLY');
    await u.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ name: '연간', price: 99000, billing_cycle: 'YEARLY', description: null, is_active: true }),
    );
  });
});

describe('SCR-086 빌링 샌드박스', () => {
  it('최고 관리자 전용', async () => {
    renderApp('/billing/sandbox', 'SUPPORT_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });

  it('운영 키면 전체 비활성', async () => {
    vi.stubEnv('VITE_TOSS_CLIENT_KEY', 'live_ck_x');
    renderApp('/billing/sandbox', 'SUPER_ADMIN', { 'GET /admin/billing/status': status() });
    expect(await screen.findByText('운영 키에서는 샌드박스를 사용할 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '토스 카드 등록 열기' })).toBeDisabled();
  });

  it('카드 등록에서 돌아오면 빌링키를 발급하고, 청구·취소까지 진행한다', async () => {
    vi.stubEnv('VITE_TOSS_CLIENT_KEY', 'test_ck_x');
    sessionStorage.setItem('billing-sandbox', JSON.stringify({ customerKey: 'sandbox_abc', log: [] }));
    const u = userEvent.setup();
    const { calls } = renderApp('/billing/sandbox?result=success&authKey=auth_1&customerKey=sandbox_abc', 'SUPER_ADMIN', {
      'GET /admin/billing/status': status(),
      'POST /admin/billing/sandbox/issue': { token: 'tok', customer_key: 'sandbox_abc', card_company: '현대', card_number_masked: '4330****', billing_key_hint: '****99' },
      'POST /admin/billing/sandbox/charge': { payment_key: 'pk_sb', order_id: 'sandbox_1', amount: 100, status: 'DONE', approved_at: null, idempotency_key: 'idem' },
      'POST /admin/billing/sandbox/cancel': { payment_key: 'pk_sb', status: 'CANCELED' },
    });
    expect(await screen.findByText('billingKey ****99')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/billing/sandbox/issue')?.body).toEqual({ auth_key: 'auth_1', customer_key: 'sandbox_abc' });
    await u.click(screen.getByRole('button', { name: '청구 실행' }));
    expect(await screen.findByText('pk_sb')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/billing/sandbox/charge')?.body).toEqual({ token: 'tok', customer_key: 'sandbox_abc' });
    await u.click(screen.getByRole('button', { name: '취소 실행' }));
    expect(await screen.findByText(/sandbox\/cancel 200/)).toBeInTheDocument();
    expect(JSON.stringify(sessionStorage.getItem('billing-sandbox'))).not.toContain('auth_1');
  });
});
