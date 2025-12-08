// lib/api.ts


  /* ----------------------------- Fetchers ----------------------------- */
export async function apiGet<T>(url: string, fallback: T): Promise<T> {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return fallback;
      return (await r.json()) as T;
    } catch {
      return fallback;
    }
  }

  export async function apiPost<T>(url: string, body: any): Promise<T | null> {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      return null;
    }
  }

  export async function apiPut<T>(url: string, body: any): Promise<T | null> {
    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      return null;
    }
  }
