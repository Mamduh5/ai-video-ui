import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearchParams } from "react-router-dom";
import { getProjectLibrary } from "./api";
import { preferredView, providers, rememberLocation, savedScroll, saveScroll, saveView, sorts, statuses } from "./presentation";
import type { ProjectLibraryQuery } from "./types";

export function useProjectLibrary() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timer);
  }, [q]);
  const provider = providers.find(([value]) => value === params.get("provider"))?.[0];
  const status = statuses.find(([value]) => value === params.get("status"))?.[0];
  const sort = sorts.find(([value]) => value === params.get("sort"))?.[0] ?? "recent";
  const paused = params.get("paused") === "true" ? true : params.get("paused") === "false" ? false : undefined;
  const view = params.get("view") === "grid" ? "grid" : params.get("view") === "list" ? "list" : preferredView();
  const search = q === "" ? "" : debouncedQ;
  const filters: ProjectLibraryQuery = { q: search || undefined, provider, status, sort, paused, limit: 40 };
  const queryKey = ["projectLibrary", filters] as const;
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => getProjectLibrary({ ...filters, cursor: pageParam }, undefined, signal),
    getNextPageParam: page => page.page.has_more ? page.page.next_cursor ?? undefined : undefined,
    // Keep each traversal stable. A stale key switch would replay every cursor page.
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  // Concurrent updates may move an ID across a cursor boundary. Show it once.
  const projects = useMemo(() => [...new Map(query.data?.pages.flatMap(page => page.projects).map(project => [project.id, project])).values()], [query.data]);
  const href = location.pathname + location.search;
  const currentHref = useRef(href);
  const capturePosition = useCallback(() => saveScroll(currentHref.current, window.scrollY), []);
  const restoreTop = useRef(savedScroll(href));
  const previousHref = useRef(href);
  const restored = useRef(false);
  useLayoutEffect(() => {
    if (previousHref.current !== href) {
      previousHref.current = href;
      restoreTop.current = savedScroll(href);
      restored.current = false;
    }
    currentHref.current = href;
    rememberLocation(href);
    if (!query.isSuccess || q !== search || restored.current) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: restoreTop.current, left: 0, behavior: "instant" });
      restored.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [href, query.isSuccess, q, search]);
  useEffect(() => {
    const capture = () => { if (restored.current) saveScroll(href, window.scrollY); };
    window.addEventListener("scroll", capture, { passive: true });
    return () => window.removeEventListener("scroll", capture);
  }, [href]);

  function update(key: string, value: string) {
    saveScroll(href, window.scrollY);
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key); else next.set(key, value);
    // A changed query starts at the top; returning via history restores its saved position.
    saveScroll(location.pathname + (next.size ? `?${next}` : ""), 0);
    if (key === "view") saveView(value);
    setParams(next, { replace: key === "q" });
  }
  function clearFilters() {
    const next = new URLSearchParams();
    if (params.has("view")) next.set("view", view);
    saveScroll(location.pathname + (next.size ? `?${next}` : ""), 0);
    setParams(next);
  }
  async function refresh() {
    // Cancel before trimming: an in-flight continuation must not reappend old pages.
    await client.cancelQueries({ queryKey, exact: true });
    client.setQueryData(queryKey, (data: typeof query.data) => data ? {
      pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1),
    } : data);
    saveScroll(href, 0);
    window.scrollTo({ top: 0, left: 0 });
    await query.refetch();
  }
  return {
    query, projects, q, provider, status, sort, paused, view, update, clearFilters, refresh,
    searching: q !== search,
    filtered: Boolean(q || provider || status || paused !== undefined),
    capturePosition,
  };
}
