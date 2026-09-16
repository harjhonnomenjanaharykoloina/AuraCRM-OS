import { Geist, Geist_Mono, Open_Sans, Poppins } from "next/font/google";

/**
 * Centralized font declarations.
 *
 * Each `next/font/google` call produces a unique set of `@font-face`
 * declarations and `<link rel="preload">` tags keyed on the instantiated
 * config. Instantiating the same font in multiple modules — even with
 * identical options — causes Next.js to emit duplicate preload tags in
 * `<head>`, which in turn produces "preloaded with link preload was not
 * used" warnings in the browser console (the duplicate font files are
 * never referenced by an applied `@font-face`).
 *
 * To prevent this, every font that is shared across components is declared
 * exactly once here and imported wherever needed.
 */

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
