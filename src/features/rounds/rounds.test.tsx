import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { roundStats, scoreError, type Board } from './detail/board';

const row = {
  id: '5',
  name: '토요 라운딩',
  meeting_subtype: 'REGULAR',
  course_name: '남서울CC',
  location: '',
  meeting_time: '2026-10-31T07:00:00',
  max_participants: 8,
  status: 'SCHEDULED',
  club_id: '3',
  club_name: '강남 골프회',
  participant_count: 5,
  confirmed_count: 4,
  creator: { id: 1, realname: '김리더', nickname: 'leader' },
};
const detail = {
  id: 5,
  name: '토요 라운딩',
  description: null,
  meeting_type: 'ROUND',
  meeting_subtype: 'REGULAR',
  location: null,
  course_name: '남서울CC',
  tee_times: ['07:00', '07:08'],
  meeting_time: '2026-10-31T07:00:00',
  application_deadline: null,
  reservation_name: null,
  hole_count: 18,
  team_size: 2,
  team_formation_mode: 'GENDER_MIXED_RANDOM',
  green_fee: 150000,
  caddy_fee: null,
  cart_fee: null,
  total_cost: null,
  settlement_method: 'EQUAL_SPLIT',
  is_private: false,
  max_participants: 8,
  status: 'SCHEDULED',
  club_id: 3,
  club_name: '강남 골프회',
  participant_count: 4,
  created_at: null,
};
const p = (id: number, nick: string, extra: object = {}) => ({
  id,
  user_id: id * 10,
  guest_id: null,
  user_name: `실명${id}`,
  user_nickname: nick,
  status: 'CONFIRMED',
  role: 'PARTICIPANT',
  is_guest: false,
  created_at: null,
  ...extra,
});
const participants = [
  p(1, 'kim'),
  p(2, 'lee'),
  p(3, 'park'),
  p(4, '손님', {
    user_id: null,
    guest_id: 9,
    is_guest: true,
    user_name: '손님',
  }),
];
const member = (pid: number, nick: string) => ({
  participant_id: pid,
  user_id: pid * 10,
  guest_id: null,
  user_name: nick,
  user_nickname: nick,
  is_guest: false,
  gender: null,
  handicap: 20,
});
const teams = [
  {
    id: 11,
    name: '1조',
    meeting_id: 5,
    formation_mode: null,
    members: [member(1, 'kim'), member(2, 'lee')],
  },
  { id: 12, name: '2조', meeting_id: 5, formation_mode: null, members: [] },
];
const scores = {
  scores: [
    { participant_id: 1, user_id: 10, score: 92 },
    { participant_id: 2, user_id: 20, score: null },
    { participant_id: 3, user_id: 30, score: null },
    { participant_id: 4, user_id: null, score: null },
  ],
};
const handlers = {
  'GET /admin/meetings/5': detail,
  'GET /admin/meetings/5/participants': participants,
  'GET /admin/meetings/5/teams': teams,
  'GET /admin/meetings/5/scores': scores,
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-050 라운딩 목록', () => {
  it('대시보드 링크(?date=today)를 그대로 보내고, 기본 정렬은 모임일 최신순', async () => {
    const { calls } = renderApp('/rounds?date=today', 'MEETING_ADMIN', {
      'GET /admin/meetings/rounding': {
        data: [row],
        total: 1,
        page: 1,
        limit: 20,
      },
    });
    expect(await screen.findByText('토요 라운딩')).toBeInTheDocument();
    const q = calls.find((c) => c.path === '/admin/meetings/rounding')!.query;
    expect(q.get('date')).toBe('today');
    expect(q.get('sort')).toBe('-meeting_time');
    expect(screen.getByText('모임일: 오늘')).toBeInTheDocument();
    expect(screen.getByText('/8')).toBeInTheDocument();
  });
});

