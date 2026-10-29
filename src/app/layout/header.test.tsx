import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { maskMode } from '@/lib/pii';
import { renderApp } from '@/test/renderApp';

const dash = { 'GET /admin/dashboard/todo': {}, 'GET /admin/dashboard/stats': {} };

afterEach(() => {
  vi.unstubAllGlobals();
  maskMode.set(false);
});

describe('헤더 알림 벨 (F-016)', () => {
  it('안 읽은 수를 보여 주고, 알림을 누르면 읽음 처리 후 링크로 간다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/dashboard', 'SUPPORT_ADMIN', {
      ...dash,
      'GET /admin/notifications/unread-count': { count: 2 },
      'GET /admin/notifications': [
        {
          id: 7,
          type: 'INQUIRY',
          title: '새 문의가 등록되었습니다',
          content: 'golfking님 · 로그인 안 됨',
          link: '/inquiries/12',
          status: 'UNREAD',
          created_at: '2026-10-28T10:00:00',
        },
        { id: 6, type: 'REPORT', title: '새 신고 · 회원', content: null, link: '/reports/3', status: 'READ', created_at: '2026-10-27T10:00:00' },
      ],
      'PUT /admin/notifications/7/read': {},
      'GET /admin/inquiries/12': {
        inquiry: { id: 12, title: 'x', content: 'x', type: 'ACCOUNT', status: 'PENDING', user_id: 1, user_nickname: 'g', created_at: null, updated_at: null },
        responses: [],
      },
    });
    await user.click(await screen.findByRole('button', { name: '알림 2개 안 읽음' }));
    await user.click(await screen.findByRole('button', { name: /로그인 안 됨/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/inquiries/12'));
    expect(calls.some((c) => c.method === 'PUT' && c.path === '/admin/notifications/7/read')).toBe(true);
  });

  it('알림이 없으면 빈 안내', async () => {
    const user = userEvent.setup();
    renderApp('/dashboard', 'SUPPORT_ADMIN', { ...dash, 'GET /admin/notifications/unread-count': { count: 0 }, 'GET /admin/notifications': [] });
    await user.click(await screen.findByRole('button', { name: '알림' }));
    expect(await screen.findByText('새 알림이 없습니다')).toBeInTheDocument();
  });
});

describe('헤더 통합 검색 (F-015)', () => {
  it('두 글자부터 찾고, 회원 실명·이메일은 마스킹 모드를 따르며, Enter 로 첫 결과로 간다', async () => {
    maskMode.set(true);
    const user = userEvent.setup();
    const { calls, router } = renderApp('/dashboard', 'SUPER_ADMIN', {
      ...dash,
      'GET /admin/search': {
        users: [{ id: 7, nickname: 'golfking', realname: '김민수', email: 'golfking@gmail.com', link: '/users/7' }],
        clubs: [{ id: 3, name: '강남 골프회', link: '/clubs/3' }],
        meetings: [],
        admins: [],
      },
      'GET /admin/users/7': {},
    });
    const box = await screen.findByRole('combobox', { name: '통합 검색' });
    await user.type(box, '강');
    expect(calls.some((c) => c.path === '/admin/search')).toBe(false);
    await user.type(box, '남');
    expect(await screen.findByRole('option', { name: /golfking/ })).toHaveTextContent('김*수');
    expect(screen.queryByText('김민수')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/users/7'));
  });
});

describe('헤더 마스킹 토글 (F-131)', () => {
  it('켜면 "마스킹 중"으로 바뀌고 브라우저에 기억한다', async () => {
    const user = userEvent.setup();
    renderApp('/dashboard', 'SUPPORT_ADMIN', dash);
    const btn = await screen.findByRole('button', { name: '마스킹' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await user.click(btn);
    expect(screen.getByRole('button', { name: '마스킹 중' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('teeup_admin_mask')).toBe('1');
    expect(maskMode.get()).toBe(true);
  });
});
