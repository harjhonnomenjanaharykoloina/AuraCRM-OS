import { cookies } from "next/headers";
import { defaultLocale, localeCookieName, type Locale } from "./config";
import { enMessages, frMessages } from "./messages";
import { createTFunction, type TFunction } from "./t";

export interface ServerTranslations {
  locale: Locale;
  t: TFunction;
}

export const useServerTranslations = async (): Promise<ServerTranslations> => {
  let locale: Locale = defaultLocale;
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(localeCookieName)?.value;
    if (cookieValue && (cookieValue === "en" || cookieValue === "fr")) {
      locale = cookieValue;
    }
  } catch {
    // Cookie not available in this context
  }

  const messages = locale === "fr" ? frMessages : enMessages;
  const t = createTFunction(messages);
  return { locale, t };
};
