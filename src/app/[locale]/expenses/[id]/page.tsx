import { notFound } from "next/navigation";

import { ExpenseDetail } from "../_components/expense-detail";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  return <ExpenseDetail id={numericId} />;
}
