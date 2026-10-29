import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';

const totals = { dau: 12.5, mau: 340, signups: 48, clubs: 3, rounds: 21, socials: 4, revenue: null };
const kpi = {
  from: '2026-09-30',
  to: '2026-10-29',
  interval: 'day',
  data_since: '2026-10-10',
  totals,
  previous: { ...totals, dau: null, mau: null, signups: 40, rounds: 25 },
  clubs_total: 86,
  series: [
    { start: '2026-10-09', active_users: null, dau: null, signups: 2, clubs: 0, rounds: 1, socials: 0, revenue: null },
    { start: '2026-10-10', active_users: 31, dau: 31, signups: 3, clubs: 1, rounds: 0, socials: 1, revenue: null },
  ],
  retention: [{ week_start: '2026-10-05', size: 12, weeks: [66.7, 41.7, null, null] }],
};

afterEach(() => vi.unstubAllGlobals());

describe('SCR-011 KPI', () => {
  it('지표 카드: 데이터 없음·이전 기간 대비, 매출은 연동 후', async () => {
    const { calls } = renderApp('/dashboard/kpi', 'SUPER_ADMIN', { 'GET /admin/kpi': kpi });
    expect(await screen.findByText('MAU (최근 30일)')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/kpi')!.query.get('interval')).toBe('day');
    const signups = screen.getByText('신규 가입', { selector: 'p' }).parentElement!;
    expect(signups).toHaveTextContent('48명');
    expect(signups).toHaveTextContent('+20%');
    const rounds = screen.getByText('라운딩', { selector: 'p' }).parentElement!;
    expect(rounds).toHaveTextContent('-16%');
    expect(screen.getByText('매출', { selector: 'p' }).parentElement).toHaveTextContent('데이터 없음');
    expect(screen.getByText('로그인 기록은 2026-10-10부터 있습니다')).toBeInTheDocument();
  });

  it('차트는 값이 없는 칸을 데이터 없음으로, 표로 보기를 지원한다', async () => {
    const user = userEvent.setup();
    renderApp('/dashboard/kpi', 'SUPER_ADMIN', { 'GET /admin/kpi': kpi });
    const chart = (await screen.findByText('활성 회원 (일별)')).closest('section')!;
    expect(within(chart).getByRole('img', { name: '10/9 데이터 없음' })).toBeInTheDocument();
    expect(within(chart).getByRole('img', { name: '10/10 31명' })).toBeInTheDocument();
    await user.click(within(chart).getByRole('button', { name: '표로 보기' }));
    expect(within(chart).getByRole('rowheader', { name: '10/10' }).parentElement).toHaveTextContent('31명');
  });

  it('리텐션은 숫자를 함께, 지나지 않은 주차는 -', async () => {
    renderApp('/dashboard/kpi', 'SUPER_ADMIN', { 'GET /admin/kpi': kpi });
    const row = (await screen.findByRole('rowheader', { name: '2026-10-05 주' })).parentElement!;
    expect(row).toHaveTextContent('12명');
    expect(row).toHaveTextContent('66.7%');
    expect(within(row).getAllByText('-')).toHaveLength(2);
  });

  it('기간을 바꾸면 단위 기본값이 바뀌고 URL 에 남는다', async () => {
    const user = userEvent.setup();
    const { calls, router } = renderApp('/dashboard/kpi', 'SUPER_ADMIN', { 'GET /admin/kpi': kpi });
    await user.selectOptions(await screen.findByLabelText('기간'), '12m');
    await waitFor(() => expect(router.state.location.search).toBe('?range=12m'));
    await waitFor(() =>
      expect(
        calls
          .filter((c) => c.path === '/admin/kpi')
          .pop()!
          .query.get('interval'),
      ).toBe('month'),
    );
  });

  it('최고 관리자 전용', async () => {
    renderApp('/dashboard/kpi', 'CLUB_ADMIN');
    expect(await screen.findByText('이 화면에 접근할 권한이 없습니다')).toBeInTheDocument();
  });
});
