import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/router';
import { maskMode } from '@/lib/pii';
import { tokenStore } from '@/lib/auth/token';

const user = { id: 7, email: 'golfking@gmail.com', realname: '김민수', nickname: 'golfking', phone_number: '01012345678', average_score: 92, club_count: 2, status: 'ACTIVE', created_at: '2026-03-02T10:00:00' };

function renderUsers(role: string) {
  tokenStore.set('jwt');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/admin/me')) return Response.json({ id: 1, email: 'a@t', name: '운영', role, status: 'ACTIVE' });
      if (url.startsWith('/api/v1/admin/users')) return Response.json({ data: [user], total: 1, page: 1, limit: 20 });
      return Response.json({});
    }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/users'] })} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  maskMode.set(false);
});

describe('SCR-030 회원 목록', () => {
  it('USER_ADMIN: 등록 버튼·선택 체크박스가 있다', async () => {
    renderUsers('USER_ADMIN');
    expect(await screen.findByText('golfking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /회원 등록/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' })).toBeInTheDocument();
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
  });

  it('SUPPORT_ADMIN(조회 전용): 등록·일괄 작업 없음', async () => {
    renderUsers('SUPPORT_ADMIN');
    expect(await screen.findByText('golfking')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /회원 등록/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('마스킹 모드면 개인정보를 가린다', async () => {
    maskMode.set(true);
    renderUsers('USER_ADMIN');
    expect(await screen.findByText('김*수')).toBeInTheDocument();
    expect(screen.getByText('go***@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('010-****-5678')).toBeInTheDocument();
  });
});
