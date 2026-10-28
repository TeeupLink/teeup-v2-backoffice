import { accessFor, can } from './permissions';

describe('권한 매트릭스 (정보구조도 3장)', () => {
  it('SUPER_ADMIN 은 모든 영역 쓰기', () => {
    expect(can('SUPER_ADMIN', 'admins', 'write')).toBe(true);
    expect(can('SUPER_ADMIN', 'billingSandbox', 'write')).toBe(true);
  });

  it('role 이 없으면 아무것도 못 한다 (SUPER 간주 금지)', () => {
    expect(accessFor(null, 'dashboard')).toBeNull();
    expect(accessFor(undefined, 'profile')).toBeNull();
  });

  it('SUPPORT_ADMIN 은 회원·결제 조회만', () => {
    expect(can('SUPPORT_ADMIN', 'users', 'read')).toBe(true);
    expect(can('SUPPORT_ADMIN', 'users', 'write')).toBe(false);
    expect(can('SUPPORT_ADMIN', 'payments', 'read')).toBe(true);
    expect(can('SUPPORT_ADMIN', 'payments', 'write')).toBe(false);
    expect(can('SUPPORT_ADMIN', 'inquiries', 'write')).toBe(true);
  });

  it('CLUB_ADMIN 은 모임 조회만, MEETING_ADMIN 은 클럽 조회만', () => {
    expect(can('CLUB_ADMIN', 'meetings', 'read')).toBe(true);
    expect(can('CLUB_ADMIN', 'meetings', 'write')).toBe(false);
    expect(can('MEETING_ADMIN', 'clubs', 'read')).toBe(true);
    expect(can('MEETING_ADMIN', 'clubs', 'write')).toBe(false);
  });

  it('관리자·감사 로그·KPI·샌드박스는 SUPER 전용', () => {
    for (const r of ['admins', 'auditLogs', 'kpi', 'billingSandbox'] as const) {
      expect(can('CONTENT_ADMIN', r)).toBe(false);
      expect(can('USER_ADMIN', r)).toBe(false);
    }
  });

  it('모든 역할이 대시보드·프로필에 들어간다', () => {
    for (const role of ['CLUB_ADMIN', 'MEETING_ADMIN', 'USER_ADMIN', 'CONTENT_ADMIN', 'SUPPORT_ADMIN'] as const) {
      expect(can(role, 'dashboard')).toBe(true);
      expect(can(role, 'profile', 'write')).toBe(true);
    }
  });
});
