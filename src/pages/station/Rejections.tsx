import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { dt } from '../../format';
import { Alert, Badge, Button, Card, Mono, Page, StatusBadge, Table, Tabs, useAction } from '../../ui';
import { DecisionModal } from '../Approvals';

export function Rejections() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [approval, setApproval] = useState<any>(null);
  const { busy, run } = useAction();
  const cases = useQuery({ queryKey: ['rejections', status], queryFn: () => api.get('/rejections', { status: status === 'ALL' ? undefined : status }), refetchInterval: 8000 });

  const openDecision = (c: any) =>
    run(`open-${c.id}`, async () => {
      const list = await api.get('/approvals', { subjectId: c.id, status: 'PENDING' });
      if (!list.length) throw new Error('This case has no open approval (already decided?)');
      setApproval(list[0]);
    });

  return (
    <Page title="Rejection approval" subtitle="Plates rejected at QC or by the dealer at inward. Approve: the rejected plates are scrapped and only those positions are re-issued (they ship on a new challan). Disapprove: the order returns to where it would have been.">
      <Card>
        <Tabs value={status} onChange={setStatus} tabs={[{ key: 'PENDING', label: 'Waiting' }, { key: 'APPROVED', label: 'Approved' }, { key: 'DISAPPROVED', label: 'Disapproved' }, { key: 'ALL', label: 'All' }]} />
        <Alert tone="info">Remarks are mandatory for both decisions.</Alert>
        <Table
          columns={[
            { key: 'createdAt', label: 'Raised', render: (c: any) => dt(c.createdAt) },
            { key: 'orderNo', label: 'Order', render: (c: any) => <Link to={`/orders/${c.orderId}`}><Mono>{c.orderNo}</Mono></Link> },
            { key: 'regnNo', label: 'Registration' },
            { key: 'source', label: 'From', render: (c: any) => <Badge tone={c.source === 'QC' ? 'violet' : 'teal'}>{c.source === 'QC' ? 'Station QC' : 'Dealer inward'}</Badge> },
            { key: 'positions', label: 'Plates', render: (c: any) => c.positions.join(' + ') },
            { key: 'reason', label: 'Reason' },
            { key: 'status', label: 'Decision', render: (c: any) => <StatusBadge status={c.status} /> },
            { key: 'remarks', label: 'Remarks' },
            { key: 'act', label: '', render: (c: any) => c.status === 'PENDING' && <Button small variant="primary" busy={busy === `open-${c.id}`} onClick={() => openDecision(c)}>Decide</Button> },
          ]}
          rows={cases.data}
          empty="No rejection cases."
        />
      </Card>
      {approval && (
        <DecisionModal
          approval={approval}
          approveLabel="Approve (re-issue)"
          rejectLabel="Disapprove"
          onClose={() => setApproval(null)}
          onDone={() => {
            setApproval(null);
            setTimeout(() => qc.invalidateQueries({ queryKey: ['rejections'] }), 600);
          }}
        />
      )}
    </Page>
  );
}
