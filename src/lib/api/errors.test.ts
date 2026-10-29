import { ApiError, parseErrorBody } from './errors';

describe('parseErrorBody', () => {
  it('detail 문자열을 메시지로 쓴다', () => {
    expect(parseErrorBody({ detail: '이미 처리됨' })).toEqual({ message: '이미 처리됨', code: undefined, fields: [] });
  });

  it('FastAPI 422 detail 배열을 필드 에러로 바꾼다', () => {
    const r = parseErrorBody({ detail: [{ loc: ['body', 'email'], msg: '형식 오류' }] });
    expect(r.fields).toEqual([{ field: 'email', message: '형식 오류' }]);
    expect(r.message).toBe('형식 오류');
  });

  it('정규화된 field/message 형식도 읽는다', () => {
    const r = parseErrorBody({ detail: [{ field: 'nickname', message: '이미 사용 중' }] });
    expect(r.fields[0]).toEqual({ field: 'nickname', message: '이미 사용 중' });
  });

  it('detail 이 없으면 message, 그것도 없으면 기본 문구', () => {
    expect(parseErrorBody({ message: '오류' }).message).toBe('오류');
    expect(parseErrorBody(null).message).toBe('요청을 처리하지 못했습니다');
  });
});

describe('ApiError', () => {
  it('CSRF 403 을 code 또는 메시지로 알아본다', () => {
    expect(new ApiError(403, '유효하지 않은 CSRF 토큰입니다').isCsrf).toBe(true);
    expect(new ApiError(403, 'x', { code: 'CSRF' }).isCsrf).toBe(true);
    expect(new ApiError(403, '권한 없음').isCsrf).toBe(false);
  });

  it('401 과 비활성 계정 403 만 재로그인 대상', () => {
    expect(new ApiError(401, '').isAuth).toBe(true);
    expect(new ApiError(403, '', { code: 'INACTIVE' }).isAuth).toBe(true);
    expect(new ApiError(403, '권한 없음').isAuth).toBe(false);
  });
});
