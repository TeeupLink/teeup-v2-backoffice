/** 클럽 enum 라벨 (백엔드 models/enums.py 기준) */
export const CLUB_ROLE: Record<string, string> = { LEADER: '리더', MANAGER: '매니저', MEMBER: '멤버' };

export const CLUB_TYPE: Record<string, string> = { REGULAR: '정기', IRREGULAR: '비정기' };

export const MEMBERSHIP_STATUS: Record<string, string> = { ACTIVE: '활동', APPROVED: '활동', PENDING: '대기', INACTIVE: '비활성', SUSPENDED: '정지', CANCELED: '탈퇴' };

export const BILLING_CYCLE: Record<string, string> = { MONTHLY: '월', QUARTERLY: '분기', YEARLY: '연', ONE_TIME: '1회' };
