import { Suspense } from 'react';
import { DoodleTable } from '@/components/doodle/DoodleTable';

export default function Page() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-violet-50" />}>
      <DoodleTable />
    </Suspense>
  );
}
