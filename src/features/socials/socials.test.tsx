import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { toSocialBody, toSocialValues } from './socialForm';
import type { SocialDetail } from './types';

const social: SocialDetail = {
  id: 8,
  name: '송년회',
  description: null,
  meeting_type: 'SOCIAL',
  social_type: 'DINNER',
  venue_name: '역삼 고깃집',
  location: null,
  meeting_time: '2026-12-20T19:00:00',
  application_deadline: null,
  max_participants: 0,
  social_cost: 30000,
  social_notes: null,
  settlement_method: 'EQUAL_SPLIT',
  settlement_confirmed: false,
  status: 'SCHEDULED',
  club_id: 3,
  club_name: '강남 골프회',
  participant_count: 3,
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
const participants = [p(1, 'kim'), p(2, 'lee'), p(3, 'park', { status: 'PENDING' })];
const base = { 'GET /admin/meetings/8': social, 'GET /admin/meetings/8/participants': participants };

afterEach(() => vi.unstubAllGlobals());

describe('SCR-060 소셜 목록', () => {
  it('유형 필터와 기본 정렬을 보내고, 인원 제한 없음은 그렇게 보여 준다', async () => {
    const { calls } = renderApp('/socials?social_type=DINNER', 'MEETING_ADMIN', {
      'GET /admin/meetings/event': {
        data: [
          {
            id: 8,
            name: '송년회',
            social_type: 'DINNER',
            venue_name: '역삼 고깃집',
            location: null,
            meeting_time: '2026-12-20T19:00:00',
            max_participants: 0,
            status: 'SCHEDULED',
            club_id: 3,
            club_name: '강남 골프회',
            participant_count: 3,
            confirmed_count: 2,
            creator: null,
          },
        ],
        total: 1,
      },
    });
    expect(await screen.findByText('송년회')).toBeInTheDocument();
    const q = calls.find((c) => c.path === '/admin/meetings/event')!.query;
    expect(q.get('social_type')).toBe('DINNER');
    expect(q.get('sort')).toBe('-meeting_time');
    expect(screen.getByText('/제한 없음')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /소셜 등록/ })).toHaveAttribute('href', '/socials/new');
  });

  it('클럽 상세 소셜 탭은 이 클럽으로 고정한다', async () => {
    const { calls } = renderApp('/clubs/3/socials', 'CLUB_ADMIN', {
      'GET /admin/clubs/3': {
        id: 3,
        name: '강남 골프회',
        status: 'ACTIVE',
        type: 'REGULAR',
        sido_code: '11',
        gungu_codes: [],
        leader: null,
        pending_count: 0,
        round_count: 4,
        social_count: 1,
      },
      'GET /admin/meetings/event': { data: [], total: 0 },
    });
    expect(await screen.findByText('소셜 모임이 없습니다')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/meetings/event')!.query.get('club_id')).toBe('3');
    expect(screen.queryByRole('link', { name: /소셜 등록/ })).not.toBeInTheDocument();
  });
});

