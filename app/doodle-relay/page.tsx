import { Suspense } from 'react';
import { DoodleLobby } from '@/components/doodle/DoodleLobby';

export default function Page() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-violet-50" />}>
      <DoodleLobby />
    </Suspense>
  );
}
