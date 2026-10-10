import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api';
import { useAuth } from '../../auth';
import { Alert, Button, Card, Field, Input, Page, Select, useAction } from '../../ui';

export function NewOrder() {
  const { hasRole } = useAuth();
  const isDealer = hasRole('DEALER');
  const nav = useNavigate();
  const { busy, run } = useAction();
  const dealers = useQuery({ queryKey: ['masters', 'dealers'], queryFn: () => api.get('/masters/dealers'), enabled: !isDealer });
  const oems = useQuery({ queryKey: ['masters', 'oems'], queryFn: () => api.get('/masters/oems') });
  const [f, setF] = useState({ dealerCode: '', oemCode: '', orderType: 'NEW', plateSet: 'BOTH', replacementReason: 'DAMAGED', regnNo: '', chassisNo: '', engineNo: '', ownerName: '', mobile: '', email: '' });
  const [evidence, setEvidence] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<{ id: string; no: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setExisting(null);
    const res = await run('save', async () => {
      let evidenceFileId: string | undefined;
      if (f.orderType === 'REPLACEMENT' && evidence) {
        const fd = new FormData();
        fd.set('file', evidence);
        fd.set('purpose', 'replacement-evidence');
        evidenceFileId = (await api.post('/files', undefined, { form: fd })).id;
      }
      try {
        return await api.post(
          '/orders',
          {
            regnNo: f.regnNo,
            chassisNo: f.chassisNo,
            engineNo: f.engineNo,
            orderType: f.orderType,
            plateSet: f.orderType === 'REPLACEMENT' ? f.plateSet : 'BOTH',
            replacementReason: f.orderType === 'REPLACEMENT' ? f.replacementReason : undefined,
            evidenceFileId,
            dealerCode: isDealer ? undefined : f.dealerCode,
            oemCode: f.oemCode || undefined,
            ownerName: f.ownerName || undefined,
            mobile: f.mobile || undefined,
            email: f.email || undefined,
          },
          { idempotent: true },
        );
      } catch (err) {
        if (err instanceof ApiError && err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.path, x.message])));
        if (err instanceof ApiError && err.code === 'order-exists') setExisting({ id: String(err.body?.orderId), no: String(err.body?.orderNo) });
        throw err;
      }
    }, 'Order received. Validation is running.');
    if (res) nav(`/orders/${res.id}`);
  }

  return (
    <Page title="Place an order" subtitle="The order is checked against VAHAN (and the OEM catalogue where required), priced, and paid from the dealer wallet.">
      <Card>
        {existing && (
          <Alert tone="warn">
            An open order already exists for this vehicle: <a href={`/orders/${existing.id}`}>{existing.no}</a>
          </Alert>
        )}
        <form onSubmit={submit} className="stack">
          <div className="form">
            {!isDealer && (
              <Field label="Dealer" error={errors.dealerCode}>
                <Select required value={f.dealerCode} onChange={set('dealerCode')} placeholder="Choose dealer" options={(dealers.data ?? []).map((d: any) => ({ value: d.code, label: `${d.code} · ${d.name}` }))} />
              </Field>
            )}
            <Field label="Order type">
              <Select value={f.orderType} onChange={set('orderType')} options={[{ value: 'NEW', label: 'New vehicle' }, { value: 'REPLACEMENT', label: 'Replacement (plates exist)' }, { value: 'OLD', label: 'Old vehicle (before cut-off)' }]} />
            </Field>
            <Field label="OEM (optional)" hint="Set it for an OEM-supplied vehicle; the OEM's validation steps apply.">
              <Select value={f.oemCode} onChange={set('oemCode')} placeholder="None" options={(oems.data ?? []).map((o: any) => ({ value: o.code, label: o.name }))} />
            </Field>
            <Field label="Registration number" error={errors.regnNo}>
              <Input required value={f.regnNo} onChange={set('regnNo')} placeholder="WB02AB1234" style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Chassis number" error={errors.chassisNo}>
              <Input required value={f.chassisNo} onChange={set('chassisNo')} style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Engine number" error={errors.engineNo}>
              <Input required value={f.engineNo} onChange={set('engineNo')} style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Owner name">
              <Input value={f.ownerName} onChange={set('ownerName')} />
            </Field>
            <Field label="Owner mobile" error={errors.mobile} hint="Required in Odisha. Gets status SMS.">
              <Input value={f.mobile} onChange={set('mobile')} inputMode="numeric" />
            </Field>
            <Field label="Owner e-mail" error={errors.email}>
              <Input type="email" value={f.email} onChange={set('email')} />
            </Field>
            {f.orderType === 'REPLACEMENT' && (
              <>
                <Field label="Plates to replace">
                  <Select value={f.plateSet} onChange={set('plateSet')} options={[{ value: 'BOTH', label: 'Front and rear' }, { value: 'FRONT', label: 'Front only' }, { value: 'REAR', label: 'Rear only' }]} />
                </Field>
                <Field label="Reason">
                  <Select value={f.replacementReason} onChange={set('replacementReason')} options={[{ value: 'DAMAGED', label: 'Damaged plate' }, { value: 'THEFT', label: 'Theft' }]} />
                </Field>
                <Field label={f.replacementReason === 'THEFT' ? 'Police report (PDF or photo)' : 'Photo of the damaged plate'} hint="Operations review it before the order is confirmed.">
                  <Input type="file" accept="image/*,application/pdf" required onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} />
                </Field>
              </>
            )}
          </div>
          <div>
            <Button variant="primary" type="submit" busy={busy === 'save'}>
              Place order
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}
