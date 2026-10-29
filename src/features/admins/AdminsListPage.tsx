import { createColumnHelper } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { StatusTabs } from '@/components/filter-bar/StatusTabs';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/auth/useAuth';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { formatDate, formatDateTime } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { ADMINS_PATH, type AdminAccount } from './api';

// SCR-090 관리자 목록 (화면설계서 4.10, F-090). 최고 관리자 전용
const DEFS: FilterDef[] = [{ kind: 'select', key: 'role', label: '역할', options: toOptions(ROLE_LABEL) }];
const CONFIG: ListConfig = { filters: filterKeys(DEFS, ['status_filter']) };
const col = createColumnHelper<AdminAccount>();

export function AdminsListPage() {
  const { me } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<AdminAccount>('admin-accounts', ADMINS_PATH, list.state);
  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: '관리자',
        cell: ({ row: { original: a } }) => (
          <Link to={`/admins/${a.id}`} className="block hover:underline">
            <span className="font-medium text-slate-900">{a.name}</span>
            {a.id === me?.id && <Badge className="ml-1.5">나</Badge>}
            <span className="block text-xs text-slate-500">{a.email}</span>
          </Link>
        ),
      }),
      col.accessor('role', {
        header: '역할',
        cell: (c) => {
          const r = c.getValue();
          return r ? <Badge tone={r === 'SUPER_ADMIN' ? 'info' : 'neutral'}>{ROLE_LABEL[r]}</Badge> : <Badge tone="danger">역할 없음</Badge>;
        },
      }),
      col.accessor('status', { header: '상태', cell: (c) => (c.getValue() === 'ACTIVE' ? <Badge tone="success">활성</Badge> : <Badge>비활성</Badge>) }),
      col.accessor('last_login_at', { header: '최근 로그인', cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('created_at', { header: '등록일', cell: (c) => formatDate(c.getValue()) }),
    ],
    [me?.id],
  );

  return (
    <>
      <PageHeader
        title="관리자"
        description="백오피스 계정과 역할입니다. 역할에 따라 볼 수 있는 메뉴와 할 수 있는 작업이 정해집니다."
        actions={
          <Link to="/admins/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              관리자 등록
            </Button>
          </Link>
        }
      />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="이름·이메일" />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(a) => a.id}
        rowHref={(a) => `/admins/${a.id}`}
        empty={{ title: '관리자가 없습니다' }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="status_filter"
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
