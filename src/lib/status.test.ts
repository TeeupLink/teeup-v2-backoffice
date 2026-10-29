import { statusOf, statusOptions } from './status';

describe('status', () => {
  it('문의 상태 6종을 화면 라벨 4종으로 묶는다', () => {
    expect(statusOf('inquiry', 'PENDING').label).toBe('미답변');
    expect(statusOf('inquiry', 'SUBMITTED').label).toBe('미답변');
    expect(statusOf('inquiry', 'COMPLETED').label).toBe('답변완료');
    expect(statusOptions('inquiry').map((o) => o.label)).toEqual(['미답변', '처리중', '답변완료', '종료']);
  });
  it('모르는 값은 원문을 neutral 로', () => {
    expect(statusOf('club', 'PENDING')).toEqual({ label: 'PENDING', tone: 'neutral' });
    expect(statusOf('club', null).label).toBe('-');
  });
});
