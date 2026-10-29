import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Drawer } from '@/components/dialog/Drawer';
import { DescriptionList } from '@/components/display/DescriptionList';
import { JsonDiff } from '@/components/display/JsonDiff';
import { Badge, StatusBadge } from '@/components/display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatDateTime } from '@/lib/format';
import { fetchAuditLog, type AuditRow } from './api';
import { ACTION, TARGET, targetHref } from './labels';

export function ActionBadge({ action }: { action: string }) {
  const a = ACTION[action];
  return <Badge tone={a?.tone ?? 'neutral'}>{a?.label ?? action}</Badge>;
}

export function TargetLabel({ row }: { row: Pick<AuditRow, 'target_type' | 'target_id'> }) {
  if (!row.target_type) return <span className="text-slate-400">-</span>;
  const text = `${TARGET[row.target_type] ?? row.target_type}${row.target_id ? ` #${row.target_id}` : ''}`;
  const href = targetHref(row.target_type, row.target_id);
  return href ? (
    <Link to={href} className="text-slate-700 hover:underline">
      {text}
    </Link>
  ) : (
    <span className="text-slate-700">{text}</span>
  );
}

/** SCR-093-D1 감사 로그 상세 — 요청 정보 + 변경 전후 + 같은 요청 묶음. 편집·삭제 없음 */
export function AuditLogDrawer({ id, onClose, onSelect }: { id: number | null; onClose: () => void; onSelect: (id: number) => void }) {
  const q = useQuery({ queryKey: ['audit-logs', 'detail', id], queryFn: () => fetchAuditLog(id!), enabled: id != null });
  const d = q.data;

  return (
    <Drawer open={id != null} onOpenChange={(o) => !o && onClose()} title="감사 로그 상세">
      {q.isPending && id != null && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      )}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {d && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge action={d.action} />
            <StatusBadge domain="auditResult" value={d.result} />
            <span className="text-sm text-slate-500 tabular">{formatDateTime(d.created_at)}</span>
          </div>
          <DescriptionList
            items={[
              { label: '관리자', value: d.actor.email || '(알 수 없음)' },
              { label: '역할', value: d.actor.role },
              { label: '대상', value: <TargetLabel row={d} /> },
              { label: '응답', value: <span className="tabular">{d.status_code}</span> },
              { label: '요청', value: <span className="break-all font-mono text-xs">{`${d.method} ${d.path}`}</span>, full: true },
              { label: '사유', value: d.reason, full: true },
              { label: 'IP', value: <span className="tabular">{d.ip}</span> },
              { label: '요청 ID', value: <span className="break-all font-mono text-xs">{d.request_id}</span> },
              { label: '브라우저', value: <span className="break-all text-xs text-slate-600">{d.user_agent}</span>, full: true },
            ]}
          />
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">변경 내용</h3>
            <JsonDiff before={d.before} after={d.after} />
          </section>
          {d.meta && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">부가 정보</h3>
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(d.meta, null, 2)}</pre>
            </section>
          )}
          {d.related.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">같은 요청의 다른 기록 {d.related.length}건</h3>
              <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
                {d.related.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onSelect(r.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <ActionBadge action={r.action} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {TARGET[r.target_type ?? ''] ?? r.target_type} {r.target_id && `#${r.target_id}`}
                      </span>
                      <StatusBadge domain="auditResult" value={r.result} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
