import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as OpenLibraryModule from "./openLibrary";

type Mod = typeof OpenLibraryModule;

let mod: Mod;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({
    toFake: [
      "Date",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
    ],
  });
  vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  mod = await import("./openLibrary");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const sampleSearchDoc = {
  key: "/works/OL1W",
  title: "Sample Title",
  author_name: ["Sample Author"],
  first_publish_year: 2020,
  number_of_pages_median: 200,
  cover_i: 1,
};

const sampleSearchResponse = { docs: [sampleSearchDoc], numFound: 1 };
const emptySearchResponse = { docs: [], numFound: 0 };
const sampleWorkResponse = {
  description: "A sample description",
  subjects: ["Sample Subject"],
  first_sentence: "A sample first sentence.",
  title: "Sample Title",
  authors: [],
};
const emptyEditionsResponse = { entries: [] };

function smartSearchResponse(url: string): Response {
  const m = url.match(/[?&]q=([^&]*)/);
  const q = m ? decodeURIComponent(m[1]) : "default";
  const id = q.replace(/[^a-zA-Z0-9]+/g, "_");
  // If this is a series:"..." style query (used by the series-books fallback),
  // don't return any matches so we don't trigger extra recursive lookups.
  if (q.startsWith("series:") || q.includes('series:"')) {
    return makeJsonResponse(emptySearchResponse);
  }
  return makeJsonResponse({
    docs: [
      {
        key: `/works/OL_${id}_W`,
        title: q.split(" ")[0] ?? "Title",
        author_name: [q.split(" ")[1] ?? "Author"],
        first_publish_year: 2020,
        number_of_pages_median: 150,
        cover_i: 7,
      },
    ],
    numFound: 1,
  });
}

function defaultRouter(url: string): Response {
  if (url.includes("openlibrary.org/search.json")) {
    return smartSearchResponse(url);
  }
  if (url.includes("/editions.json")) {
    return makeJsonResponse(emptyEditionsResponse);
  }
  if (url.includes("/authors/")) {
    return makeJsonResponse({ name: "Sample Author" });
  }
  if (url.endsWith(".json")) {
    return makeJsonResponse(sampleWorkResponse);
  }
  return new Response("Not Found", { status: 404 });
}

function installRouterMock(): void {
  fetchMock.mockImplementation(async (url: string) => defaultRouter(url));
}

// Pause the very first fetch invocation. All subsequent calls resolve via the
// router. Returns a function that resumes the paused first fetch.
function installPausableRouterMock(): () => void {
  const gate = deferred<void>();
  let firstHandled = false;
  fetchMock.mockImplementation(async (url: string) => {
    if (!firstHandled) {
      firstHandled = true;
      await gate.promise;
    }
    return defaultRouter(url);
  });
  return () => gate.resolve();
}

// --- searchOpenLibrary cache ----------------------------------------------

