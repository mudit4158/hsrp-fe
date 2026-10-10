import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { describeError } from './api';
import { statusLabel } from './format';

// ------------------------------------------------------------------ layout

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · HSRP`;
  }, [title]);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="row gap">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="row gap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export const Grid = ({ cols = 2, children }: { cols?: number; children: ReactNode }) => <div className={`grid grid-${cols}`}>{children}</div>;

// ------------------------------------------------------------------ controls

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; busy?: boolean; small?: boolean };
export function Button({ variant = 'secondary', busy, small, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant} ${small ? 'btn-sm' : ''} ${className}`} disabled={disabled || busy} {...rest}>
      {busy && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, wide }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...p} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="input" rows={3} {...p} />;
export function Select({ options, placeholder, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ value: string; label: string } | string>; placeholder?: string }) {
  return (
    <select className="input" {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: Array<{ key: string; label: ReactNode }>; value: string; onChange: (k: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={t.key === value} className={t.key === value ? 'tab active' : 'tab'} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ data display

export interface Column<T> {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
}

export function Table<T extends { id?: string }>({ columns, rows, empty = 'Nothing here yet.', onRowClick, rowKey }: { columns: Column<T>[]; rows: T[] | undefined; empty?: ReactNode; onRowClick?: (r: T) => void; rowKey?: (r: T, i: number) => string }) {
  if (!rows) return <Loading />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : (r.id ?? i)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'clickable' : ''}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align }}>
                  {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '–')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pager">
      <span className="muted">
        {total === 0 ? 'No results' : `${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total}`}
      </span>
      <div className="row gap">
        <Button small disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button small disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  RECEIVED: 'info', VALIDATED: 'info', AWAITING_APPROVAL: 'warn', AWAITING_PAYMENT: 'warn', CONFIRMED: 'info', ISSUED: 'violet', QC_PASSED: 'violet',
  STICKER_PRINTED: 'violet', DISPATCHED: 'teal', INWARDED: 'teal', FITTED: 'teal', COMPLETED: 'ok', REJECTION_REVIEW: 'warn', REJECTED: 'bad', CANCELLED: 'muted',
  PENDING: 'warn', APPROVED: 'ok', DISAPPROVED: 'bad', DONE: 'ok', FAILED: 'warn', DEAD: 'bad', RUNNING: 'info', SUCCESS: 'ok', CREATED: 'info',
  OPEN: 'warn', IN_PROGRESS: 'info', RESOLVED: 'ok', CLOSED: 'muted', INWARDED_CH: 'ok', ACCEPTED: 'ok', POSTED: 'ok', MANUAL: 'bad', RETRYING: 'warn',
  HELD: 'warn', CAPTURED: 'ok', RELEASED: 'muted', REFUNDED: 'muted', SENT: 'ok', QUEUED: 'warn', ACTIVE: 'ok', CLOSED_ALLOC: 'muted', OK: 'ok', ERROR: 'bad',
  AVAILABLE: 'ok', ALLOCATED: 'info', SCRAPPED: 'bad', EXHAUSTED: 'muted',
};

export const Badge = ({ tone = 'muted', children }: { tone?: string; children: ReactNode }) => <span className={`badge badge-${tone}`}>{children}</span>;
export const StatusBadge = ({ status }: { status?: string | null }) => (status ? <Badge tone={TONE[status] ?? 'muted'}>{statusLabel(status)}</Badge> : <span>–</span>);

export function KV({ items }: { items: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="kv">
      {items.map(([k, v], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd>{v ?? '–'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export const Alert = ({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'bad' | 'ok'; children: ReactNode }) => <div className={`alert alert-${tone}`}>{children}</div>;
export const Loading = ({ label = 'Loading…' }: { label?: string }) => <div className="loading"><span className="spinner" /> {label}</div>;
export const ErrorBox = ({ error }: { error: unknown }) => (error ? <Alert tone="bad">{describeError(error)}</Alert> : null);

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: Array<{ title: ReactNode; at?: ReactNode; note?: ReactNode; tone?: string }> }) {
  return (
    <ol className="timeline">
      {items.map((it, i) => (
        <li key={i} className={it.tone ? `tl-${it.tone}` : ''}>
          <div className="tl-title">{it.title}</div>
          {it.at && <div className="tl-at">{it.at}</div>}
          {it.note && <div className="tl-note">{it.note}</div>}
        </li>
      ))}
    </ol>
  );
}

export const Mono = ({ children }: { children: ReactNode }) => <code className="mono">{children}</code>;
export const Json = ({ value }: { value: unknown }) => <pre className="json">{JSON.stringify(value, null, 2)}</pre>;

// ------------------------------------------------------------------ toasts

interface Toast {
  id: number;
  tone: 'ok' | 'bad' | 'info';
  text: string;
}
const ToastCtx = createContext<{ push: (tone: Toast['tone'], text: string) => void }>({ push: () => undefined });

export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast['tone'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, tone, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === 'bad' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const { push } = useContext(ToastCtx);
  return { ok: (t: string) => push('ok', t), bad: (e: unknown) => push('bad', describeError(e)), info: (t: string) => push('info', t) };
}

/** Runs an async action with a busy flag and an error toast. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(key);
      try {
        const r = await fn();
        if (success) toast.ok(success);
        return r;
      } catch (e) {
        toast.bad(e);
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );
  return { busy, run };
}
