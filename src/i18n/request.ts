import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { loadMessages } from "./loadMessages";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  const messages = await loadMessages(locale);
  return { locale, messages };
});
