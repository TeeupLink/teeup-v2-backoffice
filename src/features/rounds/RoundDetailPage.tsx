import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Route, Routes, useNavigate, useParams } from "react-router";
import { NotFoundPage } from "@/app/pages/NotFoundPage";
import { useAuth } from "@/app/auth/useAuth";
import { StatusBadge } from "@/components/display/StatusBadge";
import { confirm } from "@/components/dialog/confirm-store";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { toast } from "@/components/feedback/toast-store";
import { DetailHeader } from "@/components/layout/DetailHeader";
import { RouteTabs } from "@/components/layout/RouteTabs";
import { Button } from "@/components/ui/Button";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { deleteRound, fetchRound } from "./api";
import { OverviewTab } from "./detail/OverviewTab";
import { ParticipantsTab } from "./detail/ParticipantsTab";
import { ScoresTab } from "./detail/ScoresTab";
import { StatsTab } from "./detail/StatsTab";
import { TeamsTab } from "./detail/TeamsTab";
import type { RoundDetail } from "./types";

// SCR-052 라운딩 상세 (화면설계서 4.6, F-052~056). 정산 탭은 등록·수정 폼과 함께 이어서 붙인다.

function DeleteButton({ round }: { round: RoundDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const remove = async () => {
    const r = await confirm({
      title: `${round.name}을(를) 삭제할까요?`,
      description:
        '참가자·팀·점수·정산 기록이 함께 지워지며 되돌릴 수 없습니다. 취소만 필요하면 상태를 "취소"로 바꾸세요.',
      confirmText: "삭제",
      tone: "danger",
    });
    if (!r) return;
    try {
      await deleteRound(round.id);
      await qc.invalidateQueries({ queryKey: ["rounds"] });
      toast.success("라운딩을 삭제했습니다");
      navigate("/rounds", { replace: true });
    } catch (e) {
      toast.error("삭제하지 못했습니다", { description: errorMessage(e) });
    }
  };
  return (
    <Button
      variant="danger-ghost"
      aria-label="라운딩 삭제"
      onClick={() => void remove()}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function RoundDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const writable = can("meetings", "write");
  const q = useQuery({
    queryKey: ["round", id],
    queryFn: () => fetchRound(id),
    enabled: Number.isInteger(id),
  });

  const notRound = q.data && q.data.meeting_type !== "ROUND";
  if (
    !Number.isInteger(id) ||
    notRound ||
    (q.error instanceof ApiError && q.error.status === 404)
  )
    return <NotFoundPage title="라운딩을 찾을 수 없습니다" />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const r = q.data;
  const base = `/rounds/${id}`;
  return (
    <>
      <DetailHeader
        backTo="/rounds"
        title={r.name}
        badges={<StatusBadge domain="meeting" value={r.status} />}
        meta={
          <>
            <span>{formatDateTime(r.meeting_time)}</span>
            <span>{r.club_name}</span>
            {r.course_name && <span>{r.course_name}</span>}
          </>
        }
        actions={writable && <DeleteButton round={r} />}
      />
      <RouteTabs
        tabs={[
          { to: base, label: "개요", end: true },
          {
            to: `${base}/participants`,
            label: "참가자",
            count: r.participant_count,
          },
          { to: `${base}/teams`, label: "팀" },
          { to: `${base}/scores`, label: "점수" },
          { to: `${base}/stats`, label: "통계" },
        ]}
      />
      <Routes>
        <Route index element={<OverviewTab round={r} writable={writable} />} />
        <Route path="participants" element={<ParticipantsTab roundId={id} />} />
        <Route
          path="teams"
          element={<TeamsTab round={r} writable={writable} />}
        />
        <Route
          path="scores"
          element={<ScoresTab roundId={id} writable={writable} />}
        />
        <Route path="stats" element={<StatsTab roundId={id} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
