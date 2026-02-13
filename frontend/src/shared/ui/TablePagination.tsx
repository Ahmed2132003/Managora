type TablePaginationProps = {
  page: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  disabled?: boolean;
};

export function TablePagination({
  page,
  totalPages,
  onPreviousPage,
  onNextPage,
  disabled = false,
}: TablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="table-pagination">
      <button
        type="button"
        className="table-action"
        onClick={onPreviousPage}
        disabled={disabled || page <= 1}
      >
        Previous
      </button>
      <span className="helper-text">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        className="table-action"
        onClick={onNextPage}
        disabled={disabled || page >= totalPages}
      >
        Next
      </button>
    </div>
  );
}