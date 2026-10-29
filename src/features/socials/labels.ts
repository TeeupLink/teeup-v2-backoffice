/** 소셜 enum 라벨 (백엔드 models/enums.py 기준) */
export const SOCIAL_TYPE: Record<string, string> = {
  CASUAL: '캐주얼',
  DINNER: '식사',
  EVENT: '이벤트',
};

/** 소셜에서 쓰는 정산 방식 (예전 화면과 같은 두 가지) */
export const SOCIAL_SETTLEMENT: Record<string, string> = {
  EQUAL_SPLIT: 'N분의 1',
  CLUB_FUND: '클럽 회비',
};