describe("searchOpenLibrary cache", () => {
  it("hits the network only once for repeated identical calls", async () => {
    fetchMock.mockResolvedValue(makeJsonResponse(sampleSearchResponse));
    const r1 = await mod.searchOpenLibrary("hello world");
    const r2 = await mod.searchOpenLibrary("hello world");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
  });

  it("shares a single in-flight request among concurrent callers", async () => {
    const fetchDeferred = deferred<Response>();
    fetchMock.mockReturnValue(fetchDeferred.promise);

    const p1 = mod.searchOpenLibrary("foo");
    const p2 = mod.searchOpenLibrary("foo");
    const p3 = mod.searchOpenLibrary("foo");

    fetchDeferred.resolve(makeJsonResponse(sampleSearchResponse));
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(r3);
  });

  it("does not poison the cache when a secondary caller aborts", async () => {
    const fetchDeferred = deferred<Response>();
    fetchMock.mockReturnValue(fetchDeferred.promise);

    const ctrl = new AbortController();
    const p1 = mod.searchOpenLibrary("foo");
    const p2 = mod.searchOpenLibrary("foo", ctrl.signal);

    ctrl.abort();
    await expect(p2).rejects.toBeDefined();

    fetchDeferred.resolve(makeJsonResponse(sampleSearchResponse));
    const r1 = await p1;
    expect(r1).toBeDefined();

    // Cache populated; further calls don't trigger another fetch.
    const r3 = await mod.searchOpenLibrary("foo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r3).toEqual(r1);
  });

  it("expires entries after their TTL", async () => {
    fetchMock.mockImplementation(async () =>
      makeJsonResponse(sampleSearchResponse),
    );
    await mod.searchOpenLibrary("foo");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // searchCache TTL is 1 hour.
    vi.setSystemTime(new Date(Date.now() + 60 * 60 * 1000 + 1));
    await mod.searchOpenLibrary("foo");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("evicts least-recently-used entries past max size", async () => {
    fetchMock.mockImplementation(async () =>
      makeJsonResponse(sampleSearchResponse),
    );

    // searchCache max is 50; fill it with 51 unique queries.
    for (let i = 0; i < 51; i++) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      await mod.searchOpenLibrary(`q${i}`);
    }
    expect(fetchMock).toHaveBeenCalledTimes(51);

    // The oldest entry ("q0") should have been evicted.
    vi.setSystemTime(new Date(Date.now() + 1000));
    await mod.searchOpenLibrary("q0");
    expect(fetchMock).toHaveBeenCalledTimes(52);

    // The most-recently-used entry ("q50") should still be cached.
    await mod.searchOpenLibrary("q50");
    expect(fetchMock).toHaveBeenCalledTimes(52);
  });
});

// --- fetchWorkDetails cache -----------------------------------------------

describe("fetchWorkDetails cache", () => {
  it("hits the network only once for repeated identical calls", async () => {
    fetchMock.mockResolvedValue(makeJsonResponse(sampleWorkResponse));
    const r1 = await mod.fetchWorkDetails("/works/OL1W");
    const r2 = await mod.fetchWorkDetails("/works/OL1W");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
  });

  it("shares a single in-flight request among concurrent callers", async () => {
    const fetchDeferred = deferred<Response>();
    fetchMock.mockReturnValue(fetchDeferred.promise);

    const p1 = mod.fetchWorkDetails("/works/OL1W");
    const p2 = mod.fetchWorkDetails("/works/OL1W");
    const p3 = mod.fetchWorkDetails("/works/OL1W");

    fetchDeferred.resolve(makeJsonResponse(sampleWorkResponse));
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(r3);
  });

  it("does not poison the cache when a secondary caller aborts", async () => {
    const fetchDeferred = deferred<Response>();
    fetchMock.mockReturnValue(fetchDeferred.promise);

    const ctrl = new AbortController();
    const p1 = mod.fetchWorkDetails("/works/OL1W");
    const p2 = mod.fetchWorkDetails("/works/OL1W", ctrl.signal);

    ctrl.abort();
    await expect(p2).rejects.toBeDefined();

    fetchDeferred.resolve(makeJsonResponse(sampleWorkResponse));
    const r1 = await p1;
    expect(r1).toBeDefined();

    const r3 = await mod.fetchWorkDetails("/works/OL1W");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r3).toEqual(r1);
  });

  it("expires entries after their TTL", async () => {
    fetchMock.mockImplementation(async () =>
      makeJsonResponse(sampleWorkResponse),
    );
    await mod.fetchWorkDetails("/works/OL1W");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // workDetailsCache TTL is 24 hours.
    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 1));
    await mod.fetchWorkDetails("/works/OL1W");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("evicts least-recently-used entries past max size", async () => {
    fetchMock.mockImplementation(async () =>
      makeJsonResponse(sampleWorkResponse),
    );

    // workDetailsCache max is 100.
    for (let i = 0; i < 101; i++) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      await mod.fetchWorkDetails(`/works/OL${i}W`);
    }
    expect(fetchMock).toHaveBeenCalledTimes(101);

    vi.setSystemTime(new Date(Date.now() + 1000));
    await mod.fetchWorkDetails("/works/OL0W");
    expect(fetchMock).toHaveBeenCalledTimes(102);

    await mod.fetchWorkDetails("/works/OL100W");
    expect(fetchMock).toHaveBeenCalledTimes(102);
  });
});

// --- searchAndFetchWork cache ---------------------------------------------
//
// `searchAndFetchWork` internally calls `searchOpenLibrary` and
// `fetchWorkDetails`, which have their own caches. Without isolation, those
// nested caches would mask regressions in `searchAndFetchWork`'s own outer
// cache (a broken outer cache would still see 0 extra fetches because the
// inner caches catch them). To make outer-cache regressions detectable we:
//   1. Count outer-fetcher invocations via `__testInternals.getCallCounts()`.
//   2. Clear inner caches with `__testInternals.clearInnerHelperCaches()`
//      before any second observation, so a broken outer cache surfaces as
//      additional fetches.

