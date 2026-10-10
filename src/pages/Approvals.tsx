import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { dt } from '../format';
import { Button, Card, ErrorBox, Field, Modal, Page, Select, StatusBadge, Table, Tabs, Textarea, useAction } from '../ui';

export const APPROVAL_TYPES = [
  { value: 'replacement-order', label: 'Replacement orders' },
  { value: 'dealer-onboarding', label: 'Dealer onboarding' },
  { value: 'plate-rejection', label: 'Plate rejections' },
];

/** Decision dialog shared by operations approvals and station rejection approval. Remarks are mandatory. */
export function DecisionModal({ approval, onClose, onDone, approveLabel = 'Approve', rejectLabel = 'Reject' }: { approval: any; onClose: () => void; onDone: () => void; approveLabel?: string; rejectLabel?: string }) {
  const [remarks, setRemarks] = useState('');
  const { busy, run } = useAction();
  const evidence = useQuery({
    queryKey: ['file', approval?.details?.evidenceFileId],
    queryFn: () => api.get(`/files/${approval.details.evidenceFileId}`),
    enabled: Boolean(approval?.details?.evidenceFileId),
  });
  if (!approval) return null;
  const decide = (decision: 'APPROVE' | 'REJECT') =>
    run(decision, () => api.post(`/approvals/${approval.id}/decision`, { decision, remarks }), `Decision saved: ${decision === 'APPROVE' ? approveLabel : rejectLabel}`).then((r) => r && onDone());
  return (
    <Modal
      open
      title={approval.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" busy={busy === 'REJECT'} disabled={remarks.trim().length < 3} onClick={() => decide('REJECT')}>
            {rejectLabel}
          </Button>
          <Button variant="primary" busy={busy === 'APPROVE'} disabled={remarks.trim().length < 3} onClick={() => decide('APPROVE')}>
            {approveLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        <dl className="kv">
          {Object.entries(approval.details ?? {})
            .filter(([k]) => !['evidenceFileId', 'orderId'].includes(k))
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
              </div>
            ))}
        </dl>
        {approval.details?.orderId && <Link to={`/orders/${approval.details.orderId}`}>Open order</Link>}
        {approval.subjectType === 'hsrp.order' && <Link to={`/orders/${approval.subjectId}`}>Open order</Link>}
        {evidence.data && (
          <div>
            <b>Evidence: </b>
            <a href={evidence.data.url} target="_blank" rel="noreferrer">
              {evidence.data.filename}
            </a>
            {evidence.data.mimeType.startsWith('image/') && <img className="photo" style={{ display: 'block', marginTop: 8, width: 260, height: 'auto' }} src={evidence.data.url} alt="evidence" />}
          </div>
        )}
        <Field label="Remarks (mandatory)">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

export function Approvals() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [type, setType] = useState('replacement-order,dealer-onboarding');
  const [open, setOpen] = useState<any>(null);
  const q = useQuery({ queryKey: ['approvals', status, type], queryFn: () => api.get('/approvals', { status: status === 'ALL' ? undefined : status, type }), refetchInterval: 10_000 });
  return (
    <Page title="Approvals" subtitle="Replacement orders and dealer onboarding wait here for operations. Remarks are mandatory for every decision.">
      <Card>
        <Tabs value={status} onChange={setStatus} tabs={[{ key: 'PENDING', label: 'Waiting' }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }, { key: 'ALL', label: 'All' }]} />
        <div className="filters">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'replacement-order,dealer-onboarding', label: 'Operations queue' }, ...APPROVAL_TYPES]} />
          </Field>
        </div>
        <ErrorBox error={q.error} />
        <Table
          onRowClick={(r: any) => r.status === 'PENDING' && setOpen(r)}
          columns={[
            { key: 'createdAt', label: 'Raised', render: (r: any) => dt(r.createdAt) },
            { key: 'type', label: 'Type', render: (r: any) => APPROVAL_TYPES.find((t) => t.value === r.type)?.label ?? r.type },
            { key: 'title', label: 'Request' },
            { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
            { key: 'remarks', label: 'Remarks' },
            { key: 'act', label: '', render: (r: any) => r.status === 'PENDING' && <Button small variant="primary">Decide</Button> },
          ]}
          rows={q.data}
          empty="Nothing waiting for a decision."
        />
      </Card>
      {open && (
        <DecisionModal
          approval={open}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null);
            qc.invalidateQueries({ queryKey: ['approvals'] });
          }}
        />
      )}
    </Page>
  );
}
