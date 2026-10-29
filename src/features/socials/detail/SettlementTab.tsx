import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Card, StatCard } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { Switch } from '@/components/form/Switch';
import { Button } from '@/components/ui/Button';
import { fetchParticipants, markPaid } from '@/features/rounds/api';
import { participantsKey } from '@/features/rounds/detail/board';
import type { SettlementPerson } from '@/features/rounds/types';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatWon } from '@/lib/format';
import { fetchSocialSettlement, saveSocialSettlement, type SocialSettlementInput } from '../api';
import type { SocialDetail } from '../types';
import { SettlementModal } from './SettlementModal';

const CONFIG = {};
const col = createColumnHelper<SettlementPerson>();
const settlementKey = (id: number) => ['social', id, 'settlement'] as const;

/** 정산 (F-063) — 항목, 참가자별 납부 토글(즉시 저장), 정산 입력 */
export function SettlementTab({ social, writable }: { social: SocialDetail; writable: boolean }) {
  const id = social.id;
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: settlementKey(id), queryFn: () => fetchSocialSettlement(id) });
  const people = useQuery({ queryKey: participantsKey(id), queryFn: () => fetchParticipants(id) });
  const table = useQuery({
    queryKey: settlementKey(id),
    queryFn: () => fetchSocialSettlement(id),
    select: (s): Page<SettlementPerson> => ({
      items: s?.participants ?? [],
      total: s?.participants.length ?? 0,
      page: 1,
      size: Math.max(s?.participants.length ?? 0, 1),
    }),
  });
  const confirmed = (people.data ?? []).filter((p) => p.status === 'CONFIRMED');
  const locked = !!social.settlement_confirmed;

  const save = useMutation({
    mutationFn: (v: SocialSettlementInput) => saveSocialSettlement(id, v, confirmed),
    onSuccess: async () => {
      setEditing(false);
      await qc.invalidateQueries({ queryKey: settlementKey(id) });
      toast.success('정산을 저장했습니다');
    },
    onError: (e) => toast.error('정산을 저장하지 못했습니다', { description: errorMessage(e) }),
  });

  const toggle = useMutation({
    mutationFn: ({ p, on }: { p: SettlementPerson; on: boolean }) => markPaid(id, q.data!.id, p, on),
    onSuccess: () => qc.invalidateQueries({ queryKey: settlementKey(id) }),
    onError: (e) => toast.error('납부 상태를 바꾸지 못했습니다', { description: errorMessage(e) }),
  });

  const columns = useMemo(
    () => [
      col.accessor('user_name', {
        header: '참가자',
        cell: ({ row: { original: p } }) => (
          <span className="font-medium text-slate-900">
            {p.user_name}
            {p.is_guest && <Badge className="ml-1.5">게스트</Badge>}
          </span>
        ),
      }),
      col.accessor('amount', { header: '분담액', meta: { align: 'right' }, cell: (c) => formatWon(c.getValue()) }),
      col.display({
        id: 'paid',
        header: '납부',
        cell: ({ row: { original: p } }) =>
          writable ? (
            <Switch checked={p.is_paid} disabled={toggle.isPending} label={`${p.user_name} 납부`} onCheckedChange={(on) => toggle.mutate({ p, on })} />
          ) : p.is_paid ? (
            <Badge tone="success">납부</Badge>
          ) : (
            <Badge tone="warning">미납</Badge>
          ),
      }),
      col.accessor('paid_at', { header: '납부일', cell: (c) => formatDateTime(c.getValue()) }),
    ],
    [writable, toggle],
  );

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  const s = q.data;
  const defaults: SocialSettlementInput = s
    ? { items: s.expense_items, notes: s.notes ?? '' }
    : { items: social.social_cost ? [{ title: '참가비', amount: social.social_cost * confirmed.length, memo: null, covered_by_fee: false }] : [], notes: '' };
  const action = writable && !locked && (
    <Button variant={s ? undefined : 'primary'} disabled={!people.data} onClick={() => setEditing(true)}>
      {s ? '정산 수정' : '정산 만들기'}
    </Button>
  );

  return (
    <div className="space-y-4">
      {s ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="총액" value={formatWon(s.total_cost)} />
            <StatCard label="1인 분담" value={formatWon(s.amount_per_person)} />
            <StatCard label="대상" value={`${s.total_participants}명`} />
            <StatCard label="납부 완료" value={`${s.participants.filter((p) => p.is_paid).length}/${s.participants.length}`} />
          </div>
          <Card title="비용 항목" actions={action}>
            {locked && <p className="mb-2 text-sm text-slate-500">정산이 확정되어 수정할 수 없습니다.</p>}
            <ul className="divide-y divide-slate-100">
              {s.expense_items.map((it, i) => (
                <li key={it.id ?? i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-slate-900">{it.title}</span>
                    {it.covered_by_fee && <Badge className="ml-1.5">회비 처리</Badge>}
                    {it.memo && <span className="block text-xs text-slate-500">{it.memo}</span>}
                  </span>
                  <span className="tabular text-slate-900">{formatWon(it.amount)}</span>
                </li>
              ))}
            </ul>
            {s.notes && <p className="mt-3 text-sm text-slate-600">메모: {s.notes}</p>}
          </Card>
          <DataTable list={list} query={table} columns={columns} getRowId={(p) => p.id} empty={{ title: '정산 대상이 없습니다' }} />
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Receipt}
            title="아직 정산이 없습니다"
            description="모임이 끝나면 쓴 비용을 항목별로 넣어 참가자에게 정산 알림을 보내세요."
            action={action}
          />
        </Card>
      )}
      {editing && (
        <SettlementModal
          defaults={defaults}
          targets={confirmed.length}
          saving={save.isPending}
          onClose={() => setEditing(false)}
          onSave={(v) => save.mutate(v)}
        />
      )}
    </div>
  );
}
