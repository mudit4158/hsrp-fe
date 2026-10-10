import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { date, dt, rupees, statusLabel } from '../../format';
import { Alert, Badge, Button, Card, ErrorBox, Field, Grid, Json, KV, Loading, Modal, Mono, Page, StatusBadge, Table, Tabs, Textarea, Timeline, useAction } from '../../ui';

const CANCELLABLE = ['RECEIVED', 'VALIDATED', 'AWAITING_APPROVAL', 'AWAITING_PAYMENT', 'CONFIRMED'];

export function OrderDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('plates');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { busy, run } = useAction();
  const q = useQuery({ queryKey: ['order-detail', id], queryFn: () => api.get(`/orders/${id}/detail`), refetchInterval: 5000 });
  if (q.error) return <Page title="Order"><ErrorBox error={q.error} /></Page>;
  if (!q.data) return <Page title="Order"><Loading /></Page>;
  const d = q.data;
  const o = d.order;
  const refresh = () => qc.invalidateQueries({ queryKey: ['order-detail', id] });

  return (
    <Page
      title={`Order ${o.orderNo}`}
      subtitle={
        <span className="row gap">
          <StatusBadge status={o.status} /> <span className="plate">{o.regnNo}</span> <span>{o.channel.replace('_', ' ').toLowerCase()} · {o.orderType.toLowerCase()}</span>
        </span>
      }
      actions={
        <>
          {o.status === 'VALIDATED' && o.remarks && can('orders.create') && (
            <Button busy={busy === 'retry'} onClick={() => run('retry', () => api.post(`/orders/${o.id}/retry-confirmation`), 'Retried').then(refresh)}>
              Retry wallet hold
            </Button>
          )}
          {CANCELLABLE.includes(o.status) && can('orders.cancel') && (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              Cancel order
            </Button>
          )}
        </>
      }
    >
      {o.status === 'REJECTED' && <Alert tone="bad">Rejected: {o.rejectionReason}</Alert>}
      {o.status === 'CANCELLED' && <Alert tone="warn">Cancelled: {o.cancelReason}</Alert>}
      {o.remarks && o.status === 'VALIDATED' && <Alert tone="warn">{o.remarks}</Alert>}
      <Grid cols={3}>
        <Card title="Order" className="span-2">
          <KV
            items={[
              ['Dealer', d.dealer ? `${d.dealer.code} · ${d.dealer.name}` : '–'],
              ['Station', d.station ? `${d.station.code} · ${d.station.name}` : '–'],
              ['State', o.stateCode],
              ['Plate set', o.plateSet],
              ['Amount', rupees(o.amountPaise)],
              ['OEM reference', o.sourceRef],
              ['Chassis', <Mono>{o.chassisNo}</Mono>],
              ['Engine', <Mono>{o.engineNo}</Mono>],
              ['Vehicle', [o.maker, o.vehicleClass, o.vehicleType?.toLowerCase().replace('_', '-')].filter(Boolean).join(' · ') || '–'],
              ['Fuel / norms', [o.fuel, o.norms].filter(Boolean).join(' · ') || '–'],
              ['Registered', o.regnDate],
              ['Sticker', o.stickerRequired ? (o.greenStrip ? 'required · green strip' : 'required') : 'not required'],
              ['Owner', o.ownerName],
              ['Mobile', o.mobile],
              ['Replacement', o.replacementReason],
              ['Pending plates', o.pendingPositions?.join(' + ') || '–'],
              ['Received', dt(o.createdAt)],
              ['Confirmed', dt(o.confirmedAt)],
              ['Completed', dt(o.completedAt)],
            ]}
          />
        </Card>
        <Card title="Timeline">
          <Timeline
            items={d.history.map((h: any) => ({
              title: statusLabel(h.toStatus),
              at: `${dt(h.createdAt)} · ${h.trigger}`,
              note: h.note,
              tone: ['REJECTED', 'REJECTION_REVIEW'].includes(h.toStatus) ? 'bad' : h.toStatus === 'CANCELLED' ? 'warn' : undefined,
            }))}
          />
        </Card>
      </Grid>

      <Card>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'plates', label: `Plates & dispatch (${d.allocations.length})` },
            { key: 'fitment', label: 'Fitment & VAHAN' },
            { key: 'validation', label: `Validation (${d.validations.length})` },
            { key: 'approvals', label: `Approvals & rejections (${d.approvals.length})` },
            { key: 'money', label: 'Payment & booking' },
            { key: 'files', label: `Files (${d.files.length})` },
            { key: 'audit', label: `Audit (${d.audit.length})` },
            { key: 'events', label: `Events (${d.events.length})` },
          ]}
        />
        {tab === 'plates' && (
          <div className="stack">
            <h2>Laser code allocations</h2>
            <Table
              columns={[
                { key: 'position', label: 'Position' },
                { key: 'laserCode', label: 'Laser code', render: (r: any) => <Mono>{r.laserCode}</Mono> },
                { key: 'status', label: 'Allocation', render: (r: any) => <StatusBadge status={r.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE'} /> },
                { key: 'closeReason', label: 'Closed because' },
                { key: 'createdAt', label: 'Allocated', render: (r: any) => dt(r.createdAt) },
              ]}
              rows={d.allocations}
              empty="No plates allocated yet."
            />
            <h2>Challan lines</h2>
            <Table
              columns={[
                { key: 'challanNo', label: 'Challan', render: (r: any) => <Mono>{r.challanNo}</Mono> },
                { key: 'challanStatus', label: 'Challan status', render: (r: any) => <StatusBadge status={r.challanStatus} /> },
                { key: 'position', label: 'Position' },
                { key: 'laserCode', label: 'Laser code', render: (r: any) => <Mono>{r.laserCode}</Mono> },
                { key: 'inwardStatus', label: 'Inward', render: (r: any) => <StatusBadge status={r.inwardStatus} /> },
                { key: 'rejectReason', label: 'Reason' },
              ]}
              rows={d.challanLines}
              empty="Not dispatched yet."
            />
            <h2>QC and stickers</h2>
            <Table
              columns={[
                { key: 'createdAt', label: 'When', render: (r: any) => dt(r.createdAt) },
                { key: 'what', label: 'What', render: (r: any) => (r.result ? `QC ${r.result.toLowerCase()}${r.positions?.length ? ` (${r.positions.join(', ')})` : ''}` : `Sticker ${r.reprint ? 'reprint' : 'print'} #${r.printNo}`) },
                { key: 'reason', label: 'Reason' },
              ]}
              rows={[...d.qc, ...d.stickerPrints].sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt))}
              empty="No QC yet."
            />
          </div>
        )}
        {tab === 'fitment' &&
          (d.fitment ? (
            <div className="stack">
              <KV
                items={[
                  ['Fitted at', dt(d.fitment.fittedAt)],
                  ['Front laser code', <Mono>{d.fitment.frontLaserCode ?? '–'}</Mono>],
                  ['Rear laser code', <Mono>{d.fitment.rearLaserCode ?? '–'}</Mono>],
                  ['VAHAN post', <StatusBadge status={d.fitment.vahanStatus} />],
                  ['Posted at', dt(d.fitment.postedAt)],
                  ['Device', d.fitment.deviceId],
                ]}
              />
              {d.fitment.vahanReply && <Alert tone={d.fitment.vahanStatus === 'POSTED' ? 'ok' : 'warn'}>VAHAN reply: {d.fitment.vahanReply}</Alert>}
              <div className="row gap-lg">
                {[['Front', d.fitment.frontPhotoUrl], ['Rear', d.fitment.rearPhotoUrl], ['Chassis', d.fitment.chassisPhotoUrl]]
                  .filter(([, u]) => u)
                  .map(([l, u]) => (
                    <a key={l} href={u} target="_blank" rel="noreferrer" className="stack">
                      <img className="photo" src={u} alt={`${l} photo`} />
                      <span className="small">{l} photo</span>
                    </a>
                  ))}
              </div>
            </div>
          ) : (
            <p className="muted">Not fitted yet.</p>
          ))}
        {tab === 'validation' && (
          <Table
            columns={[
              { key: 'createdAt', label: 'When', render: (r: any) => dt(r.createdAt) },
              { key: 'step', label: 'Step' },
              { key: 'outcome', label: 'Outcome', render: (r: any) => <Badge tone={r.outcome === 'PASS' ? 'ok' : 'bad'}>{r.outcome}</Badge> },
              { key: 'message', label: 'Message' },
            ]}
            rows={d.validations}
            empty="Validation has not run yet."
          />
        )}
        {tab === 'approvals' && (
          <div className="stack">
            <Table
              columns={[
                { key: 'createdAt', label: 'Raised', render: (r: any) => dt(r.createdAt) },
                { key: 'type', label: 'Type' },
                { key: 'title', label: 'Request' },
                { key: 'status', label: 'Decision', render: (r: any) => <StatusBadge status={r.status} /> },
                { key: 'remarks', label: 'Remarks' },
                { key: 'decidedAt', label: 'Decided', render: (r: any) => dt(r.decidedAt) },
              ]}
              rows={d.approvals}
              empty="No approvals for this order."
            />
            {d.rejections.length > 0 && (
              <Table
                columns={[
                  { key: 'createdAt', label: 'Raised', render: (r: any) => dt(r.createdAt) },
                  { key: 'source', label: 'Source' },
                  { key: 'positions', label: 'Plates', render: (r: any) => r.positions.join(' + ') },
                  { key: 'reason', label: 'Reason' },
                  { key: 'status', label: 'Decision', render: (r: any) => <StatusBadge status={r.status} /> },
                  { key: 'remarks', label: 'Station remarks' },
                ]}
                rows={d.rejections}
              />
            )}
          </div>
        )}
        {tab === 'money' && (
          <div className="stack">
            <KV items={[['Wallet hold', o.walletHoldId ? <Mono>{o.walletHoldId.slice(0, 8)}</Mono> : '–'], ['Price snapshot', o.priceSnapshot ? rupees(o.priceSnapshot.totalPaise) : '–']]} />
            <Table
              columns={[
                { key: 'txnId', label: 'Transaction', render: (r: any) => <Mono>{r.txnId}</Mono> },
                { key: 'amountPaise', label: 'Amount', render: (r: any) => rupees(r.amountPaise) },
                { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
                { key: 'providerRef', label: 'Gateway ref' },
                { key: 'succeededAt', label: 'Paid', render: (r: any) => dt(r.succeededAt) },
              ]}
              rows={d.payments}
              empty="No gateway payments (dealer and OEM orders are paid from the wallet)."
            />
            {d.booking && <Alert tone="info">Fitment appointment: {date(d.booking.slotDate)} at {d.booking.slotStart} ({d.booking.status.toLowerCase()}, rescheduled {d.booking.rescheduleCount}×)</Alert>}
            {o.vahanSnapshot && (
              <>
                <h2>VAHAN reply copied at confirmation</h2>
                <Json value={o.vahanSnapshot} />
              </>
            )}
          </div>
        )}
        {tab === 'files' && (
          <Table
            columns={[
              { key: 'filename', label: 'File', render: (r: any) => <a href={r.url} target="_blank" rel="noreferrer">{r.filename}</a> },
              { key: 'purpose', label: 'Purpose' },
              { key: 'mimeType', label: 'Type' },
            ]}
            rows={d.files}
            empty="No files."
          />
        )}
        {tab === 'audit' && (
          <Table
            columns={[
              { key: 'createdAt', label: 'When', render: (r: any) => dt(r.createdAt) },
              { key: 'actorName', label: 'Who', render: (r: any) => r.actorName ?? r.actorId ?? r.actorType },
              { key: 'action', label: 'Action' },
              { key: 'ip', label: 'IP / device', render: (r: any) => [r.ip, r.device].filter(Boolean).join(' · ') || '–' },
            ]}
            rows={d.audit}
          />
        )}
        {tab === 'events' && (
          <Table
            columns={[
              { key: 'at', label: 'When', render: (r: any) => dt(r.at) },
              { key: 'type', label: 'Event' },
              { key: 'payload', label: 'Payload', render: (r: any) => <span className="small muted">{JSON.stringify(r.payload).slice(0, 140)}</span> },
            ]}
            rows={d.events}
          />
        )}
      </Card>
      <p className="small muted">
        <Link to="/orders">← All orders</Link>
      </p>

      <Modal
        open={cancelOpen}
        title={`Cancel ${o.orderNo}`}
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button onClick={() => setCancelOpen(false)}>Keep order</Button>
            <Button
              variant="danger"
              busy={busy === 'cancel'}
              disabled={reason.trim().length < 3}
              onClick={() =>
                run('cancel', () => api.post(`/orders/${o.id}/cancel`, { reason }), 'Order cancelled').then((r) => {
                  if (r) {
                    setCancelOpen(false);
                    refresh();
                  }
                })
              }
            >
              Cancel order
            </Button>
          </>
        }
      >
        <p className="muted">A wallet hold is released, a captured amount is returned to the wallet and a gateway payment is refunded.</p>
        <Field label="Reason">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
    </Page>
  );
}
