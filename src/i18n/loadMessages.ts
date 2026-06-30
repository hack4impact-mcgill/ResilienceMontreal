import type { MessageNamespace } from "./messageNamespaces";
import { MESSAGE_NAMESPACES } from "./messageNamespaces";

export type Messages = Record<MessageNamespace, Record<string, string>>;

/**
 * Loads all feature JSON files for a locale and merges them as namespaces
 * (Option B: messages/en/common.json, messages/en/navigation.json, …).
 */
export async function loadMessages(locale: string): Promise<Messages> {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (name) => {
      const mod = await import(`../../messages/${locale}/${name}.json`);
      return [name, mod.default as Record<string, string>] as const;
    }),
  );
  return Object.fromEntries(entries) as Messages;
}
