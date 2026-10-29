import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "@/app/auth/useAuth";
import { DataTable } from "@/components/data-table/DataTable";
import type { ListConfig } from "@/components/data-table/listState";
import { useListState } from "@/components/data-table/useListState";
import { Badge, StatusBadge } from "@/components/display/StatusBadge";
import { StatusTabs } from "@/components/filter-bar/StatusTabs";
import type { Page } from "@/lib/api/envelope";
import { formatDateTime } from "@/lib/format";
import { usePII } from "@/lib/usePII";
import { GENDER } from "@/features/users/labels";
import { fetchParticipants } from "../api";
import { PARTICIPANT_ROLE } from "../labels";
import { participantsKey } from "./board";
import type { Participant } from "../types";

const CONFIG: ListConfig = { filters: { pstatus: "single" } };
const col = createColumnHelper<Participant>();

/** 참가자 (F-052). API 가 전체를 한 번에 주므로 상태 탭은 화면에서 거른다 */
export function ParticipantsTab({ roundId }: { roundId: number }) {
  const { can } = useAuth();
  const pii = usePII();
  const list = useListState(CONFIG);
  const status = list.state.filters.pstatus as string | undefined;
  const all = useQuery({
    queryKey: participantsKey(roundId),
    queryFn: () => fetchParticipants(roundId),
  });
  const query = useQuery({
    queryKey: participantsKey(roundId),
    queryFn: () => fetchParticipants(roundId),
    select: (rows): Page<Participant> => {
      const items = status ? rows.filter((p) => p.status === status) : rows;
      return {
        items,
        total: items.length,
        page: 1,
        size: Math.max(items.length, 1),
      };
    },
  });
  const count = (s: string) => all.data?.filter((p) => p.status === s).length;

  const columns = useMemo(
    () => [
      col.accessor("user_nickname", {
        header: "참가자",
        cell: ({ row: { original: p } }) => {
          const label = (
            <>
              <span className="font-medium text-slate-900">
                {p.user_nickname}
              </span>
              {p.is_guest ? (
                <Badge className="ml-1.5">게스트</Badge>
              ) : (
                <span className="block text-xs text-slate-500">
                  {pii.name(p.user_name)}
                </span>
              )}
            </>
          );
          return !p.is_guest && p.user_id && can("users") ? (
            <Link to={`/users/${p.user_id}`} className="block hover:underline">
              {label}
            </Link>
          ) : (
            <div>{label}</div>
          );
        },
      }),
      col.display({
        id: "guest",
        header: "게스트 정보",
        cell: ({ row: { original: p } }) =>
          p.is_guest
            ? [
                p.guest_gender && (GENDER[p.guest_gender] ?? p.guest_gender),
                p.guest_handicap != null && `핸디 ${p.guest_handicap}`,
              ]
                .filter(Boolean)
                .join(" · ") || "-"
            : "-",
      }),
      col.accessor("role", {
        header: "역할",
        cell: (c) => PARTICIPANT_ROLE[c.getValue()] ?? c.getValue(),
      }),
      col.accessor("status", {
        header: "상태",
        cell: (c) => <StatusBadge domain="participant" value={c.getValue()} />,
      }),
      col.accessor("created_at", {
        header: "신청일",
        cell: (c) => formatDateTime(c.getValue()),
      }),
    ],
    [pii, can],
  );

  return (
    <DataTable
      list={list}
      query={query}
      columns={columns}
      getRowId={(p) => p.id}
      empty={{ title: "참가자가 없습니다" }}
      toolbar={
        <StatusTabs
          list={list}
          filterKey="pstatus"
          options={[
            { value: "", label: "전체", count: all.data?.length },
            { value: "CONFIRMED", label: "확정", count: count("CONFIRMED") },
            { value: "PENDING", label: "신청", count: count("PENDING") },
            {
              value: "WAITING_LIST",
              label: "대기",
              count: count("WAITING_LIST"),
            },
            { value: "CANCELED", label: "취소", count: count("CANCELED") },
          ]}
        />
      }
    />
  );
}
