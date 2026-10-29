import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { toClubBody, toClubValues } from './clubForm';
import type { ClubDetail } from './types';

const club: ClubDetail = {
  id: 3,
  display_id: 'C-0003',
  name: '강남 골프회',
  sido_code: '11',
  gungu_codes: ['11680'],
  type: 'REGULAR',
  description: '주말마다 라운딩하는 모임입니다',
  status: 'ACTIVE',
  representative_name: '김리더',
  representative_id: 7,
  location: null,
  contact_info: null,
  additional_info: null,
  profile_image: null,
  member_count: 20,
  current_member_count: 3,
  leader: { id: 7, nickname: 'leader', realname: '김리더' },
  pending_count: 0,
  created_at: null,
};
const regions = {
  'GET /sido-list': [
    { code: '11', name: '서울' },
    { code: '26', name: '부산' },
  ],
  'GET /gungu-list': (c: { query: URLSearchParams }) =>
    c.query.get('sido_code') === '26'
      ? [{ code: '26350', name: '해운대구' }]
      : ['강남구', '서초구', '송파구', '마포구', '종로구'].map((name, i) => ({ code: `1168${i}`, name })),
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-041 클럽 등록', () => {
  it('군구는 4개까지, 대표자·정기회비를 함께 보내고 상세로 간다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/clubs/new', 'CLUB_ADMIN', {
      ...regions,
      'GET /admin/lookup/users': { items: [{ id: 7, nickname: 'leader', name_masked: '김*더', email_masked: null }], total: 1, page: 1, size: 20 },
      'POST /admin/clubs': { id: 9 },
      'GET /admin/clubs/9': { ...club, id: 9 },
    });
    await user.type(await screen.findByLabelText(/클럽명/), '송파 골프회');
    await user.type(screen.getByLabelText(/^설명/), '평일 저녁 스크린과 주말 라운딩');
    await user.selectOptions(screen.getByLabelText(/시도/), '11');
    const group = await screen.findByRole('group', { name: '군구' });
    for (const n of ['강남구', '서초구', '송파구', '마포구']) await user.click(await within(group).findByLabelText(n));
    expect(within(group).getByLabelText('종로구')).toBeDisabled();

    await user.click(screen.getByLabelText(/대표자/));
    await user.type(await screen.findByLabelText('회원 선택 검색'), 'le');
    await user.click(await screen.findByRole('option', { name: /leader/ }));
    await user.click(screen.getByLabelText('정기 회비를 받습니다'));
    await user.type(screen.getByLabelText(/금액/), '30000');
    await user.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/clubs/9'));
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      name: '송파 골프회',
      sido_code: '11',
      gungu_codes: ['11680', '11681', '11682', '11683'],
      representative_id: 7,
      regular_fee: { amount: 30000, cycle: 'MONTHLY', description: '' },
    });
  });

  it('설명 10자 미만·대표자 없음은 화면에서 막는다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/clubs/new', 'CLUB_ADMIN', regions);
    await user.type(await screen.findByLabelText(/클럽명/), '짧은 클럽');
    await user.type(screen.getByLabelText(/^설명/), '짧아요');
    await user.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText('설명은 10자 이상 입력해주세요')).toBeInTheDocument();
    expect(screen.getByText('대표자(리더)를 선택해주세요')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('클럽 폼 변환', () => {
  it('수정: 시도를 바꾸면 군구를 함께, 나머지는 바뀐 것만', () => {
    const v = { ...toClubValues(club), sido_code: '26', gungu_codes: ['26350'], name: '해운대 골프회' };
    expect(toClubBody(v, { sido_code: true, name: true })).toEqual({ name: '해운대 골프회', sido_code: '26', gungu_codes: ['26350'] });
    expect(toClubBody({ ...toClubValues(club), contact_info: '010' }, { contact_info: true })).toEqual({ contact_info: '010' });
  });
});

describe('SCR-042 공지·규정·회비 탭', () => {
  const base = { 'GET /admin/clubs/3': club };

  it('공지: 검색어를 보내고, 작성 버튼은 작성 화면으로', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/clubs/3/notices', 'CLUB_ADMIN', {
      ...base,
      'GET /admin/clubs/3/notices': { data: [{ id: 1, title: '11월 정기 라운딩', content: '', is_important: true, is_private: false, author_name: '김리더', view_count: 12, created_at: null }], total: 1 },
    });
    expect(await screen.findByText('11월 정기 라운딩')).toBeInTheDocument();
    expect(screen.getByLabelText('중요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /공지 작성/ })).toHaveAttribute('href', '/clubs/3/notices/new');
    await user.type(screen.getByRole('searchbox'), '회비{Enter}');
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/clubs/3/notices').pop()!.query.get('q')).toBe('회비'));
  });

  it('공지 수정: 제목만 바꿔 저장하면 공지 탭으로 돌아간다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/clubs/3/notices/1/edit', 'CLUB_ADMIN', {
      'GET /admin/clubs/3/notices/1': { id: 1, title: '11월 정기 라운딩', content: '<p>장소 공지</p>', is_important: false, is_private: false, author_name: 'x', view_count: 0, created_at: null },
      'PUT /admin/clubs/3/notices/1': {},
      ...base,
      'GET /admin/clubs/3/notices': { data: [], total: 0 },
    });
    const title = await screen.findByLabelText(/제목/);
    await user.clear(title);
    await user.type(title, '11월 정기 라운딩 (장소 변경)');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/clubs/3/notices'));
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ title: '11월 정기 라운딩 (장소 변경)', content: '<p>장소 공지</p>', is_important: false, is_private: false });
  });

  it('규정: 카테고리 추가, 규정이 남은 카테고리 삭제는 서버 사유를 보여 준다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/clubs/3/regulations', 'CLUB_ADMIN', {
      ...base,
      'GET /admin/clubs/3/regulations': { categories: [{ id: 1, name: '회칙', order: 1, regulations: [{ id: 5, title: '제1조 목적', content: '<p>친목</p>', status: 'ACTIVE', created_at: null }] }] },
      'POST /admin/clubs/3/regulations/categories': {},
      'DELETE /admin/clubs/3/regulations/categories/1': () => Response.json({ detail: '이 카테고리에 규정이 1개 있습니다. 규정을 먼저 옮기거나 삭제해주세요.' }, { status: 409 }),
    });
    await user.click(await screen.findByRole('button', { name: '제1조 목적' }));
    expect(screen.getByText('친목')).toBeInTheDocument();

    await user.type(screen.getByLabelText('새 카테고리 이름'), '벌칙');
    await user.click(screen.getByRole('button', { name: '카테고리' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ name: '벌칙' }));

    await user.click(screen.getByRole('button', { name: '회칙 카테고리 삭제' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '삭제' }));
    expect(await screen.findByText(/규정이 1개 있습니다/)).toBeInTheDocument();
  });

  it('회비: 모달로 추가, 금액은 숫자로', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/clubs/3/fees', 'CLUB_ADMIN', { ...base, 'GET /admin/clubs/3/fees': [], 'POST /admin/clubs/3/fees': {} });
    await user.click(await screen.findByRole('button', { name: /회비 항목/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/항목명/), '연회비');
    await user.type(within(dialog).getByLabelText(/금액/), '120000');
    expect(within(dialog).getByLabelText(/금액/)).toHaveValue('120,000');
    await user.selectOptions(within(dialog).getByLabelText('주기'), 'YEARLY');
    await user.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ name: '연회비', amount: 120000, cycle: 'YEARLY', description: '', is_active: true }));
  });

  it('조회 전용 역할은 작성 화면에 들어올 수 없다', async () => {
    renderApp('/clubs/3/notices/new', 'MEETING_ADMIN', base);
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});
