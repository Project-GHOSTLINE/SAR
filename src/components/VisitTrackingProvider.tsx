'use client';

import { useEffect } from 'react';
import { initVisitTracking, trackPageView } from '@/lib/visit-tracking';
import { installFetchInterceptor } from '@/lib/fetch-wrapper';
import { usePathname } from 'next/navigation';

/**
 * VisitTrackingProvider
 *
 * Initializes visit tracking on mount:
 * - Creates or reads visit_id cookie
 * - Installs fetch interceptor to auto-inject headers
 * - Tracks page views on navigation
 */
export function VisitTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize visit tracking
    initVisitTracking();

    // Install fetch interceptor
    installFetchInterceptor();
  }, []);

  // Track page view on pathname change
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return <>{children}</>;
}
