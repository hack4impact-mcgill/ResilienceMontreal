"use client";

import { useEffect, useState } from "react";

type Expense = {
  id: number;
  totalAmount: string | number;
  description: string;
  date: string;
  invoiceUrl?: string | null;
};

export default function ExpensesPage() {
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  // Initialize date after mount to avoid SSR/client mismatch
  const [date, setDate] = useState<string>("");
  const [invoiceUrl, setInvoiceUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadExpenses = async () => {
    try {
      setLoadingList(true);
      const res = await fetch(`/api/expenses?page=1&limit=10`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch expenses");
      setExpenses(data.expenses || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    // Only load existing expenses; do not prefill form values so backend validation is exercised
    loadExpenses();
  }, []);

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: totalAmount, // send raw value (string) so backend validates
          description,
          date,
          invoiceUrl: invoiceUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create expense");
      setMessage("Expense created");
      setTotalAmount("");
      setDescription("");
      // Leave date empty to avoid client-side defaults
      setDate("");
      setInvoiceUrl("");
      await loadExpenses();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const createSample = async () => {
    setTotalAmount("12.34");
    setDescription("Sample expense");
    setDate(new Date().toISOString().slice(0, 10));
    await handleCreate();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-sm text-gray-500">Create a new expense and view recent ones.</p>
      </div>

      <div className="max-w-md space-y-3 border rounded-md p-4">
        <h2 className="font-medium">Create Expense</h2>
        <div className="space-y-2">
          <label className="block text-sm">Total Amount</label>
          <input
            type="text"
            placeholder="e.g. 123.45 (or try invalid to test backend)"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Description</label>
          <input
            type="text"
            placeholder="What is this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Invoice URL (optional)</label>
          <input
            type="url"
            placeholder="https://..."
            value={invoiceUrl}
            onChange={(e) => setInvoiceUrl(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Expense"}
          </button>
          <button
            onClick={createSample}
            disabled={submitting}
            className="border px-4 py-2 rounded"
          >
            Quick sample
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent expenses</h2>
          <button onClick={loadExpenses} className="text-sm underline" disabled={loadingList}>
            {loadingList ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="border rounded-md divide-y">
          {expenses.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No expenses yet.</div>
          )}
          {expenses.map((e) => (
            <div key={e.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{e.description}</div>
                {/* Use a stable, timezone-agnostic format to avoid SSR/client mismatches */}
                <div className="text-xs text-gray-500">{new Date(e.date).toISOString().slice(0, 10)}</div>
                {e.invoiceUrl && (
                  <a href={e.invoiceUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">
                    Invoice
                  </a>
                )}
              </div>
              <div className="font-mono">${typeof e.totalAmount === "number" ? e.totalAmount.toFixed(2) : e.totalAmount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
