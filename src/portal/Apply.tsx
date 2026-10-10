import { useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { api, describeError, session } from '../api';
import { addDays, rupees, todayIst } from '../format';
import { Alert, Badge, Button, Card, Field, Input, KV, Loading, Select, Table } from '../ui';
import { PortalLayout } from './PortalRoutes';
import { OTP_HINT, payOnline } from './shared';

const STEPS = ['Vehicle', 'Fitment centre', 'Your details', 'Confirm', 'Payment'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Apply() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ stateCode: 'WB', regnNo: '', chassisLast5: '', engineLast5: '' });
  const [check, setCheck] = useState<any>(null);
  const [repl, setRepl] = useState({ plateSet: 'BOTH', replacementReason: 'DAMAGED', evidenceFileId: '', evidenceName: '' });
  const [city, setCity] = useState('');
  const [dealerCode, setDealerCode] = useState('');
  const [date, setDate] = useState(addDays(todayIst(), 1));
  const [slot, setSlot] = useState('');
  const [who, setWho] = useState({ ownerName: '', mobile: '', email: '' });
  const [otp, setOtp] = useState<{ otpRef: string; sentTo: string } | null>(null);
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<any>(null);

  const states = useQuery({ queryKey: ['p-states'], queryFn: () => api.get('/public/states') });
  const prices = useQuery({ queryKey: ['p-prices', v.stateCode], queryFn: () => api.get('/public/prices', { stateCode: v.stateCode }) });
  const cities = useQuery({ queryKey: ['p-cities', check?.stateCode], queryFn: () => api.get('/public/cities', { stateCode: check.stateCode }), enabled: Boolean(check) });
  const centres = useQuery({ queryKey: ['p-centres', check?.stateCode, city], queryFn: () => api.get('/public/fitment-centres', { stateCode: check.stateCode, city }), enabled: Boolean(check && city) });
  const slots = useQuery({ queryKey: ['p-slots', dealerCode, date], queryFn: () => api.get('/public/slots', { dealerCode, date }), enabled: Boolean(dealerCode && date) });
  const live = useQuery({ queryKey: ['p-order', order?.orderId], queryFn: () => api.get(`/public/orders/${order.orderId}`, undefined, true), enabled: Boolean(order), refetchInterval: (q) => (['AWAITING_PAYMENT', 'CONFIRMED', 'REJECTED', 'AWAITING_APPROVAL'].includes(q.state.data?.status) ? false : 1500) });
  const state = (states.data ?? []).find((s: any) => s.code === v.stateCode);

  useEffect(() => setSlot(''), [dealerCode, date]);

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

  const checkVehicle = (e: FormEvent) => {
    e.preventDefault();
    attempt(async () => {
      setCheck(null);
      const c = await api.post('/public/vehicle-checks', v);
      let r = c;
      for (let i = 0; i < 40 && r.status === 'PENDING'; i++) {
        await sleep(600);
        r = await api.get(`/public/vehicle-checks/${c.id}`);
      }
      if (r.status === 'PENDING') throw new Error('VAHAN is taking long to answer. Try again in a few minutes.');
      if (r.status === 'FAILED') throw new Error(r.error);
      setCheck(r);
    });
  };

  const uploadEvidence = (file: File) =>
    attempt(async () => {
      const fd = new FormData();
      fd.set('file', file);
      const f = await api.post('/public/evidence', undefined, { form: fd });
      setRepl((x) => ({ ...x, evidenceFileId: f.id, evidenceName: f.filename }));
    });

  const sendOtp = () =>
    attempt(async () => {
      setOtp(await api.post('/public/otp', { purpose: 'ORDER_CONFIRM', mobile: who.mobile }));
    });

  const placeOrder = () =>
    attempt(async () => {
      const r = await api.post(
        '/public/orders',
        {
          vehicleCheckId: check.id,
          otpRef: otp!.otpRef,
          otpCode: code,
          dealerCode,
          slotDate: date,
          slotStart: slot,
          ownerName: who.ownerName,
          mobile: who.mobile,
          email: who.email || undefined,
          orderType: check.result.orderType,
          ...(check.result.orderType === 'REPLACEMENT' ? { plateSet: repl.plateSet, replacementReason: repl.replacementReason, evidenceFileId: repl.evidenceFileId } : {}),
        },
        { idempotent: true },
      );
      session.customer = r.token;
      setOrder(r);
      setStep(4);
    });

  const res = check?.result;
  return (
    <PortalLayout>
      <h1>Apply HSRP</h1>
      <div className="steps" style={{ marginTop: 12 }}>
        {STEPS.map((s, i) => (
          <span key={s} className={`step ${i === step ? 'on' : i < step ? 'done' : ''}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      {error && <Alert tone="bad">{error}</Alert>}

      {step === 0 && (
        <Card title="Your vehicle">
          <form className="stack" onSubmit={checkVehicle}>
            <div className="form">
              <Field label="State">
                <Select value={v.stateCode} onChange={(e) => { setV({ ...v, stateCode: e.target.value }); setCheck(null); }} options={(states.data ?? []).map((s: any) => ({ value: s.code, label: s.name }))} />
              </Field>
              <Field label="Registration number">
                <Input required value={v.regnNo} onChange={(e) => setV({ ...v, regnNo: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="WB02AB1234" />
              </Field>
              <Field label="Last 5 characters of chassis no.">
                <Input required maxLength={5} value={v.chassisLast5} onChange={(e) => setV({ ...v, chassisLast5: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Last 5 characters of engine no.">
                <Input required maxLength={5} value={v.engineLast5} onChange={(e) => setV({ ...v, engineLast5: e.target.value.toUpperCase() })} />
              </Field>
            </div>
            <div>
              <Button variant="primary" type="submit" busy={busy}>
                Check with VAHAN
              </Button>
            </div>
          </form>
          {res && (
            <div className="stack" style={{ marginTop: 16 }}>
              <Alert tone="ok">{res.message}</Alert>
              <KV
                items={[
                  ['Maker', res.maker],
                  ['Vehicle', `${res.vehicleClass ?? res.vchCatg} · ${res.fuel}`],
                  ['Registered', res.regnDate],
                  ['Emission norms', <>{res.norms} {res.greenStrip && <Badge tone="ok">green strip sticker</Badge>}</>],
                  ['Order type', res.orderType === 'REPLACEMENT' ? 'Replacement' : 'HSRP for an old vehicle'],
                  ['Price (front + rear)', res.pricePaise ? rupees(res.pricePaise) : 'shown after confirmation'],
                ]}
              />
              {res.orderType === 'REPLACEMENT' && (
                <div className="form">
                  <Field label="Plates to replace">
                    <Select value={repl.plateSet} onChange={(e) => setRepl({ ...repl, plateSet: e.target.value })} options={[{ value: 'BOTH', label: 'Front and rear' }, { value: 'FRONT', label: 'Front' }, { value: 'REAR', label: 'Rear' }]} />
                  </Field>
                  <Field label="Reason">
                    <Select value={repl.replacementReason} onChange={(e) => setRepl({ ...repl, replacementReason: e.target.value })} options={[{ value: 'DAMAGED', label: 'Plate damaged' }, { value: 'THEFT', label: 'Plate stolen' }]} />
                  </Field>
                  <Field label={repl.replacementReason === 'THEFT' ? 'Police report (photo or PDF)' : 'Photo of the damaged plate'} hint={repl.evidenceName ? `Uploaded: ${repl.evidenceName}` : 'Reviewed before your order is confirmed'}>
                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && uploadEvidence(e.target.files[0])} />
                  </Field>
                </div>
              )}
              <div>
                <Button variant="primary" disabled={res.orderType === 'REPLACEMENT' && !repl.evidenceFileId} onClick={() => setStep(1)}>
                  Continue
                </Button>
              </div>
            </div>
          )}
          {state?.rulePack === 'odisha' && prices.data?.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary>Published prices in {state.name}</summary>
              <Table
                rowKey={(_r, i) => String(i)}
                columns={[
                  { key: 'vehicleClass', label: 'Class' },
                  { key: 'orderType', label: 'Order' },
                  { key: 'plateSet', label: 'Plates' },
                  { key: 'amountPaise', label: 'Price', align: 'right', render: (r: any) => rupees(r.amountPaise) },
                ]}
                rows={prices.data.filter((p: any) => p.orderType !== 'NEW')}
              />
            </details>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card title="Choose a fitment centre and a slot">
          <div className="form">
            <Field label="City">
              <Select value={city} onChange={(e) => { setCity(e.target.value); setDealerCode(''); }} placeholder="Choose city" options={cities.data ?? []} />
            </Field>
            <Field label="Fitment centre">
              <Select value={dealerCode} onChange={(e) => setDealerCode(e.target.value)} placeholder={city ? 'Choose centre' : 'Choose a city first'} options={(centres.data ?? []).map((c: any) => ({ value: c.code, label: `${c.name} — ${c.address ?? c.city}` }))} />
            </Field>
            <Field label="Date" hint={slots.data ? `Bookable ${slots.data.first} to ${slots.data.last}` : undefined}>
              <Input type="date" value={date} min={addDays(todayIst(), 1)} max={addDays(todayIst(), 30)} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          {dealerCode && (
            <div style={{ marginTop: 14 }}>
              {slots.isLoading ? (
                <Loading />
              ) : slots.data?.slots.length === 0 ? (
                <Alert tone="warn">No slots on this date (centres close on Sundays). Pick another date.</Alert>
              ) : (
                <div className="slots">
                  {(slots.data?.slots ?? []).map((s: any) => (
                    <button key={s.start} type="button" className={`slot ${slot === s.start ? 'sel' : ''}`} disabled={s.available === 0} onClick={() => setSlot(s.start)}>
                      {s.start}
                      <div className="small muted">{s.available ? `${s.available} free` : 'full'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="row gap" style={{ marginTop: 16 }}>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="primary" disabled={!slot} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Your details">
          <div className="form">
            <Field label="Owner name">
              <Input value={who.ownerName} onChange={(e) => setWho({ ...who, ownerName: e.target.value })} />
            </Field>
            <Field label="Mobile number" hint="We send the OTP and status updates here">
              <Input inputMode="numeric" maxLength={10} value={who.mobile} onChange={(e) => setWho({ ...who, mobile: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="E-mail (for the receipt)">
              <Input type="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
            </Field>
          </div>
          <div className="row gap" style={{ marginTop: 16 }}>
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" disabled={who.ownerName.trim().length < 2 || !/^[6-9]\d{9}$/.test(who.mobile)} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Confirm by OTP">
          <KV
            items={[
              ['Vehicle', `${v.regnNo} (${v.stateCode})`],
              ['Centre', (centres.data ?? []).find((c: any) => c.code === dealerCode)?.name],
              ['Appointment', `${date} at ${slot}`],
              ['Owner', `${who.ownerName} · ${who.mobile}`],
              ['Order', res?.orderType === 'REPLACEMENT' ? `Replacement (${repl.plateSet.toLowerCase()}, ${repl.replacementReason.toLowerCase()})` : 'HSRP front + rear'],
            ]}
          />
          <div className="stack" style={{ marginTop: 14 }}>
            {!otp ? (
              <div>
                <Button variant="primary" busy={busy} onClick={sendOtp}>
                  Send OTP to {who.mobile}
                </Button>
              </div>
            ) : (
              <>
                <Alert tone="info">
                  OTP sent to {otp.sentTo}. {OTP_HINT}
                </Alert>
                <div className="form">
                  <Field label="OTP">
                    <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
                  </Field>
                </div>
                <div className="row gap">
                  <Button onClick={sendOtp} busy={busy}>
                    Resend
                  </Button>
                  <Button variant="primary" busy={busy} disabled={code.length !== 6} onClick={placeOrder}>
                    Confirm booking
                  </Button>
                </div>
              </>
            )}
            <div>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 4 && order && (
        <Card title={`Order ${order.orderNo}`}>
          {!live.data || ['RECEIVED', 'VALIDATED'].includes(live.data.status) ? (
            <Loading label="Validating with VAHAN and pricing your order…" />
          ) : live.data.status === 'AWAITING_PAYMENT' ? (
            <div className="stack">
              <KV items={[['Amount to pay', rupees(live.data.amountPaise)], ['Appointment', `${live.data.booking?.date} at ${live.data.booking?.slot}`], ['Centre', live.data.centre?.name]]} />
              <div>
                <Button variant="primary" busy={busy} onClick={() => attempt(() => payOnline(order.orderId))}>
                  Pay {rupees(live.data.amountPaise)} online
                </Button>
              </div>
            </div>
          ) : live.data.status === 'AWAITING_APPROVAL' ? (
            <Alert tone="info">Your replacement request is with our operations team. Once approved you can pay from HSRP Status.</Alert>
          ) : live.data.status === 'REJECTED' ? (
            <Alert tone="bad">The order could not be accepted: {live.data.rejectionReason}</Alert>
          ) : (
            <Alert tone="ok">Order status: {live.data.status}</Alert>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>
            Keep your order number. You can come back any time under HSRP Status.
          </p>
        </Card>
      )}
    </PortalLayout>
  );
}
