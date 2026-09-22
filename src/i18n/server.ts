import { cookies } from "next/headers";
import { defaultLocale, localeCookieName, type Locale } from "./config";
import { enMessages, frMessages } from "./messages";
import type { Messages } from "./messages/en";
import { createTFunction, type TFunction } from "./t";

export const getLocale = async (): Promise<Locale> => {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get(localeCookieName)?.value;
    if (locale && (locale === "en" || locale === "fr")) {
      return locale;
    }
  } catch {
    // Cookie not available in this context
  }
  return defaultLocale;
};

export const getMessages = async (): Promise<Messages> => {
  const locale = await getLocale();
  return locale === "fr" ? frMessages : enMessages;
};

export const getT = async (messages?: Messages): Promise<TFunction> => {
  const msgs = messages ?? (await getMessages());
  return createTFunction(msgs);
};

export { createTFunction, type TFunction };
