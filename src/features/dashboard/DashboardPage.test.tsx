import { screen } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';

afterEach(() => vi.unstubAllGlobals());

describe('SCR-010 대시보드', () => {
  it('권한 밖 카드(null)는 그리지 않고, 카드는 필터 목록으로 이동한다', async () => {
    renderApp('/dashboard', 'SUPPORT_ADMIN', {
      'GET /admin/dashboard/todo': { join_requests: null, unanswered_inquiries: 3, today_rounds: null, pending_reports: 0 },
      'GET /admin/dashboard/stats': { total_users: 1240, total_clubs: 86, total_meetings: 412, weekly_rounds: 9 },
    });
    const card = await screen.findByRole('link', { name: /미답변 문의/ });
    expect(card).toHaveAttribute('href', '/inquiries');
    expect(card).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /신고 대기/ })).toHaveTextContent('처리할 일 없음');
    expect(screen.queryByText('가입신청 대기')).not.toBeInTheDocument();
    expect(await screen.findByText('1,240')).toBeInTheDocument();
  });
});
