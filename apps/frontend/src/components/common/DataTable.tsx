"use client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { EmptyState } from "@/components/feedback/EmptyState";
export type DataColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};
export function DataTable<T>({
  rows,
  columns,
  getKey,
  emptyTitle = "Nothing to show",
}: {
  rows: T[];
  columns: DataColumn<T>[];
  getKey: (row: T) => React.Key;
  emptyTitle?: string;
}) {
  const tableColumns: ColumnDef<T>[] = columns.map((column) => ({
    id: column.key,
    header: column.label,
    cell: ({ row }) => column.render(row.original),
    meta: { className: column.className },
  }));
  // TanStack Table intentionally returns callable table APIs; React Compiler skips memoizing this boundary.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(getKey(row)),
  });
  if (!rows.length) return <EmptyState title={emptyTitle} />;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-surface-raised text-xs uppercase tracking-wide text-foreground-subtle">
          <tr>
            {table
              .getHeaderGroups()
              .flatMap((group) => group.headers)
              .map((header) => (
                <th
                  key={header.id}
                  className={`px-4 py-3 font-medium ${(header.column.columnDef.meta as { className?: string } | undefined)?.className ?? ""}`}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="bg-surface hover:bg-surface-raised/60">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`px-4 py-3 ${(cell.column.columnDef.meta as { className?: string } | undefined)?.className ?? ""}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
