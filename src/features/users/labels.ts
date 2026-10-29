/** 회원 화면 enum 라벨 (백엔드 models/enums.py, utils/activity.py EVENT_TYPES 기준) */
export const GENDER: Record<string, string> = { MALE: '남성', FEMALE: '여성', OTHER: '기타' };

export const PROVIDER: Record<string, string> = { LOCAL: '이메일', GOOGLE: '구글', APPLE: '애플' };

export const DEVICE: Record<string, string> = { ios: 'iOS', android: 'Android', web: '웹' };

/** 활동 유형 — 타임라인 칩 라벨 */
export const EVENT_TYPE: Record<string, string> = {
  SIGNUP: '가입',
  LOGIN: '로그인',
  PROFILE_UPDATE: '프로필',
  WITHDRAW: '탈퇴',
  CLUB_JOIN_REQUEST: '가입신청',
  CLUB_JOIN: '클럽 가입',
  CLUB_LEAVE: '클럽 탈퇴',
  MEETING_JOIN: '모임 참가',
  MEETING_CANCEL: '참가 취소',
  PAYMENT: '결제',
  REPORT: '신고',
};

/**
 * 활동 대상 → 상세 링크.
 * MEETING 은 라운딩·소셜 구분이 활동 로그에 없어 링크하지 않는다 (요약 문구에 모임명이 있다).
 */
export function activityHref(targetType: string | null, targetId: number | null): string | null {
  if (!targetType || targetId == null) return null;
  switch (targetType) {
    case 'CLUB':
      return `/clubs/${targetId}`;
    case 'REPORT':
      return `/reports/${targetId}`;
    default:
      return null;
  }
}
