import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { dt, rupees } from '../../format';
import { Alert, Button, Card, ErrorBox, Grid, Loading, Mono, Page, Stat, StatusBadge, Table } from '../../ui';

export function DealerHome() {
  const home = useQuery({ queryKey: ['dealer-home'], queryFn: () => api.get('/dealer/home'), refetchInterval: 15_000 });
  const recent = useQuery({ queryKey: ['orders', 'dealer-recent'], queryFn: () => api.get('/orders', { pageSize: 8 }) });
  const challans = useQuery({ queryKey: ['dealer-challans'], queryFn: () => api.get('/dispatch/challans', { status: 'CREATED' }) });
  if (home.error) return <Page title="Home"><ErrorBox error={home.error} /></Page>;
  if (!home.data) return <Page title="Home"><Loading /></Page>;
  const h = home.data;
  return (
    <Page title={h.dealer.name} subtitle={`${h.dealer.code} · ${h.dealer.city}`} actions={<Link to="/orders/new"><Button variant="primary">Place order</Button></Link>}>
      <Alert tone="info">Challan inward and fitment with photos are done in the dealer Android app. This web view is for placing and tracking orders.</Alert>
      <div className="stats">
        <Stat label="Challans to inward" value={h.counts.toInward} tone={h.counts.toInward ? 'warn' : undefined} />
        <Stat label="Ready to fit" value={h.counts.toFit} />
        <Stat label="In production" value={h.counts.inProduction} />
        <Stat label="Waiting for VAHAN" value={h.counts.awaitingVahan} />
        <Stat label="Wallet available" value={h.wallet ? rupees(h.wallet.availablePaise) : '–'} hint={h.wallet ? `${rupees(h.wallet.heldPaise)} held` : undefined} tone={h.wallet && h.wallet.availablePaise < 100_000 ? 'bad' : 'ok'} />
      </div>
      <Grid cols={2}>
        <Card title="Recent orders" actions={<Link to="/orders">All orders</Link>}>
          <Table
            columns={[
              { key: 'orderNo', label: 'Order', render: (o: any) => <Link to={`/orders/${o.id}`}><Mono>{o.orderNo}</Mono></Link> },
              { key: 'regnNo', label: 'Registration', render: (o: any) => <span className="plate">{o.regnNo}</span> },
              { key: 'status', label: 'Status', render: (o: any) => <StatusBadge status={o.status} /> },
            ]}
            rows={recent.data?.items}
          />
        </Card>
        <div className="stack">
          <Card title="Today's fitment appointments">
            <Table
              columns={[
                { key: 'slotStart', label: 'Time' },
                { key: 'regnNo', label: 'Vehicle' },
                { key: 'ownerName', label: 'Customer' },
                { key: 'orderStatus', label: 'Order', render: (a: any) => <StatusBadge status={a.orderStatus} /> },
              ]}
              rows={h.appointments}
              empty="No appointments today."
            />
          </Card>
          <Card title="Challans in transit">
            <Table
              columns={[
                { key: 'challanNo', label: 'Challan', render: (c: any) => <Mono>{c.challanNo}</Mono> },
                { key: 'createdAt', label: 'Dispatched', render: (c: any) => dt(c.createdAt) },
                { key: 'plates', label: 'Plates', align: 'right' },
              ]}
              rows={challans.data}
              empty="Nothing in transit."
            />
          </Card>
        </div>
      </Grid>
    </Page>
  );
}