describe('SCR-052 라운딩 상세', () => {
  it('개요: 취소로 바꾸면 확인 후 상태만 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5', 'MEETING_ADMIN', {
      ...handlers,
      'PUT /admin/meetings/5': {},
    });
    await user.selectOptions(await screen.findByLabelText('상태 변경'), 'CANCELED');
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '라운딩 취소' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
        status: 'CANCELED',
      }),
    );
  });

  it('점수: 바꾼 행만 일괄 저장, 실패 건은 이름과 사유로 보여 준다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5/scores', 'MEETING_ADMIN', {
      ...handlers,
      'PUT /admin/meetings/5/scores/bulk': {
        succeeded: [2],
        failed: [{ id: 3, message: '참가자를 찾을 수 없습니다.' }],
      },
    });
    const kim = await screen.findByLabelText('kim 총타');
    expect(kim).toHaveValue('92');
    expect(screen.getByText('입력 불가')).toBeInTheDocument();
    await user.type(screen.getByLabelText('lee 총타'), '88');
    await user.type(screen.getByLabelText('park 총타'), '300');
    expect(screen.getByRole('button', { name: '변경 2건 저장' })).toBeDisabled();
    await user.clear(screen.getByLabelText('park 총타'));
    await user.type(screen.getByLabelText('park 총타'), '101');
    await user.click(screen.getByRole('button', { name: '변경 2건 저장' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
        items: [
          { participant_id: 2, score: 88 },
          { participant_id: 3, score: 101 },
        ],
      }),
    );
    expect(await screen.findByText('park')).toBeInTheDocument();
    expect(screen.getByText('참가자를 찾을 수 없습니다.')).toBeInTheDocument();
  });

  it('팀: 미배정 참가자를 골라 팀으로 옮기면 그 팀 전체 명단을 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5/teams', 'MEETING_ADMIN', {
      ...handlers,
      'PUT /admin/meetings/5/teams/11/members': {},
    });
    const pool = await screen.findByRole('list', { name: '미배정 참가자' });
    await user.click(within(pool).getByLabelText('park 선택'));
    await user.click(within(pool).getByLabelText('손님 선택'));
    await user.selectOptions(screen.getByLabelText('옮길 팀'), '11');
    await user.click(screen.getByRole('button', { name: '팀으로 이동' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
        participant_ids: [1, 2, 3, 4],
      }),
    );
  });

  it('팀: 편성이 있으면 자동 편성은 덮어쓰기 경고를 띄운다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5/teams', 'MEETING_ADMIN', {
      ...handlers,
      'POST /admin/meetings/5/teams/auto-formation': { teams: [] },
    });
    await user.click(await screen.findByRole('button', { name: /자동 편성/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('모두 지워지고');
    await user.click(within(dialog).getByRole('button', { name: '기존 편성 지우고 실행' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        formation_mode: 'GENDER_MIXED_RANDOM',
        team_size: 2,
      }),
    );
  });

  it('조회 전용 역할은 점수를 입력할 수 없다', async () => {
    renderApp('/rounds/5/scores', 'CLUB_ADMIN', handlers);
    expect(await screen.findByText('92')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /저장/ })).not.toBeInTheDocument();
  });
});

describe('라운딩 계산', () => {
  it('총타 범위 검사', () => {
    expect(scoreError('')).toBeNull();
    expect(scoreError('90')).toBeNull();
    expect(scoreError('54')).not.toBeNull();
    expect(scoreError('9.5')).not.toBeNull();
  });

  it('통계: 평균·최저·최고, 동타는 같은 순위', () => {
    const r = (id: number, score: number | null) => ({
      ...p(id, `n${id}`),
      team: null,
      score,
    });
    const board: Board = {
      rows: [r(1, 90), r(2, 85), r(3, 90), r(4, null)],
      teams: [],
    };
    const s = roundStats(board);
    expect(s).toMatchObject({
      participants: 4,
      scored: 3,
      average: 88.3,
      best: 85,
      worst: 90,
    });
    expect(s.ranked.map((x) => [x.id, x.rank])).toEqual([
      [2, 1],
      [1, 2],
      [3, 2],
    ]);
  });
});
