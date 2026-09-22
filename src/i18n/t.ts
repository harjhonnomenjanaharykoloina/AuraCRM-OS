import type { Messages } from "./messages/en";

type MessageValue = string | MessageValue[] | { [key: string]: MessageValue };

type Dict = Record<string, MessageValue>;

export type TFunction = (key: string, options?: Record<string, unknown>) => string;

function resolveKey(messages: Dict, key: string): MessageValue | undefined {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current as MessageValue | undefined;
}

function interpolate(message: string, options?: Record<string, unknown>): string {
  if (!options) return message;
  return message.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = options[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return `{${key}}`;
  });
}

function pluralize(message: string, count: number): string {
  const parts = message.split("|");
  if (parts.length === 1) {
    return interpolate(message, { count });
  }
  return interpolate(parts[count === 1 ? 0 : 1], { count });
}

export function createTFunction(messages: Messages): TFunction {
  const dict = messages as unknown as Dict;
  return (key: string, options?: Record<string, unknown>): string => {
    const resolved = resolveKey(dict, key);
    if (resolved === undefined) {
      return key;
    }
    if (typeof resolved !== "string") {
      return key;
    }
    const hasCount = options && "count" in options;
    if (hasCount) {
      return pluralize(resolved, Number(options.count));
    }
    return interpolate(resolved, options);
  };
}
