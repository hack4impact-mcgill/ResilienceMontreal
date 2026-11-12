import { notFound } from "next/navigation";

import { GrantDetail } from "../_components/grant-detail";

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  return <GrantDetail id={numericId} />;
}
