import { AlertCircle } from 'lucide-react';
import { errorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/Button';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <AlertCircle className="h-10 w-10 text-red-300" aria-hidden />
      <p className="text-sm text-slate-700">{errorMessage(error)}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry} className="mt-2">
          다시 시도
        </Button>
      )}
    </div>
  );
}
