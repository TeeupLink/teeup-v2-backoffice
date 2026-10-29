import { fetchParticipants, fetchScores, fetchTeams } from "../api";
import { SCORE_MAX, SCORE_MIN } from "../labels";
import type { Participant, Team } from "../types";

export const participantsKey = (id: number) =>
  ["round", id, "participants"] as const;
export const boardKey = (id: number) => ["round", id, "board"] as const;

export type BoardRow = Participant & {
  team: Team | null;
  score: number | null;
};
export type Board = { rows: BoardRow[]; teams: Team[] };

/** 참가자 + 팀 + 총타를 한 줄로 (점수·통계 탭). 취소한 참가자는 빼고 팀 순서대로 */
export async function fetchBoard(roundId: number): Promise<Board> {
  const [participants, teams, scores] = await Promise.all([
    fetchParticipants(roundId),
    fetchTeams(roundId),
    fetchScores(roundId),
  ]);
  const teamOf = new Map<number, Team>();
  for (const t of teams)
    for (const m of t.members)
      if (m.participant_id != null) teamOf.set(m.participant_id, t);
  const scoreOf = new Map(
    scores.scores.map((s) => [s.participant_id, s.score]),
  );
  const order = new Map(teams.map((t, i) => [t.id, i]));
  const rank = (r: BoardRow) =>
    r.team ? order.get(r.team.id)! : Number.MAX_SAFE_INTEGER;
  const rows = participants
    .filter((p) => p.status !== "CANCELED")
    .map((p) => ({
      ...p,
      team: teamOf.get(p.id) ?? null,
      score: scoreOf.get(p.id) ?? null,
    }))
    .sort((a, b) => rank(a) - rank(b));
  return { rows, teams };
}

/** 입력값 검사. 빈 칸은 "입력 안 함" */
export function scoreError(v: string): string | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= SCORE_MIN && n <= SCORE_MAX
    ? null
    : `${SCORE_MIN}~${SCORE_MAX}`;
}

export type Ranked = BoardRow & { rank: number };

/** 통계 (F-056) — 서버 통계 API 없이 참가자·팀·점수로 계산 */
export function roundStats(b: Board) {
  const scored = b.rows.filter((r) => r.score != null) as (BoardRow & {
    score: number;
  })[];
  const values = scored.map((r) => r.score);
  const sorted = [...scored].sort((a, c) => a.score - c.score);
  // 동타는 같은 순위 (1, 2, 2, 4)
  const ranked: Ranked[] = sorted.map((r) => ({
    ...r,
    rank: sorted.findIndex((x) => x.score === r.score) + 1,
  }));
  return {
    participants: b.rows.filter((r) => r.status === "CONFIRMED").length,
    teams: b.teams.length,
    scored: scored.length,
    average: values.length
      ? Math.round((values.reduce((a, c) => a + c, 0) / values.length) * 10) /
        10
      : null,
    best: values.length ? Math.min(...values) : null,
    worst: values.length ? Math.max(...values) : null,
    ranked,
  };
}
