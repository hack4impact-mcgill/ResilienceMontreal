"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface FundPoolWithAmount {
  id: number;
  category: string;
  calculatedAmount: number;
  order: number;
}

interface FundPoolTableProps {
  fundPools: FundPoolWithAmount[];
  onEdit: (fundPool: FundPoolWithAmount) => void;
  onDelete: (fundPool: FundPoolWithAmount) => void;
  onReorder: (orderedIds: number[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FundPoolTable({
  fundPools,
  onEdit,
  onDelete,
  onReorder,
  searchQuery,
  onSearchChange,
}: FundPoolTableProps) {
  const filteredItems = fundPools.filter((item) =>
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...fundPools];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      onReorder(newOrder.map(item => item.id));
    }
  };

  const moveDown = (index: number) => {
    if (index < fundPools.length - 1) {
      const newOrder = [...fundPools];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      onReorder(newOrder.map(item => item.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search fund pools..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.map((fundPool, index) => (
            <TableRow key={fundPool.id}>
              <TableCell>{fundPool.category}</TableCell>
              <TableCell>{formatCurrency(fundPool.calculatedAmount)}</TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveDown(index)}
                    disabled={index === fundPools.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(fundPool)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(fundPool)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? "No fund pools match your search." : "No fund pools found."}
        </div>
      )}
    </div>
  );
}