import { ORDER_CHANNELS, ORDER_STATUSES } from '@hsrp/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { dt, rupees, statusLabel } from '../../format';
import { Button, Card, ErrorBox, Field, Input, Mono, Page, Pager, Select, StatusBadge, Table } from '../../ui';

export function OrderList() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { can } = useAuth();
  const filters = Object.fromEntries(sp.entries());
  const page = Number(filters.page ?? 1);
  const q = useQuery({ queryKey: ['orders', filters], queryFn: () => api.get('/orders', { pageSize: 25, ...filters }), placeholderData: keepPreviousData });
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setSp(n);
  };

  return (
    <Page title="Orders" subtitle="Every order from every channel, newest first." actions={can('orders.create') && <Link to="/orders/new"><Button variant="primary">Place order</Button></Link>}>
      <Card>
        <div className="filters">
          <Field label="Search">
            <Input placeholder="Order, registration or chassis" defaultValue={filters.q ?? ''} onKeyDown={(e) => e.key === 'Enter' && set('q', (e.target as HTMLInputElement).value)} onBlur={(e) => set('q', e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)} placeholder="All statuses" options={ORDER_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
          </Field>
          <Field label="Channel">
            <Select value={filters.channel ?? ''} onChange={(e) => set('channel', e.target.value)} placeholder="All channels" options={ORDER_CHANNELS.map((c) => ({ value: c, label: c.replace('_', ' ').toLowerCase() }))} />
          </Field>
          <Field label="State">
            <Select value={filters.stateCode ?? ''} onChange={(e) => set('stateCode', e.target.value)} placeholder="All" options={[{ value: 'WB', label: 'West Bengal' }, { value: 'OD', label: 'Odisha' }]} />
          </Field>
          <Field label="From">
            <Input type="date" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} />
          </Field>
          {sp.toString() && <Button onClick={() => setSp(new URLSearchParams())}>Clear</Button>}
        </div>
        <ErrorBox error={q.error} />
        <Table
          onRowClick={(r: any) => nav(`/orders/${r.id}`)}
          columns={[
            { key: 'orderNo', label: 'Order', render: (r: any) => <Mono>{r.orderNo}</Mono> },
            { key: 'createdAt', label: 'Received', render: (r: any) => dt(r.createdAt) },
            { key: 'channel', label: 'Channel', render: (r: any) => r.channel.replace('_', ' ').toLowerCase() },
            { key: 'orderType', label: 'Type', render: (r: any) => `${r.orderType.toLowerCase()}${r.plateSet !== 'BOTH' ? ` · ${r.plateSet.toLowerCase()}` : ''}` },
            { key: 'regnNo', label: 'Registration', render: (r: any) => <span className="plate">{r.regnNo}</span> },
            { key: 'vehicleClass', label: 'Class' },
            { key: 'dealerName', label: 'Dealer' },
            { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
            { key: 'amount', label: 'Amount', align: 'right', render: (r: any) => rupees(r.amountPaise) },
          ]}
          rows={q.data?.items}
        />
        {q.data && <Pager page={page} pageSize={25} total={q.data.total} onPage={(p) => set('page', String(p))} />}
      </Card>
    </Page>
  );
}
