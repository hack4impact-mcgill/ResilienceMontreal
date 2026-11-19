import { ExpensesTable } from "./_components/data-table";

export default async function ExpensesPage({
  searchParams,
}: {
  // ?view=<id> opens that expense's panel (linked from grant and client details)
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const viewId = Number(view);

  return (
    <div className="p-8">
      <h1 className="text-4xl mb-4">Expenses</h1>
      <ExpensesTable
        initialViewId={Number.isInteger(viewId) && viewId > 0 ? viewId : null}
      />
    </div>
  );
}
