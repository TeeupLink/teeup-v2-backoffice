import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const row = { id: 3, title: '로그인이 안 돼요', type: 'ACCOUNT', status: 'PENDING', user: { id: 7, nickname: 'golfking' }, response_count: 0, created_at: '2026-10-27T21:04:00' };
const detail = {
  inquiry: { id: 3, title: '로그인이 안 돼요', content: '어제부터 로그인이 안 됩니다', type: 'ACCOUNT', status: 'PENDING', user_id: 7, user_nickname: 'golfking', created_at: '2026-10-27T21:04:00', updated_at: null },
  responses: [{ id: 1, content: '비번 재설정 이력 있음', is_internal: true, admin_name: '김운영', created_at: '2026-10-28T09:00:00' }],
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-021 문의 목록', () => {
  it('기본 탭은 미답변 — PENDING·SUBMITTED 로 조회', async () => {
    const { calls } = renderApp('/inquiries', 'SUPPORT_ADMIN', { 'GET /admin/inquiries': { items: [row], total: 1, page: 1, size: 20 } });
    expect(await screen.findByText('로그인이 안 돼요')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/inquiries')!.query.getAll('status')).toEqual(['PENDING', 'SUBMITTED']);
    expect(screen.getByRole('tab', { name: '미답변' })).toHaveAttribute('aria-selected', 'true');
  });

  it('전체 탭은 상태 조건 없이', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/inquiries', 'SUPPORT_ADMIN', { 'GET /admin/inquiries': { items: [row], total: 1, page: 1, size: 20 } });
    await screen.findByText('로그인이 안 돼요');
    await user.click(screen.getByRole('tab', { name: '전체' }));
    await waitFor(() => expect(calls.filter((c) => c.path === '/admin/inquiries').pop()!.query.has('status')).toBe(false));
  });
});

describe('SCR-022 문의 상세', () => {
  it('답변 등록 시 답변완료 전환을 함께 보낸다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/inquiries/3', 'SUPPORT_ADMIN', {
      'GET /admin/inquiries/3': detail,
      'POST /admin/inquiries/3/responses': { id: 2, status: 'COMPLETED' },
    });
    expect(await screen.findByText('어제부터 로그인이 안 됩니다')).toBeInTheDocument();
    expect(screen.getByText('비번 재설정 이력 있음').closest('li')).toHaveTextContent('내부 메모');
    await user.type(screen.getByLabelText('답변 입력'), '재설정 링크를 보내드렸습니다');
    await user.click(screen.getByRole('button', { name: '답변 등록' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ content: '재설정 링크를 보내드렸습니다', is_internal: false, set_status: 'COMPLETED' }),
    );
  });

  it('내부 메모로 남기면 상태를 바꾸지 않는다', async () => {
    const user = userEvent.setup();
    const { calls } = renderApp('/inquiries/3', 'SUPPORT_ADMIN', { 'GET /admin/inquiries/3': detail, 'POST /admin/inquiries/3/responses': { id: 2, status: 'PENDING' } });
    await screen.findByText('어제부터 로그인이 안 됩니다');
    await user.click(screen.getByRole('checkbox', { name: '내부 메모' }));
    expect(screen.getByRole('checkbox', { name: '답변완료로 전환' })).toBeDisabled();
    await user.type(screen.getByLabelText('답변 입력'), '확인 중');
    await user.click(screen.getByRole('button', { name: '메모 남기기' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ content: '확인 중', is_internal: true }));
  });

  it('작성자 링크는 회원 활동 탭으로 (회원 조회 권한이 있을 때)', async () => {
    renderApp('/inquiries/3', 'SUPPORT_ADMIN', { 'GET /admin/inquiries/3': detail });
    const card = (await screen.findByText('문의 정보')).closest('section')!;
    expect(within(card).getByRole('link', { name: /golfking/ })).toHaveAttribute('href', '/users/7/activity');
  });

  it('없는 문의는 404 화면', async () => {
    renderApp('/inquiries/999', 'SUPPORT_ADMIN', { 'GET /admin/inquiries/999': new Response(JSON.stringify({ detail: '없음' }), { status: 404 }) });
    expect(await screen.findByText('문의를 찾을 수 없습니다')).toBeInTheDocument();
  });
});