describe('SCR-061 소셜 등록·수정', () => {
  it('필수값을 막고, 등록은 유형을 type 으로 보내며 제한 없음은 0', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/socials/new', 'MEETING_ADMIN', {
      'GET /admin/lookup/clubs': { items: [{ id: 3, name: '강남 골프회', status: 'ACTIVE' }], total: 1, page: 1, size: 50 },
      'POST /admin/meetings/event': { id: 8 },
      ...base,
    });
    await user.click(await screen.findByRole('button', { name: '등록' }));
    expect(await screen.findByText('모임명을 입력해주세요')).toBeInTheDocument();
    expect(screen.getByText('클럽을 선택해주세요')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/유형/), 'DINNER');
    await user.type(screen.getByLabelText(/모임명/), '송년회');
    await user.click(screen.getByLabelText(/클럽/));
    await user.click(await screen.findByRole('option', { name: '강남 골프회' }));
    await user.type(screen.getByLabelText(/^일시/), '2026-12-20T19:00');
    await user.click(screen.getByLabelText('제한 없음'));
    expect(screen.getByLabelText(/최대 인원/)).toBeDisabled();
    await user.type(screen.getByLabelText('참가비'), '30000');
    await user.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/socials/8'));
    const body = calls.find((c) => c.method === 'POST')!.body as Record<string, unknown>;
    expect(body).toMatchObject({ type: 'DINNER', name: '송년회', club_id: 3, max_participants: 0, social_cost: 30000, meeting_time: '2026-12-20T19:00' });
    expect(body).not.toHaveProperty('social_type');
  });

  it('수정은 바뀐 항목만, 클럽은 바꾸지 않는다', () => {
    const v = { ...toSocialValues(social), venue_name: '선릉 횟집', club_id: '9' };
    expect(toSocialBody(v, { venue_name: true, club_id: true })).toEqual({ venue_name: '선릉 횟집' });
    expect(toSocialBody({ ...toSocialValues(social), unlimited: false, max_participants: '12' }, { unlimited: true, max_participants: true })).toEqual({
      max_participants: 12,
    });
    expect(toSocialValues(social).unlimited).toBe(true);
  });

  it('조회 전용 역할은 등록 화면에 들어올 수 없다', async () => {
    renderApp('/socials/new', 'CLUB_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});

describe('SCR-062 소셜 상세', () => {
  it('개요: 유형·장소·참가비, 라운딩 id 로 들어오면 404', async () => {
    renderApp('/socials/8', 'MEETING_ADMIN', base);
    expect(await screen.findByRole('heading', { name: /송년회/ })).toBeInTheDocument();
    expect(screen.getAllByText('식사').length).toBeGreaterThan(0);
    expect(screen.getByText('제한 없음')).toBeInTheDocument();
    expect(screen.getByText('30,000원')).toBeInTheDocument();
  });

  it('라운딩 id 로 들어오면 찾을 수 없다', async () => {
    renderApp('/socials/5', 'MEETING_ADMIN', { 'GET /admin/meetings/5': { ...social, id: 5, meeting_type: 'ROUND' } });
    expect(await screen.findByText('소셜 모임을 찾을 수 없습니다')).toBeInTheDocument();
  });

  it('정산: 항목·회비 처리를 넣고 확정 참가자 id 로만 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/socials/8/settlement', 'MEETING_ADMIN', {
      ...base,
      'GET /admin/meetings/8/settlement': { settlement: null },
      'POST /admin/meetings/8/settlement/social': {},
    });
    await user.click(await screen.findByRole('button', { name: '정산 만들기' }));
    const dialog = await screen.findByRole('dialog');
    // 참가비 30,000 × 확정 2명이 기본 항목
    expect(within(dialog).getByLabelText('항목 1 금액')).toHaveValue('60,000');
    await user.click(within(dialog).getByRole('button', { name: '항목 추가' }));
    await user.type(within(dialog).getByLabelText('항목 2 이름'), '케이크');
    await user.type(within(dialog).getByLabelText('항목 2 금액'), '40000');
    await user.click(within(dialog).getAllByLabelText('클럽 회비로 처리')[1]!);
    expect(dialog).toHaveTextContent('1인 약 30,000원');
    await user.click(within(dialog).getByRole('button', { name: '저장하고 알림 보내기' }));

    await waitFor(() => expect(calls.find((c) => c.method === 'POST')).toBeTruthy());
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      expense_items: [
        { title: '참가비', amount: 60000, memo: null, covered_by_fee: false },
        { title: '케이크', amount: 40000, memo: null, covered_by_fee: true },
      ],
      total_cost: 100000,
      settlement_targets: [1, 2],
      notes: '',
    });
  });

  it('정산이 확정되면 수정 버튼이 없다', async () => {
    renderApp('/socials/8/settlement', 'MEETING_ADMIN', {
      ...base,
      'GET /admin/meetings/8': { ...social, settlement_confirmed: true },
      'GET /admin/meetings/8/settlement': {
        settlement: {
          id: 1,
          total_cost: 60000,
          amount_per_person: 30000,
          total_participants: 2,
          notes: null,
          expense_items: [{ id: 1, title: '참가비', amount: 60000, memo: null, covered_by_fee: false }],
          participants: [],
        },
      },
    });
    expect(await screen.findByText('정산이 확정되어 수정할 수 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '정산 수정' })).not.toBeInTheDocument();
  });
});
