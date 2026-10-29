import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { toRoundBody, toRoundValues } from './roundForm';
import type { Participant, RoundDetail } from './types';

const round: RoundDetail = {
  id: 5,
  name: '토요 라운딩',
  description: null,
  meeting_type: 'ROUND',
  meeting_subtype: 'REGULAR',
  location: null,
  course_name: '남서울CC',
  tee_times: ['07:00'],
  meeting_time: '2026-10-31T07:00:00',
  application_deadline: '2026-10-29T18:00:00',
  reservation_name: null,
  hole_count: 18,
  team_size: 4,
  team_formation_mode: 'GENDER_MIXED_HANDICAP',
  green_fee: 150000,
  caddy_fee: 40000,
  cart_fee: 25000,
  total_cost: null,
  settlement_method: 'EQUAL_SPLIT',
  is_private: true,
  max_participants: 8,
  status: 'SCHEDULED',
  club_id: 3,
  club_name: '강남 골프회',
  participant_count: 2,
  created_at: null,
};
const p = (id: number, extra: Partial<Participant> = {}): Participant => ({
  id,
  user_id: id * 10,
  guest_id: null,
  user_name: `실명${id}`,
  user_nickname: `nick${id}`,
  status: 'CONFIRMED',
  role: 'PARTICIPANT',
  is_guest: false,
  created_at: null,
  ...extra,
});
const participants = [p(1), p(2, { user_id: null, guest_id: 9, is_guest: true, user_name: '손님', user_nickname: '손님', guest_handicap: 18, guest_gender: 'MALE' })];

afterEach(() => vi.unstubAllGlobals());

describe('SCR-051 라운딩 등록', () => {
  it('필수값·마감 순서를 화면에서 막고, 통과하면 등록 후 상세로 간다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/rounds/new', 'MEETING_ADMIN', {
      'GET /admin/lookup/clubs': { items: [{ id: 3, name: '강남 골프회', status: 'ACTIVE' }], total: 1, page: 1, size: 50 },
      'POST /admin/meetings/rounding': { id: 77 },
      'GET /admin/meetings/77': { ...round, id: 77 },
    });
    await user.type(await screen.findByLabelText(/모임명/), '일요 라운딩');
    await user.click(screen.getByLabelText(/클럽/));
    await user.click(await screen.findByRole('option', { name: '강남 골프회' }));
    await user.type(screen.getByLabelText(/^일시/), '2026-11-08T07:00');
    await user.type(screen.getByLabelText(/신청 마감/), '2026-11-09T07:00');
    await user.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('신청 마감은 모임 일시보다 앞서야 합니다')).toBeInTheDocument();
    expect(screen.getByText('티타임을 1개 이상 입력해주세요')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/신청 마감/));
    await user.type(screen.getByLabelText(/신청 마감/), '2026-11-06T18:00');
    await user.type(screen.getByLabelText('티타임 1'), '07:30');
    await user.type(screen.getByLabelText('그린피'), '150000');
    expect(screen.getByLabelText('그린피')).toHaveValue('150,000');
    await user.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/rounds/77'));
    const body = calls.find((c) => c.method === 'POST')!.body;
    expect(body).toMatchObject({ name: '일요 라운딩', club_id: 3, tee_times: ['07:30'], green_fee: 150000, is_private: false, team_size: 4 });
    expect(body).not.toHaveProperty('selected_participants');
  });

  it('프라이빗이면 참가자 섹션이 나오고 참가자 없이 등록할 수 없다', async () => {
    const user = userEvent.setup();
    renderApp('/rounds/new', 'MEETING_ADMIN');
    await user.click(await screen.findByLabelText('프라이빗'));
    expect(screen.getByRole('heading', { name: '참가자' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '게스트 추가' }));
    expect(screen.getByLabelText('게스트 1 이름')).toBeInTheDocument();
  });
});

