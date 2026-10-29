import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatDate } from '@/lib/format';
import { renderApp } from '@/test/renderApp';
import { passwordStrength, toBody, toValues } from './userForm';

const detail = {
  id: 7,
  email: 'golfking@gmail.com',
  realname: '김민수',
  nickname: 'golfking',
  phone_number: '01012345678',
  birthdate: '1990-05-01',
  gender: 'MALE',
  provider: 'GOOGLE',
  status: 'ACTIVE',
  average_score: 92,
  average_score_init: 95,
  handicap: 20,
  handicap_init: 23,
  handicap_update_method: 'AUTO',
  handicap_calculation_count: 5,
  club_count: 2,
  created_at: '2026-03-02T10:00:00',
  updated_at: null,
  last_login_at: '2026-10-26T21:04:00',
  last_login_device: 'ios',
  terms_agreement: true,
  privacy_policy: true,
  privacy_collection: true,
  marketing_consent: false,
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-032 회원 상세', () => {
  it('헤더에 상태·최근 로그인 기기, 탭에 클럽 수', async () => {
    renderApp('/users/7', 'USER_ADMIN', { 'GET /admin/users/7': detail });
    expect(await screen.findByRole('heading', { name: /golfking/ })).toBeInTheDocument();
    expect(screen.getByText(/최근 로그인 2026-10-26 21:04 iOS/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /클럽\s*2/ })).toBeInTheDocument();
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /수정/ })).toHaveAttribute('href', '/users/7/edit');
  });

  it('조회 전용 역할은 수정·삭제가 없다', async () => {
    renderApp('/users/7', 'SUPPORT_ADMIN', { 'GET /admin/users/7': detail });
    await screen.findByRole('heading', { name: /golfking/ });
    expect(screen.queryByRole('link', { name: /수정/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '회원 삭제' })).not.toBeInTheDocument();
  });

  it('삭제는 사유를 받아 보낸다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/users/7', 'USER_ADMIN', { 'GET /admin/users/7': detail, 'DELETE /admin/users/7': { message: 'ok' }, 'GET /admin/users': { data: [], total: 0 } });
    await screen.findByRole('heading', { name: /golfking/ });
    await user.click(screen.getByRole('button', { name: '회원 삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), '본인 탈퇴 요청');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/users'));
    expect(calls.find((c) => c.method === 'DELETE')!.query.get('reason')).toBe('본인 탈퇴 요청');
  });

  it('활동 탭: 기본 최근 30일, 날짜별로 묶고 더 보기는 커서로', async () => {
    const user = userEvent.setup();
    const item = (id: number, at: string, type: string, summary: string) => ({ id, event_type: type, summary, target_type: null, target_id: null, meta: { device: 'android' }, ip_masked: '211.***.***.12', created_at: at });
    const { calls } = renderApp('/users/7/activity', 'SUPPORT_ADMIN', {
      'GET /admin/users/7': detail,
      'GET /admin/users/7/activities': (c: { query: URLSearchParams }) =>
        c.query.get('cursor')
          ? { items: [item(1, '2026-10-20T09:10:00', 'CLUB_JOIN_REQUEST', '강남 골프회 가입신청')], next_cursor: null }
          : { items: [item(3, '2026-10-26T21:04:00', 'LOGIN', '로그인'), item(2, '2026-10-26T20:58:00', 'MEETING_CANCEL', '토요 라운딩 참가 취소')], next_cursor: 'c1' },
    });
    expect(await screen.findByText('토요 라운딩 참가 취소')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2026-10-26' })).toBeInTheDocument();
    expect(screen.getAllByText('Android · 211.***.***.12')).toHaveLength(2);
    const first = calls.find((c) => c.path === '/admin/users/7/activities')!;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    expect(first.query.get('from')).toBe(formatDate(d));

    await user.click(screen.getByRole('button', { name: '더 보기' }));
    expect(await screen.findByText('강남 골프회 가입신청')).toBeInTheDocument();
    expect(calls.filter((c) => c.path === '/admin/users/7/activities').pop()!.query.get('cursor')).toBe('c1');
    expect(screen.getByText(/1년이 지난 활동은 보관하지 않습니다/)).toBeInTheDocument();
  });

  it('모임 탭: 라운딩·소셜 탭 전환', async () => {
    const user = userEvent.setup();
    const m = (id: number, name: string) => ({ meeting_id: id, meeting_name: name, club_name: '강남 골프회', meeting_time: '2026-10-25T07:00:00', status: 'COMPLETED', joined_at: null, has_score: true, gross_score: 90, net_score: 70 });
    renderApp('/users/7/meetings', 'USER_ADMIN', {
      'GET /admin/users/7': detail,
      'GET /admin/users/7/meetings': { rounding_meetings: [m(1, '토요 라운딩')], social_meetings: [m(2, '송년회')], total_rounding: 1, total_social: 1 },
    });
    expect(await screen.findByText('토요 라운딩')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /소셜/ }));
    expect(await screen.findByText('송년회')).toBeInTheDocument();
    expect(screen.queryByText('토요 라운딩')).not.toBeInTheDocument();
  });
});

