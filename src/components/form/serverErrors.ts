import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, errorMessage } from '@/lib/api/errors';

/**
 * 서버 검증 에러(409·422 의 field)를 폼 필드에 매핑한다 (REQ-009).
 * 매핑되지 않은 에러는 반환값(폼 상단 배너용)으로 돌려준다.
 */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: readonly string[]): string | null {
  if (err instanceof ApiError && err.fields.length) {
    const unmatched: string[] = [];
    for (const f of err.fields) {
      if (fields.includes(f.field)) setError(f.field as Path<T>, { type: 'server', message: f.message });
      else unmatched.push(f.message);
    }
    return unmatched.length ? unmatched.join(' / ') : null;
  }
  return errorMessage(err);
}
