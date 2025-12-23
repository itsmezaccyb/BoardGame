import { Suspense } from 'react';
import { ChameleonTableContent } from '@/components/ChameleonTableContent';

export default function ChameleonTablePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-gray-100">Loading...</div>}>
      <ChameleonTableContent />
    </Suspense>
  );
}
