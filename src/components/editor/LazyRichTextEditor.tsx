import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '@/components/feedback/Skeleton';

// TipTap 은 크기가 커서 에디터가 있는 화면에서만 내려받는다
const Editor = lazy(() => import('./RichTextEditor'));

export function RichTextEditor(props: ComponentProps<typeof Editor>) {
  return (
    <Suspense fallback={<Skeleton className="h-[284px] w-full rounded-lg" />}>
      <Editor {...props} />
    </Suspense>
  );
}
