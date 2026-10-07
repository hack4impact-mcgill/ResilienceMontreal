import { notFound } from "next/navigation";

import { FundPoolDetail } from "../_components/fund-pool-detail";

export default async function FundPoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  return <FundPoolDetail id={numericId} />;
}
