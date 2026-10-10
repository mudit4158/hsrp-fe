import { FormEvent, useState } from 'react';
import { api, describeError, session } from '../api';
import { addDays, dt, rupees, statusLabel, todayIst } from '../format';
import { Alert, Button, Card, Field, Input, KV, Select, StatusBadge, Timeline } from '../ui';
import { PortalLayout } from './PortalRoutes';
import { downloadReceipt, OTP_HINT, payOnline } from './shared';

export function Status() {
  const [f, setF] = useState({ regnNo: '', chassisLast5: '' });
  const [otp, setOtp] = useState<any>(null);
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resched, setResched] = useState({ open: false, date: addDays(todayIst(), 1), slot: '', slots: [] as any[] });

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

  const request = (e: FormEvent) => {
    e.preventDefault();
    attempt(async () => setOtp(await api.post('/public/otp', { purpose: 'STATUS', regnNo: f.regnNo, chassisLast5: f.chassisLast5 })));
  };
  const verify = () =>
    attempt(async () => {
      const r = await api.post('/public/status', { otpRef: otp.otpRef, code });
      session.customer = r.token;
      setOrder(r.order);
    });
  const reload = async () => setOrder(await api.get(`/public/orders/${order.id}`, undefined, true));
  const loadSlots = (date: string) =>
    attempt(async () => {
      if (!order.centre) return;
      const r = await api.get('/public/slots', { dealerCode: order.centre.code, date });
      setResched((x) => ({ ...x, date, slot: '', slots: r.slots }));
    });

  return (
    <PortalLayout>
      <h1>HSRP Status</h1>
      {error && <Alert tone="bad">{error}</Alert>}
      {!order && (
        <Card title="Find your order">
          <form className="stack" onSubmit={request}>
            <div className="form">
              <Field label="Registration number">
                <Input required value={f.regnNo} onChange={(e) => setF({ ...f, regnNo: e.target.value.toUpperCase().replace(/\s/g, '') })} />
              </Field>
              <Field label="Last 5 characters of chassis no.">
                <Input required maxLength={5} value={f.chassisLast5} onChange={(e) => setF({ ...f, chassisLast5: e.target.value.toUpperCase() })} />
              </Field>
            </div>
            {!otp && (
              <div>
                <Button variant="primary" type="submit" busy={busy}>
                  Send OTP to my registered mobile
                </Button>
              </div>
            )}
          </form>
          {otp && (
            <div className="stack" style={{ marginTop: 12 }}>
              <Alert tone="info">
                OTP sent to {otp.sentTo}. {OTP_HINT}
              </Alert>
              <div className="form">
                <Field label="OTP">
                  <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
                </Field>
              </div>
              <div>
                <Button variant="primary" busy={busy} disabled={code.length !== 6} onClick={verify}>
                  Show status
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      {order && (
        <>
          <Card title={`Order ${order.orderNo}`} actions={<StatusBadge status={order.status} />}>
            {order.status === 'REJECTED' && <Alert tone="bad">{order.rejectionReason}</Alert>}
            <KV
              items={[
                ['Vehicle', order.regnNo],
                ['Order type', order.orderType],
                ['Amount', rupees(order.amountPaise)],
                ['Payment', order.payment ? `${order.payment.status.toLowerCase()} · ${order.payment.txnId}` : '–'],
                ['Fitment centre', order.centre ? `${order.centre.name}, ${order.centre.city}` : '–'],
                ['Appointment', order.booking ? `${order.booking.date} at ${order.booking.slot}` : '–'],
              ]}
            />
            <div className="row gap" style={{ marginTop: 12 }}>
              {order.status === 'AWAITING_PAYMENT' && (
                <Button variant="primary" busy={busy} onClick={() => attempt(() => payOnline(order.id))}>
                  Pay {rupees(order.amountPaise)}
                </Button>
              )}
              {order.payment?.status === 'SUCCESS' && <Button onClick={() => downloadReceipt(order.id, order.orderNo)}>Download receipt</Button>}
              {order.booking && !['FITTED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status) && (
                <Button onClick={() => { setResched((x) => ({ ...x, open: true })); loadSlots(resched.date); }}>Reschedule</Button>
              )}
            </div>
            {resched.open && (
              <div className="stack" style={{ marginTop: 12 }}>
                <div className="form">
                  <Field label="New date">
                    <Input type="date" value={resched.date} min={addDays(todayIst(), 1)} max={addDays(todayIst(), 30)} onChange={(e) => loadSlots(e.target.value)} />
                  </Field>
                  <Field label="Slot">
                    <Select value={resched.slot} onChange={(e) => setResched({ ...resched, slot: e.target.value })} placeholder="Choose" options={resched.slots.filter((s: any) => s.available > 0).map((s: any) => s.start)} />
                  </Field>
                </div>
                <div>
                  <Button variant="primary" disabled={!resched.slot} busy={busy} onClick={() => attempt(async () => { await api.post(`/public/orders/${order.id}/reschedule`, { slotDate: resched.date, slotStart: resched.slot }, { customer: true }); setResched({ ...resched, open: false }); await reload(); })}>
                    Move appointment
                  </Button>
                </div>
              </div>
            )}
          </Card>
          <Card title="Progress">
            <Timeline items={order.timeline.map((t: any) => ({ title: statusLabel(t.status), at: dt(t.at), note: t.note }))} />
          </Card>
        </>
      )}
    </PortalLayout>
  );
}
