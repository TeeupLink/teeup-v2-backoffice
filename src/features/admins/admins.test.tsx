import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const acct = (id: number, extra: object = {}) => ({
  id,
  email: `a${id}@teeup.kr`,
  name: `관리자${id}`,
  phone_number: null,
  status: 'ACTIVE',
  role: 'CONTENT_ADMIN',
  last_login_at: '2026-10-28T09:00:00',
  created_at: '2026-03-01T10:00:00',
  updated_at: null,
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe('SCR-090 관리자 목록', () => {
  it('최고 관리자만 열고, 역할 필터·상태 탭을 그대로 보낸다', async () => {
    const { calls } = renderApp('/admins?role=SUPPORT_ADMIN&status_filter=ACTIVE', 'SUPER_ADMIN', {
      'GET /admin/admins': { data: [acct(3, { role: 'SUPPORT_ADMIN' })], total: 1 },
    });
    expect(await screen.findByText('관리자3')).toBeInTheDocument();
    const q = calls.find((c) => c.path === '/admin/admins')!.query;
    expect(q.get('role')).toBe('SUPPORT_ADMIN');
    expect(q.get('status_filter')).toBe('ACTIVE');
    expect(screen.getByRole('cell', { name: '고객지원' })).toBeInTheDocument();
  });

  it('다른 역할은 403', async () => {
    renderApp('/admins', 'CONTENT_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});

describe('SCR-091 관리자 상세', () => {
  it('역할 권한 표를 보여 주고, 비활성화는 확인 후 상태만 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/admins/3', 'SUPER_ADMIN', { 'GET /admin/admins/3': acct(3, { role: 'SUPPORT_ADMIN' }), 'PUT /admin/admins/3': {} });
    const perms = await screen.findByText('역할 권한');
    const card = perms.closest('section')!;
    expect(within(card).getByText('1:1 문의').parentElement).toHaveTextContent('관리');
    expect(within(card).getByText('회원').parentElement).toHaveTextContent('조회');
    expect(within(card).getByText('클럽').parentElement).toHaveTextContent('없음');

    await user.click(screen.getByRole('button', { name: '비활성화' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '비활성화' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ status: 'DEACTIVATED' }));
  });

  it('내 계정은 비활성화·삭제 버튼이 없다', async () => {
    // renderApp 의 로그인 관리자는 id 1
    renderApp('/admins/1', 'SUPER_ADMIN', { 'GET /admin/admins/1': acct(1, { role: 'SUPER_ADMIN' }) });
    expect(await screen.findByRole('button', { name: /비밀번호 재설정/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '비활성화' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '관리자 삭제' })).not.toBeInTheDocument();
  });

  it('비밀번호 재설정은 규칙을 화면에서 먼저 막는다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/admins/3', 'SUPER_ADMIN', { 'GET /admin/admins/3': acct(3), 'PUT /admin/admins/3/password': {} });
    await user.click(await screen.findByRole('button', { name: /비밀번호 재설정/ }));
    const dialog = await screen.findByRole('dialog');
    const [pw, confirmPw] = within(dialog).getAllByLabelText(/새 비밀번호/);
    await user.type(pw!, 'abcdefgh');
    await user.click(within(dialog).getByRole('button', { name: '재설정' }));
    expect(await within(dialog).findByText('8자 이상, 영문·숫자·특수문자를 모두 넣어주세요')).toBeInTheDocument();
    await user.clear(pw!);
    await user.type(pw!, 'Golf#2026x');
    await user.type(confirmPw!, 'Golf#2026x');
    await user.click(within(dialog).getByRole('button', { name: '재설정' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ new_password: 'Golf#2026x' }));
  });
});

describe('SCR-092 관리자 등록·수정', () => {
  it('역할을 고르지 않으면 막고, 고르면 설명을 보여 준다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/admins/new', 'SUPER_ADMIN', { 'POST /admin/admins': acct(9), 'GET /admin/admins/9': acct(9) });
    await user.type(await screen.findByLabelText(/이메일/), 'new@teeup.kr');
    await user.type(screen.getByLabelText(/^이름/), '신규');
    await user.type(screen.getByLabelText(/비밀번호/), 'Golf#2026x');
    await user.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('역할을 선택해주세요')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/역할/), 'CONTENT_ADMIN');
    expect(screen.getByText('공지·FAQ·약관을 관리합니다.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admins/9'));
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      email: 'new@teeup.kr',
      name: '신규',
      phone_number: null,
      role: 'CONTENT_ADMIN',
      password: 'Golf#2026x',
    });
  });

  it('서버 칸별 오류(이메일 중복)를 그 칸에 보여 준다', async () => {
    const user = userEvent.setup();
    renderApp('/admins/new', 'SUPER_ADMIN', {
      'POST /admin/admins': () => Response.json({ detail: [{ field: 'email', message: '이미 등록된 이메일입니다' }] }, { status: 409 }),
    });
    await user.type(await screen.findByLabelText(/이메일/), 'dup@teeup.kr');
    await user.type(screen.getByLabelText(/^이름/), '중복');
    await user.type(screen.getByLabelText(/비밀번호/), 'Golf#2026x');
    await user.selectOptions(screen.getByLabelText(/역할/), 'CLUB_ADMIN');
    await user.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('이미 등록된 이메일입니다')).toBeInTheDocument();
  });

  it('수정: 내 계정은 역할을 바꿀 수 없고, 바뀐 항목만 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/admins/1/edit', 'SUPER_ADMIN', { 'GET /admin/admins/1': acct(1, { role: 'SUPER_ADMIN' }), 'PUT /admin/admins/1': {} });
    expect(await screen.findByLabelText(/역할/)).toBeDisabled();
    expect(screen.getByLabelText(/이메일/)).toBeDisabled();
    await user.type(screen.getByLabelText(/전화번호/), '010-1234-5678');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ phone_number: '010-1234-5678' }));
  });
});
