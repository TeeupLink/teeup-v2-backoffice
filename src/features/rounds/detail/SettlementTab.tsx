import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Card, StatCard } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { Badge } from '@/components/display/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { Switch } from '@/components/form/Switch';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatWon } from '@/lib/format';
import { fetchParticipants, fetchSettlement, markPaid, saveSettlement, type SettlementInput } from '../api';
import type { RoundDetail, SettlementPerson } from '../types';
import { participantsKey } from './board';
import { SettlementFormModal } from './SettlementFormModal';

const CONFIG = {};
const col = createColumnHelper<SettlementPerson>();
const settlementKey = (id: number) => ['round', id, 'settlement'] as const;

/** 정산 (F-055) — 요약·항목, 참가자별 납부 토글(즉시 저장), 정산 입력 */
export function SettlementTab({ round, writable }: { round: RoundDetail; writable: boolean }) {
  const id = round.id;
  const qc = useQueryClient();
  const list = useListState(CONFIG);
  const [editing, setEditing] = useState(false);
  const q = useQuery({ queryKey: settlementKey(id), queryFn: () => fetchSettlement(id) });
  const people = useQuery({ queryKey: participantsKey(id), queryFn: () => fetchParticipants(id) });
  const table = useQuery({
    queryKey: settlementKey(id),
    queryFn: () => fetchSettlement(id),
    select: (s): Page<SettlementPerson> => ({ items: s?.participants ?? [], total: s?.participants.length ?? 0, page: 1, size: Math.max(s?.participants.length ?? 0, 1) }),
  });
  const confirmed = (people.data ?? []).filter((p) => p.status === 'CONFIRMED');

  const save = useMutation({
    mutationFn: (v: SettlementInput) => saveSettlement(id, v, confirmed),
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
  const per = (v: number | null) => (v ?? 0) * confirmed.length;
  const defaults: SettlementInput = s
    ? { green_fee: s.green_fee ?? 0, caddy_fee: s.caddy_fee ?? 0, cart_fee: s.cart_fee ?? 0, others: s.other_expense_items ?? [], notes: s.notes ?? '' }
    : { green_fee: per(round.green_fee), caddy_fee: per(round.caddy_fee), cart_fee: per(round.cart_fee), others: [], notes: '' };
  const action = writable && (
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
            <DescriptionList
              columns={3}
              items={[
                { label: '그린피', value: formatWon(s.green_fee) },
                { label: '캐디피', value: formatWon(s.caddy_fee) },
                { label: '카트비', value: formatWon(s.cart_fee) },
                ...(s.other_expense_items ?? []).map((o, i) => ({ label: `기타 ${i + 1} · ${o.title}`, value: formatWon(o.amount) })),
                { label: '메모', value: s.notes || '-', full: true },
              ]}
            />
          </Card>
          <DataTable list={list} query={table} columns={columns} getRowId={(p) => p.id} empty={{ title: '정산 대상이 없습니다' }} />
        </>
      ) : (
        <Card>
          <EmptyState icon={Receipt} title="아직 정산이 없습니다" description="라운딩이 끝나면 비용을 입력해 참가자에게 정산 알림을 보내세요." action={action} />
        </Card>
      )}
      {editing && <SettlementFormModal defaults={defaults} targets={confirmed.length} saving={save.isPending} onClose={() => setEditing(false)} onSave={(v) => save.mutate(v)} />}
    </div>
  );
}
