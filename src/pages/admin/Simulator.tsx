import { VAHAN_MODES } from '@hsrp/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../../api';
import { dt } from '../../format';
import { Alert, Badge, Button, Card, Field, Grid, Input, Json, Mono, Page, Select, StatusBadge, Table, Tabs, useAction } from '../../ui';
import { NewVehicleDemo } from './NewVehicleDemo';

const MODE_HELP: Record<string, string> = {
  normal: 'Answers at once from the seeded vehicle table.',
  slow: 'Answers after 4 seconds.',
  down: 'Connection fails: validations and fitment posts go to the retry queue.',
  'not-found': 'Every lookup answers "Vehicle details not found".',
};
const SCENARIOS = ['demo-new', 'demo-old', 'demo-has-plates', 'oem-zenmo-sample', 'oem-kranti-sample', 'garbled-post', 'bad-category', 'seed-new', 'seed-old', 'seed-repl'];

export function Simulator() {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [tab, setTab] = useState('messages');
  const [to, setTo] = useState('');
  const [scenario, setScenario] = useState('demo-new');
  const [state, setState] = useState('WB');
  const [push, setPush] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const st = useQuery({ queryKey: ['sim-state'], queryFn: () => api.get('/simulator/state') });
  const messages = useQuery({ queryKey: ['sim-messages', to], queryFn: () => api.get('/simulator/messages', { to }), refetchInterval: 3000, enabled: tab === 'messages' });
  const payments = useQuery({ queryKey: ['sim-payments'], queryFn: () => api.get('/simulator/payments'), enabled: tab === 'payments', refetchInterval: 5000 });
  const callbacks = useQuery({ queryKey: ['sim-callbacks'], queryFn: () => api.get('/simulator/oem-callbacks'), enabled: tab === 'callbacks', refetchInterval: 5000 });
  const vehicles = useQuery({ queryKey: ['sim-vehicles', scenario, state], queryFn: () => api.get('/simulator/vahan-vehicles', { scenario, state }), enabled: tab === 'vehicles' });
  const mode = st.data?.vahanMode ?? 'normal';

  return (
    <Page title="Simulator" subtitle="Drives the mocked outside world: VAHAN, the OEM systems, the payment gateway and the SMS / e-mail gateway. Nothing here reaches a real system.">
      <NewVehicleDemo />
      <Grid cols={2}>
        <Card title="VAHAN mock">
          <div className="row gap">
            {VAHAN_MODES.map((m) => (
              <Button key={m} variant={m === mode ? 'primary' : 'secondary'} busy={busy === m} onClick={() => run(m, () => api.put('/simulator/vahan-mode', { mode: m }), `VAHAN is now ${m}`).then(() => qc.invalidateQueries({ queryKey: ['sim-state'] }))}>
                {m}
              </Button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Now: <b>{mode}</b> — {MODE_HELP[mode]}
          </p>
          {mode !== 'normal' && <Alert tone="warn">VAHAN is not normal. Switch back, then replay queued posts on the <Link to="/admin/integration">integration monitor</Link>.</Alert>}
        </Card>
        <Card title="OEM systems">
          <div className="stack">
            <div className="row gap">
              <Button variant="primary" busy={busy === 'push'} onClick={() => run('push', () => api.post('/simulator/oem-order', { repeatLast: false })).then((r) => r && setPush(r))}>
                Push a Zenmo API order
              </Button>
              <Button busy={busy === 'repeat'} onClick={() => run('repeat', () => api.post('/simulator/oem-order', { repeatLast: true })).then((r) => r && setPush(r))}>
                Repeat last push (same key)
              </Button>
            </div>
            <div className="row gap">
              <Button busy={busy === 'csv'} onClick={() => run('csv', () => api.post('/simulator/oem-csv', {}), 'Sample Kranti file uploaded').then((r) => r && setJob(r))}>
                Upload a sample Kranti CSV
              </Button>
              <Button variant="ghost" onClick={() => openFile('GET', '/simulator/oem-csv', { download: 'sample-kranti-orders.csv' })}>
                Download a sample CSV
              </Button>
            </div>
            {push && (
              <Alert tone={push.response.status < 300 ? 'ok' : 'warn'}>
                HTTP {push.response.status}
                {push.response.replayed ? ' (replayed: no duplicate created)' : ''} · Idempotency-Key <Mono>{push.request.idempotencyKey.slice(0, 8)}…</Mono>
                {push.response.body?.orderId && (
                  <>
                    {' '}
                    · <Link to={`/orders/${push.response.body.orderId}`}>{push.response.body.orderNo}</Link>
                  </>
                )}
                {push.response.body?.detail && <> · {push.response.body.detail}</>}
              </Alert>
            )}
            {job && <Alert tone="ok">File {job.filename} is being processed. See <Link to="/imports">OEM files & uploads</Link> for rows and the error report.</Alert>}
          </div>
        </Card>
      </Grid>
      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'messages', label: 'SMS & e-mail (incl. OTPs)' }, { key: 'payments', label: 'Payment attempts' }, { key: 'callbacks', label: 'OEM callbacks' }, { key: 'vehicles', label: 'VAHAN test vehicles' }]} />
        {tab === 'messages' && (
          <>
            <div className="filters">
              <Field label="Recipient contains"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="mobile or e-mail" /></Field>
            </div>
            <Table
              columns={[
                { key: 'createdAt', label: 'When', render: (m: any) => dt(m.createdAt) },
                { key: 'channel', label: 'Channel', render: (m: any) => <Badge tone={m.channel === 'SMS' ? 'info' : 'violet'}>{m.channel}</Badge> },
                { key: 'to', label: 'To' },
                { key: 'body', label: 'Message', render: (m: any) => <span>{m.subject && <b>{m.subject} — </b>}{/verification code/.test(m.body) ? <><Mono>{m.body.slice(0, 6)}</Mono>{m.body.slice(6)}</> : m.body}</span> },
                { key: 'meta', label: 'Sender / DLT', render: (m: any) => <span className="small muted">{m.senderId}{m.dltTemplateId ? ` · ${m.dltTemplateId}` : ''}</span> },
              ]}
              rows={messages.data}
              empty="No messages yet."
            />
          </>
        )}
        {tab === 'payments' && (
          <Table
            columns={[
              { key: 'createdAt', label: 'When', render: (p: any) => dt(p.createdAt) },
              { key: 'txnid', label: 'Transaction', render: (p: any) => <Mono>{p.txnid}</Mono> },
              { key: 'amount', label: 'Amount (₹)', align: 'right' },
              { key: 'status', label: 'Gateway status', render: (p: any) => <StatusBadge status={p.status === 'success' ? 'SUCCESS' : p.status === 'initiated' ? 'PENDING' : 'FAILED'} /> },
              { key: 'mihpayid', label: 'Gateway id' },
              { key: 'refunds', label: 'Refunds', render: (p: any) => (p.refunds ? (p.refunds as any[]).length : '–') },
            ]}
            rows={payments.data}
            empty="No payment attempts yet."
          />
        )}
        {tab === 'callbacks' && (
          <Table
            columns={[
              { key: 'createdAt', label: 'When', render: (c: any) => dt(c.createdAt) },
              { key: 'oemCode', label: 'OEM' },
              { key: 'orderRef', label: 'OEM order ref', render: (c: any) => <Mono>{c.orderRef}</Mono> },
              { key: 'status', label: 'Status sent', render: (c: any) => <StatusBadge status={c.status} /> },
              { key: 'reason', label: 'Reason' },
            ]}
            rows={callbacks.data}
            empty="No callbacks yet."
          />
        )}
        {tab === 'vehicles' && (
          <>
            <div className="filters">
              <Field label="Scenario"><Select value={scenario} onChange={(e) => setScenario(e.target.value)} options={SCENARIOS} /></Field>
              <Field label="State"><Select value={state} onChange={(e) => setState(e.target.value)} options={['WB', 'OD']} /></Field>
            </div>
            <p className="muted small">Use these fictional vehicles for demos. demo-new: new vehicles for dealer orders · demo-old: for the customer portal · demo-has-plates: replacements · garbled-post: VAHAN answers fitment with unreadable text.</p>
            <Table
              columns={[
                { key: 'regnNo', label: 'Registration', render: (v: any) => <span className="plate">{v.regnNo}</span> },
                { key: 'chassisNo', label: 'Chassis', render: (v: any) => <Mono>{v.chassisNo}</Mono> },
                { key: 'engineNo', label: 'Engine', render: (v: any) => <Mono>{v.engineNo}</Mono> },
                { key: 'vchCatg', label: 'Category' },
                { key: 'maker', label: 'Maker' },
                { key: 'regnDate', label: 'Registered' },
                { key: 'norms', label: 'Norms' },
                { key: 'codes', label: 'Laser codes on VAHAN', render: (v: any) => (v.hsrpFrontLaserCode ? <span className="small">{v.hsrpFrontLaserCode} / {v.hsrpRearLaserCode}</span> : '–') },
              ]}
              rows={vehicles.data}
            />
          </>
        )}
      </Card>
      {st.data && (
        <details>
          <summary className="muted small">Simulator state</summary>
          <Json value={st.data} />
        </details>
      )}
    </Page>
  );
}
