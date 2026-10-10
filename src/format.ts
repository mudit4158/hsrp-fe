import { STATUS_LABELS } from '@hsrp/contracts';

const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };

export const rupees = (paise?: number | null) =>
  paise == null ? '–' : `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const dt = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleString('en-IN', { ...IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '–';

export const date = (v?: string | Date | null) => (v ? new Date(v).toLocaleDateString('en-IN', { ...IST, day: '2-digit', month: 'short', year: 'numeric' }) : '–');

export const statusLabel = (s?: string | null) => (s ? (STATUS_LABELS[s] ?? s.replace(/_/g, ' ').toLowerCase()) : '–');

export function ago(v?: string | Date | null) {
  if (!v) return '–';
  const ms = Date.now() - new Date(v).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Today in IST as YYYY-MM-DD. */
export const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
