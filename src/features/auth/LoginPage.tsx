import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/app/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { safeNext } from '@/lib/auth/safeNext';
import { tokenStore } from '@/lib/auth/token';

const schema = z.object({
  email: z.string().trim().min(1, '이메일을 입력해주세요').email('이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});
type Values = z.infer<typeof schema>;

function loginErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return '이메일 또는 비밀번호가 올바르지 않습니다';
    if (err.status === 403) return err.message || '비활성화된 계정입니다';
  }
  return errorMessage(err);
}

export function LoginPage() {
  const { login, me } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const expired = params.get('expired') === '1';
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  if (me && tokenStore.get()) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(loginErrorText(err));
    }
  });

  const inputCls =
    'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 aria-[invalid=true]:border-red-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/logo.png" alt="" className="h-12 w-12 rounded-xl" />
          <h1 className="text-lg font-bold text-slate-900">티업링크 백오피스</h1>
        </div>
        {expired && (
          <p className="mb-4 rounded-lg border-l-4 border-secondary-500 bg-secondary-50 px-3 py-2 text-sm text-slate-800">
            로그인 시간이 만료되었습니다. 다시 로그인해주세요.
          </p>
        )}
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">이메일</label>
            <input id="email" type="email" autoComplete="username" className={inputCls} aria-invalid={!!formState.errors.email} {...register('email')} />
            {formState.errors.email && <p className="mt-1 text-xs text-red-600">{formState.errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">비밀번호</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${inputCls} pr-10`}
                aria-invalid={!!formState.errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formState.errors.password && <p className="mt-1 text-xs text-red-600">{formState.errors.password.message}</p>}
          </div>
          <Button type="submit" variant="primary" loading={formState.isSubmitting} className="h-10 w-full justify-center">
            로그인
          </Button>
          {formError && <p role="alert" className="text-center text-sm text-red-600">{formError}</p>}
        </form>
      </div>
    </div>
  );
}
