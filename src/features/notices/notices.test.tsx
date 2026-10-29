import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const row = {
  id: 4,
  title: '서버 점검 안내',
  is_important: true,
  is_published: false,
  view_count: 0,
  author_name: '콘텐츠팀',
  published_at: null,
  created_at: '2026-10-28T10:00:00',
  updated_at: null,
};
const detail = { ...row, content: '<p>11월 2일 새벽 점검</p>', attachment_file: null, web_view_link: null };

afterEach(() => vi.unstubAllGlobals());

describe('SCR-070 공지 목록', () => {
  it('게시 탭·중요 필터를 그대로 보내고, 임시 저장은 표시한다', async () => {
    const { calls } = renderApp('/notices?is_published=false&is_important=true', 'CONTENT_ADMIN', { 'GET /admin/notices': { data: [row], total: 1 } });
    expect(await screen.findByText('서버 점검 안내')).toBeInTheDocument();
    const q = calls.find((c) => c.path === '/admin/notices')!.query;
    expect(q.get('is_published')).toBe('false');
    expect(q.get('is_important')).toBe('true');
    expect(screen.getByRole('cell', { name: '임시 저장' })).toBeInTheDocument();
  });

  it('콘텐츠 권한이 없으면 들어올 수 없다', async () => {
    renderApp('/notices', 'CLUB_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});

describe('SCR-071 공지 작성·상세', () => {
  it('작성: 기본은 임시 저장, 바로 게시를 켜면 버튼이 게시로 바뀐다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/notices/new', 'CONTENT_ADMIN', { 'POST /admin/notices': { id: 4 }, 'GET /admin/notices/4': detail });
    await user.type(await screen.findByLabelText(/제목/), '서버 점검 안내');
    expect(screen.getByRole('button', { name: '임시 저장' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '임시 저장' }));
    expect(await screen.findByText('본문을 입력해주세요')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.click(screen.getByRole('switch', { name: /바로 게시/ }));
    expect(screen.getByText('저장하면 활성 회원 전체에게 알림이 갑니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '게시' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/notices/new');
  });

  it('상세: 게시하기는 확인 후 is_published 만 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/notices/4', 'CONTENT_ADMIN', { 'GET /admin/notices/4': detail, 'PUT /admin/notices/4': {} });
    expect(await screen.findByText('11월 2일 새벽 점검')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '게시하기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('활성 회원 전체에게 알림이 갑니다');
    await user.click(within(dialog).getByRole('button', { name: '게시' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ is_published: true }));
  });

  it('수정: 바뀐 항목만 보내고 게시 스위치는 없다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/notices/4/edit', 'CONTENT_ADMIN', { 'GET /admin/notices/4': detail, 'PUT /admin/notices/4': {} });
    const title = await screen.findByRole('textbox', { name: /제목/ });
    expect(screen.queryByRole('switch', { name: /바로 게시/ })).not.toBeInTheDocument();
    await user.clear(title);
    await user.type(title, '서버 점검 안내 (시간 변경)');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/notices/4'));
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ title: '서버 점검 안내 (시간 변경)' });
  });

  it('삭제는 사유를 쿼리로 보내고 목록으로 간다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/notices/4', 'CONTENT_ADMIN', {
      'GET /admin/notices/4': detail,
      'DELETE /admin/notices/4': {},
      'GET /admin/notices': { data: [], total: 0 },
    });
    await user.click(await screen.findByRole('button', { name: '공지 삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByRole('textbox'), '중복 게시');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/notices'));
    expect(calls.find((c) => c.method === 'DELETE')!.query.get('reason')).toBe('중복 게시');
  });
});
