import {
    columnFilteringFeature,
    createFilteredRowModel,
    createPaginatedRowModel,
    filterFn_equalsString,
    filterFn_includesString,
    globalFilteringFeature,
    rowPaginationFeature,
    tableFeatures,
} from '@tanstack/react-table';

/**
 * TanStack Table features shared by the app's list tables (members, deposits, signals):
 *  - a search box      → global filter (case-insensitive "contains")
 *  - status tabs etc.  → column filters (exact match)
 *  - pages / load more → pagination
 * Rows are filtered and paged in the browser; the data itself comes from TanStack Query.
 * Kept at module scope so the object is stable between renders.
 */
export const listTableFeatures = tableFeatures({
    columnFilteringFeature,
    globalFilteringFeature,
    rowPaginationFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: { includesString: filterFn_includesString, equalsString: filterFn_equalsString },
});

/** Plain tables that only render their rows (no search or pages). */
export const basicTableFeatures = tableFeatures({});

/** Stable empty list, so `data ?? EMPTY_ROWS` doesn't create a new array every render. */
export const EMPTY_ROWS: never[] = [];

/** Text the search box matches against: the given values joined, nulls skipped. */
export const searchText = (...values: Array<string | number | null | undefined>) =>
    values.filter((v) => v !== null && v !== undefined && v !== '').join(' ');
