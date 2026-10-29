import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

afterEach(() => vi.unstubAllGlobals());

const row = {
  id: 1, request_id: 'req-1', actor: { id: 2, email: 'club@teeup.run', role: 'CLUB_ADMIN' }, action: 'REJECT',
  target_type: 'CLUB_MEMBERSHIP', target_id: '12', reason: '정원 초과', method: 'POST', path: '/api/v1/admin/join-requests/bulk',
  status_code: 200, result: 'SUCCESS', ip: '211.234.10.12', created_at: '2026-10-28T10:21:03.120',
};
const detail = {
  ...row,
  before: { status: 'PENDING', club_name: '강남 골프회' },
  after: { status: 'ACTIVE', club_name: '강남 골프회' },
  meta: { bulk: true },
  user_agent: 'Mozilla/5.0',
  related: [{ ...row, id: 2, target_id: '13' }],
};
const page = { items: [row], total: 1, page: 1, size: 20 };

describe('SCR-093 감사 로그', () => {
  it('최고 관리자만 연다', async () => {
    renderApp('/audit-logs', 'SUPPORT_ADMIN');
    expect(await screen.findByText(/접근할 권한이 없습니다/)).toBeInTheDocument();
  });

  it('일시를 누르면 상세 드로어에 변경 전후와 같은 요청 묶음이 보인다', async () => {
    const user = userEvent.setup();
    renderApp('/audit-logs', 'SUPER_ADMIN', { 'GET /admin/audit-logs': page, 'GET /admin/audit-logs/1': detail, 'GET /admin/audit-logs/2': { ...detail, id: 2, related: [] } });
    const tr = (await screen.findByText('club@teeup.run')).closest('tr')!;
    expect(within(tr).getByText('거절')).toBeInTheDocument();
    expect(within(tr).getByText('가입신청 #12')).toBeInTheDocument();
    await user.click(within(tr).getByRole('button'));
    const dialog = await screen.findByRole('dialog', { name: '감사 로그 상세' });
    const changed = await within(dialog).findAllByRole('row');
    const statusRow = changed.find((r) => r.textContent?.startsWith('status'))!;
    expect(statusRow).toHaveAttribute('data-changed', 'true');
    expect(changed.find((r) => r.textContent?.startsWith('club_name'))).not.toHaveAttribute('data-changed');
    expect(within(dialog).getByText('같은 요청의 다른 기록 1건')).toBeInTheDocument();
    // 편집·삭제 UI 없음
    expect(within(dialog).queryByRole('button', { name: /삭제|수정/ })).not.toBeInTheDocument();
  });

  it('CSV 내보내기는 사유를 받아 지금 필터 그대로 요청한다', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const { calls } = renderApp('/audit-logs?action=VIEW_PII&date_from=2026-10-01', 'SUPER_ADMIN', {
      'GET /admin/audit-logs': page,
      'GET /admin/audit-logs/export': () => new Response('id\n1', { headers: { 'content-type': 'text/csv' } }),
    });
    await screen.findByText('club@teeup.run');
    await user.click(screen.getByRole('button', { name: 'CSV 내보내기' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '내보내기' }));
    expect(within(dialog).getByText('사유를 입력해주세요')).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox'), '10월 점검');
    await user.click(within(dialog).getByRole('button', { name: '내보내기' }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    const q = calls.find((c) => c.path === '/admin/audit-logs/export')!.query;
    expect(q.get('reason')).toBe('10월 점검');
    expect(q.getAll('action')).toEqual(['VIEW_PII']);
    expect(q.get('date_from')).toBe('2026-10-01');
    expect(q.get('page')).toBeNull();
  });
});

describe('SCR-094 월간 점검', () => {
  const monthly = {
    month: '2026-09',
    totals: { view_pii: 412, export: 3, login_fail: 5, changes: 230 },
    by_admin: [
      { admin_id: 2, email: 'cs@teeup.run', view_pii: 380, export: 1, changes: 40, max_daily_view_pii: 120, flagged: true },
      { admin_id: 1, email: 'owner@teeup.run', view_pii: 32, export: 2, changes: 190, max_daily_view_pii: 10, flagged: false },
    ],
    review: null,
  };

  it('100건 초과 관리자를 강조하고, 초과가 있으면 메모를 받아 점검 완료를 기록한다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/audit-logs/monthly?month=2026-09', 'SUPER_ADMIN', {
      'GET /admin/audit-logs/monthly': monthly,
      'POST /admin/audit-logs/monthly/2026-09/review': { ...monthly, review: { reviewer_admin_id: 1, memo: '확인', reviewed_at: '2026-10-28T10:00:00' } },
    });
    expect(await screen.findByText('412')).toBeInTheDocument();
    const cs = screen.getByText('cs@teeup.run').closest('tr')!;
    expect(within(cs).getByText('100건 초과')).toBeInTheDocument();
    expect(within(cs).getByText('380').closest('a')).toHaveAttribute('href', '/audit-logs?actor_id=2&action=VIEW_PII&date_from=2026-09-01&date_to=2026-09-30');
    expect(within(screen.getByText('owner@teeup.run').closest('tr')!).queryByText('100건 초과')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '점검 완료 기록' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '점검 완료' }));
    expect(within(dialog).getByText('사유를 입력해주세요')).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox'), '확인');
    await user.click(within(dialog).getByRole('button', { name: '점검 완료' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ memo: '확인' }));
  });
});
