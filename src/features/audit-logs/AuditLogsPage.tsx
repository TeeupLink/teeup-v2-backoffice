import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import type { ListConfig } from '@/components/data-table/listState';
import { useListQuery } from '@/components/data-table/useListQuery';
import { useListState } from '@/components/data-table/useListState';
import { confirm } from '@/components/dialog/confirm-store';
import { StatusBadge } from '@/components/display/StatusBadge';
import { toast } from '@/components/feedback/toast-store';
import { FilterBar } from '@/components/filter-bar/FilterBar';
import { filterKeys, type FilterDef } from '@/components/filter-bar/types';
import { TextInput } from '@/components/form/controls';
import { PageHeader } from '@/components/layout/PageHeader';
import { RouteTabs } from '@/components/layout/RouteTabs';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { AUDIT_PATH, exportAuditLogs, type AuditRow } from './api';
import { ActionBadge, AuditLogDrawer, TargetLabel } from './AuditLogDrawer';
import { actionOptions, targetOptions } from './labels';
import { AUDIT_TABS } from './tabs';

// SCR-093 감사 로그 (F-091). 기간 미지정 시 백엔드가 최근 7일로 조회한다
const DEFS: FilterDef[] = [
  { kind: 'multi', key: 'action', label: '행위', options: actionOptions },
  { kind: 'select', key: 'target_type', label: '대상', options: targetOptions },
  {
    kind: 'custom',
    key: 'target_id',
    label: '대상 ID',
    render: (v, onChange) => (
      <TextInput
        key={String(v ?? '')}
        aria-label="대상 ID"
        placeholder="대상 ID"
        className="w-28"
        defaultValue={(v as string | undefined) ?? ''}
        onKeyDown={(e) => e.key === 'Enter' && onChange(e.currentTarget.value.trim() || undefined)}
        onBlur={(e) => onChange(e.currentTarget.value.trim() || undefined)}
      />
    ),
    chipLabel: (v) => `#${String(v)}`,
  },
  {
    kind: 'custom',
    key: 'actor_id',
    label: '관리자',
    render: (v, onChange) => (
      <TextInput
        key={String(v ?? '')}
        aria-label="관리자 ID"
        placeholder="관리자 ID"
        inputMode="numeric"
        className="w-28"
        defaultValue={(v as string | undefined) ?? ''}
        onKeyDown={(e) => e.key === 'Enter' && onChange(e.currentTarget.value.replace(/\D/g, '') || undefined)}
        onBlur={(e) => onChange(e.currentTarget.value.replace(/\D/g, '') || undefined)}
      />
    ),
    chipLabel: (v) => `관리자 #${String(v)}`,
  },
  {
    kind: 'select',
    key: 'result',
    label: '결과',
    options: [
      { value: 'SUCCESS', label: '성공' },
      { value: 'FAIL', label: '실패' },
    ],
  },
  { kind: 'dateRange', key: 'date_from', toKey: 'date_to', label: '기간' },
];
const CONFIG: ListConfig = { filters: filterKeys(DEFS), defaultSort: '-created_at', sortable: ['created_at'] };

const col = createColumnHelper<AuditRow>();

export function AuditLogsPage() {
  const list = useListState(CONFIG);
  const query = useListQuery<AuditRow>('audit-logs', AUDIT_PATH, list.state);
  const [open, setOpen] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const columns = useMemo(
    () => [
      col.accessor('created_at', {
        header: '일시',
        meta: { sortKey: 'created_at' },
        cell: ({ row: { original: r } }) => (
          <button type="button" onClick={() => setOpen(r.id)} className="tabular whitespace-nowrap text-left font-medium text-slate-900 hover:underline">
            {formatDateTime(r.created_at)}
          </button>
        ),
      }),
      col.display({
        id: 'actor',
        header: '관리자',
        cell: ({ row: { original: r } }) => (
          <>
            <span className="text-slate-900">{r.actor.email || '(알 수 없음)'}</span>
            {r.actor.role && <span className="block text-xs text-slate-500">{r.actor.role}</span>}
          </>
        ),
      }),
      col.accessor('action', { header: '행위', cell: (c) => <ActionBadge action={c.getValue()} /> }),
      col.display({ id: 'target', header: '대상', cell: ({ row }) => <TargetLabel row={row.original} /> }),
      col.accessor('reason', {
        header: '사유',
        meta: { className: 'max-w-[240px]' },
        cell: (c) => <span className="block truncate text-slate-600">{c.getValue() || '-'}</span>,
      }),
      col.accessor('ip', { header: 'IP', cell: (c) => <span className="tabular text-slate-500">{c.getValue()}</span> }),
      col.accessor('result', { header: '결과', cell: (c) => <StatusBadge domain="auditResult" value={c.getValue()} /> }),
    ],
    [],
  );

  const onExport = async () => {
    const ok = await confirm({
      title: '감사 로그를 내보낼까요?',
      description: '지금 필터의 기록을 CSV로 받습니다. 내보내기도 감사 로그에 남습니다.',
      confirmText: '내보내기',
      reason: { label: '사유', placeholder: '예: 10월 월간 점검', required: true },
    });
    if (!ok) return;
    setExporting(true);
    try {
      await exportAuditLogs(list.state, ok.reason);
    } catch (e) {
      toast.error('내보내지 못했습니다', { description: errorMessage(e) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="감사 로그"
        description="관리자의 변경·개인정보 열람·내보내기·로그인 기록입니다. 기간을 정하지 않으면 최근 7일을 보여 줍니다."
        actions={
          <Button onClick={onExport} loading={exporting}>
            <Download className="h-4 w-4" aria-hidden />
            CSV 내보내기
          </Button>
        }
      />
      <RouteTabs tabs={AUDIT_TABS} label="감사 로그 탭" />
      <div className="mb-3">
        <FilterBar list={list} defs={DEFS} searchPlaceholder="관리자 이메일·요청 경로" />
      </div>
      <DataTable list={list} query={query} columns={columns} getRowId={(r) => r.id} empty={{ title: '기록이 없습니다', description: '기간을 넓혀 보세요.' }} />
      <AuditLogDrawer id={open} onClose={() => setOpen(null)} onSelect={setOpen} />
    </>
  );
}
