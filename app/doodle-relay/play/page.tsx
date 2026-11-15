import { Suspense } from 'react';
import { DoodlePlayer } from '@/components/doodle/DoodlePlayer';

export default function Page() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-violet-50" />}>
      <DoodlePlayer />
    </Suspense>
  );
}
