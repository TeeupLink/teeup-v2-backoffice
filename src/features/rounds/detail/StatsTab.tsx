import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { useListState } from "@/components/data-table/useListState";
import { StatCard } from "@/components/display/Card";
import { Badge } from "@/components/display/StatusBadge";
import type { Page } from "@/lib/api/envelope";
import { usePII } from "@/lib/usePII";
import { boardKey, fetchBoard, roundStats, type Ranked } from "./board";

const CONFIG = {};
const col = createColumnHelper<Ranked>();

export function StatsTab({ roundId }: { roundId: number }) {
  const pii = usePII();
  const list = useListState(CONFIG);
  const board = useQuery({
    queryKey: boardKey(roundId),
    queryFn: () => fetchBoard(roundId),
    select: roundStats,
  });
  const table = useQuery({
    queryKey: boardKey(roundId),
    queryFn: () => fetchBoard(roundId),
    select: (b): Page<Ranked> => {
      const { ranked } = roundStats(b);
      return {
        items: ranked,
        total: ranked.length,
        page: 1,
        size: Math.max(ranked.length, 1),
      };
    },
  });
  const s = board.data;
  const columns = useMemo(
    () => [
      col.accessor("rank", {
        header: "순위",
        meta: { align: "right", className: "w-16" },
      }),
      col.display({
        id: "name",
        header: "참가자",
        cell: ({ row: { original: r } }) => (
          <span className="font-medium text-slate-900">
            {r.user_nickname}
            {r.is_guest ? (
              <Badge className="ml-1.5">게스트</Badge>
            ) : (
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                {pii.name(r.user_name)}
              </span>
            )}
          </span>
        ),
      }),
      col.display({
        id: "team",
        header: "팀",
        cell: ({ row: { original: r } }) => r.team?.name ?? "-",
      }),
      col.accessor("score", { header: "총타", meta: { align: "right" } }),
    ],
    [pii],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="확정 참가자" value={s?.participants ?? "-"} />
        <StatCard label="팀" value={s?.teams ?? "-"} />
        <StatCard
          label="평균 타수"
          value={s?.average ?? "-"}
          hint={
            s && <span className="text-slate-500">입력 {s.scored}명 기준</span>
          }
        />
        <StatCard label="최저타 (베스트)" value={s?.best ?? "-"} />
        <StatCard label="최고타" value={s?.worst ?? "-"} />
      </div>
      <DataTable
        list={list}
        query={table}
        columns={columns}
        getRowId={(r) => r.id}
        empty={{
          title: "아직 입력된 점수가 없습니다",
          description: "점수 탭에서 총타를 입력하면 순위가 나옵니다.",
        }}
      />
    </div>
  );
}