describe("searchAndFetchWork cache", () => {
  it("hits the network only once for repeated identical calls", async () => {
    installRouterMock();
    const r1 = await mod.searchAndFetchWork("Title One", "Author One");
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(1);

    // Force inner caches to miss so any outer-cache regression would visibly
    // re-fetch. With a working outer cache, the second call is a pure hit.
    mod.__testInternals.clearInnerHelperCaches();

    const r2 = await mod.searchAndFetchWork("Title One", "Author One");
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFirst);
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(1);
    expect(r2).toEqual(r1);
  });

  it("shares a single in-flight request among concurrent callers", async () => {
    const resume = installPausableRouterMock();

    const p1 = mod.searchAndFetchWork("Title One", "Author One");
    const p2 = mod.searchAndFetchWork("Title One", "Author One");
    const p3 = mod.searchAndFetchWork("Title One", "Author One");

    resume();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    // 2 unique fetches expected (search + work details). All 3 callers
    // share the outer cache's in-flight promise.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Crucially, the outer fetcher itself only ran once across all 3 callers.
    // Without the seam, fetch counts alone would not detect a regression
    // here because the inner caches would dedupe duplicate fetcher work.
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(1);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(r3);
  });

  it("does not poison the cache when a secondary caller aborts", async () => {
    const resume = installPausableRouterMock();

    const ctrl = new AbortController();
    const p1 = mod.searchAndFetchWork("Title One", "Author One");
    const p2 = mod.searchAndFetchWork("Title One", "Author One", ctrl.signal);

    ctrl.abort();
    await expect(p2).rejects.toBeDefined();

    resume();
    const r1 = await p1;
    expect(r1).toBeDefined();

    // Force inner caches to miss so the next call exercises only the outer
    // cache. A broken outer cache would re-invoke the fetcher and refetch.
    mod.__testInternals.clearInnerHelperCaches();
    const callsBefore = fetchMock.mock.calls.length;
    const outerCallsBefore = mod.__testInternals.getCallCounts().searchAndFetchWorkUncached;

    const r3 = await mod.searchAndFetchWork("Title One", "Author One");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(outerCallsBefore);
    expect(r3).toEqual(r1);
  });

  it("expires entries after their TTL", async () => {
    installRouterMock();
    await mod.searchAndFetchWork("Title One", "Author One");
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(1);

    // searchAndFetchWorkCache TTL is 24 hours. Clear inner caches so the
    // re-fetch we expect must come from the outer cache expiring (not
    // because inner caches happen to still be valid).
    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 1));
    mod.__testInternals.clearInnerHelperCaches();

    await mod.searchAndFetchWork("Title One", "Author One");
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(2);
  });

  it("evicts least-recently-used entries past max size", async () => {
    installRouterMock();

    // searchAndFetchWorkCache max is 100. Use unique title/author pairs so
    // each call produces a unique outer cache key.
    for (let i = 0; i < 101; i++) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      await mod.searchAndFetchWork(`Title ${i}`, `Author ${i}`);
    }
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(101);

    // Clear inner caches so subsequent observations reflect outer state only.
    mod.__testInternals.clearInnerHelperCaches();
    const outerCallsBefore = mod.__testInternals.getCallCounts().searchAndFetchWorkUncached;

    // Most-recently-used entry should still be cached in the outer cache.
    await mod.searchAndFetchWork("Title 100", "Author 100");
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(outerCallsBefore);

    // Oldest entry should have been evicted -> outer fetcher runs again.
    vi.setSystemTime(new Date(Date.now() + 1000));
    await mod.searchAndFetchWork("Title 0", "Author 0");
    expect(mod.__testInternals.getCallCounts().searchAndFetchWorkUncached).toBe(outerCallsBefore + 1);
  });
});

// --- fetchSeriesInfo cache (bespoke implementation) -----------------------

describe("fetchSeriesInfo cache", () => {
  it("hits the network only once for repeated identical calls", async () => {
    installRouterMock();
    const r1 = await mod.fetchSeriesInfo("/works/OL1W");
    const callsAfterFirst = fetchMock.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    const r2 = await mod.fetchSeriesInfo("/works/OL1W");
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFirst);
    expect(r2).toEqual(r1);
  });

  it("shares a single in-flight request among concurrent callers", async () => {
    const resume = installPausableRouterMock();

    const p1 = mod.fetchSeriesInfo("/works/OL1W");
    const p2 = mod.fetchSeriesInfo("/works/OL1W");
    const p3 = mod.fetchSeriesInfo("/works/OL1W");

    resume();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    // No author key in the work response, so internal calls are:
    // 1) work fetch, 2) editions fetch, 3) search fetch.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(r3);
  });

  it("does not poison the cache when a secondary caller aborts", async () => {
    const resume = installPausableRouterMock();

    const ctrl = new AbortController();
    const p1 = mod.fetchSeriesInfo("/works/OL1W");
    const p2 = mod.fetchSeriesInfo("/works/OL1W", ctrl.signal);

    ctrl.abort();
    await expect(p2).rejects.toBeDefined();

    resume();
    const r1 = await p1;
    // Subsequent caller hits the cache instead of the network.
    const callsBefore = fetchMock.mock.calls.length;
    const r3 = await mod.fetchSeriesInfo("/works/OL1W");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(r3).toEqual(r1);
  });

  it("expires entries after their TTL", async () => {
    installRouterMock();
    await mod.fetchSeriesInfo("/works/OL1W");
    const callsAfterFirst = fetchMock.mock.calls.length;

    // SERIES_CACHE_TTL_MS is 24 hours.
    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 1));
    await mod.fetchSeriesInfo("/works/OL1W");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("evicts least-recently-used entries past max size", async () => {
    installRouterMock();

    // SERIES_CACHE_MAX_ENTRIES is 50.
    for (let i = 0; i < 51; i++) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      await mod.fetchSeriesInfo(`/works/OL${i}W`);
    }

    const callsBefore = fetchMock.mock.calls.length;

    // Most-recently-used entry should still be cached -> no new fetches.
    await mod.fetchSeriesInfo("/works/OL50W");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);

    // Oldest entry should have been evicted -> new fetches happen.
    vi.setSystemTime(new Date(Date.now() + 1000));
    await mod.fetchSeriesInfo("/works/OL0W");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
