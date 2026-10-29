import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Shuffle, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import { confirm } from '@/components/dialog/confirm-store';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toast-store';
import { Select } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { autoFormTeams, createTeam, deleteTeam, renameTeam, setTeamMembers } from '../api';
import type { RoundDetail, Team } from '../types';
import { AutoFormationModal } from './AutoFormationModal';
import { boardKey, fetchBoard, type BoardRow } from './board';

type Chip = {
  pid: number;
  name: string;
  guest: boolean;
  handicap: number | null;
};

function chipsOf(team: Team, rows: BoardRow[]): Chip[] {
  return team.members
    .filter((m) => m.participant_id != null)
    .map((m) => {
      const r = rows.find((x) => x.id === m.participant_id);
      return {
        pid: m.participant_id!,
        name: r?.user_nickname ?? m.user_nickname,
        guest: m.is_guest,
        handicap: m.handicap,
      };
    });
}

function MemberChip({ c, selected, onToggle, selectable }: { c: Chip; selected: boolean; onToggle: () => void; selectable: boolean }) {
  return (
    <li>
      <label
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
          selectable && 'cursor-pointer hover:bg-slate-50',
          selected && 'bg-primary-50 ring-1 ring-primary-200',
        )}
      >
        {selectable && <input type="checkbox" checked={selected} onChange={onToggle} className="h-4 w-4 accent-primary-800" aria-label={`${c.name} 선택`} />}
        <span className="font-medium text-slate-900">{c.name}</span>
        {c.guest && <Badge>게스트</Badge>}
        <span className="ml-auto text-xs tabular text-slate-500">{c.handicap != null ? `핸디 ${c.handicap}` : ''}</span>
      </label>
    </li>
  );
}

