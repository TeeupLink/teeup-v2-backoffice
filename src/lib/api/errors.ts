export type FieldError = { field: string; message: string };

const FALLBACK = '요청을 처리하지 못했습니다';

/** 서버 오류. status 0 은 네트워크 오류. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields: FieldError[];

  constructor(status: number, message: string, opts: { code?: string; fields?: FieldError[] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = opts.code;
    this.fields = opts.fields ?? [];
  }

  get isCsrf() {
    return this.status === 403 && (this.code === 'CSRF' || /CSRF/i.test(this.message));
  }

  /** 세션이 끝나 다시 로그인해야 하는 경우 */
  get isAuth() {
    if (this.status === 401) return true;
    return this.status === 403 && this.code === 'INACTIVE';
  }
}

type FastApiDetailItem = { loc?: (string | number)[]; msg?: string; field?: string; message?: string };

function toFieldError(item: FastApiDetailItem): FieldError | null {
  const message = item.message ?? item.msg;
  if (!message) return null;
  const field = item.field ?? item.loc?.filter((p) => p !== 'body' && p !== 'query').join('.') ?? '';
  return { field, message };
}

/**
 * 응답 본문에서 메시지·필드 에러를 뽑는다 (REQ-010).
 * 순서: detail(문자열) → detail[0].message|msg → message → 기본 문구
 */
export function parseErrorBody(body: unknown): { message: string; code?: string; fields: FieldError[] } {
  if (!body || typeof body !== 'object') return { message: FALLBACK, fields: [] };
  const b = body as { detail?: unknown; message?: unknown; code?: unknown };
  const code = typeof b.code === 'string' ? b.code : undefined;

  if (typeof b.detail === 'string' && b.detail) return { message: b.detail, code, fields: [] };
  if (Array.isArray(b.detail)) {
    const fields = (b.detail as FastApiDetailItem[]).map(toFieldError).filter((f): f is FieldError => f !== null);
    return { message: fields[0]?.message ?? FALLBACK, code, fields };
  }
  if (typeof b.message === 'string' && b.message) return { message: b.message, code, fields: [] };
  return { message: FALLBACK, code, fields: [] };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return FALLBACK;
}
