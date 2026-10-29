import type { BulkResult } from "@/components/data-table/bulk";
import { api } from "@/lib/api/client";
import type {
  MeetingStatus,
  Participant,
  RoundDetail,
  ScoreRow,
  Team,
} from "./types";

export const ROUNDS_PATH = "/admin/meetings/rounding";
const M = "/admin/meetings";

/** 공통 목록 파라미터 → 현행 /admin/meetings/rounding (BE#46 정규화 전, BE#59 기간·정렬) */
export function mapRoundsQuery(
  q: Record<string, unknown>,
): Record<string, unknown> {
  const { q: search, ...rest } = q;
  return { ...rest, search };
}

export const fetchRound = (id: number) => api<RoundDetail>(`${M}/${id}`);
export const updateRoundStatus = (id: number, status: MeetingStatus) =>
  api(`${M}/${id}`, { method: "PUT", body: { status } });
export const deleteRound = (id: number) =>
  api(`${M}/${id}`, { method: "DELETE" });

export const fetchParticipants = (id: number) =>
  api<Participant[]>(`${M}/${id}/participants`);

export const fetchTeams = (id: number) => api<Team[]>(`${M}/${id}/teams`);
export const createTeam = (id: number, name: string) =>
  api<{ id: number }>(`${M}/${id}/teams`, { method: "POST", body: { name } });
export const renameTeam = (id: number, teamId: number, name: string) =>
  api(`${M}/${id}/teams/${teamId}`, { method: "PUT", body: { name } });
export const deleteTeam = (id: number, teamId: number) =>
  api(`${M}/${id}/teams/${teamId}`, { method: "DELETE" });
export const setTeamMembers = (
  id: number,
  teamId: number,
  participantIds: number[],
) =>
  api(`${M}/${id}/teams/${teamId}/members`, {
    method: "PUT",
    body: { participant_ids: participantIds },
  });
export const autoFormTeams = (
  id: number,
  formation_mode: string,
  team_size: number,
) =>
  api(`${M}/${id}/teams/auto-formation`, {
    method: "POST",
    body: { formation_mode, team_size },
  });

export const fetchScores = (id: number) =>
  api<{ scores: ScoreRow[] }>(`${M}/${id}/scores`);
export const saveScores = (
  id: number,
  items: { participant_id: number; score: number }[],
) =>
  api<BulkResult>(`${M}/${id}/scores/bulk`, { method: "PUT", body: { items } });