describe('SCR-031 회원 등록·수정', () => {
  it('등록: 평균스코어로 핸디캡을 채우고, 서버 중복 에러는 해당 칸에', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/users/new', 'USER_ADMIN', {
      'POST /admin/users': () => Response.json({ detail: [{ field: 'nickname', message: '이미 사용 중인 닉네임입니다' }] }, { status: 409 }),
    });
    await user.type(await screen.findByLabelText(/이메일/), 'new@teeup.run');
    await user.type(screen.getByLabelText(/비밀번호/), 'golf123!');
    await user.type(screen.getByLabelText(/실명/), '김골프');
    await user.type(screen.getByLabelText(/닉네임/), 'golfking');
    await user.type(screen.getByLabelText('평균스코어'), '92');
    expect(screen.getByLabelText('핸디캡')).toHaveValue('20');
    await user.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('이미 사용 중인 닉네임입니다')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      email: 'new@teeup.run',
      password: 'golf123!',
      realname: '김골프',
      nickname: 'golfking',
      phone_number: null,
      birthdate: null,
      gender: null,
      average_score_init: 92,
      handicap_init: 20,
    });
  });

  it('등록: 비밀번호 규칙을 화면에서 먼저 막는다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/users/new', 'USER_ADMIN');
    await user.type(await screen.findByLabelText(/비밀번호/), 'short');
    await user.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('8자 이상, 영문·숫자·특수문자를 모두 포함해주세요')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('수정: 바꾼 항목과 사유만 보낸다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/users/7/edit', 'USER_ADMIN', { 'GET /admin/users/7': detail, 'PUT /admin/users/7': { ...detail, nickname: 'golfqueen' } });
    const nick = await screen.findByLabelText(/닉네임/);
    expect(screen.queryByLabelText(/비밀번호/)).not.toBeInTheDocument();
    await user.clear(nick);
    await user.type(nick, 'golfqueen');
    await user.type(screen.getByLabelText('변경 사유'), '본인 요청');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/users/7'));
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ nickname: 'golfqueen', reason: '본인 요청' });
  });

  it('조회 전용 역할은 수정 화면에 들어올 수 없다', async () => {
    renderApp('/users/7/edit', 'SUPPORT_ADMIN', { 'GET /admin/users/7': detail });
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});

describe('회원 폼 변환', () => {
  it('비밀번호 강도', () => {
    expect(passwordStrength('abc').label).toBe('약함');
    expect(passwordStrength('golf123!').label).toBe('보통');
    expect(passwordStrength('golf123!longer').label).toBe('강함');
  });

  it('빈 칸은 null, 상태·사유는 등록 본문에 넣지 않는다', () => {
    const body = toBody({ ...toValues(), email: 'a@b.co', realname: '김골프', nickname: 'n', password: 'x' });
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('reason');
    expect(body.phone_number).toBeNull();
  });
});
