import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const row = (id: number, extra: object = {}) => ({
  id,
  status: 'PENDING',
  reason: 'ABUSE',
  description: '단톡방에서 욕설',
  admin_note: null,
  reporter: { id: 10, nickname: '신고자', realname: '김신고' },
  target: { type: 'USER', id: 182, name: '악플러', link: '/users/182', status: 'ACTIVE', club_id: null, exists: true },
  same_target_count: 3,
  created_at: '2026-10-28T22:05:00',
  updated_at: null,
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe('SCR-023 신고 목록', () => {
  it('기본은 대기 탭(대시보드 숫자와 같은 기준), 누적 3건 이상은 강조', async () => {
    const { calls } = renderApp('/reports', 'SUPPORT_ADMIN', { 'GET /admin/reports': { items: [row(1)], total: 1, page: 1, size: 20 } });
    expect(await screen.findByText('악플러')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/reports')!.query.getAll('status')).toEqual(['PENDING']);
    expect(screen.getByRole('tab', { name: '대기' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('cell', { name: '3' }).firstChild).toHaveClass('text-red-700');
  });

  it('전체 탭은 상태 조건 없이, 지워진 대상은 삭제됨 표시', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/reports', 'SUPPORT_ADMIN', {
      'GET /admin/reports': {
        items: [row(2, { target: { type: 'CLUB', id: 999, name: null, link: null, status: null, club_id: null, exists: false } })],
        total: 1,
      },
    });
    expect(await screen.findByText('삭제됨 #999')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '전체' }));
    await waitFor(() =>
      expect(
        calls
          .filter((c) => c.path === '/admin/reports')
          .pop()!
          .query.has('status'),
      ).toBe(false),
    );
  });

  it('일괄 기각은 메모를 받아 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/reports', 'SUPPORT_ADMIN', {
      'GET /admin/reports': { items: [row(1), row(2)], total: 2 },
      'POST /admin/reports/bulk': { succeeded: [1, 2], failed: [] },
    });
    await screen.findAllByText('악플러');
    await user.click(screen.getByRole('checkbox', { name: /전체 선택/ }));
    await user.click(screen.getByRole('button', { name: '기각' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), '근거 없음');
    await user.click(within(dialog).getByRole('button', { name: '기각' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({ ids: [1, 2], status: 'DISMISSED', reason: '근거 없음' }));
  });

  it('신고 권한이 없으면 403', async () => {
    renderApp('/reports', 'CLUB_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});

describe('SCR-024 신고 상세', () => {
  const detail = { ...row(1), same_target: [row(2, { description: '모임에서 폭언', status: 'RESOLVED' })] };

  it('대상 화면 링크와 같은 대상 신고를 보여 준다', async () => {
    renderApp('/reports/1', 'SUPPORT_ADMIN', { 'GET /admin/reports/1': detail });
    expect(await screen.findByRole('link', { name: /대상 화면에서 조치/ })).toHaveAttribute('href', '/users/182');
    expect(screen.getByText('같은 대상의 다른 신고 1건')).toBeInTheDocument();
    expect(screen.getByText('모임에서 폭언')).toBeInTheDocument();
    expect(screen.getByText('같은 대상 누적 3건')).toBeInTheDocument();
  });

  it('해결은 메모 없이 저장할 수 없고, 메모를 넣으면 상태와 함께 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/reports/1', 'SUPPORT_ADMIN', { 'GET /admin/reports/1': detail, 'PUT /admin/reports/1': row(1, { status: 'RESOLVED' }) });
    await user.selectOptions(await screen.findByLabelText('상태'), 'RESOLVED');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('해결·기각은 메모를 남겨야 합니다')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    await user.type(screen.getByLabelText(/처리 메모/), '회원 비활성화');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ status: 'RESOLVED', admin_note: '회원 비활성화' }));
  });
});

describe('SCR-025 차단', () => {
  it('해제는 사유를 받아 쿼리로 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/reports/blocks', 'SUPPORT_ADMIN', {
      'GET /admin/blocks': {
        items: [{ id: 5, blocker: { id: 10, nickname: '신고자', realname: null }, blocked: { id: 182, nickname: '악플러', realname: null }, created_at: null }],
        total: 1,
      },
      'DELETE /admin/blocks/5': {},
    });
    await user.click(await screen.findByRole('button', { name: '해제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), '해제 요청');
    await user.click(within(dialog).getByRole('button', { name: '해제' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')?.query.get('reason')).toBe('해제 요청'));
    expect(screen.getByRole('link', { name: '차단' })).toHaveAttribute('aria-current', 'page');
  });
});
