"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { Button } from "@/components/ui/button";
import { Download, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  hiddenOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchableKeys?: (keyof T & string)[];
  searchPlaceholder?: string;
  defaultPageSize?: number;
  toolbar?: React.ReactNode;
  filters?: React.ReactNode;
  onExport?: () => void;
  className?: string;
}

/** Generic data table with built-in search, pagination, filters and CSV export. */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchableKeys,
  searchPlaceholder = "Search records...",
  defaultPageSize = 10,
  toolbar,
  filters,
  onExport,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [showFilters, setShowFilters] = React.useState(false);

  // Reset to first page when data or query changes
  React.useEffect(() => setPage(1), [data.length, query]);

  const filtered = React.useMemo(() => {
    if (!query.trim() || !searchableKeys?.length) return data;
    const q = query.toLowerCase().trim();
    return data.filter((row) =>
      searchableKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, searchableKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / defaultPageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * defaultPageSize, safePage * defaultPageSize);

  const handleExport = () => {
    const header = columns.map((c) => c.header).join(",");
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const rendered = c.render(row);
          const text =
            typeof rendered === "string" || typeof rendered === "number" ? String(rendered) : "";
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "cadastre-export.csv";
    link.click();
  };

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-tech overflow-hidden", className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {searchableKeys?.length && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-tech h-9 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium outline-none"
            />
          )}
          {filters && (
            <Button variant="outline" size="sm" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport ?? handleExport}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {filters && showFilters && (
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 animate-fade-in">
          <FilterPanel>{filters}</FilterPanel>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(col.hiddenOnMobile && "hidden md:table-cell")}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-28 text-center text-xs text-slate-400">
                No records match the current search / filters.
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={cn(col.className, col.hiddenOnMobile && "hidden md:table-cell")}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="border-t border-slate-100 p-4">
        <Pagination page={safePage} pageSize={defaultPageSize} totalItems={filtered.length} onPageChange={setPage} />
      </div>
    </div>
  );
}