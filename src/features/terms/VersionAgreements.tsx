import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { Card } from '@/components/display/Card';
import { StatusBadge } from '@/components/display/StatusBadge';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { formatDateTime } from '@/lib/format';
import { agreementsPath, type VersionAgreement } from './api';

// F-111 버전별 동의 이력. 목록 상태는 URL 에 남는다
const CONFIG = {};
const col = createColumnHelper<VersionAgreement>();

export function VersionAgreements({ versionId }: { versionId: number }) {
  const { can } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<VersionAgreement>('terms-agreements', agreementsPath(versionId), list.state);
  const linkUsers = can('users');
  const columns = useMemo(
    () => [
      col.accessor('nickname', {
        header: '회원',
        cell: ({ row: { original: a } }) =>
          linkUsers ? (
            <Link to={`/users/${a.user_id}`} className="font-medium text-slate-900 hover:underline">
              {a.nickname}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{a.nickname}</span>
          ),
      }),
      col.accessor('user_id', { header: '회원 번호', cell: (c) => <span className="tabular">{c.getValue()}</span> }),
      col.accessor('user_status', { header: '회원 상태', cell: (c) => <StatusBadge domain="user" value={c.getValue()} /> }),
      col.accessor('agreed_at', { header: '동의 일시', cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('ip_address', { header: 'IP', cell: (c) => c.getValue() ?? '-' }),
    ],
    [linkUsers],
  );
  return (
    <Card title="동의한 회원" className="mt-4">
      <div className="mb-3">
        <FilterBar list={list} searchPlaceholder="닉네임 또는 회원 번호" />
      </div>
      <DataTable list={list} query={query} columns={columns} getRowId={(a) => a.id} empty={{ title: '이 버전에 동의한 회원이 없습니다' }} />
    </Card>
  );
}