describe('SCR-051 라운딩 수정', () => {
  it('바꾼 항목만 보내고, 프라이빗 참가자를 바꾸면 명단 전체를 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5/edit', 'MEETING_ADMIN', {
      'GET /admin/meetings/5': round,
      'GET /admin/meetings/5/participants': participants,
      'PUT /admin/meetings/5': {},
    });
    const name = await screen.findByLabelText(/모임명/);
    expect(screen.getByRole('list', { name: '지정한 멤버' })).toHaveTextContent('nick1');
    expect(screen.getByLabelText('게스트 1 평균타수')).toHaveValue('90');
    await user.clear(name);
    await user.type(name, '토요 정기 라운딩');
    await user.click(screen.getByRole('button', { name: 'nick1 빼기' }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toBeTruthy());
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({
      name: '토요 정기 라운딩',
      selected_participants: [],
      selected_guests: [{ name: '손님', birthdate: null, gender: 'MALE', average_score: 90, handicap: 18 }],
    });
  });

  it('예정이 아니면 참가자는 읽기 전용', async () => {
    renderApp('/rounds/5/edit', 'MEETING_ADMIN', { 'GET /admin/meetings/5': { ...round, status: 'COMPLETED' }, 'GET /admin/meetings/5/participants': participants });
    expect(await screen.findByText(/예정 상태가 아니어서 참가자를 바꿀 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게스트 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'nick1 빼기' })).not.toBeInTheDocument();
  });
});

describe('SCR-052 정산 탭', () => {
  const settlement = {
    id: 40,
    total_cost: 430000,
    amount_per_person: 215000,
    total_participants: 2,
    notes: null,
    green_fee: 300000,
    caddy_fee: 80000,
    cart_fee: 50000,
    other_fee: 0,
    other_expense_items: [],
    participants: [
      { id: 1, user_id: 10, guest_id: null, user_name: 'nick1', is_guest: false, amount: 215000, amount_paid: 0, is_paid: false, paid_at: null },
      { id: 2, user_id: null, guest_id: 9, user_name: '손님', is_guest: true, amount: 215000, amount_paid: 0, is_paid: false, paid_at: null },
    ],
  };
  const base = { 'GET /admin/meetings/5': round, 'GET /admin/meetings/5/participants': participants };

  it('납부 토글은 게스트면 guest_id 로 바로 저장한다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5/settlement', 'MEETING_ADMIN', {
      ...base,
      'GET /admin/meetings/5/settlement': { settlement },
      'PATCH /admin/meetings/5/expenses/40/participants/mark-paid': {},
    });
    expect(await screen.findByText('430,000원')).toBeInTheDocument();
    expect(screen.getByText('0/2')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: '손님 납부' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ guest_id: 9, is_paid: true }));
  });

  it('정산이 없으면 1인 금액 × 확정 인원으로 채워 만들고, 대상은 참가자 id 로 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/rounds/5/settlement', 'MEETING_ADMIN', {
      ...base,
      'GET /admin/meetings/5/settlement': { settlement: null },
      'POST /admin/meetings/5/settlement/rounding': { settlement_id: 41 },
    });
    await user.click(await screen.findByRole('button', { name: '정산 만들기' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('green_fee')).toHaveValue('300,000');
    await user.click(within(dialog).getByRole('button', { name: '항목 추가' }));
    await user.type(within(dialog).getByLabelText('기타 1 항목'), '식사');
    await user.type(within(dialog).getByLabelText('기타 1 금액'), '60000');
    await user.click(within(dialog).getByRole('button', { name: '저장하고 알림 보내기' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')).toBeTruthy());
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      green_fee: 300000,
      caddy_fee: 80000,
      cart_fee: 50000,
      other_fee: 60000,
      total_cost: 490000,
      green_fee_participant_ids: [1, 2],
      other_expense_items: [{ title: '식사', amount: 60000, participant_ids: [1, 2] }],
    });
  });
});

describe('라운딩 폼 변환', () => {
  it('공개 라운딩 수정에서 참가자 필드는 보내지 않는다', () => {
    const v = toRoundValues({ ...round, is_private: false }, participants);
    expect(toRoundBody({ ...v, name: 'x' }, { name: true })).toEqual({ name: 'x' });
  });
});
