import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const rows = [
  { membership_id: 11, club: { id: 5, display_id: null, name: '강남 골프회' }, user: { id: 7, nickname: 'golfking', name: '김민수', average_score: 92 }, created_at: '2026-10-27T21:04:00' },
  { membership_id: 12, club: { id: 6, display_id: null, name: '분당 라운드' }, user: { id: 8, nickname: 'birdie', name: '이서연', average_score: 101 }, created_at: '2026-10-26T09:00:00' },
];

afterEach(() => vi.unstubAllGlobals());

describe('SCR-020 가입신청', () => {
  it('전체 선택 → 승인 (확인 없이 1회 bulk 호출)', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/join-requests', 'CLUB_ADMIN', {
      'GET /admin/join-requests': { items: rows, total: 2, page: 1, size: 20 },
      'POST /admin/join-requests/bulk': { succeeded: [11, 12], failed: [] },
    });
    expect(await screen.findByText('golfking')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' }));
    await user.click(within(screen.getByRole('region', { name: '일괄 작업' })).getByRole('button', { name: '승인' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ ids: [11, 12], action: 'approve' }));
    expect(await screen.findByText('2건 승인 완료')).toBeInTheDocument();
  });

  it('행 거절은 확인 후 사유와 함께 처리', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/join-requests', 'CLUB_ADMIN', {
      'GET /admin/join-requests': { items: rows, total: 2, page: 1, size: 20 },
      'POST /admin/join-requests/bulk': { succeeded: [12], failed: [] },
    });
    await screen.findByText('birdie');
    const row = screen.getByText('birdie').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: '거절' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), '정원 초과');
    await user.click(within(dialog).getByRole('button', { name: '거절' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ ids: [12], action: 'reject', reason: '정원 초과' }));
  });

  it('클럽 담당은 회원 상세 권한이 없으므로 신청자 링크가 없다', async () => {
    renderApp('/join-requests', 'CLUB_ADMIN', { 'GET /admin/join-requests': { items: rows, total: 2, page: 1, size: 20 } });
    await screen.findByText('golfking');
    expect(screen.queryByRole('link', { name: /golfking/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '강남 골프회' })).toHaveAttribute('href', '/clubs/5');
  });
});

describe('SCR-020 가입신청 > 처리 이력', () => {
  const history = [
    {
      id: 900, membership_id: 12, action: 'REJECT', club: { id: 6, name: '분당 라운드' }, user: { id: 8, nickname: 'birdie', name: '이서연' },
      reason: '정원 초과', processed_by: { id: 1, email: 'owner@teeup.run' }, requested_at: '2026-10-26T09:00:00', processed_at: '2026-10-27T10:00:00',
    },
  ];

  it('대기 탭에서 처리 이력 탭으로 이동하면 거절된 신청도 보인다', async () => {
    const user = userEvent.setup();
    const { router, calls } = renderApp('/join-requests', 'CLUB_ADMIN', {
      'GET /admin/join-requests': { items: rows, total: 2, page: 1, size: 20 },
      'GET /admin/join-requests/history': { items: history, total: 1, page: 1, size: 20 },
    });
    await screen.findByText('golfking');
    await user.click(screen.getByRole('link', { name: '처리 이력' }));
    expect(router.state.location.pathname).toBe('/join-requests/history');
    const row = (await screen.findByText('birdie')).closest('tr')!;
    expect(within(row).getByText('거절')).toBeInTheDocument();
    expect(within(row).getByText('정원 초과')).toBeInTheDocument();
    expect(within(row).getByText('owner@teeup.run')).toBeInTheDocument();
    expect(within(row).getByText('분당 라운드')).toBeInTheDocument();
    // 처리 이력에는 선택·일괄 처리가 없다
    expect(screen.queryByRole('checkbox', { name: '현재 페이지 전체 선택' })).not.toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/join-requests/history')?.query.get('sort')).toBe('-processed_at');
  });
});
