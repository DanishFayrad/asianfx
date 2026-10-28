'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** One QueryClient per browser session (created once, never shared between server requests). */
export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Realtime events invalidate queries when data changes, so a short stale time is enough.
                staleTime: 30_000,
                retry: 1,
                refetchOnWindowFocus: true,
            },
        },
    }));

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
