import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
  itemLabel?: string;
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 20,
  onPageChange,
  isLoading = false,
  itemLabel = 'records',
  className = '',
}) => {
  if (totalCount === 0 || totalPages <= 0) {
    return null;
  }

  // Calculate range displayed (e.g. 1-20 of 60)
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers with smart ellipsis (1, 2, 3, ... Next, Previous)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Always include page 1
    pages.push(1);

    if (currentPage <= 4) {
      // Near beginning: 1, 2, 3, 4, 5, ..., totalPages
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        pages.push(i);
      }
      if (totalPages > 6) {
        pages.push('ellipsis');
      }
    } else if (currentPage >= totalPages - 3) {
      // Near end: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
      pages.push('ellipsis');
      for (let i = totalPages - 4; i <= totalPages - 1; i++) {
        if (i > 1) pages.push(i);
      }
    } else {
      // In middle: 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
      pages.push('ellipsis');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('ellipsis');
    }

    // Always include last page if > 1
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !isLoading) {
      onPageChange(page);
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3.5 px-4 bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs text-xs ${className}`}
      aria-label="Table pagination navigation"
    >
      {/* Range summary and loading status */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
        <span>
          Showing <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono-tabular">{startItem}</strong>
          –
          <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono-tabular">{endItem}</strong> of{' '}
          <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono-tabular">{totalCount}</strong>{' '}
          {itemLabel}
        </span>
        <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">•</span>
        <span className="hidden md:inline-block text-[11px] text-slate-400 dark:text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Page navigation controls: [First] [Previous] [1, 2, 3, ...] [Next] [Last] */}
      <div className="flex items-center gap-1">
        {/* Jump to first page */}
        {totalPages > 4 && (
          <button
            type="button"
            onClick={() => handlePageClick(1)}
            disabled={currentPage === 1 || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="First Page"
            aria-label="Go to first page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Previous button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Numbered Page Buttons with Ellipsis */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-slate-400 dark:text-slate-500 font-mono select-none"
                >
                  …
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                disabled={isLoading}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-8 h-8 px-2 rounded-lg font-bold font-mono-tabular transition-all text-xs flex items-center justify-center ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Jump to last page */}
        {totalPages > 4 && (
          <button
            type="button"
            onClick={() => handlePageClick(totalPages)}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Last Page"
            aria-label="Go to last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
