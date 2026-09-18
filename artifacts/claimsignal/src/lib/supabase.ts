const env = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
const url = env?.VITE_SUPABASE_URL;
const key = env?.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

export class SupabaseUnavailableError extends Error {
  constructor() {
    super('ClaimSignal is not connected to its data source.');
    this.name = 'SupabaseUnavailableError';
  }
}

function endpoint(table: string) {
  if (!url || !key) throw new SupabaseUnavailableError();
  return `${url.replace(/\/$/, '')}/rest/v1/${table}`;
}

async function request<T>(table: string, init?: RequestInit, query = ''): Promise<T> {
  const response = await fetch(`${endpoint(table)}${query}`, {
    ...init,
    headers: {
      apikey: key as string,
      Authorization: `Bearer ${key as string}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return [] as T;
  return response.json() as Promise<T>;
}

export const supabase = {
  list: <T>(table: string, query = '') => request<T[]>(table, undefined, query),
  one: <T>(table: string, query = '') => request<T[]>(table, undefined, query).then((rows) => rows[0] ?? null),
  update: <T>(table: string, query: string, body: Record<string, unknown>) =>
    request<T[]>(table, { method: 'PATCH', body: JSON.stringify(body) }, query),
};