import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('스크립트·iframe 제거', () => {
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>');
    expect(sanitizeHtml('<iframe src="x"></iframe><p>b</p>')).toBe('<p>b</p>');
  });
  it('이벤트 속성·javascript: URL 제거', () => {
    expect(sanitizeHtml('<img src="a.png" onerror="alert(1)">')).toBe('<img src="a.png">');
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a href="#">x</a>');
  });
  it('일반 서식은 유지', () => {
    const html = '<h2>제목</h2><p><strong>굵게</strong> <a href="https://teeup.kr">링크</a></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});
