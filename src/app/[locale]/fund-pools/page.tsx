import { FundPoolsDataTable } from "@/components/fund-pools-data-table";

export default function FundPoolsPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl mb-4">Fund Pools</h1>
      <FundPoolsDataTable />
    </div>
  );
}
