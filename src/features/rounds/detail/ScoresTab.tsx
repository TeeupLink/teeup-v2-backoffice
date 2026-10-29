import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { createContext, useContext, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { BulkFailureDialog } from '@/components/data-table/BulkFailureDialog';
import type { BulkResult } from '@/components/data-table/bulk';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import { toast } from '@/components/feedback/toast-store';
import { TextInput } from '@/components/form/controls';
import { useUnsavedGuard } from '@/components/form/useUnsavedGuard';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { usePII } from '@/lib/usePII';
import { saveScores } from '../api';
import { SCORE_MAX, SCORE_MIN } from '../labels';
import { boardKey, fetchBoard, scoreError, type BoardRow } from './board';

const CONFIG = {};
const col = createColumnHelper<BoardRow>();

type Edits = {
  edits: Record<number, string>;
  setEdit: (pid: number, v: string) => void;
  writable: boolean;
};
// 입력값은 컨텍스트로 — 열 정의가 입력마다 바뀌면 셀이 다시 만들어져 포커스가 빠진다
const EditsContext = createContext<Edits>({
  edits: {},
  setEdit: () => {},
  writable: false,
});

function ScoreCell({ row: r }: { row: BoardRow }) {
  const { edits, setEdit, writable } = useContext(EditsContext);
  if (r.is_guest) return <span className="text-slate-400">입력 불가</span>;
  if (!writable) return <>{r.score ?? '-'}</>;
  const raw = edits[r.id];
  const v = raw ?? (r.score != null ? String(r.score) : '');
  const err = scoreError(v);
  const dirty = raw !== undefined && raw.trim() !== '' && Number(raw) !== r.score;
  return (
    <div className="flex items-center gap-2">
      <TextInput
        aria-label={`${r.user_nickname} 총타`}
        inputMode="numeric"
        className={cn('w-20 text-right tabular', dirty && 'bg-amber-50')}
        aria-invalid={!!err}
        value={v}
        onChange={(e) => setEdit(r.id, e.target.value)}
      />
      {err ? <span className="text-xs text-red-600">{err}</span> : dirty && <span className="text-xs text-amber-700">변경됨</span>}
    </div>
  );
}

/** 총타 입력 (F-054). 바꾼 행만 모아 한 번에 저장 */
export function ScoresTab({ roundId, writable }: { roundId: number; writable: boolean }) {
  const qc = useQueryClient();
  const pii = usePII();
  const list = useListState(CONFIG);
  const query = useQuery({
    queryKey: boardKey(roundId),
    queryFn: () => fetchBoard(roundId),
    select: (b): Page<BoardRow> => ({
      items: b.rows,
      total: b.rows.length,
      page: 1,
      size: Math.max(b.rows.length, 1),
    }),
  });
  const rows = query.data?.items;
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [failures, setFailures] = useState<BulkResult['failed'] | null>(null);

  const changed = Object.entries(edits).filter(([pid, v]) => {
    const row = rows?.find((r) => r.id === Number(pid));
    return row && v.trim() !== '' && Number(v) !== row.score;
  });
  const invalid = changed.some(([, v]) => scoreError(v));
  useUnsavedGuard(changed.length > 0 && !saving);

  const columns = useMemo(
    () => [
      col.display({
        id: 'team',
        header: '팀',
        cell: ({ row: { original: r } }) => r.team?.name ?? <span className="text-slate-400">미배정</span>,
      }),
      col.display({
        id: 'name',
        header: '참가자',
        cell: ({ row: { original: r } }) => (
          <span>
            <span className="font-medium text-slate-900">{r.is_guest ? r.user_name : pii.name(r.user_name)}</span>
            {r.is_guest && <Badge className="ml-1.5">게스트</Badge>}
          </span>
        ),
      }),
      col.display({
        id: 'score',
        header: '총타',
        cell: ({ row: { original: r } }) => <ScoreCell row={r} />,
      }),
    ],
    [pii],
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveScores(
        roundId,
        changed.map(([pid, v]) => ({
          participant_id: Number(pid),
          score: Number(v),
        })),
      );
      setEdits((s) => {
        const next = { ...s };
        for (const id of res.succeeded) delete next[Number(id)];
        return next;
      });
      await qc.invalidateQueries({ queryKey: boardKey(roundId) });
      if (res.failed.length) setFailures(res.failed);
      else toast.success(`${res.succeeded.length}건을 저장했습니다`);
    } catch (e) {
      toast.error('저장하지 못했습니다', { description: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {writable && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            회원만 입력할 수 있습니다 ({SCORE_MIN}~{SCORE_MAX}). 저장하면 해당 회원의 핸디캡이 다시 계산됩니다.
          </p>
          <Button variant="primary" disabled={!changed.length || invalid} loading={saving} onClick={() => void save()}>
            변경 {changed.length}건 저장
          </Button>
        </div>
      )}
      <EditsContext.Provider
        value={{
          edits,
          setEdit: (pid, v) => setEdits((e) => ({ ...e, [pid]: v })),
          writable,
        }}
      >
        <DataTable list={list} query={query} columns={columns} getRowId={(r) => r.id} empty={{ title: '참가자가 없습니다' }} />
      </EditsContext.Provider>
      <BulkFailureDialog
        failures={failures}
        onClose={() => setFailures(null)}
        label={(id) => rows?.find((r) => r.id === Number(id))?.user_nickname ?? String(id)}
      />
    </div>
  );
}
