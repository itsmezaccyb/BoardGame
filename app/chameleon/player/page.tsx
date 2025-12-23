import { Suspense } from 'react';
import { ChameleonPlayerContent } from '@/components/ChameleonPlayerContent';

export default function ChameleonPlayerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-gray-100">Loading...</div>}>
      <ChameleonPlayerContent />
    </Suspense>
  );
}
