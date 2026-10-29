/** 라운딩 enum 라벨 (백엔드 models/enums.py · schemas/enums.py 기준) */
export const SUBTYPE: Record<string, string> = {
  REGULAR: "정기",
  IRREGULAR: "비정기",
  ONE_TIME: "일회성",
};

export const FORMATION_MODE: Record<string, string> = {
  GENDER_MIXED_HANDICAP: "성별 혼합 · 핸디캡",
  GENDER_MIXED_PREVIOUS_RECORD: "성별 혼합 · 직전 성적",
  GENDER_MIXED_RANDOM: "성별 혼합 · 랜덤",
  GENDER_SEPARATED_HANDICAP: "성별 분리 · 핸디캡",
  GENDER_SEPARATED_PREVIOUS_RECORD: "성별 분리 · 직전 성적",
  GENDER_SEPARATED_RANDOM: "성별 분리 · 랜덤",
};

export const SETTLEMENT_METHOD: Record<string, string> = {
  EQUAL_SPLIT: "N분의 1",
  INDIVIDUAL: "개별 정산",
  TREASURER_PREPAID: "총무 선결제",
  CLUB_FUND: "클럽 회비",
};

/** 상태 진행 순서 (개요 탭 진행 표시) */
export const STATUS_FLOW = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const;

export const SCORE_MIN = 55;
export const SCORE_MAX = 144;

export const PARTICIPANT_ROLE: Record<string, string> = {
  PARTICIPANT: "참가자",
  ORGANIZER: "개설자",
  CO_ORGANIZER: "공동 개설자",
};
