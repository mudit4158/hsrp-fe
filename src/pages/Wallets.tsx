import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { dt, rupees } from '../format';
import { Button, Card, Field, Grid, Input, KV, Modal, Page, Stat, StatusBadge, Table, Tabs, useAction } from '../ui';

export function WalletStatement({ walletId }: { walletId: string }) {
  const st = useQuery({ queryKey: ['statement', walletId], queryFn: () => api.get(`/wallets/${walletId}/statement`) });
  return (
    <Table
      columns={[
        { key: 'createdAt', label: 'When', render: (e: any) => dt(e.createdAt) },
        { key: 'kind', label: 'Entry' },
        { key: 'account', label: 'Account' },
        { key: 'memo', label: 'Details' },
        { key: 'amountPaise', label: 'Amount', align: 'right', render: (e: any) => <span style={{ color: e.amountPaise < 0 ? 'var(--bad)' : 'var(--ok)' }}>{rupees(e.amountPaise)}</span> },
        { key: 'balanceAfterPaise', label: 'Balance after', align: 'right', render: (e: any) => rupees(e.balanceAfterPaise) },
      ]}
      rows={st.data?.items}
    />
  );
}

export function Wallets() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { busy, run } = useAction();
  const [sel, setSel] = useState('');
  const [tab, setTab] = useState('statement');
  const [topUp, setTopUp] = useState(false);
  const [credit, setCredit] = useState(false);
  const [form, setForm] = useState({ amountRupees: '', reference: '', creditLimitRupees: '' });
  const wallets = useQuery({ queryKey: ['wallets'], queryFn: () => api.get('/wallets') });
  const dealers = useQuery({ queryKey: ['masters', 'dealers'], queryFn: () => api.get('/masters/dealers') });
  const holds = useQuery({ queryKey: ['holds', sel], queryFn: () => api.get(`/wallets/${sel}/holds`), enabled: Boolean(sel) && tab === 'holds' });
  useEffect(() => {
    if (!sel && wallets.data?.length) setSel(wallets.data[0].id);
  }, [wallets.data, sel]);
  const w = (wallets.data ?? []).find((x: any) => x.id === sel);
  const sharedBy = (dealers.data ?? []).filter((d: any) => d.walletAccountId === sel);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['wallets'] });
    qc.invalidateQueries({ queryKey: ['statement'] });
  };

  return (
    <Page title="Wallets" subtitle="Double-entry ledger. Orders hold an amount, capture it at confirmation, and release or refund it on rejection or cancellation. Several dealers can share one wallet.">
      <Grid cols={3}>
        <Card title="Wallets">
          <Table
            onRowClick={(r: any) => setSel(r.id)}
            columns={[
              { key: 'name', label: 'Wallet', render: (r: any) => <b style={{ color: r.id === sel ? 'var(--brand-2)' : undefined }}>{r.name}</b> },
              { key: 'availablePaise', label: 'Available', align: 'right', render: (r: any) => rupees(r.availablePaise) },
            ]}
            rows={wallets.data}
          />
        </Card>
        {w && (
          <Card
            className="span-2"
            title={w.name}
            actions={
              can('wallet.manage') && (
                <>
                  <Button onClick={() => setCredit(true)}>Credit limit</Button>
                  <Button variant="primary" onClick={() => setTopUp(true)}>
                    Top up
                  </Button>
                </>
              )
            }
          >
            <div className="stats">
              <Stat label="Balance" value={rupees(w.balancePaise)} />
              <Stat label="Held for orders" value={rupees(w.heldPaise)} />
              <Stat label="Credit limit" value={rupees(w.creditLimitPaise)} />
              <Stat label="Available" value={rupees(w.availablePaise)} tone={w.availablePaise <= 0 ? 'bad' : 'ok'} />
            </div>
            <KV items={[['Owner', `${w.ownerType.replace('hsrp.', '')} ${w.ownerId}`], ['Used by', sharedBy.map((d: any) => `${d.code} ${d.name}`).join(', ') || '–']]} />
            <div style={{ marginTop: 12 }}>
              <Tabs value={tab} onChange={setTab} tabs={[{ key: 'statement', label: 'Statement' }, { key: 'holds', label: 'Holds' }]} />
              {tab === 'statement' ? (
                <WalletStatement walletId={w.id} />
              ) : (
                <Table
                  columns={[
                    { key: 'createdAt', label: 'When', render: (h: any) => dt(h.createdAt) },
                    { key: 'subject', label: 'For', render: (h: any) => (h.subjectType === 'hsrp.order' ? <a href={`/orders/${h.subjectId}`}>order</a> : h.subjectType) },
                    { key: 'amountPaise', label: 'Amount', align: 'right', render: (h: any) => rupees(h.amountPaise) },
                    { key: 'status', label: 'Status', render: (h: any) => <StatusBadge status={h.status} /> },
                  ]}
                  rows={holds.data}
                />
              )}
            </div>
          </Card>
        )}
      </Grid>
      <Modal
        open={topUp}
        title={`Top up ${w?.name}`}
        onClose={() => setTopUp(false)}
        footer={
          <Button variant="primary" busy={busy === 'top'} onClick={() => run('top', () => api.post(`/wallets/${sel}/top-ups`, { amountRupees: Number(form.amountRupees), reference: form.reference }, { idempotent: true }), 'Wallet topped up').then((r) => { if (r) { setTopUp(false); refresh(); } })}>
            Top up
          </Button>
        }
      >
        <div className="form">
          <Field label="Amount (₹)">
            <Input type="number" min={1} value={form.amountRupees} onChange={(e) => setForm({ ...form, amountRupees: e.target.value })} />
          </Field>
          <Field label="Reference" hint="Bank or cheque reference">
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </Field>
        </div>
      </Modal>
      <Modal
        open={credit}
        title="Credit limit"
        onClose={() => setCredit(false)}
        footer={
          <Button variant="primary" busy={busy === 'credit'} onClick={() => run('credit', () => api.patch(`/wallets/${sel}/credit-limit`, { creditLimitRupees: Number(form.creditLimitRupees) }), 'Credit limit saved').then((r) => { if (r) { setCredit(false); refresh(); } })}>
            Save
          </Button>
        }
      >
        <Field label="Credit limit (₹)" hint="The balance may go negative down to minus this amount.">
          <Input type="number" min={0} value={form.creditLimitRupees} onChange={(e) => setForm({ ...form, creditLimitRupees: e.target.value })} />
        </Field>
      </Modal>
    </Page>
  );
}
