/**
 * 역할별 접근 권한 — docs/02.기획문서/정보구조도.md 3장 권한 매트릭스와 1:1.
 * 메뉴·라우트 가드·대시보드 카드가 이 표 하나를 본다.
 * 프론트 표시는 편의일 뿐이며 최종 판단은 백엔드가 한다.
 */
export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'CLUB_ADMIN',
  'MEETING_ADMIN',
  'USER_ADMIN',
  'CONTENT_ADMIN',
  'SUPPORT_ADMIN',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type Access = 'read' | 'write';

export type Resource =
  | 'dashboard'
  | 'kpi'
  | 'joinRequests'
  | 'inquiries'
  | 'reports'
  | 'users'
  | 'clubs'
  | 'meetings'
  | 'content'
  | 'payments'
  | 'billingSandbox'
  | 'admins'
  | 'auditLogs'
  | 'profile';

type Matrix = Record<Resource, Partial<Record<Exclude<AdminRole, 'SUPER_ADMIN'>, Access>>>;

const ALL_READ = {
  CLUB_ADMIN: 'read',
  MEETING_ADMIN: 'read',
  USER_ADMIN: 'read',
  CONTENT_ADMIN: 'read',
  SUPPORT_ADMIN: 'read',
} as const;

const MATRIX: Matrix = {
  dashboard: ALL_READ,
  kpi: {},
  joinRequests: { CLUB_ADMIN: 'write' },
  inquiries: { SUPPORT_ADMIN: 'write' },
  reports: { SUPPORT_ADMIN: 'write' },
  users: { USER_ADMIN: 'write', SUPPORT_ADMIN: 'read' },
  clubs: { CLUB_ADMIN: 'write', MEETING_ADMIN: 'read' },
  meetings: { MEETING_ADMIN: 'write', CLUB_ADMIN: 'read' },
  content: { CONTENT_ADMIN: 'write' },
  payments: { SUPPORT_ADMIN: 'read' },
  billingSandbox: {},
  admins: {},
  auditLogs: {},
  profile: {
    CLUB_ADMIN: 'write',
    MEETING_ADMIN: 'write',
    USER_ADMIN: 'write',
    CONTENT_ADMIN: 'write',
    SUPPORT_ADMIN: 'write',
  },
};

export function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === 'string' && (ADMIN_ROLES as readonly string[]).includes(v);
}

/** 역할이 없거나 알 수 없으면 아무 권한도 없다 (role null → SUPER 간주 금지, REQ-026) */
export function accessFor(role: AdminRole | null | undefined, resource: Resource): Access | null {
  if (!role || !isAdminRole(role)) return null;
  if (role === 'SUPER_ADMIN') return 'write';
  return MATRIX[resource][role] ?? null;
}

export function can(role: AdminRole | null | undefined, resource: Resource, need: Access = 'read'): boolean {
  const a = accessFor(role, resource);
  if (!a) return false;
  return need === 'read' || a === 'write';
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: '최고 관리자',
  CLUB_ADMIN: '클럽 관리자',
  MEETING_ADMIN: '모임 관리자',
  USER_ADMIN: '회원 관리자',
  CONTENT_ADMIN: '콘텐츠 관리자',
  SUPPORT_ADMIN: '고객지원',
};
