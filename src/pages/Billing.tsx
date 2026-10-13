import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, openFile } from '../api';
import { useAuth } from '../auth';
import { dt, rupees } from '../format';
import { Alert, Badge, Button, Card, Field, Input, Modal, Mono, Page, Select, StatusBadge, Table, Tabs, useAction } from '../ui';

const MODE_HELP: Record<string, string> = {
  PREPAID: 'Orders are paid from a wallet when they are confirmed.',
  POSTPAID: 'Orders are confirmed without payment; dispatched plates are billed at the end of each cycle.',
};

/**
 * Billing (D46): per OEM the payment mode (prepaid wallet or postpaid), the billing cycle and the billing contact;
 * per OEM × dealer who is billed (the OEM or the dealer). Postpaid orders become charges, and each cycle close (or
 * "Run billing now") turns the dispatched ones into one bill per party, sent by e-mail with a PDF.
 */
export function Billing() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const manage = can('billing.manage');
  const { busy, run } = useAction();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('bill') ? 'bills' : 'setup');
  const [chargeStatus, setChargeStatus] = useState('PENDING,BILLABLE');
  const [open, setOpen] = useState<string | null>(null);
  const [runOem, setRunOem] = useState('');
  const setup = useQuery({ queryKey: ['billing-setup'], queryFn: () => api.get('/billing/setup') });
  const charges = useQuery({ queryKey: ['billing-charges', chargeStatus], queryFn: () => api.get('/billing/charges', { status: chargeStatus }), enabled: tab === 'charges', refetchInterval: 5000 });
  const bills = useQuery({ queryKey: ['billing-bills'], queryFn: () => api.get('/billing/bills'), enabled: tab === 'bills', refetchInterval: 5000 });
  const bill = useQuery({ queryKey: ['billing-bill', open], queryFn: () => api.get(`/billing/bills/${open}`), enabled: Boolean(open) });
  const postpaid = (setup.data ?? []).filter((o: any) => o.paymentMode === 'POSTPAID');
  const refresh = () => ['billing-setup', 'billing-charges', 'billing-bills'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  // A bill number in the URL (the link in the bill e-mail) opens that bill.
  useEffect(() => {
    const no = params.get('bill');
    const hit = no && (bills.data ?? []).find((b: any) => b.billNo === no);
    if (hit) setOpen(hit.id);
  }, [params, bills.data]);
  useEffect(() => {
    if (!runOem && postpaid.length) setRunOem(postpaid[0].oemCode);
  }, [postpaid, runOem]);

  return (
    <Page title="Billing" subtitle="Prepaid OEMs pay from wallets. Postpaid OEMs are billed per cycle for the plates dispatched, either to the OEM or to the dealer.">
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'setup', label: 'Setup' }, { key: 'charges', label: 'Unbilled charges' }, { key: 'bills', label: 'Bills' }]} />
      {tab === 'setup' &&
        (setup.data ?? []).map((o: any) => <OemSetup key={o.oemCode} oem={o} manage={manage} onSaved={refresh} />)}
      {tab === 'charges' && (
        <Card
          title="Postpaid charges"
          actions={<Select value={chargeStatus} onChange={(e) => setChargeStatus(e.target.value)} options={[{ value: 'PENDING,BILLABLE', label: 'Not billed yet' }, { value: 'BILLED', label: 'Billed' }, { value: 'VOID', label: 'Void' }, { value: 'PENDING,BILLABLE,BILLED,VOID', label: 'All' }]} />}
        >
          <p className="muted small">A charge is created when a postpaid order is confirmed, becomes billable when its plates are dispatched, and is billed at the next cycle close. Cancelled or rejected orders are voided.</p>
          <Table
            columns={[
              { key: 'confirmedAt', label: 'Confirmed', render: (c: any) => dt(c.confirmedAt) },
              { key: 'orderNo', label: 'Order', render: (c: any) => <Link to={`/orders/${c.orderId}`}><Mono>{c.orderNo}</Mono></Link> },
              { key: 'regnNo', label: 'Registration', render: (c: any) => <span className="plate">{c.regnNo}</span> },
              { key: 'billToName', label: 'Bill to', render: (c: any) => <span>{c.billToName} <Badge tone={c.billToType === 'DEALER' ? 'teal' : 'violet'}>{c.billToType === 'DEALER' ? 'dealer' : 'OEM'}</Badge></span> },
              { key: 'amountPaise', label: 'Amount', align: 'right', render: (c: any) => rupees(c.amountPaise) },
              { key: 'dispatchedAt', label: 'Dispatched', render: (c: any) => dt(c.dispatchedAt) },
              { key: 'status', label: 'Status', render: (c: any) => <Badge tone={c.status === 'BILLABLE' ? 'info' : c.status === 'BILLED' ? 'ok' : c.status === 'VOID' ? 'muted' : 'warn'}>{c.status.toLowerCase()}</Badge> },
            ]}
            rows={charges.data}
            empty="No charges here."
          />
        </Card>
      )}
      {tab === 'bills' && (
        <Card
          title="Bills"
          actions={
            manage && postpaid.length > 0 ? (
              <div className="row gap">
                <Select value={runOem} onChange={(e) => setRunOem(e.target.value)} options={postpaid.map((o: any) => ({ value: o.oemCode, label: o.oemName }))} />
                <Button variant="primary" busy={busy === 'run'} onClick={() => run('run', () => api.post('/billing/run', { oemCode: runOem }), 'Billing run finished').then(refresh)}>
                  Run billing now
                </Button>
              </div>
            ) : undefined
          }
        >
          <p className="muted small">Bills are made automatically when an OEM's cycle closes (weekly: Monday 00:00 IST; monthly: the 1st 00:00 IST). "Run billing now" closes the current period early.</p>
          <Table
            onRowClick={(b: any) => setOpen(b.id)}
            columns={[
              { key: 'billNo', label: 'Bill', render: (b: any) => <Mono>{b.billNo}</Mono> },
              { key: 'createdAt', label: 'Issued', render: (b: any) => dt(b.createdAt) },
              { key: 'oemCode', label: 'OEM' },
              { key: 'billToName', label: 'Bill to', render: (b: any) => <span>{b.billToName} <Badge tone={b.billToType === 'DEALER' ? 'teal' : 'violet'}>{b.billToType === 'DEALER' ? 'dealer' : 'OEM'}</Badge></span> },
              { key: 'period', label: 'Period' },
              { key: 'lineCount', label: 'Orders', align: 'right' },
              { key: 'amountPaise', label: 'Amount', align: 'right', render: (b: any) => rupees(b.amountPaise) },
              { key: 'status', label: 'Status', render: (b: any) => <StatusBadge status={b.status} /> },
              { key: 'sentTo', label: 'Sent to', render: (b: any) => <span className="small">{b.sentTo ?? '–'}</span> },
            ]}
            rows={bills.data}
            empty="No bills yet."
          />
        </Card>
      )}
      <Modal
        open={Boolean(open && bill.data)}
        wide
        title={`Bill ${bill.data?.billNo ?? ''}`}
        onClose={() => setOpen(null)}
        footer={
          <div className="row gap">
            <Button onClick={() => openFile('GET', `/billing/bills/${open}/pdf`)}>Open PDF</Button>
            {manage && (
              <Button busy={busy === 'send'} onClick={() => run('send', () => api.post(`/billing/bills/${open}/send`), 'Bill sent again').then(refresh)}>
                Send again
              </Button>
            )}
            {manage && bill.data?.status !== 'PAID' && (
              <Button variant="primary" busy={busy === 'paid'} onClick={() => run('paid', () => api.post(`/billing/bills/${open}/paid`), 'Marked as paid').then(() => { refresh(); qc.invalidateQueries({ queryKey: ['billing-bill'] }); })}>
                Mark as paid
              </Button>
            )}
          </div>
        }
      >
        {bill.data && (
          <div className="stack">
            <p className="muted">
              {bill.data.billToName} · {bill.data.period} · {bill.data.cycle.toLowerCase()} cycle · <b>{rupees(bill.data.amountPaise)}</b> for {bill.data.lineCount} order(s) ·{' '}
              <StatusBadge status={bill.data.status} /> {bill.data.sentTo && <>· sent to {bill.data.sentTo} {dt(bill.data.sentAt)}</>}
            </p>
            <Table
              columns={[
                { key: 'orderNo', label: 'Order', render: (l: any) => <Link to={`/orders/${l.orderId}`}><Mono>{l.orderNo}</Mono></Link> },
                { key: 'regnNo', label: 'Registration' },
                { key: 'dispatchedAt', label: 'Dispatched', render: (l: any) => dt(l.dispatchedAt) },
                { key: 'amountPaise', label: 'Amount', align: 'right', render: (l: any) => rupees(l.amountPaise) },
              ]}
              rows={bill.data.lines}
            />
          </div>
        )}
      </Modal>
    </Page>
  );
}

