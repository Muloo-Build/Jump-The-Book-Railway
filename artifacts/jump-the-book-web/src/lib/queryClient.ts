import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Module-level holder for Clerk's `getToken`. We can't call React hooks from
// `apiFetch` (a plain function used inside react-query queryFns), so a tiny
// bridge component up at the App root writes the function reference here on
// mount. This makes every API call mobile-Safari-safe by attaching a Bearer
// token instead of relying solely on Clerk's session cookie — which ITP and
// the in-app browsers users open from Messages/email frequently strip.
type GetToken = () => Promise<string | null>;
let getTokenFn: GetToken | null = null;

export function setApiTokenGetter(fn: GetToken | null): void {
  getTokenFn = fn;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let bearer: string | null = null;
  if (getTokenFn) {
    try {
      bearer = await getTokenFn();
    } catch {
      // If Clerk hasn't finished loading yet, fall back to cookie auth.
      bearer = null;
    }
  }
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
