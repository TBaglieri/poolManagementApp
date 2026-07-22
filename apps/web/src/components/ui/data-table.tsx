import { cn } from "@/lib/cn";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns, rows, getKey, onRowClick, empty, dense = false,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: { title: string; description?: string; icon?: string };
  dense?: boolean;
}) {
  if (rows.length === 0 && empty) {
    return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;
  }
  const align = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500",
                  align(c.align), c.hideOnMobile && "hidden md:table-cell",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 align-middle text-slate-700 dark:text-slate-300",
                    dense ? "py-2" : "py-3",
                    align(c.align), c.className, c.hideOnMobile && "hidden md:table-cell",
                  )}
                >
                  {c.render ? c.render(row) : (row as Record<string, React.ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
