import { formatPII, formatPhone, maskEmail, maskName, maskPhone } from './pii';

describe('개인정보 포맷터 (REQ-241 예시 기준)', () => {
  it('이름', () => {
    expect(maskName('김민수')).toBe('김*수');
    expect(maskName('남궁민수')).toBe('남**수');
    expect(maskName('김수')).toBe('김*');
    expect(maskName('a')).toBe('*');
  });

  it('전화', () => {
    expect(formatPhone('01012341234')).toBe('010-1234-1234');
    expect(maskPhone('010-1234-1234')).toBe('010-****-1234');
    expect(maskPhone('0212345678')).toBe('02-****-5678');
  });

  it('이메일', () => {
    expect(maskEmail('student@example.com')).toBe('st***@example.com');
    expect(maskEmail('ab@x.com')).toBe('a***@x.com');
  });

  it('마스킹 off 면 원문(전화는 하이픈 정리), 빈 값은 -', () => {
    expect(formatPII('name', '김민수', false)).toBe('김민수');
    expect(formatPII('phone', '01012341234', false)).toBe('010-1234-1234');
    expect(formatPII('email', null, true)).toBe('-');
  });
});
