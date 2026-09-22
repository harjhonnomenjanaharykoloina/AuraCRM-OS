import { useMemo } from "react";
import type { Messages } from "./messages/en";
import { createTFunction, type TFunction } from "./t";

export function useTranslations(messages: Messages): TFunction {
  return useMemo(() => createTFunction(messages), [messages]);
}
