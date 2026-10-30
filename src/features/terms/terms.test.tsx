import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const ver = (id: number, version: number, status: string, extra: object = {}) => ({
  id,
  type: 'SERVICE',
  version,
  title: '서비스 이용약관',
  status,
  is_required: true,
  agreement_count: status === 'ACTIVE' ? 1240 : 30,
  created_by_name: '콘텐츠팀',
  published_at: status === 'DRAFT' ? null : '2026-01-01T10:00:00',
  created_at: null,
  updated_at: null,
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe('SCR-075 약관', () => {
  it('종류별 게시 버전·동의 수, 게시 버전이 없으면 경고', async () => {
    renderApp('/terms', 'CONTENT_ADMIN', {
      'GET /admin/terms/versions': {
        items: [
          { type: 'SERVICE', default_title: '서비스 이용약관', active: ver(2, 2, 'ACTIVE'), version_count: 3, draft_count: 1 },
          { type: 'MARKETING', default_title: '마케팅정보 수신동의', active: null, version_count: 0, draft_count: 0 },
        ],
      },
    });
    const card = (await screen.findByText('서비스 이용약관')).closest('a')!;
    expect(card).toHaveAttribute('href', '/terms/SERVICE');
    expect(card).toHaveTextContent('v2');
    expect(card).toHaveTextContent('1,240명');
    expect(card).toHaveTextContent('초안 1');
    expect(screen.getByText(/게시된 버전이 없습니다/)).toBeInTheDocument();
  });
});

describe('SCR-076 약관 버전', () => {
  const versions = [ver(3, 3, 'DRAFT'), ver(2, 2, 'ACTIVE'), ver(1, 1, 'RETIRED')];

  it('버전 목록과 새 버전 링크', async () => {
    renderApp('/terms/SERVICE', 'CONTENT_ADMIN', { 'GET /admin/terms/versions': { items: versions } });
    expect(await screen.findByRole('link', { name: 'v3' })).toHaveAttribute('href', '/terms/SERVICE/v/3');
    expect(screen.getByRole('link', { name: /새 버전/ })).toHaveAttribute('href', '/terms/new?type=SERVICE');
    expect(screen.getAllByText('지난 버전').length).toBeGreaterThan(0);
  });

  it('초안 게시는 확인 후 게시 API, 재동의가 뜨지 않는다고 안내', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/terms/SERVICE/v/3', 'CONTENT_ADMIN', {
      'GET /admin/terms/versions/3': { ...ver(3, 3, 'DRAFT'), content: '<p>개정안</p>' },
      'POST /admin/terms/versions/3/publish': ver(3, 3, 'ACTIVE'),
    });
    expect(await screen.findByText('개정안')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '게시' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('재동의 화면은 뜨지 않습니다');
    await user.click(within(dialog).getByRole('button', { name: '게시' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/terms/versions/3/publish')).toBe(true));
  });

  it('게시된 버전은 수정·삭제가 없고 "이 버전으로 새 초안"만', async () => {
    renderApp('/terms/SERVICE/v/2', 'CONTENT_ADMIN', { 'GET /admin/terms/versions/2': { ...ver(2, 2, 'ACTIVE'), content: '<p>현재</p>' } });
    expect(await screen.findByRole('link', { name: /이 버전으로 새 초안/ })).toHaveAttribute('href', '/terms/new?type=SERVICE&from=2');
    expect(screen.queryByRole('link', { name: /수정/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '초안 삭제' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게시' })).not.toBeInTheDocument();
  });

  it('지난 버전은 "다시 게시"로 되돌린다', async () => {
    renderApp('/terms/SERVICE/v/1', 'CONTENT_ADMIN', { 'GET /admin/terms/versions/1': { ...ver(1, 1, 'RETIRED'), content: '<p>옛날</p>' } });
    expect(await screen.findByRole('button', { name: '다시 게시' })).toBeInTheDocument();
  });

  it('새 초안: 기존 버전 본문을 복사해 시작하고 저장하면 그 버전 화면으로', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/terms/new?type=SERVICE&from=2', 'CONTENT_ADMIN', {
      'GET /admin/terms/versions/2': { ...ver(2, 2, 'ACTIVE'), content: '<p>현재</p>' },
      'POST /admin/terms/versions': ver(4, 4, 'DRAFT'),
      'GET /admin/terms/versions/4': { ...ver(4, 4, 'DRAFT'), content: '<p>현재</p>' },
    });
    const title = await screen.findByRole('textbox', { name: /제목/ });
    await user.type(title, ' (개정)');
    await user.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/terms/SERVICE/v/4'));
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      type: 'SERVICE',
      title: '서비스 이용약관 (개정)',
      content: '<p>현재</p>',
      is_required: true,
    });
  });

  it('없는 종류는 찾을 수 없다고 보여 준다', async () => {
    renderApp('/terms/NOPE', 'CONTENT_ADMIN');
    expect(await screen.findByText('약관 종류를 찾을 수 없습니다')).toBeInTheDocument();
  });
});

describe('SCR-076 버전별 동의 회원 (F-111)', () => {
  it('게시된 버전 아래에 동의 회원 목록, 검색어는 q 로 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/terms/SERVICE/v/2', 'CONTENT_ADMIN', {
      'GET /admin/terms/versions/2': { ...ver(2, 2, 'ACTIVE'), content: '<p>현재</p>' },
      'GET /admin/terms/versions/2/agreements': {
        items: [{ id: 9, user_id: 7, nickname: 'golfking', user_status: 'ACTIVE', agreed_at: '2026-09-02T10:00:00', ip_address: null }],
        total: 1,
        page: 1,
        size: 20,
      },
    });
    expect(await screen.findByText('golfking')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('닉네임 또는 회원 번호'), 'golf{Enter}');
    await waitFor(() => expect(calls.some((c) => c.path === '/admin/terms/versions/2/agreements' && c.query.get('q') === 'golf')).toBe(true));
  });

  it('초안은 동의 회원 목록이 없다', async () => {
    const { calls } = renderApp('/terms/SERVICE/v/3', 'CONTENT_ADMIN', { 'GET /admin/terms/versions/3': { ...ver(3, 3, 'DRAFT'), content: '<p>초안</p>' } });
    expect(await screen.findByRole('button', { name: '게시' })).toBeInTheDocument();
    expect(screen.queryByText('동의한 회원')).not.toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/agreements'))).toBe(false);
  });
});

describe('SCR-076 뒤로 가기', () => {
  it('버전 보기의 목록으로는 그 종류의 버전 목록', async () => {
    renderApp('/terms/SERVICE/v/1', 'CONTENT_ADMIN', { 'GET /admin/terms/versions/1': { ...ver(1, 1, 'RETIRED'), content: '<p>옛날</p>' } });
    expect(await screen.findByRole('link', { name: /목록으로/ })).toHaveAttribute('href', '/terms/SERVICE');
  });
});
