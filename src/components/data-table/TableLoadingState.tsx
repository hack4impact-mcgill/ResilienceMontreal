"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function TableLoadingState() {
  const t = useTranslations("common");

  return (
    <div
      role="status"
      className="flex w-full justify-center p-6 text-muted-foreground"
    >
      <LoaderCircle aria-hidden="true" className="size-6 motion-safe:animate-spin" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
