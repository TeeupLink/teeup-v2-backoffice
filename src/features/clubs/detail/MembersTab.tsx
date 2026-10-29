import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Crown, UserMinus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { Select } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format';
import { toOptions } from '@/lib/labels';
import { usePII } from '@/lib/usePII';
import { changeLeader, fetchMembers, removeMember, setMemberRole } from '../api';
import { CLUB_ROLE, MEMBERSHIP_STATUS } from '../labels';
import type { ClubDetail, ClubMember } from '../types';

const DEFS: FilterDef[] = [
  { kind: 'select', key: 'role', label: '역할', options: toOptions(CLUB_ROLE) },
  {
    kind: 'select',
    key: 'mstatus',
    label: '상태',
    options: [
      { value: 'ACTIVE', label: '활동' },
      { value: 'PENDING', label: '대기' },
      { value: 'SUSPENDED', label: '정지' },
    ],
  },
];
const CONFIG: ListConfig = { filters: filterKeys(DEFS) };
const col = createColumnHelper<ClubMember>();
const isActive = (m: ClubMember) => m.status === 'ACTIVE' || m.status === 'APPROVED';

/** 멤버 (F-043). API 가 전체를 주므로 검색·필터는 화면에서. 리더 교체는 원자적 API (F-044) */
export function MembersTab({ club, writable }: { club: ClubDetail; writable: boolean }) {
  const { can } = useAuth();
  const pii = usePII();
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const { q, filters } = list.state;
  const query = useQuery({
    queryKey: ['club', club.id, 'members'],
    queryFn: () => fetchMembers(club.id),
    select: (d): Page<ClubMember> => {
      const term = (q ?? '').trim().toLowerCase();
      const items = d.members
        .filter((m) => !filters.role || m.role === filters.role)
        .filter((m) => !filters.mstatus || (filters.mstatus === 'ACTIVE' ? isActive(m) : m.status === filters.mstatus))
        .filter((m) => !term || [m.user_nickname, m.user_realname, m.user_email].some((v) => v?.toLowerCase().includes(term)))
        .sort((a, b) => ['LEADER', 'MANAGER', 'MEMBER'].indexOf(a.role) - ['LEADER', 'MANAGER', 'MEMBER'].indexOf(b.role));
      return { items, total: items.length, page: 1, size: Math.max(items.length, 1) };
    },
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['club', club.id] });
    await qc.invalidateQueries({ queryKey: ['clubs'] });
  };
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: (e) => toast.error('처리하지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(() => {
    const makeLeader = async (m: ClubMember) => {
      const r = await confirm({
        title: `${m.user_nickname} 님을 리더로 지정할까요?`,
        description: `지금 리더(${club.leader?.nickname ?? '없음'})는 매니저가 됩니다.`,
        confirmText: '리더로 지정',
        reason: { label: '사유 (선택)', placeholder: '감사 로그에 남습니다' },
      });
      if (r) run.mutate(() => changeLeader(club.id, m.user_id, r.reason || undefined).then(() => toast.success('리더를 바꿨습니다')));
    };
    const kick = async (m: ClubMember) => {
      const r = await confirm({
        title: `${m.user_nickname} 님을 내보낼까요?`,
        description: '클럽에서 바로 빠지고, 회원 활동 기록에 남습니다.',
        confirmText: '내보내기',
        tone: 'danger',
        reason: { required: true, placeholder: '감사 로그에 남습니다' },
      });
      if (r) run.mutate(() => removeMember(club.id, m.user_id, r.reason).then(() => toast.success('내보냈습니다')));
    };

    return [
      col.accessor('user_nickname', {
        header: '회원',
        cell: ({ row: { original: m } }) => {
          const label = (
            <>
              <span className="font-medium text-slate-900">{m.user_nickname}</span>
              <span className="block text-xs text-slate-500">
                {pii.name(m.user_realname)} · {pii.phone(m.user_phone_number)}
              </span>
            </>
          );
          return can('users') ? (
            <Link to={`/users/${m.user_id}`} className="block hover:underline">
              {label}
            </Link>
          ) : (
            <div>{label}</div>
          );
        },
      }),
      col.accessor('role', {
        header: '역할',
        cell: ({ row: { original: m } }) =>
          m.role === 'LEADER' ? (
            <Badge tone="success">
              <Crown className="mr-1 h-3 w-3" aria-hidden />
              리더
            </Badge>
          ) : writable && isActive(m) ? (
            <Select
              aria-label={`${m.user_nickname} 역할`}
              className="w-28"
              value={m.role}
              disabled={run.isPending}
              options={[
                { value: 'MEMBER', label: '멤버' },
                { value: 'MANAGER', label: '매니저' },
              ]}
              onChange={(e) => {
                // 값은 지금 읽는다 — mutationFn 이 돌 때는 제어 컴포넌트가 이전 값으로 되돌아가 있다
                const role = e.target.value as 'MEMBER' | 'MANAGER';
                run.mutate(() => setMemberRole(club.id, m.user_id, role));
              }}
            />
          ) : (
            (CLUB_ROLE[m.role] ?? m.role)
          ),
      }),
      col.accessor('status', { header: '상태', cell: (c) => MEMBERSHIP_STATUS[c.getValue()] ?? c.getValue() }),
      col.accessor('user_average_score', { header: '평균타수', meta: { align: 'right' }, cell: (c) => c.getValue() ?? '-' }),
      col.accessor('created_at', { header: '가입일', cell: (c) => formatDate(c.getValue()) }),
      ...(writable
        ? [
            col.display({
              id: 'actions',
              header: () => <span className="sr-only">작업</span>,
              meta: { align: 'right' },
              cell: ({ row: { original: m } }) =>
                m.role === 'LEADER' || !isActive(m) ? null : (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" disabled={run.isPending} onClick={() => void makeLeader(m)}>
                      리더로
                    </Button>
                    <Button size="sm" variant="danger-ghost" aria-label={`${m.user_nickname} 내보내기`} disabled={run.isPending} onClick={() => void kick(m)}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ),
            }),
          ]
        : []),
    ];
  }, [pii, can, writable, run, club.id, club.leader]);

  return (
    <div className="space-y-3">
      <FilterBar list={list} defs={DEFS} searchPlaceholder="닉네임·실명·이메일" />
      <DataTable list={list} query={query} columns={columns} getRowId={(m) => m.id} empty={{ title: '조건에 맞는 멤버가 없습니다' }} />
    </div>
  );
}
