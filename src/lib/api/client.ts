import { tokenStore } from '@/lib/auth/token';
import { ApiError, parseErrorBody } from './errors';

const BASE = '/api/v1';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** 기본 true. false 면 Authorization 헤더를 붙이지 않는다 */
  auth?: boolean;
  signal?: AbortSignal;
};

let onAuthError: (() => void) | null = null;

/** 401 등 재로그인이 필요할 때 호출할 함수 (AuthProvider 가 등록) */
export function setAuthErrorHandler(fn: (() => void) | null) {
  onAuthError = fn;
}

export function buildQuery(query?: Query): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** 일회성 CSRF 토큰. 변경 요청마다 새로 받는다. */
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE}/auth/csrf-token`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'CSRF 토큰을 받지 못했습니다');
  const data = (await res.json()) as { csrf_token: string };
  return data.csrf_token;
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (MUTATING.has(method)) headers['X-CSRF-Token'] = await fetchCsrfToken();

  const body =
    opts.body === undefined ? undefined : opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body);

  return fetch(`${BASE}${path}${buildQuery(opts.query)}`, {
    method,
    headers,
    body,
    credentials: 'include',
    signal: opts.signal,
  });
}

async function toError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* 본문 없음 */
  }
  const { message, code, fields } = parseErrorBody(body);
  return new ApiError(res.status, message, { code, fields });
}

/** 백오피스의 유일한 HTTP 진입점 (F-011) */
export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, opts);
    if (res.status === 403 && MUTATING.has(opts.method ?? 'GET')) {
      const err = await toError(res.clone());
      // CSRF 토큰 만료 — 한 번만 새로 받아 재시도
      if (err.isCsrf) res = await send(path, opts);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, '서버에 연결할 수 없습니다');
  }

  if (!res.ok) {
    const err = await toError(res);
    if (err.isAuth && opts.auth !== false) onAuthError?.();
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
