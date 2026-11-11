import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { TRPCReactProvider } from "~/trpc/react";
import { getServerAuthSession } from "~/server/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebarWrapper } from "@/components/AppSidebarWrapper";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resilience Montreal",
  description: "TBA",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "fr")) {
    return null;
  }
  setRequestLocale(locale);

  const [messages, session] = await Promise.all([
    getMessages(),
    getServerAuthSession(),
  ]);
  const isLoggedIn = Boolean(session?.user);

  return (
    <NextIntlClientProvider locale={locale} messages={messages ?? {}}>
      <TRPCReactProvider>
        <SidebarProvider>
          <AppSidebarWrapper isLoggedIn={isLoggedIn}>
            {children}
          </AppSidebarWrapper>
        </SidebarProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { marginTop: "20px" },
            classNames: {
              error: "bg-red-50 text-red-900 border-red-200",
              success: "bg-green-50 text-green-900 border-green-200",
            },
          }}
        />
      </TRPCReactProvider>
    </NextIntlClientProvider>
  );
}
