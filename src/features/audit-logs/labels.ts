import type { Tone } from '@/lib/status';

export const ACTION: Record<string, { label: string; tone: Tone }> = {
  CREATE: { label: '등록', tone: 'info' },
  UPDATE: { label: '수정', tone: 'info' },
  DELETE: { label: '삭제', tone: 'danger' },
  STATUS_CHANGE: { label: '상태 변경', tone: 'info' },
  APPROVE: { label: '승인', tone: 'success' },
  REJECT: { label: '거절', tone: 'danger' },
  BULK: { label: '일괄', tone: 'info' },
  VIEW_PII: { label: '개인정보 열람', tone: 'warning' },
  EXPORT: { label: '내보내기', tone: 'warning' },
  LOGIN: { label: '로그인', tone: 'neutral' },
  LOGOUT: { label: '로그아웃', tone: 'neutral' },
  LOGIN_FAIL: { label: '로그인 실패', tone: 'danger' },
  PASSWORD_RESET: { label: '비밀번호 재설정', tone: 'warning' },
  REVIEW: { label: '월간 점검', tone: 'neutral' },
};

export const TARGET: Record<string, string> = {
  USER: '회원',
  ADMIN: '관리자',
  CLUB: '클럽',
  CLUB_MEMBERSHIP: '가입신청',
  CLUB_NOTICE: '클럽 공지',
  REGULATION: '규정',
  FEE: '회비',
  MEETING: '모임',
  TEAM: '팀',
  SCORE: '점수',
  EXPENSE: '경비',
  NOTICE: '공지',
  FAQ: 'FAQ',
  TERMS: '약관',
  INQUIRY: '문의',
  REPORT: '신고',
  PLAN: '요금제',
  SUBSCRIPTION: '구독',
  PAYMENT: '결제',
  BILLING: '빌링',
  AUDIT: '감사 로그',
};

const TARGET_PATH: Record<string, string> = {
  USER: '/users',
  ADMIN: '/admins',
  CLUB: '/clubs',
  INQUIRY: '/inquiries',
  NOTICE: '/notices',
  REPORT: '/reports',
  PAYMENT: '/payments',
};

/** 대상 화면 링크. 숫자 ID 이고 상세 화면이 있는 대상만 */
export function targetHref(type: string | null, id: string | null): string | null {
  if (!type || !id || !/^\d+$/.test(id)) return null;
  const base = TARGET_PATH[type];
  return base ? `${base}/${id}` : null;
}

export const actionOptions = Object.entries(ACTION).map(([value, a]) => ({ value, label: a.label }));
export const targetOptions = Object.entries(TARGET).map(([value, label]) => ({ value, label }));
