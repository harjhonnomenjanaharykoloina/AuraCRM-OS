"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, localeCookieName, type Locale } from "./config";
import { enMessages, frMessages } from "./messages";
import { createTFunction, type TFunction } from "./t";
export { locales, defaultLocale, localeCookieName, type Locale, type Messages, getMessageFallback } from "./config";

interface I18nContext {
  locale: Locale;
  t: TFunction;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContext | undefined>(undefined);

const localeMessages: Record<Locale, unknown> = {
  en: enMessages,
  fr: frMessages,
};

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? defaultLocale);

  const t = useMemo(() => {
    const messages = localeMessages[locale] as any;
    return createTFunction(messages);
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      document.cookie = `${localeCookieName}=${newLocale};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // Cookie not available (e.g., during SSR)
    }
  };

  useEffect(() => {
    try {
      const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${localeCookieName}=`));
      if (cookie) {
        const value = cookie.split("=")[1] as Locale;
        if ((value === "en" || value === "fr") && value !== locale) {
          setLocaleState(value);
        }
      }
    } catch {
      // Cookie not available
    }
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale(): Locale {
  const context = useContext(I18nContext);
  if (!context) {
    return defaultLocale;
  }
  return context.locale;
}

export function useTranslations(scope?: string): TFunction {
  const context = useContext(I18nContext);
  const t = context ? context.t : createTFunction(enMessages as any);
  if (!scope) return t;
  return (key: string, options?: Record<string, unknown>) => t(`${scope}.${key}`, options);
}

export function useSetLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    return (locale: Locale) => {
      try {
        document.cookie = `${localeCookieName}=${locale};path=/;max-age=31536000;samesite=lax`;
      } catch {}
    };
  }
  return context.setLocale;
}
