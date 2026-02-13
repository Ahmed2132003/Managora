import { useCallback, useMemo, useState, type SetStateAction } from "react";

export function useClientPagination<T>(rows: T[], pageSize = 10) {
  const [rawPage, setRawPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(rawPage, 1), totalPages);

  const setPage = useCallback(
    (nextPage: SetStateAction<number>) => {
      setRawPage((previousPage) => {
        const resolvedPage =
          typeof nextPage === "function" ? nextPage(previousPage) : nextPage;
        return Math.min(Math.max(resolvedPage, 1), totalPages);
      });
    },
    [totalPages]
  );
  
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return {
    page,
    setPage,
    totalPages,
    paginatedRows,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}