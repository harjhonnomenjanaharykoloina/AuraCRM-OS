"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n";

interface ProvidersProps {
    children: React.ReactNode;
    initialLocale?: Locale;
}

export function Providers({ children, initialLocale }: ProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                    },
                },
            })
    );

    return (
        <I18nProvider initialLocale={initialLocale}>
            <QueryClientProvider client={queryClient}>
                {children}
                <Toaster richColors position="top-center" />
            </QueryClientProvider>
        </I18nProvider>
    );
}
