'use client';

import { IncompleteProfileBanner } from './IncompleteProfileBanner';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IncompleteProfileBanner />
      {children}
    </>
  );
}