function OemSetup({ oem, manage, onSaved }: { oem: any; manage: boolean; onSaved: () => void }) {
  const { busy, run } = useAction();
  const [f, setF] = useState({ paymentMode: oem.paymentMode, cycle: oem.cycle, billToDefault: oem.billToDefault, contactEmail: oem.contactEmail });
  useEffect(() => setF({ paymentMode: oem.paymentMode, cycle: oem.cycle, billToDefault: oem.billToDefault, contactEmail: oem.contactEmail }), [oem]);
  const dirty = f.paymentMode !== oem.paymentMode || f.cycle !== oem.cycle || f.billToDefault !== oem.billToDefault || f.contactEmail !== oem.contactEmail;
  const postpaid = f.paymentMode === 'POSTPAID';
  return (
    <Card title={`${oem.oemName}`} actions={<Badge tone={oem.paymentMode === 'POSTPAID' ? 'violet' : 'info'}>{oem.paymentMode.toLowerCase()}</Badge>}>
      <div className="form">
        <Field label="Payment mode" hint={MODE_HELP[f.paymentMode]}>
          <Select disabled={!manage} value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })} options={[{ value: 'PREPAID', label: 'Prepaid (wallet)' }, { value: 'POSTPAID', label: 'Postpaid (billed per cycle)' }]} />
        </Field>
        <Field label="Billing cycle" hint="Weekly closes Monday 00:00 IST; monthly closes the 1st 00:00 IST.">
          <Select disabled={!manage || !postpaid} value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value })} options={[{ value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} />
        </Field>
        <Field label="Bill to (default)" hint="For dealers without their own setting below.">
          <Select disabled={!manage || !postpaid} value={f.billToDefault} onChange={(e) => setF({ ...f, billToDefault: e.target.value })} options={[{ value: 'OEM', label: 'The OEM' }, { value: 'DEALER', label: 'The dealer' }]} />
        </Field>
        <Field label="OEM billing e-mail">
          <Input disabled={!manage} type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} />
        </Field>
      </div>
      {manage && (
        <div className="row gap" style={{ marginTop: 8 }}>
          <Button variant="primary" disabled={!dirty} busy={busy === 'save'} onClick={() => run('save', () => api.put(`/billing/oems/${oem.oemCode}`, f), `${oem.oemName} billing saved`).then(onSaved)}>
            Save
          </Button>
          {f.paymentMode !== oem.paymentMode && <Alert tone="warn">Changing the payment mode applies to orders confirmed from now on.</Alert>}
        </div>
      )}
      {postpaid && (
        <>
          <h3 style={{ margin: '16px 0 8px' }}>Who is billed, per dealer</h3>
          <Table
            rowKey={(d: any) => d.dealerCode}
            columns={[
              { key: 'dealerCode', label: 'Dealer', render: (d: any) => `${d.dealerCode} · ${d.dealerName}` },
              {
                key: 'billTo',
                label: 'Bill to',
                render: (d: any) => (
                  <Select
                    aria-label={`Bill to for ${d.dealerCode}`}
                    disabled={!manage || busy === `pair-${d.dealerCode}`}
                    value={d.billTo}
                    onChange={(e) => run(`pair-${d.dealerCode}`, () => api.put(`/billing/oems/${oem.oemCode}/dealers/${d.dealerCode}`, { billTo: e.target.value }), `${d.dealerCode} billed to ${e.target.value === 'DEALER' ? 'the dealer' : oem.oemName}`).then(onSaved)}
                    options={[{ value: 'OEM', label: `${oem.oemName} (OEM)` }, { value: 'DEALER', label: `${d.dealerName} (dealer)` }]}
                  />
                ),
              },
              { key: 'email', label: 'Dealer billing e-mail', render: (d: any) => <span className="small">{d.email ?? '–'}</span> },
            ]}
            rows={oem.dealers}
          />
        </>
      )}
    </Card>
  );
}
