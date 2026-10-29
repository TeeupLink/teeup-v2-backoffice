import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const row = {
  id: 3,
  display_id: 'C-0003',
  name: '강남 골프회',
  description: null,
  type: 'REGULAR',
  member_count: 12,
  pending_count: 2,
  sido_code: '11',
  gungu_codes: [],
  leader_id: 7,
  leader_nickname: 'leader',
  leader_name: '김리더',
  status: 'ACTIVE',
  deleted_at: null,
  created_at: '2026-03-02T10:00:00',
};
const detail = {
  id: 3,
  display_id: 'C-0003',
  name: '강남 골프회',
  sido_code: '11',
  gungu_codes: ['11680'],
  type: 'REGULAR',
  description: '주말 라운딩 모임',
  status: 'ACTIVE',
  representative_name: '김리더',
  representative_id: 7,
  location: null,
  contact_info: '010-0000-0000',
  additional_info: null,
  profile_image: null,
  member_count: 20,
  current_member_count: 3,
  leader: { id: 7, nickname: 'leader', realname: '김리더' },
  pending_count: 2,
  round_count: 5,
  social_count: 1,
  last_meeting_at: '2026-10-25T07:00:00',
  deleted_at: null,
  created_at: '2026-03-02T10:00:00',
};
const m = (id: number, nick: string, role: string, status = 'APPROVED') => ({
  id,
  user_id: id * 10,
  role,
  status,
  created_at: '2026-03-02T10:00:00',
  user_nickname: nick,
  user_email: `${nick}@t.run`,
  user_realname: '실명',
  user_phone_number: '01012345678',
  user_average_score: 90,
});
const members = { members: [m(2, 'kim', 'MEMBER'), m(1, 'leader', 'LEADER'), m(3, 'lee', 'MANAGER')], total_members: 3 };
const base = {
  'GET /admin/clubs/3': detail,
  'GET /sido-list': [{ code: '11', name: '서울' }],
  'GET /gungu-list': [{ code: '11680', name: '강남구' }],
  'GET /admin/clubs/3/members': members,
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-040 클럽 목록', () => {
  it('삭제 클럽은 빼고 조회하고, 대기 수는 가입신청 탭으로 연결', async () => {
    const { calls } = renderApp('/clubs', 'CLUB_ADMIN', { 'GET /admin/clubs': { data: [row], total: 1, page: 1, limit: 20 }, 'GET /sido-list': [{ code: '11', name: '서울' }] });
    expect(await screen.findByText('강남 골프회')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/clubs')!.query.get('include_deleted')).toBe('false');
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('href', '/clubs/3/join-requests');
    expect(await screen.findByRole('cell', { name: '서울' })).toBeInTheDocument();
  });
});

describe('SCR-042 클럽 상세', () => {
  it('개요: 통계와 지역 이름', async () => {
    renderApp('/clubs/3', 'CLUB_ADMIN', base);
    expect(await screen.findByText('5 · 1')).toBeInTheDocument();
    expect(await screen.findByText('서울 · 강남구')).toBeInTheDocument();
  });

  it('멤버: 리더가 맨 위, 리더 행에는 작업이 없다', async () => {
    renderApp('/clubs/3/members', 'CLUB_ADMIN', base);
    await screen.findByText('kim');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('leader');
    expect(within(rows[0]!).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[0]!).getByText('리더')).toBeInTheDocument();
  });

  it('멤버: 역할 변경, 리더 지정은 리더 교체 API, 내보내기는 사유 필수', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/clubs/3/members', 'CLUB_ADMIN', {
      ...base,
      'PUT /admin/clubs/3/members/20/role': {},
      'POST /admin/clubs/3/leader': {},
      'DELETE /admin/clubs/3/members/30': {},
    });
    await user.selectOptions(await screen.findByLabelText('kim 역할'), 'MANAGER');
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ new_role: 'MANAGER' }));

    const kimRow = screen.getByText('kim').closest('tr')!;
    await user.click(within(kimRow).getByRole('button', { name: '리더로' }));
    let dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('지금 리더(leader)는 매니저가 됩니다');
    await user.click(within(dialog).getByRole('button', { name: '리더로 지정' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ new_leader_id: 20 }));

    await user.click(screen.getByRole('button', { name: 'lee 내보내기' }));
    dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '내보내기' }));
    expect(within(dialog).getByText('사유를 입력해주세요')).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox'), '비매너');
    await user.click(within(dialog).getByRole('button', { name: '내보내기' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')?.query.get('reason')).toBe('비매너'));
  });

  it('조회 전용(MEETING_ADMIN)은 작업 버튼이 없다', async () => {
    renderApp('/clubs/3/members', 'MEETING_ADMIN', base);
    await screen.findByText('kim');
    expect(screen.queryByLabelText('kim 역할')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '클럽 삭제' })).not.toBeInTheDocument();
  });

  it('비활성화는 사유를 받아 상태와 함께 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/clubs/3', 'CLUB_ADMIN', { ...base, 'PUT /admin/clubs/3': {} });
    await user.click(await screen.findByRole('button', { name: '비활성화' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), '운영 중단');
    await user.click(within(dialog).getByRole('button', { name: '비활성화' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ status: 'INACTIVE', reason: '운영 중단' }));
  });

  it('가입신청·모임 탭은 이 클럽으로 고정해 조회한다', async () => {
    const { calls } = renderApp('/clubs/3/join-requests', 'CLUB_ADMIN', { ...base, 'GET /admin/join-requests': { items: [], total: 0, page: 1, size: 20 } });
    expect(await screen.findByText('처리할 가입신청이 없습니다')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/join-requests')!.query.get('club_id')).toBe('3');
    expect(screen.queryByText('클럽 전체')).not.toBeInTheDocument();
  });

  it('모임 탭: 클럽 열 없이 이 클럽 라운딩만', async () => {
    const { calls } = renderApp('/clubs/3/meetings', 'CLUB_ADMIN', {
      ...base,
      'GET /admin/meetings/rounding': { data: [{ id: '5', name: '토요 라운딩', meeting_subtype: '', course_name: '', location: '', meeting_time: null, max_participants: 8, status: 'SCHEDULED', club_id: '3', club_name: '강남 골프회', participant_count: 1, creator: null }], total: 1 },
    });
    expect(await screen.findByText('토요 라운딩')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/meetings/rounding')!.query.get('club_id')).toBe('3');
    expect(screen.queryByRole('columnheader', { name: '클럽' })).not.toBeInTheDocument();
  });
});
