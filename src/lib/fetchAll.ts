// Supabase returns at most 1000 rows per request. fetchAll keeps asking for the next 1000
// until the list is complete, so member / deposit lists are never cut off as the site grows.
// The query must have a stable order (e.g. .order('id')) so pages don't overlap or skip rows.

const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export const fetchAll = async <T>(
    page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error?: string }> => {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await page(from, from + PAGE_SIZE - 1);
        if (error) return { data: rows, error: error.message };
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) return { data: rows };
    }
};
