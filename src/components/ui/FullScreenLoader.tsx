import { Loader2 } from 'lucide-react';
import { Button } from './Button';

export function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100" role="status" aria-label="불러오는 중">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" aria-hidden />
    </div>
  );
}

export function FullScreenError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center">
      <p className="text-sm text-slate-700">{message}</p>
      <Button onClick={onRetry}>다시 시도</Button>
    </div>
  );
}
