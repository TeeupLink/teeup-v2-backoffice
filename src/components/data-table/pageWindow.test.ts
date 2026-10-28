import { pageWindow } from './pageWindow';

describe('pageWindow', () => {
  it('페이지가 적으면 전부', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('가운데면 양쪽 생략', () => {
    expect(pageWindow(10, 20)).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 20]);
  });
  it('끝 근처', () => {
    expect(pageWindow(20, 20)).toEqual([1, '…', 18, 19, 20]);
  });
});
