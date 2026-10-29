import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('내부 경로는 그대로', () => {
    expect(safeNext('/clubs/3/members?page=2')).toBe('/clubs/3/members?page=2');
  });

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/login?next=/x'])(
    '외부·위험 경로 %s 는 기본값',
    (v) => expect(safeNext(v)).toBe('/dashboard'),
  );

  it('없으면 기본값', () => {
    expect(safeNext(null)).toBe('/dashboard');
  });
});
