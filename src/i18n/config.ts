import type { Messages } from "./messages/en";

export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookieName = "NEXT_LOCALE";

export const localePrefix = "as-needed";

export const getMessageFallback = (
  messages: Record<string, unknown> | undefined,
  key: string,
  _defaultMessages: Messages = {} as Messages
): string => {
  if (!messages) return key;
  const keys = key.split(".");
  let current: unknown = messages;
  for (const k of keys) {
    if (current && typeof current === "object" && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  if (typeof current === "string") return current as string;
  return key;
};

export type { Messages };
