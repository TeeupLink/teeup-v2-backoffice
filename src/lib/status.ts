/**
 * 상태값 → 라벨·색. 화면에서 상태별 분기를 직접 쓰지 않고 여기만 본다.
 * 근거: 디자인스타일가이드 3.5, DB설계서 6장 (백엔드 enum 값 기준)
 */
export type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';
type Entry = { label: string; tone: Tone };

const S = {
  user: {
    ACTIVE: { label: '활성', tone: 'success' },
    DEACTIVATED: { label: '비활성', tone: 'neutral' },
    DELETED: { label: '탈퇴', tone: 'danger' },
  },
  admin: {
    ACTIVE: { label: '활성', tone: 'success' },
    DEACTIVATED: { label: '비활성', tone: 'neutral' },
    DELETED: { label: '삭제', tone: 'danger' },
  },
  club: {
    ACTIVE: { label: '활성', tone: 'success' },
    INACTIVE: { label: '비활성', tone: 'neutral' },
  },
  membership: {
    PENDING: { label: '대기', tone: 'warning' },
    ACTIVE: { label: '활동', tone: 'success' },
    INACTIVE: { label: '비활성', tone: 'neutral' },
    SUSPENDED: { label: '정지', tone: 'danger' },
    CANCELED: { label: '탈퇴', tone: 'neutral' },
  },
  meeting: {
    SCHEDULED: { label: '예정', tone: 'warning' },
    IN_PROGRESS: { label: '진행중', tone: 'info' },
    COMPLETED: { label: '완료', tone: 'success' },
    CANCELED: { label: '취소', tone: 'danger' },
  },
  participant: {
    PENDING: { label: '신청', tone: 'warning' },
    CONFIRMED: { label: '확정', tone: 'success' },
    WAITING_LIST: { label: '대기', tone: 'warning' },
    CANCELED: { label: '취소', tone: 'danger' },
  },
  inquiry: {
    PENDING: { label: '미답변', tone: 'warning' },
    SUBMITTED: { label: '미답변', tone: 'warning' },
    IN_PROGRESS: { label: '처리중', tone: 'info' },
    RESOLVED: { label: '답변완료', tone: 'success' },
    COMPLETED: { label: '답변완료', tone: 'success' },
    CLOSED: { label: '종료', tone: 'neutral' },
  },
  report: {
    PENDING: { label: '대기', tone: 'warning' },
    REVIEWING: { label: '검토중', tone: 'info' },
    RESOLVED: { label: '해결', tone: 'success' },
    DISMISSED: { label: '기각', tone: 'neutral' },
  },
  payment: {
    SUCCEEDED: { label: '완료', tone: 'success' },
    PARTIAL_CANCELED: { label: '부분취소', tone: 'info' },
    CANCELED: { label: '취소', tone: 'danger' },
    PENDING: { label: '대기', tone: 'warning' },
    FAILED: { label: '실패', tone: 'danger' },
  },
  subscription: {
    ACTIVE: { label: '활성', tone: 'success' },
    PAST_DUE: { label: '연체', tone: 'warning' },
    CANCELED: { label: '해지', tone: 'neutral' },
  },
  terms: {
    DRAFT: { label: '초안', tone: 'info' },
    ACTIVE: { label: '게시중', tone: 'success' },
    ARCHIVED: { label: '지난 버전', tone: 'neutral' },
  },
  auditResult: {
    SUCCESS: { label: '성공', tone: 'success' },
    FAIL: { label: '실패', tone: 'danger' },
  },
} satisfies Record<string, Record<string, Entry>>;

export type StatusDomain = keyof typeof S;

export function statusOf(domain: StatusDomain, value: string | null | undefined): Entry {
  const map = S[domain] as Record<string, Entry>;
  if (value && map[value]) return map[value];
  return { label: value ?? '-', tone: 'neutral' };
}

/** 필터 select·탭용 옵션 (라벨이 같은 값은 첫 값만) */
export function statusOptions(domain: StatusDomain): { value: string; label: string }[] {
  const seen = new Set<string>();
  return Object.entries(S[domain] as Record<string, Entry>)
    .filter(([, e]) => (seen.has(e.label) ? false : (seen.add(e.label), true)))
    .map(([value, e]) => ({ value, label: e.label }));
}
