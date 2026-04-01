"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border p-0.5 gap-0.5 bg-background/80",
        className,
      )}
      role="group"
      aria-label={t("language")}
    >
      {routing.locales.map((loc) => (
        <Button
          key={loc}
          type="button"
          variant={locale === loc ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-8 min-w-[2.25rem] px-2 text-xs",
            locale === loc && "font-semibold",
          )}
          onClick={() => {
            if (loc !== locale) {
              router.replace(pathname, { locale: loc });
            }
          }}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
