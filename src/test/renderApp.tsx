import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/router';
import { ConfirmHost } from '@/components/dialog/ConfirmHost';
import { Toaster } from '@/components/feedback/Toaster';
import { tokenStore } from '@/lib/auth/token';

export type Call = { method: string; path: string; query: URLSearchParams; body: unknown };
type Handler = (call: Call) => unknown;

/**
 * 실제 라우터·가드·레이아웃까지 띄우고 API 만 가짜로 바꾼다.
 * handlers 키: "GET /admin/inquiries" 처럼 메서드 + 경로(/api/v1 제외). 값이 Response 면 그대로 돌려준다.
 */
export function renderApp(path: string, role: string, handlers: Record<string, Handler | unknown> = {}) {
  tokenStore.set('jwt');
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input, 'http://x');
      const p = url.pathname.replace(/^\/api\/v1/, '');
      const method = (init.method ?? 'GET').toUpperCase();
      if (p === '/auth/csrf-token') return Response.json({ csrf_token: 't' });
      if (p === '/admin/me') return Response.json({ id: 1, email: 'a@teeup.run', name: '김운영', role, status: 'ACTIVE' });
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      const call = { method, path: p, query: url.searchParams, body };
      calls.push(call);
      const h = handlers[`${method} ${p}`];
      const out = typeof h === 'function' ? (h as Handler)(call) : h;
      if (out instanceof Response) return out;
      return Response.json(out ?? {});
    }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <ConfirmHost />
      <Toaster />
    </QueryClientProvider>,
  );
  return { router, calls };
}
