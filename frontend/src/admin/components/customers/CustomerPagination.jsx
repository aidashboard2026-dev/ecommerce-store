import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CustomerPagination({
  page,
  pages,
  onPage,
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-30 transition-all"
      >
        <ChevronLeft size={14} />
      </button>

      <span className="text-xs text-muted px-2 font-medium">
        Page {page} of {pages}
      </span>

      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-30 transition-all"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}