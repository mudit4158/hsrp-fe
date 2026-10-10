/** Thin API client. Errors arrive as RFC 7807 problem JSON and are thrown as ApiError. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public code: string,
    public errors?: Array<{ path: string; message: string }>,
    public body?: Record<string, unknown>,
  ) {
    super(detail || title);
  }
}

const TOKEN_KEY = 'hsrp.token';
const CUSTOMER_KEY = 'hsrp.customer';

export const session = {
  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set token(v: string | null) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
  /** Short-lived customer token from the public portal, kept per tab. */
  get customer(): string | null {
    try {
      return sessionStorage.getItem(CUSTOMER_KEY);
    } catch {
      return null;
    }
  },
  set customer(v: string | null) {
    try {
      if (v) sessionStorage.setItem(CUSTOMER_KEY, v);
      else sessionStorage.removeItem(CUSTOMER_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

/** crypto.randomUUID exists only in secure contexts (https or localhost); a LAN address is neither. */
export function uuid(): string {
  const c: Crypto = crypto;
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface RequestOptions {
  body?: unknown;
  form?: FormData;
  idempotent?: boolean;
  customer?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export function qs(query?: RequestOptions['query']) {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function request<T = any>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = opts.customer ? session.customer : session.token;
  if (token) headers.authorization = `Bearer ${token}`;
  if (opts.idempotent) headers['idempotency-key'] = uuid();
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api/v1${path}${qs(opts.query)}`, { method, headers, body });
  if (res.status === 401 && !opts.customer && session.token) onUnauthorized?.();
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    const p = type.includes('json') ? await res.json().catch(() => ({})) : {};
    throw new ApiError(res.status, p.title ?? res.statusText, p.detail ?? '', String(p.type ?? '').split('/').pop() ?? '', p.errors, p);
  }
  if (type.includes('json')) return res.json();
  return (await res.blob()) as unknown as T;
}

export const api = {
  get: <T = any>(path: string, query?: RequestOptions['query'], customer = false) => request<T>('GET', path, { query, customer }),
  post: <T = any>(path: string, body?: unknown, opts: Omit<RequestOptions, 'body'> = {}) => request<T>('POST', path, { ...opts, body }),
  put: <T = any>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
};

/** Fetches a PDF/CSV with the session token and opens or downloads it. */
export async function openFile(method: 'GET' | 'POST', path: string, opts: RequestOptions & { download?: string } = {}) {
  const blob = await request<Blob>(method, path, opts);
  const url = URL.createObjectURL(blob);
  if (opts.download) {
    const a = document.createElement('a');
    a.href = url;
    a.download = opts.download;
    a.click();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.errors?.length) return e.errors.map((x) => `${x.path || 'request'}: ${x.message}`).join('; ');
    return e.detail || e.title;
  }
  return (e as Error)?.message ?? 'Something went wrong';
}