/** 팀 편성 (F-053) — 팀 카드 + 미배정, 선택한 참가자를 다른 팀으로 이동 */
export function TeamsTab({ round, writable }: { round: RoundDetail; writable: boolean }) {
  const id = round.id;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: boardKey(id), queryFn: () => fetchBoard(id) });
  const [selected, setSelected] = useState<number[]>([]);
  const [target, setTarget] = useState('');
  const [autoOpen, setAutoOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['round', id] });
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(label);
      return true;
    } catch (e) {
      toast.error('처리하지 못했습니다', { description: errorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const auto = useMutation({
    mutationFn: ({ mode, size }: { mode: string; size: number }) => autoFormTeams(id, mode, size),
    onSuccess: async () => {
      setAutoOpen(false);
      setSelected([]);
      await refresh();
      toast.success('자동 편성을 마쳤습니다');
    },
    onError: (e) => toast.error('편성하지 못했습니다', { description: errorMessage(e) }),
  });

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;

  const { rows, teams } = q.data;
  const toggle = (pid: number) => setSelected((s) => (s.includes(pid) ? s.filter((x) => x !== pid) : [...s, pid]));
  const unassigned: Chip[] = rows
    .filter((r) => !r.team && r.status === 'CONFIRMED')
    .map((r) => ({
      pid: r.id,
      name: r.user_nickname,
      guest: r.is_guest,
      handicap: r.guest_handicap ?? null,
    }));
  const confirmed = rows.filter((r) => r.status === 'CONFIRMED').length;

  const moveTo = async (teamId: number) => {
    const team = teams.find((t) => t.id === teamId)!;
    const keep = chipsOf(team, rows)
      .map((c) => c.pid)
      .filter((p) => !selected.includes(p));
    if (await run(`${selected.length}명을 ${team.name}(으)로 옮겼습니다`, () => setTeamMembers(id, teamId, [...keep, ...selected]))) {
      setSelected([]);
      setTarget('');
    }
  };

  const unassign = async () => {
    const affected = teams.filter((t) => chipsOf(t, rows).some((c) => selected.includes(c.pid)));
    const ok = await run('배정을 해제했습니다', async () => {
      for (const t of affected)
        await setTeamMembers(
          id,
          t.id,
          chipsOf(t, rows)
            .map((c) => c.pid)
            .filter((p) => !selected.includes(p)),
        );
    });
    if (ok) setSelected([]);
  };

  const rename = async (t: Team) => {
    const r = await confirm({
      title: '팀 이름 바꾸기',
      confirmText: '저장',
      reason: { label: '새 이름', placeholder: t.name, required: true },
    });
    if (r) await run('팀 이름을 바꿨습니다', () => renameTeam(id, t.id, r.reason.trim()));
  };

  const remove = async (t: Team) => {
    const ok = await confirm({
      title: `${t.name}을(를) 삭제할까요?`,
      description: '팀원은 미배정으로 돌아갑니다.',
      confirmText: '삭제',
      tone: 'danger',
    });
    if (ok) await run('팀을 삭제했습니다', () => deleteTeam(id, t.id));
  };

  return (
    <div className="space-y-4">
      {writable && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAutoOpen(true)}>
            <Shuffle className="h-4 w-4" aria-hidden />
            자동 편성
          </Button>
          <Button onClick={() => void run('팀을 추가했습니다', () => createTeam(id, `${teams.length + 1}조`))} disabled={busy}>
            <Plus className="h-4 w-4" aria-hidden />팀 추가
          </Button>
          {selected.length > 0 && (
            <div
              className="ml-auto flex flex-wrap items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-sm"
              role="region"
              aria-label="선택한 참가자 작업"
            >
              <span className="font-medium text-primary-900">{selected.length}명 선택</span>
              <Select
                aria-label="옮길 팀"
                className="w-36"
                value={target}
                placeholder="팀 선택"
                onChange={(e) => setTarget(e.target.value)}
                options={teams.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                }))}
              />
              <Button size="sm" variant="primary" disabled={!target || busy} onClick={() => void moveTo(Number(target))}>
                팀으로 이동
              </Button>
              <Button size="sm" disabled={busy} onClick={() => void unassign()}>
                배정 해제
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                선택 취소
              </Button>
            </div>
          )}
        </div>
      )}

      {teams.length === 0 && unassigned.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="확정된 참가자가 없습니다" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => {
            const chips = chipsOf(t, rows);
            const hcs = chips.map((c) => c.handicap).filter((h): h is number => h != null);
            return (
              <Card
                key={t.id}
                title={
                  <span>
                    {t.name} <span className="text-sm font-normal text-slate-500">{chips.length}명</span>
                  </span>
                }
                actions={
                  writable && (
                    <>
                      <Button size="sm" variant="ghost" aria-label={`${t.name} 이름 바꾸기`} onClick={() => void rename(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="danger-ghost" aria-label={`${t.name} 삭제`} onClick={() => void remove(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )
                }
                bodyClassName="px-3 py-3"
              >
                {chips.length ? (
                  <ul aria-label={`${t.name} 팀원`}>
                    {chips.map((c) => (
                      <MemberChip key={c.pid} c={c} selectable={writable} selected={selected.includes(c.pid)} onToggle={() => toggle(c.pid)} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-3 text-sm text-slate-400">팀원이 없습니다</p>
                )}
                {hcs.length > 0 && (
                  <p className="mt-2 border-t border-slate-100 px-2 pt-2 text-xs text-slate-500">
                    평균 핸디 {(hcs.reduce((a, b) => a + b, 0) / hcs.length).toFixed(1)}
                  </p>
                )}
              </Card>
            );
          })}
          <Card
            title={
              <span>
                미배정 <span className="text-sm font-normal text-slate-500">{unassigned.length}명</span>
              </span>
            }
            className="bg-slate-50"
            bodyClassName="px-3 py-3"
          >
            {unassigned.length ? (
              <ul aria-label="미배정 참가자">
                {unassigned.map((c) => (
                  <MemberChip key={c.pid} c={c} selectable={writable} selected={selected.includes(c.pid)} onToggle={() => toggle(c.pid)} />
                ))}
              </ul>
            ) : (
              <p className="px-2 py-3 text-sm text-slate-400">모든 확정 참가자가 배정됐습니다</p>
            )}
          </Card>
        </div>
      )}

      {autoOpen && (
        <AutoFormationModal
          open
          onOpenChange={setAutoOpen}
          defaults={{ mode: round.team_formation_mode, size: round.team_size }}
          confirmed={confirmed}
          hasTeams={teams.length > 0}
          running={auto.isPending}
          onRun={(mode, size) => auto.mutate({ mode, size })}
        />
      )}
    </div>
  );
}
