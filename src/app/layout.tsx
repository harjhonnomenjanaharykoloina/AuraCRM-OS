import type { Metadata } from "next";
import { geistSans, geistMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraCRM — Open Source CRM",
  description:
    "AuraCRM is an open-source learning project for building a modern, metadata-driven CRM.",
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Some browser extensions inject attributes on <html> before React hydrates.
    // Suppress the root warning so extension noise does not look like an app bug.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
