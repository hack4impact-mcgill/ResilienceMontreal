"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import { ListFilter, Check, CirclePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { columns, Client } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { fetchClients } from "@/lib/api";

// ------------------------------------------------------------
// ADD CLIENT MODAL
// ------------------------------------------------------------
function AddClientModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (client: Client) => void;
}) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [leaseStart, setLeaseStart] = React.useState("");
  const [leaseEnd, setLeaseEnd] = React.useState("");

  const resetFields = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setLeaseStart("");
    setLeaseEnd("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-center">Add Client</h2>

        <div className="space-y-3">
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
          />
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
          />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />

          <Input
            type="date"
            value={leaseStart}
            onChange={(e) => setLeaseStart(e.target.value)}
          />
          <Input
            type="date"
            value={leaseEnd}
            onChange={(e) => setLeaseEnd(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              resetFields();
              onClose();
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              const newClient: Client = {
                id: Date.now().toString(),
                firstName,
                lastName,
                email,
                leaseStartDate: new Date(leaseStart),
                leaseEndDate: new Date(leaseEnd),
              };

              onSubmit(newClient);
              resetFields();
              onClose();
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// EXPORT CLIENTS TO CSV
// ------------------------------------------------------------
const exportToCSV = (clients: Client[]) => {
  if (!clients.length) return;

  // CSV header
  const header = [
    "First Name",
    "Last Name",
    "Email",
    "Lease Start Date",
    "Lease End Date",
  ];

  // CSV rows
  const rows = clients.map((c) => [
    c.firstName,
    c.lastName,
    c.email,
    c.leaseStartDate.toLocaleDateString(),
    c.leaseEndDate.toLocaleDateString(),
  ]);

  // combine header + rows
  const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");

  // create filename with current date
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)}`; // MM-DD-YY
  const fileName = `client_list_${dateStr}.csv`;

  // create a blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ------------------------------------------------------------
// MAIN TABLE COMPONENT
// ------------------------------------------------------------
export const ClientsTable = () => {
  const [localClients, setLocalClients] = React.useState<Client[]>([]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [filterColumn, setFilterColumn] = React.useState<
    "firstName" | "lastName" | "email"
  >("email");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  const [addModalOpen, setAddModalOpen] = React.useState(false);

  // fetch initial server data
  const {
    data: fetchedClients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  // merge server-loaded + local-added
  React.useEffect(() => {
    if (fetchedClients) setLocalClients(fetchedClients);
  }, [fetchedClients]);

  const table = useReactTable<Client>({
    data: localClients,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const prettyLabel = (col: string) => {
    if (col === "firstName") return "First Name";
    if (col === "lastName") return "Last Name";
    if (col === "email") return "Email";
    return col;
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data.</div>;

  type FilterColumn = "firstName" | "lastName" | "email";
  return (
    <div className="w-full">
      {/* Top Messages */}
      <div className="border-t border-border -mx-8 px-8 py-4">
        <div className="flex flex-row items-start gap-10">
          <div className="flex flex-col">
            <span className="text-green-600 font-bold text-2xl">$0000</span>
            <span className="text-black text-sm -mt-1">available</span>
          </div>
          <div className="flex flex-col">
            <span className="text-red-600 font-bold text-2xl">X days</span>
            <span className="text-black text-sm -mt-1">
              until next grant is due
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="border-t border-border -mx-8 px-8 flex items-center py-4">
        {/* Search Input */}
        <Input
          placeholder={`Search by ${prettyLabel(filterColumn)}...`}
          value={
            (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn(filterColumn)?.setFilterValue(e.target.value)
          }
          className="max-w-sm"
        />

        {/* Filter Dropdown */}
        <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="ml-2 flex items-center gap-2 px-2 py-1 h-auto hover:bg-transparent"
            >
              <ListFilter
                className={`transition-transform ${filterMenuOpen ? "rotate-90" : "rotate-0"}`}
              />
              <span>Filter</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            {["firstName", "lastName", "email"].map((col) => (
              <DropdownMenuItem
                key={col}
                onClick={() => {
                  table.getColumn(filterColumn)?.setFilterValue("");
                  setFilterColumn(col as FilterColumn);
                  setFilterMenuOpen(false);
                }}
                className="flex items-center gap-2"
              >
                {filterColumn === col ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 opacity-0" />
                )}
                {prettyLabel(col)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <Button
          variant="ghost"
          className="ml-auto text-black hover:bg-transparent"
          onClick={() => exportToCSV(localClients)}
        >
          Export
        </Button>

        {/* Add Client Button */}
        <Button
          variant="outline"
          className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
          onClick={() => setAddModalOpen(true)}
        >
          <CirclePlus /> Add Client
        </Button>
      </div>

      {/* Table */}
      <div className="-mx-8">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          <TableFooter />
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4 px-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={(newClient) => {
          setLocalClients((prev) => {
            const updated = [...prev, newClient];
            return updated;
          });

          // force React Table to recompute with new data
          setTimeout(() => {
            table.setPageIndex(table.getPageCount() - 1);
          }, 10);
        }}
      />
    </div>
  );
};
