import { ExpensesTable } from "./_components/data-table";

export default function ExpensesPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl mb-4">Expenses</h1>
      <ExpensesTable />
    </div>
  );
}
