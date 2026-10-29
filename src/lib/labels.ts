/** 상태가 아닌 enum 의 화면 라벨 (백엔드 models/enums.py 기준) */
export const INQUIRY_TYPE: Record<string, string> = {
  GENERAL: '일반',
  ACCOUNT: '계정',
  TECHNICAL: '기술',
  BUG_REPORT: '오류 신고',
  FEATURE_REQUEST: '기능 제안',
  BILLING: '요금',
  PAYMENT: '결제',
};

export const toOptions = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));
