import { z } from 'zod';

/** 관리자 비밀번호 규칙 (BE#66 과 같음): 8~64자, 영문·숫자·특수문자 모두 */
export const adminPassword = z
  .string()
  .refine(
    (v) => v.length >= 8 && v.length <= 64 && /[A-Za-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v),
    '8자 이상, 영문·숫자·특수문자를 모두 넣어주세요',
  );
