import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, describeError } from '../api';
import { date, dt } from '../format';
import { Alert, Badge, Button, Card, Field, Input, KV, Select, StatusBadge, Tabs, Textarea, Timeline } from '../ui';
import { PortalLayout } from './PortalRoutes';
import { OTP_HINT } from './shared';

export function Support() {
  const [tab, setTab] = useState('raise');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cats = useQuery({ queryKey: ['p-cats'], queryFn: () => api.get('/public/complaint-categories') });
  const [f, setF] = useState({ name: '', mobile: '', regnNo: '', category: 'PLATE_DELAY', description: '' });
  const [otp, setOtp] = useState<any>(null);
  const [code, setCode] = useState('');
  const [done, setDone] = useState<any>(null);
  const [ticketNo, setTicketNo] = useState('');
  const [status, setStatus] = useState<any>(null);

  async function attempt(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }
  const switchTab = (t: string) => {
    setTab(t);
    setOtp(null);
    setCode('');
    setError('');
  };

  return (
    <PortalLayout>
      <h1>HSRP Support</h1>
      <Tabs value={tab} onChange={switchTab} tabs={[{ key: 'raise', label: 'Raise a complaint' }, { key: 'status', label: 'Complaint status' }]} />
      {error && <Alert tone="bad">{error}</Alert>}
      {tab === 'raise' && (
        <Card>
          {done ? (
            <Alert tone="ok">
              Complaint <b>{done.ticketNo}</b> is registered. We will resolve it by {date(done.dueAt)}. You will get an SMS when we reply.
            </Alert>
          ) : (
            <div className="stack">
              <div className="form">
                <Field label="Your name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                <Field label="Mobile number"><Input inputMode="numeric" maxLength={10} value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, '') })} /></Field>
                <Field label="Registration number (optional)"><Input value={f.regnNo} onChange={(e) => setF({ ...f, regnNo: e.target.value.toUpperCase().replace(/\s/g, '') })} /></Field>
                <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={(cats.data ?? []).map((c: any) => ({ value: c.code, label: c.name }))} /></Field>
                <Field label="What happened?" wide><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
              </div>
              {!otp ? (
                <div>
                  <Button variant="primary" busy={busy} disabled={f.name.length < 2 || !/^[6-9]\d{9}$/.test(f.mobile) || f.description.length < 10} onClick={() => attempt(async () => setOtp(await api.post('/public/otp', { purpose: 'SUPPORT', mobile: f.mobile })))}>
                    Send OTP
                  </Button>
                </div>
              ) : (
                <>
                  <Alert tone="info">OTP sent to {otp.sentTo}. {OTP_HINT}</Alert>
                  <div className="form"><Field label="OTP"><Input maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus /></Field></div>
                  <div>
                    <Button variant="primary" busy={busy} disabled={code.length !== 6} onClick={() => attempt(async () => setDone(await api.post('/public/complaints', { ...f, regnNo: f.regnNo || undefined, otpRef: otp.otpRef, otpCode: code })))}>
                      Submit complaint
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}
      {tab === 'status' && (
        <Card>
          {!status ? (
            <div className="stack">
              <div className="form"><Field label="Complaint number"><Input value={ticketNo} onChange={(e) => setTicketNo(e.target.value.toUpperCase().trim())} placeholder="CMP2610-00001" /></Field></div>
              {!otp ? (
                <div>
                  <Button variant="primary" busy={busy} disabled={ticketNo.length < 5} onClick={() => attempt(async () => setOtp(await api.post('/public/otp', { purpose: 'SUPPORT', ticketNo })))}>
                    Send OTP to the mobile on the complaint
                  </Button>
                </div>
              ) : (
                <>
                  <Alert tone="info">OTP sent to {otp.sentTo}. {OTP_HINT}</Alert>
                  <div className="form"><Field label="OTP"><Input maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus /></Field></div>
                  <div>
                    <Button variant="primary" busy={busy} disabled={code.length !== 6} onClick={() => attempt(async () => setStatus(await api.post('/public/complaints/status', { ticketNo, otpRef: otp.otpRef, code })))}>
                      Show status
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="stack">
              <div className="row spread">
                <h2>{status.ticketNo} · {status.title}</h2>
                <StatusBadge status={status.status} />
              </div>
              <KV items={[['Raised', dt(status.createdAt)], ['Answer due by', date(status.dueAt)], ['Age', `${status.ageDays} days`], ['Within 15 days', status.overdue ? <Badge tone="bad">late</Badge> : <Badge tone="ok">yes</Badge>]]} />
              <Timeline items={status.events.map((e: any) => ({ title: e.kind === 'CREATED' ? 'Complaint raised' : e.status ? `Status: ${e.status.toLowerCase().replace('_', ' ')}` : 'Reply', at: dt(e.at), note: e.message }))} />
            </div>
          )}
        </Card>
      )}
    </PortalLayout>
  );
}
