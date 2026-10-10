import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { date, dt } from '../format';
import { Badge, Button, Card, Field, KV, Modal, Mono, Page, Select, StatusBadge, Table, Tabs, Textarea, Timeline, useAction } from '../ui';

export function Complaints() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('OPEN,IN_PROGRESS');
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState({ message: '', status: '', isPublic: true });
  const { busy, run } = useAction();
  const list = useQuery({
    queryKey: ['tickets', tab],
    queryFn: () => api.get('/tickets', tab === 'overdue' ? { overdue: 'true', pageSize: 100 } : { status: tab === 'ALL' ? undefined : tab, pageSize: 100 }),
  });
  const t = useQuery({ queryKey: ['ticket', open], queryFn: () => api.get(`/tickets/${open}`), enabled: Boolean(open) });

  return (
    <Page title="Complaints" subtitle="Customer complaints from HSRP Support, with ageing against the 15-day limit.">
      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'OPEN,IN_PROGRESS', label: 'Open' }, { key: 'overdue', label: 'Past 15 days' }, { key: 'RESOLVED,CLOSED', label: 'Resolved' }, { key: 'ALL', label: 'All' }]} />
        <Table
          onRowClick={(r: any) => { setOpen(r.id); setReply({ message: '', status: '', isPublic: true }); }}
          columns={[
            { key: 'ticketNo', label: 'Ticket', render: (r: any) => <Mono>{r.ticketNo}</Mono> },
            { key: 'title', label: 'Complaint' },
            { key: 'raisedByName', label: 'Raised by' },
            { key: 'createdAt', label: 'Raised', render: (r: any) => date(r.createdAt) },
            { key: 'ageDays', label: 'Age', align: 'right', render: (r: any) => `${r.ageDays} d` },
            { key: 'due', label: 'Due', render: (r: any) => (r.overdue ? <Badge tone="bad">overdue</Badge> : r.daysLeft == null ? '–' : `${r.daysLeft} d left`) },
            { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
          ]}
          rows={list.data?.items}
          empty="No complaints here."
        />
      </Card>
      <Modal
        open={Boolean(open && t.data)}
        wide
        title={`${t.data?.ticketNo ?? ''} · ${t.data?.title ?? ''}`}
        onClose={() => setOpen(null)}
        footer={
          <Button
            variant="primary"
            disabled={reply.message.trim().length < 2}
            busy={busy === 'reply'}
            onClick={() =>
              run('reply', () => api.post(`/tickets/${open}/replies`, { message: reply.message, status: reply.status || undefined, isPublic: reply.isPublic }), 'Reply saved').then((r) => {
                if (!r) return;
                setReply({ message: '', status: '', isPublic: true });
                qc.invalidateQueries({ queryKey: ['ticket', open] });
                qc.invalidateQueries({ queryKey: ['tickets'] });
              })
            }
          >
            Save reply
          </Button>
        }
      >
        {t.data && (
          <div className="stack">
            <KV
              items={[
                ['Status', <StatusBadge status={t.data.status} />],
                ['Category', t.data.categoryCode],
                ['Raised by', `${t.data.raisedByName} · ${t.data.raisedByContact}`],
                ['Raised', dt(t.data.createdAt)],
                ['Due', dt(t.data.dueAt)],
                ['Age', `${t.data.ageDays} days${t.data.overdue ? ' (overdue)' : ''}`],
                ['Order', t.data.subjectId ? <Link to={`/orders/${t.data.subjectId}`}>open order</Link> : '–'],
              ]}
            />
            <Timeline items={t.data.events.map((e: any) => ({ title: `${e.kind.toLowerCase()}${e.toStatus && e.kind !== 'COMMENT' ? ` → ${e.toStatus.toLowerCase()}` : ''} · ${e.actor ?? ''}`, at: `${dt(e.createdAt)}${e.isPublic ? '' : ' · internal'}`, note: e.message }))} />
            <div className="form">
              <Field label="Reply" wide>
                <Textarea value={reply.message} onChange={(e) => setReply({ ...reply, message: e.target.value })} />
              </Field>
              <Field label="Set status">
                <Select value={reply.status} onChange={(e) => setReply({ ...reply, status: e.target.value })} placeholder="Keep / in progress" options={['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']} />
              </Field>
              <label className="check">
                <input type="checkbox" checked={reply.isPublic} onChange={(e) => setReply({ ...reply, isPublic: e.target.checked })} /> Visible to the customer (sends SMS)
              </label>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}
