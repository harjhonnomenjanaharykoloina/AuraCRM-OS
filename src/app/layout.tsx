import type { Metadata } from "next";
import { geistSans, geistMono } from "@/lib/fonts";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
    title: "AuraCRM — Open Source CRM",
    description:
        "AuraCRM is an open-source learning project for building a modern, metadata-driven CRM.",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();

    return (
        // Some browser extensions inject attributes on <html> before React hydrates.
        // Suppress the root warning so extension noise does not look like an app bug.
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <I18nProvider initialLocale={locale}>
                    <Providers initialLocale={locale}>
                        {children}
                    </Providers>
                </I18nProvider>
            </body>
        </html>
    );
}
