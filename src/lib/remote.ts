import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Loads a list from the backend. If the endpoint isn't live yet, falls back to
 * sample rows so the page stays usable; `sample` tells the UI to say so.
 * Mutations go through `mutate`, which calls the backend and then updates the
 * row locally (also in sample mode, so every button visibly works).
 */
export function useRemoteList<T extends { id: string }>(
  path: string,
  fallback: T[],
  map: (raw: any) => T = (r) => r,
  query?: Record<string, string | number | undefined>,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState(false);
  const qKey = JSON.stringify(query ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d: any = await api(path, { query: JSON.parse(qKey) });
      const list: any[] = Array.isArray(d) ? d : d?.items ?? [];
      setRows(list.map(map));
      setSample(false);
    } catch {
      setRows(fallback);
      setSample(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, qKey]);

  useEffect(() => {
    load();
  }, [load]);

  /** Run a backend call; on success (or in sample mode) patch the row locally. */
  const mutate = useCallback(
    async (call: () => Promise<unknown>, id: string, patch: Partial<T> | null) => {
      try {
        await call();
      } catch (e) {
        if (!sample) throw e;
      }
      setRows((rs) =>
        patch === null ? rs.filter((r) => r.id !== id) : rs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [sample],
  );

  const add = (row: T) => setRows((rs) => [row, ...rs]);

  return { rows, setRows, loading, sample, reload: load, mutate, add };
}
