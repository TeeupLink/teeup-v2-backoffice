import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const me = {
  id: 1,
  email: 'cs@teeup.kr',
  name: '고객지원',
  phone_number: null,
  status: 'ACTIVE',
  role: 'SUPPORT_ADMIN',
  last_login_at: null,
  created_at: null,
  updated_at: null,
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-093 내 프로필', () => {
  it('실제 역할을 보여 주고, 이름만 바꿔 저장한다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/profile', 'SUPPORT_ADMIN', { 'GET /admin/profile': me, 'PUT /admin/profile': me });
    const account = (await screen.findByText('계정')).closest('section')!;
    expect(within(account).getByText('고객지원')).toBeInTheDocument();
    const name = screen.getByLabelText(/^이름/);
    await user.clear(name);
    await user.type(name, '김상담');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/admin/profile' && c.method === 'PUT')?.body).toEqual({ name: '김상담', phone_number: null }));
  });

  it('비밀번호: 확인 불일치는 화면에서, 현재 비밀번호 오류는 서버 칸별 오류로', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/profile', 'SUPPORT_ADMIN', {
      'GET /admin/profile': me,
      'PUT /admin/password': () => Response.json({ detail: [{ field: 'current_password', message: '현재 비밀번호가 올바르지 않습니다' }] }, { status: 400 }),
    });
    await user.type(await screen.findByLabelText(/현재 비밀번호/), 'wrong');
    await user.type(screen.getAllByLabelText(/새 비밀번호/)[0]!, 'Golf#2026x');
    await user.type(screen.getByLabelText(/새 비밀번호 확인/), 'Golf#2026y');
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    expect(await screen.findByText('새 비밀번호와 확인이 일치하지 않습니다')).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/admin/password')).toBe(false);

    await user.clear(screen.getByLabelText(/새 비밀번호 확인/));
    await user.type(screen.getByLabelText(/새 비밀번호 확인/), 'Golf#2026x');
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    expect(await screen.findByText('현재 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
  });
});
