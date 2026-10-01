"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";

export const formatMoney = (amount: unknown) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount ?? 0));

export const formatDate = (date: Date | string | null | undefined) =>
  date ? new Date(date).toLocaleDateString() : "—";

/** Page shell for an entity detail page: back link, title, then sections. */
export function DetailPage({
  backHref,
  backLabel,
  title,
  subtitle,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-8 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
        <h1 className="text-4xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Label/value grid for an entity's own fields. */
export function DetailFields({
  fields,
}: {
  fields: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="flex flex-col gap-1">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            {field.label}
          </dt>
          <dd className="break-words">{field.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Titled section, typically wrapping a table of linked items. */
export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  );
}

/** Styled in-app link used inside detail fields and table cells. */
export function EntityLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-[#3FA9A9] underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}
