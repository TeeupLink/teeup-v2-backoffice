import { createColumnHelper } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import type { BulkAction } from '@/components/data-table/bulk';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { StatusBadge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys } from '@/components/filter-bar/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { mapUsersQuery, setUsersStatus, USERS_PATH } from './api';
import type { UserRow } from './types';

// SCR-030 회원 목록 (화면설계서 4.4)
const CONFIG: ListConfig = {
  filters: filterKeys([], ['status']),
  defaultSort: '-created_at',
  sortable: ['created_at'],
};

const col = createColumnHelper<UserRow>();

export function UsersListPage() {
  const { can } = useAuth();
  const writable = can('users', 'write');
  const pii = usePII();
  const list = useListState(CONFIG);
  const query = useListQuery<UserRow>('users', USERS_PATH, list.state, { mapQuery: mapUsersQuery });

  const columns = useMemo(
    () => [
      col.accessor('nickname', {
        header: '회원',
        cell: ({ row }) => (
          <Link to={`/users/${row.original.id}`} className="block font-medium text-slate-900 hover:underline">
            {row.original.nickname}
            <span className="block text-xs font-normal text-slate-500">{pii.name(row.original.realname)}</span>
          </Link>
        ),
      }),
      col.accessor('email', { header: '이메일', cell: (c) => pii.email(c.getValue()) }),
      col.accessor('phone_number', { header: '전화', cell: (c) => pii.phone(c.getValue()) }),
      col.accessor('average_score', { header: '평균타수', meta: { align: 'right' }, cell: (c) => c.getValue() ?? '-' }),
      col.accessor('club_count', { header: '가입 클럽', meta: { align: 'right' }, cell: (c) => c.getValue() ?? 0 }),
      col.accessor('status', { header: '상태', cell: (c) => <StatusBadge domain="user" value={c.getValue()} /> }),
      col.accessor('created_at', { header: '가입일', meta: { sortKey: 'created_at' }, cell: (c) => formatDate(c.getValue()) }),
      col.accessor('last_login_at', { header: '최근 로그인', cell: (c) => formatDate(c.getValue()) }),
    ],
    [pii],
  );

  const bulkActions: BulkAction[] = writable
    ? [
        { key: 'activate', label: '활성화', run: (ids) => setUsersStatus(ids, 'activate') },
        {
          key: 'deactivate',
          label: '비활성화',
          tone: 'danger',
          confirm: (n) => ({
            title: `${n}명을 비활성화할까요?`,
            description: '비활성화된 회원은 앱에 로그인할 수 없습니다.',
            confirmText: '비활성화',
            tone: 'danger',
            reason: { required: true, placeholder: '감사 로그에 남습니다' },
          }),
          run: (ids, reason) => setUsersStatus(ids, 'deactivate', reason),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="회원"
        actions={
          writable && (
            <Link to="/users/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                회원 등록
              </Button>
            </Link>
          )
        }
      />
      <div className="mb-3">
        <FilterBar list={list} searchPlaceholder="이메일·닉네임·실명·전화" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/users/${r.id}`}
        bulkActions={bulkActions}
        empty={{ title: '아직 회원이 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="status"
            options={[
              { value: '', label: '전체' },
              { value: 'ACTIVE', label: '활성' },
              { value: 'DEACTIVATED', label: '비활성' },
            ]}
          />
        }
      />
    </>
  );
}
