import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { dt, rupees } from '../../format';
import { Card, ErrorBox, Loading, Page, Stat, Table } from '../../ui';

export function DealerWallet() {
  const q = useQuery({ queryKey: ['dealer-wallet'], queryFn: () => api.get('/dealer/wallet') });
  if (q.error) return <Page title="My wallet"><ErrorBox error={q.error} /></Page>;
  if (!q.data) return <Page title="My wallet"><Loading /></Page>;
  const w = q.data.summary;
  return (
    <Page title="My wallet" subtitle={`${w.name}. Orders hold their price when validated and capture it at confirmation. Top-ups are posted by operations.`}>
      <div className="stats">
        <Stat label="Balance" value={rupees(w.balancePaise)} />
        <Stat label="Held for orders" value={rupees(w.heldPaise)} />
        <Stat label="Credit limit" value={rupees(w.creditLimitPaise)} />
        <Stat label="Available" value={rupees(w.availablePaise)} tone={w.availablePaise <= 0 ? 'bad' : 'ok'} />
      </div>
      <Card title="Statement">
        <Table
          columns={[
            { key: 'createdAt', label: 'When', render: (e: any) => dt(e.createdAt) },
            { key: 'kind', label: 'Entry' },
            { key: 'memo', label: 'Details' },
            { key: 'amountPaise', label: 'Amount', align: 'right', render: (e: any) => <span style={{ color: e.amountPaise < 0 ? 'var(--bad)' : 'var(--ok)' }}>{rupees(e.amountPaise)}</span> },
          ]}
          rows={q.data.statement.items.filter((e: any) => e.account === 'WALLET')}
        />
      </Card>
    </Page>
  );
}
