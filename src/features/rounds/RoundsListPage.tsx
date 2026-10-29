import { createColumnHelper } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "@/app/auth/useAuth";
import { DataTable } from "@/components/data-table/DataTable";
import type { ListConfig } from "@/components/data-table/listState";
import { useListQuery } from "@/components/data-table/useListQuery";
import { useListState } from "@/components/data-table/useListState";
import { StatusBadge } from "@/components/display/StatusBadge";
import { FilterBar } from "@/components/filter-bar/FilterBar";
import { StatusTabs } from "@/components/filter-bar/StatusTabs";
import { filterKeys, type FilterDef } from "@/components/filter-bar/types";
import { LookupSelect } from "@/components/form/LookupSelect";
import { lookupLabel } from "@/components/form/lookupLabels";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { mapRoundsQuery, ROUNDS_PATH } from "./api";
import { SUBTYPE } from "./labels";
import type { RoundRow } from "./types";

// SCR-050 라운딩 목록 (화면설계서 4.6, F-050)
const DEFS: FilterDef[] = [
  {
    kind: "custom",
    key: "club_id",
    label: "클럽",
    render: (v, onChange) => (
      <LookupSelect
        kind="clubs"
        value={v as string | undefined}
        onChange={(id) => onChange(id)}
        placeholder="클럽 전체"
      />
    ),
    chipLabel: (v) => lookupLabel("clubs", String(v)),
  },
  {
    kind: "select",
    key: "date",
    label: "모임일",
    options: [{ value: "today", label: "오늘" }],
  },
  { kind: "dateRange", key: "date_from", toKey: "date_to", label: "기간" },
];
const CONFIG: ListConfig = {
  filters: filterKeys(DEFS, ["status"]),
  defaultSort: "-meeting_time",
  sortable: ["meeting_time"],
};

const col = createColumnHelper<RoundRow>();

export function RoundsListPage() {
  const { can } = useAuth();
  const list = useListState(CONFIG);
  const query = useListQuery<RoundRow>("rounds", ROUNDS_PATH, list.state, {
    mapQuery: mapRoundsQuery,
  });

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: "모임명",
        cell: ({ row: { original: r } }) => (
          <Link
            to={`/rounds/${r.id}`}
            className="block font-medium text-slate-900 hover:underline"
          >
            {r.name}
            {r.meeting_subtype && (
              <span className="block text-xs font-normal text-slate-500">
                {SUBTYPE[r.meeting_subtype] ?? r.meeting_subtype}
              </span>
            )}
          </Link>
        ),
      }),
      col.accessor("club_name", { header: "클럽" }),
      col.accessor("meeting_time", {
        header: "일시",
        meta: { sortKey: "meeting_time" },
        cell: (c) => formatDateTime(c.getValue()),
      }),
      col.accessor("course_name", {
        header: "골프장",
        cell: (c) => c.getValue() || "-",
      }),
      col.display({
        id: "count",
        header: "참가",
        meta: { align: "right" },
        cell: ({ row: { original: r } }) => (
          <span className="tabular">
            {r.confirmed_count ?? r.participant_count}
            <span className="text-slate-400">/{r.max_participants || "-"}</span>
          </span>
        ),
      }),
      col.display({
        id: "creator",
        header: "개설자",
        cell: ({ row: { original: r } }) => r.creator?.nickname ?? "-",
      }),
      col.accessor("status", {
        header: "상태",
        cell: (c) => <StatusBadge domain="meeting" value={c.getValue()} />,
      }),
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="라운딩"
        actions={
          can("meetings", "write") && (
            <Link to="/rounds/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden />
                라운딩 등록
              </Button>
            </Link>
          )
        }
      />
      <div className="mb-3">
        <FilterBar
          list={list}
          defs={DEFS}
          searchPlaceholder="모임명·골프장·장소"
        />
      </div>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/rounds/${r.id}`}
        empty={{
          title: "라운딩이 없습니다",
          description: "필터를 바꿔 보세요.",
        }}
        toolbar={
          <StatusTabs
            list={list}
            filterKey="status"
            options={[
              { value: "", label: "전체" },
              { value: "SCHEDULED", label: "예정" },
              { value: "IN_PROGRESS", label: "진행중" },
              { value: "COMPLETED", label: "완료" },
              { value: "CANCELED", label: "취소" },
            ]}
          />
        }
      />
    </>
  );
}
