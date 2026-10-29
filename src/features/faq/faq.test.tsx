import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const cats = [
  { id: 1, title: '계정', order: 1, is_active: true, faq_count: 3 },
  { id: 2, title: '결제', order: 2, is_active: true, faq_count: 1 },
];
const f = (id: number, q: string, extra: object = {}) => ({
  id,
  question: q,
  answer: `${q} 답변`,
  category_id: 1,
  category_title: '계정',
  order: id,
  is_active: true,
  view_count: 0,
  created_at: null,
  updated_at: null,
  ...extra,
});
const faqs = [f(11, '비밀번호를 잊었어요'), f(12, '탈퇴하고 싶어요'), f(13, '닉네임 변경')];
const base = {
  'GET /admin/faq-categories': cats,
  'GET /admin/faq': (c: { query: URLSearchParams }) => ({
    items: c.query.get('category_id') === '1' ? faqs : [...faqs, f(21, '환불', { category_id: 2, category_title: '결제' })],
    total: 3,
  }),
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-072 FAQ', () => {
  it('카테고리를 누르면 URL 과 조회가 그 카테고리로 바뀌고, 검색어는 search 로 보낸다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/faq?q=비밀번호', 'CONTENT_ADMIN', base);
    expect(await screen.findByText('비밀번호를 잊었어요')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/faq')!.query.get('search')).toBe('비밀번호');
    // 검색 중에는 순서 바꾸기를 숨긴다
    await user.click(screen.getByRole('button', { name: /^계정/, pressed: false }));
    await waitFor(() => expect(router.state.location.search).toContain('category_id=1'));
    expect(screen.queryByRole('button', { name: '비밀번호를 잊었어요 위로' })).not.toBeInTheDocument();
  });

  it('카테고리 안에서 아래로 옮기면 전체 순서를 한 번에 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/faq?category_id=1', 'CONTENT_ADMIN', { ...base, 'PUT /admin/faq-order': {} });
    const down = await screen.findByRole('button', { name: '비밀번호를 잊었어요 아래로' });
    expect(screen.getByRole('button', { name: '비밀번호를 잊었어요 위로' })).toBeDisabled();
    await waitFor(() => expect(down).toBeEnabled());
    await user.click(down);
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ ids: [12, 11, 13] }));
  });

  it('공개 스위치는 토글 API, 카테고리 삭제 실패는 서버 사유를 보여 준다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/faq?category_id=1', 'CONTENT_ADMIN', {
      ...base,
      'PATCH /admin/faq/12/toggle-active': {},
      'DELETE /admin/faq-categories/1': () => Response.json({ detail: '이 카테고리를 사용하는 FAQ가 있습니다.' }, { status: 400 }),
    });
    await user.click(await screen.findByRole('switch', { name: '탈퇴하고 싶어요 공개' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    await user.click(screen.getByRole('button', { name: '계정 카테고리 삭제' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '삭제' }));
    expect(await screen.findByText(/사용하는 FAQ가 있습니다/)).toBeInTheDocument();
  });

  it('새 카테고리는 맨 뒤 순서로 만든다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/faq', 'CONTENT_ADMIN', { ...base, 'POST /admin/faq-categories': {} });
    await user.type(await screen.findByLabelText('새 카테고리 이름'), '모임');
    await user.click(screen.getByRole('button', { name: '카테고리 추가' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ title: '모임', order: 3 }));
  });
});

describe('SCR-073 FAQ 작성·수정', () => {
  it('목록에서 고른 카테고리로 시작하고, 등록 후 그 카테고리 목록으로 간다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/faq/new?category_id=2', 'CONTENT_ADMIN', { ...base, 'POST /admin/faq': {} });
    await waitFor(() => expect(screen.getByLabelText('카테고리')).toHaveValue('2'));
    await user.type(screen.getByLabelText(/질문/), '환불은 언제 되나요?');
    await user.type(screen.getByLabelText(/답변/), '영업일 3일 안에 처리됩니다.');
    await user.click(screen.getByRole('button', { name: '등록' }));
    await waitFor(() => expect(router.state.location.search).toBe('?category_id=2'));
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      question: '환불은 언제 되나요?',
      answer: '영업일 3일 안에 처리됩니다.',
      category_id: 2,
      is_active: true,
    });
  });

  it('수정: 미분류로 옮기면 category_id 를 null 로 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/faq/11/edit', 'CONTENT_ADMIN', { ...base, 'GET /admin/faq/11': faqs[0], 'PUT /admin/faq/11': {} });
    await waitFor(() => expect(screen.getByLabelText('카테고리')).toHaveValue('1'));
    await user.selectOptions(screen.getByLabelText('카테고리'), '');
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ category_id: null }));
  });
});
