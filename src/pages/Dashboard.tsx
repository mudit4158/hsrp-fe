import { ORDER_STATUSES } from '@hsrp/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { statusLabel } from '../format';
import { Card, ErrorBox, Grid, Loading, Page, Stat, Table } from '../ui';

const APPROVAL_LABEL: Record<string, string> = {
  'replacement-order': 'Replacement orders',
  'plate-rejection': 'Plate rejections',
  'dealer-onboarding': 'Dealer onboarding',
};

export function Dashboard() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard'), refetchInterval: 15_000 });
  if (q.error) return <Page title="Dashboard"><ErrorBox error={q.error} /></Page>;
  if (!q.data) return <Page title="Dashboard"><Loading /></Page>;
  const d = q.data;
  const max = Math.max(1, ...Object.values<number>(d.ordersByStatus));
  const ageMax = Math.max(1, ...Object.values<number>(d.ageing));
  return (
    <Page title="Dashboard" subtitle="Live view of orders, fitments, VAHAN posts, stock and complaints. Refreshes every 15 seconds.">
      <div className="stats">
        <Stat label="Open orders" value={d.ordersOpen} hint={`${d.ordersToday} received today`} />
        <Stat label="Fitted today" value={d.fitments.fittedToday} tone="ok" />
        <Stat label="VAHAN posts pending" value={d.fitments.pendingVahan} hint={`${d.fitments.manual} in the manual queue`} tone={d.fitments.pendingVahan + d.fitments.manual ? 'warn' : undefined} />
        <Stat label="Retry / dead-letter" value={`${d.integration.retrying} / ${d.integration.dead}`} hint={<Link to="/admin/integration">Integration monitor</Link>} tone={d.integration.dead ? 'bad' : undefined} />
        <Stat label="Complaints open" value={d.complaints.open} hint={`${d.complaints.overdue} past 15 days`} tone={d.complaints.overdue ? 'bad' : undefined} />
      </div>
      <Grid cols={2}>
        <Card title="Orders by status">
          <div className="hbars">
            {ORDER_STATUSES.filter((s) => d.ordersByStatus[s]).map((s) => (
              <div className="hbar clickable" key={s} onClick={() => nav(`/orders?status=${s}`)} style={{ cursor: 'pointer' }}>
                <span>{statusLabel(s)}</span>
                <div className="bar">
                  <span style={{ width: `${(100 * d.ordersByStatus[s]) / max}%`, background: ['REJECTED', 'CANCELLED'].includes(s) ? '#94a3b8' : s === 'COMPLETED' ? '#16a34a' : undefined }} />
                </div>
                <span className="num">{d.ordersByStatus[s]}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack">
          <Card title="Ageing of open orders">
            <div className="hbars">
              {Object.entries<number>(d.ageing).map(([k, v]) => (
                <div className="hbar" key={k}>
                  <span>{k}</span>
                  <div className="bar">
                    <span style={{ width: `${(100 * v) / ageMax}%`, background: k.startsWith('16') ? '#dc2626' : k.startsWith('8') ? '#d97706' : undefined }} />
                  </div>
                  <span className="num">{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Waiting for a decision">
            {Object.keys(d.approvalsPending).length === 0 ? (
              <p className="muted">Nothing waiting.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {Object.entries<number>(d.approvalsPending).map(([k, v]) => (
                  <li key={k}>
                    <Link to={k === 'plate-rejection' ? '/station/rejections' : '/approvals'}>
                      {APPROVAL_LABEL[k] ?? k}: <b>{v}</b>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </Grid>
      <Card title="Plate stock by station" actions={<Link to="/inventory">Inventory</Link>}>
        <Table
          rowKey={(r: any) => r.station}
          columns={[
            { key: 'station', label: 'Station' },
            { key: 'AVAILABLE', label: 'Available', align: 'right' },
            { key: 'ALLOCATED', label: 'Allocated', align: 'right' },
            { key: 'FITTED', label: 'Fitted', align: 'right' },
            { key: 'SCRAPPED', label: 'Scrapped', align: 'right' },
          ]}
          rows={d.stock}
        />
      </Card>
    </Page>
  );
}
