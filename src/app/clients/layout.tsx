import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients",
  description: "TBA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
