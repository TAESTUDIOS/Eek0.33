'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/images/logo/logo.png';

/**
 * HomePage (Splash)
 * Purpose: Show a minimal splash with the app logo and brand text, then auto-redirect to /chat.
 * Behavior: Wait ~1.5s (under 2s) and navigate. Keep UI < 100 LOC.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/chat');
    }, 1500); // ensure splash is not visible longer than 2 seconds
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-0)]">
      <div className="flex flex-col items-center">
        {/* Logo badge */}
        <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 shadow-subtle md:h-36 md:w-36">
          <Image
            src={Logo}
            alt="Eeko logo"
            priority
            className="h-16 w-16 object-contain opacity-95 md:h-20 md:w-20"
          />
        </div>
        {/* Wordmark */}
        <div className="mt-4 text-2xl font-semibold tracking-wide text-[var(--fg)]/95 md:text-3xl">
          Eeko
        </div>
      </div>
    </div>
  );
}
