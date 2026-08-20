import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

export interface TableQueryParams {
  page: number;
  pageSize: number;
  search: string;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface TableQueryResult<T> {
  items: T[];
  total: number;
}

export interface UseTableQueryOptions<T>
  extends Omit<
    UseQueryOptions<TableQueryResult<T>, Error, TableQueryResult<T>, QueryKey>,
    'queryKey' | 'queryFn'
  > {
  queryKey: QueryKey;
  /** Fetcher receives current table params */
  queryFn: (params: TableQueryParams) => Promise<TableQueryResult<T>>;
  defaultPageSize?: number;
  /** Client-side filter when server doesn't support search (optional) */
  clientFilter?: (item: T, search: string) => boolean;
}

export interface UseTableQueryResult<T> {
  data: T[];
  total: number;
  loading: boolean;
  fetching: boolean;
  error: Error | null;
  params: TableQueryParams;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSort: (field?: string, order?: 'ascend' | 'descend' | null) => void;
  refresh: () => void;
  reset: () => void;
  /** Ant Design Table pagination props */
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger: boolean;
    showTotal: (total: number) => string;
    onChange: (page: number, pageSize: number) => void;
  };
  /** Convenience flags for EmptyState / ErrorState */
  isEmpty: boolean;
  isError: boolean;
}

/**
 * Unified list-page query: search + pagination + sort + empty/error flags.
 *
 * @example
 * const table = useTableQuery({
 *   queryKey: ['applications'],
 *   queryFn: async ({ search }) => {
 *     const res = await applicationApi.list();
 *     const items = res.data.items;
 *     return { items, total: res.data.total };
 *   },
 *   clientFilter: (item, s) => item.name.toLowerCase().includes(s.toLowerCase()),
 * });
 * <DataTable dataSource={table.data} loading={table.loading} pagination={table.pagination} />
 */
export function useTableQuery<T>(
  options: UseTableQueryOptions<T>,
): UseTableQueryResult<T> {
  const {
    queryKey,
    queryFn,
    defaultPageSize = 20,
    clientFilter,
    ...rest
  } = options;

  const [params, setParams] = useState<TableQueryParams>({
    page: 1,
    pageSize: defaultPageSize,
    search: '',
    sortField: undefined,
    sortOrder: null,
  });

  const query = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => queryFn(params),
    placeholderData: keepPreviousData,
    ...rest,
  });

  const filtered = useMemo(() => {
    const items = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    if (!clientFilter || !params.search.trim()) {
      return { items, total };
    }
    const next = items.filter((item) => clientFilter(item, params.search.trim()));
    return { items: next, total: next.length };
  }, [query.data, clientFilter, params.search]);

  const setSearch = useCallback((search: string) => {
    setParams((p) => ({ ...p, search, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParams((p) => ({ ...p, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setParams((p) => ({ ...p, pageSize, page: 1 }));
  }, []);

  const setSort = useCallback(
    (sortField?: string, sortOrder?: 'ascend' | 'descend' | null) => {
      setParams((p) => ({ ...p, sortField, sortOrder: sortOrder ?? null }));
    },
    [],
  );

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const reset = useCallback(() => {
    setParams({
      page: 1,
      pageSize: defaultPageSize,
      search: '',
      sortField: undefined,
      sortOrder: null,
    });
  }, [defaultPageSize]);

  const data = filtered.items;
  const total = filtered.total;

  return {
    data,
    total,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    params,
    setSearch,
    setPage,
    setPageSize,
    setSort,
    refresh,
    reset,
    pagination: {
      current: params.page,
      pageSize: params.pageSize,
      total,
      showSizeChanger: true,
      showTotal: (t: number) => `${t} items`,
      onChange: (page: number, pageSize: number) => {
        setParams((p) => ({ ...p, page, pageSize }));
      },
    },
    isEmpty: !query.isLoading && !query.isError && total === 0,
    isError: query.isError,
  };
}

export default useTableQuery;
