import { useEffect, useState } from 'react';

// Static-snapshot fetcher. Pulls JSON files from /public/data/*.json.
// On GH Pages, BASE_URL is "/Manufacturing-ODI-Demo/"; locally it's "/".

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export async function fetchJSON<T>(path: string): Promise<T> {
  const url = `${BASE}/data/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useJSON<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJSON<T>(path)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [path]);

  return { data, loading, error };
}
