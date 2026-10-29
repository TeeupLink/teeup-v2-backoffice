import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ConfirmHost } from '@/components/dialog/ConfirmHost';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { Toaster } from '@/components/feedback/Toaster';
import type { BulkAction } from './bulk';
import { DataTable } from './DataTable';
import type { ListConfig } from './listState';
import { useListQuery } from './useListQuery';
import { useListState } from './useListState';

type Club = { id: number; name: string; status: string };
const col = createColumnHelper<Club>();
const columns = [
  col.accessor('name', { header: '클럽명', meta: { sortKey: 'name' } }),
  col.accessor('status', { header: '상태' }),
];
const defs: FilterDef[] = [{ kind: 'select', key: 'type', label: '유형', options: [{ value: 'REGULAR', label: '정기' }] }];
const config: ListConfig = { filters: filterKeys(defs, ['status']), defaultSort: '-created_at', sortable: ['name', 'created_at'], defaults: { status: 'PENDING' } };

function Screen({ bulk }: { bulk?: BulkAction[] }) {
  const list = useListState(config);
  const query = useListQuery<Club>('clubs', '/admin/clubs', list.state);
  return (
    <>
      <FilterBar list={list} defs={defs} searchPlaceholder="클럽 검색" />
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        bulkActions={bulk}
        toolbar={<StatusTabs list={list} filterKey="status" options={[{ value: 'PENDING', label: '대기' }, { value: '', label: '전체' }]} />}
        empty={{ title: '클럽이 없습니다' }}
      />
    </>
  );
}

function setup(rows: (url: URL) => Club[], total?: number, bulk?: BulkAction[], initial = '/clubs') {
  const requests: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input, 'http://x');
      requests.push(url);
      const items = rows(url);
      return Response.json({ data: items, total: total ?? items.length, page: 1, limit: 20 });
    }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/clubs', element: <Screen bulk={bulk} /> }], { initialEntries: [initial] });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <ConfirmHost />
      <Toaster />
    </QueryClientProvider>,
  );
  return { router, requests, last: () => requests[requests.length - 1]! };
}

const clubs = (n: number): Club[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `클럽${i + 1}`, status: 'ACTIVE' }));

afterEach(() => vi.unstubAllGlobals());

describe('DataTable + URL 상태', () => {
  it('URL 상태로 요청하고, 기본 탭 값은 API 로 보낸다', async () => {
    const { last } = setup(() => clubs(3), 45);
    expect(await screen.findByText('클럽1')).toBeInTheDocument();
    expect(last().searchParams.get('status')).toBe('PENDING');
    expect(last().searchParams.get('sort')).toBe('-created_at');
    expect(screen.getByText('총 45건')).toBeInTheDocument();
  });

  it('정렬 헤더 클릭 → URL·요청에 반영, 다시 누르면 내림차순', async () => {
    const user = userEvent.setup();
    const { router, last } = setup(() => clubs(2));
    await screen.findByText('클럽1');
    await user.click(screen.getByRole('button', { name: /클럽명/ }));
    await waitFor(() => expect(router.state.location.search).toContain('sort=name'));
    await waitFor(() => expect(last().searchParams.get('sort')).toBe('name'));
    await user.click(screen.getByRole('button', { name: /클럽명/ }));
    await waitFor(() => expect(router.state.location.search).toContain('sort=-name'));
  });

  it('페이지 이동 후 필터를 바꾸면 1페이지로', async () => {
    const user = userEvent.setup();
    const { router } = setup(() => clubs(20), 100, undefined, '/clubs?page=3');
    await screen.findByText('클럽1');
    await user.selectOptions(screen.getByLabelText('유형'), 'REGULAR');
    await waitFor(() => expect(router.state.location.search).toBe('?type=REGULAR'));
    expect(screen.getByText('유형: 정기')).toBeInTheDocument();
  });

  it('검색어는 디바운스 후 replace 로 반영된다', async () => {
    const user = userEvent.setup();
    const { router, last } = setup(() => clubs(1));
    await screen.findByText('클럽1');
    await user.type(screen.getByRole('searchbox', { name: '클럽 검색' }), '강남');
    await waitFor(() => expect(last().searchParams.get('q')).toBe('강남'), { timeout: 1500 });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('기본 탭이 있는 목록에서 "전체"를 고르면 URL 에 남고 status 는 보내지 않는다', async () => {
    const user = userEvent.setup();
    const { router, last } = setup(() => clubs(1));
    await screen.findByText('클럽1');
    await user.click(screen.getByRole('tab', { name: '전체' }));
    await waitFor(() => expect(router.state.location.search).toBe('?status=all'));
    await waitFor(() => expect(last().searchParams.has('status')).toBe(false));
  });

  it('필터 결과가 없으면 "필터 해제", 원래 비었으면 빈 상태 문구', async () => {
    setup(() => [], 0, undefined, '/clubs?q=없음');
    expect(await screen.findByText('조건에 맞는 결과가 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '필터 해제' })).toBeInTheDocument();
  });

  it('빈 목록(필터 없음)', async () => {
    setup(() => [], 0);
    expect(await screen.findByText('클럽이 없습니다')).toBeInTheDocument();
  });
});

describe('일괄 처리', () => {
  it('선택 → 확인(사유 필수) → 실행 → 결과 Toast, 부분 실패는 실패 목록', async () => {
    const user = userEvent.setup();
    const run = vi.fn(async (ids: (string | number)[]) => ({ succeeded: ids.slice(1), failed: [{ id: ids[0]!, message: '이미 처리됨' }] }));
    const bulk: BulkAction[] = [
      { key: 'reject', label: '거절', tone: 'danger', confirm: (n) => ({ title: `${n}건 거절`, tone: 'danger', reason: { required: true } }), run },
    ];
    setup(() => clubs(3), 3, bulk);
    await screen.findByText('클럽1');

    await user.click(screen.getByRole('checkbox', { name: '현재 페이지 전체 선택' }));
    const bar = screen.getByRole('region', { name: '일괄 작업' });
    expect(within(bar).getByText('3건 선택됨')).toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: '거절' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '확인' }));
    expect(await within(dialog).findByText('사유를 입력해주세요')).toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();

    await user.type(within(dialog).getByRole('textbox'), '중복 신청');
    await user.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() => expect(run).toHaveBeenCalledWith([1, 2, 3], '중복 신청'));
    expect(await screen.findByText('2건 완료, 1건 실패')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '일괄 작업' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '실패 보기' }));
    expect(await screen.findByText('이미 처리됨')).toBeInTheDocument();
  });

  it('확인 대화상자에서 취소하면 실행하지 않는다', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    setup(() => clubs(2), 2, [{ key: 'del', label: '삭제', confirm: () => ({ title: '삭제' }), run }]);
    await screen.findByText('클럽1');
    await user.click(screen.getAllByRole('checkbox', { name: '행 선택' })[0]!);
    await user.click(within(screen.getByRole('region', { name: '일괄 작업' })).getByRole('button', { name: '삭제' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '취소' }));
    expect(run).not.toHaveBeenCalled();
  });
});
