import { TableCell, TableRow } from "@/components/ui/table";

interface Props {
  colCount: number;
  message?: string;
}

export function TableEmptyRow({ colCount, message = "No results." }: Props) {
  return (
    <TableRow>
      <TableCell colSpan={colCount} className="h-24 text-center">
        {message}
      </TableCell>
    </TableRow>
  );
}
