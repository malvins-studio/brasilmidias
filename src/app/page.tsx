'use client';

import { Suspense } from 'react';
import HomeContent from './HomeContent';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50">Carregando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
