import { tokenStore } from '@/lib/auth/token';
import { api, buildQuery, setAuthErrorHandler } from './client';
import { ApiError } from './errors';

type Call = { url: string; init: RequestInit };

function mockFetch(responses: Array<(url: string) => Response>) {
  const calls: Call[] = [];
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      if (url.endsWith('/auth/csrf-token')) return Response.json({ csrf_token: `csrf-${calls.length}` });
      const r = responses[i++];
      if (!r) throw new Error(`예상하지 않은 요청: ${url}`);
      return r(url);
    }),
  );
  return calls;
}

const headers = (c: Call) => c.init.headers as Record<string, string>;

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthErrorHandler(null);
});

describe('api client', () => {
  it('GET 에는 토큰만 붙이고 CSRF 는 받지 않는다', async () => {
    tokenStore.set('jwt-1');
    const calls = mockFetch([() => Response.json({ ok: 1 })]);
    await expect(api('/admin/me')).resolves.toEqual({ ok: 1 });
    expect(calls).toHaveLength(1);
    expect(headers(calls[0]!).Authorization).toBe('Bearer jwt-1');
    expect(headers(calls[0]!)['X-CSRF-Token']).toBeUndefined();
  });

  it('변경 요청마다 CSRF 토큰을 새로 받아 붙인다', async () => {
    const calls = mockFetch([() => Response.json({}), () => Response.json({})]);
    await api('/admin/clubs', { method: 'POST', body: { name: 'a' } });
    await api('/admin/clubs/1', { method: 'DELETE' });
    const mutating = calls.filter((c) => !c.url.endsWith('/csrf-token'));
    expect(headers(mutating[0]!)['X-CSRF-Token']).toBe('csrf-1');
    expect(headers(mutating[1]!)['X-CSRF-Token']).toBe('csrf-3');
  });

  it('CSRF 403 이면 한 번 재시도한다', async () => {
    const calls = mockFetch([
      () => Response.json({ detail: '유효하지 않은 CSRF 토큰입니다' }, { status: 403 }),
      () => Response.json({ done: true }),
    ]);
    await expect(api('/admin/x', { method: 'PUT', body: {} })).resolves.toEqual({ done: true });
    expect(calls.filter((c) => c.url.endsWith('/csrf-token'))).toHaveLength(2);
  });

  it('401 이면 재로그인 핸들러를 부르고 ApiError 를 던진다', async () => {
    const onAuth = vi.fn();
    setAuthErrorHandler(onAuth);
    mockFetch([() => Response.json({ detail: '만료' }, { status: 401 })]);
    await expect(api('/admin/me')).rejects.toBeInstanceOf(ApiError);
    expect(onAuth).toHaveBeenCalledOnce();
  });

  it('권한 403 은 재로그인 대상이 아니다', async () => {
    const onAuth = vi.fn();
    setAuthErrorHandler(onAuth);
    mockFetch([() => Response.json({ detail: '권한이 없습니다' }, { status: 403 })]);
    await expect(api('/admin/admins')).rejects.toMatchObject({ status: 403, message: '권한이 없습니다' });
    expect(onAuth).not.toHaveBeenCalled();
  });

  it('네트워크 오류는 status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(api('/admin/me')).rejects.toMatchObject({ status: 0 });
  });

  it('buildQuery 는 빈 값을 빼고 배열은 반복 키로', () => {
    expect(buildQuery({ q: '', page: 2, status: ['A', 'B'], x: undefined })).toBe('?page=2&status=A&status=B');
  });
});
