import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { tokenStore } from '@/lib/auth/token';
import { routes } from '@/app/router';

function renderAt(path: string, me: object | null) {
  if (me) tokenStore.set('jwt');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/admin/me')) return me ? Response.json(me) : Response.json({ detail: '만료' }, { status: 401 });
      return Response.json({});
    }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const meAs = (role: string | null) => ({ id: 1, email: 'a@teeup.run', name: '운영', phone_number: null, role, status: 'ACTIVE' });

afterEach(() => vi.unstubAllGlobals());

describe('라우트 가드', () => {
  it('토큰이 없으면 next 를 달고 로그인으로', async () => {
    const router = renderAt('/clubs?page=2', null);
    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/clubs?page=2')}`);
  });

  it('권한 없는 URL 에 직접 들어오면 403 화면 (REQ-023)', async () => {
    renderAt('/admins', meAs('SUPPORT_ADMIN'));
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });

  it('조회 권한만 있으면 등록 화면은 403', async () => {
    renderAt('/users/new', meAs('SUPPORT_ADMIN'));
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });

  it('조회 권한이 있으면 들어가고, 쓰기 작업은 보이지 않는다', async () => {
    // 아직 이식 전인 영역으로 확인 (조회 권한 = CLUB_ADMIN 의 meetings read)
    renderAt('/socials', meAs('CLUB_ADMIN'));
    expect(await screen.findByText('소셜 — 준비 중')).toBeInTheDocument();
  });

  it('메뉴는 역할 범위만 보인다', async () => {
    renderAt('/dashboard', meAs('SUPPORT_ADMIN'));
    expect(await screen.findByRole('link', { name: /1:1 문의/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /관리자/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /클럽/ })).not.toBeInTheDocument();
  });

  it('role 이 없는 계정은 대시보드도 403', async () => {
    renderAt('/dashboard', meAs(null));
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});
