import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { ago, dt } from '../../format';
import { Alert, Badge, Button, Card, Field, Input, Json, Modal, Mono, Page, Pager, Select, Stat, StatusBadge, Table, Tabs, useAction } from '../../ui';

export function Integration() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { busy, run } = useAction();
  const [tab, setTab] = useState('queue');
  const [status, setStatus] = useState('FAILED,DEAD,PENDING,RUNNING');
  const [subscriber, setSubscriber] = useState('');
  const [system, setSystem] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<any>(null);
  const summary = useQuery({ queryKey: ['hub-summary'], queryFn: () => api.get('/integration/summary'), refetchInterval: 4000 });
  const deliveries = useQuery({ queryKey: ['deliveries', status, subscriber, page], queryFn: () => api.get('/integration/deliveries', { status, subscriber, page, pageSize: 25 }), refetchInterval: 4000, placeholderData: keepPreviousData });
  const calls = useQuery({ queryKey: ['calls', system, page], queryFn: () => api.get('/integration/calls', { system, page, pageSize: 25 }), enabled: tab === 'calls', refetchInterval: 5000, placeholderData: keepPreviousData });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => api.get('/admin/jobs'), enabled: tab === 'jobs' });
  const pendingVahan = useQuery({ queryKey: ['vahan-pending'], queryFn: () => api.get('/fitments/vahan-pending'), refetchInterval: 5000 });
  const s = summary.data;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['deliveries'] });
    qc.invalidateQueries({ queryKey: ['hub-summary'] });
  };

  return (
    <Page title="Integration monitor" subtitle="Every external call runs from the outbox with retries and exponential back-off. Exhausted or refused calls land in the dead-letter (manual) queue and can be replayed.">
      <div className="stats">
        <Stat label="Waiting" value={s ? (s.byStatus.PENDING ?? 0) + (s.byStatus.RUNNING ?? 0) : '…'} />
        <Stat label="Retrying (back-off)" value={s?.byStatus.FAILED ?? 0} tone={s?.byStatus.FAILED ? 'warn' : undefined} />
        <Stat label="Dead-letter / manual" value={s?.byStatus.DEAD ?? 0} tone={s?.byStatus.DEAD ? 'bad' : undefined} />
        <Stat label="Delivered" value={s?.byStatus.DONE ?? 0} tone="ok" />
        <Stat label="Fitments not on VAHAN" value={pendingVahan.data?.length ?? '…'} tone={pendingVahan.data?.length ? 'warn' : undefined} />
      </div>
      {can('integration.replay') && (
        <Alert tone="info">
          VAHAN back after an outage?{' '}
          <Button small variant="primary" busy={busy === 'all'} onClick={() => run('all', () => api.post('/integration/subscribers/fitment.vahan-post/replay'), 'Re-queued').then(refresh)}>
            Replay all VAHAN posts
          </Button>{' '}
          <Button small busy={busy === 'eod'} onClick={() => run('eod', () => api.post('/fitments/vahan-eod-alert'), 'End-of-day alert checked (see the simulator messages)')}>
            Run end-of-day alert now
          </Button>
        </Alert>
      )}
      <Card>
        <Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ key: 'queue', label: 'Outbox deliveries' }, { key: 'calls', label: 'External call log' }, { key: 'subs', label: 'Subscribers' }, { key: 'jobs', label: 'Scheduled jobs' }]} />
        {tab === 'queue' && (
          <>
            <div className="filters">
              <Field label="Status">
                <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: 'FAILED,DEAD,PENDING,RUNNING', label: 'Not delivered' }, { value: 'FAILED', label: 'Retrying' }, { value: 'DEAD', label: 'Dead-letter / manual' }, { value: 'DONE', label: 'Delivered' }, { value: '', label: 'All' }]} />
              </Field>
              <Field label="Subscriber contains">
                <Input value={subscriber} onChange={(e) => { setSubscriber(e.target.value); setPage(1); }} placeholder="vahan, notification, orders…" />
              </Field>
            </div>
            <Table
              onRowClick={setOpen}
              columns={[
                { key: 'updatedAt', label: 'Updated', render: (d: any) => ago(d.updatedAt) },
                { key: 'eventType', label: 'Event' },
                { key: 'subscriber', label: 'Subscriber', render: (d: any) => <Mono>{d.subscriber}</Mono> },
                { key: 'status', label: 'Status', render: (d: any) => <StatusBadge status={d.status} /> },
                { key: 'attempts', label: 'Attempts', align: 'right', render: (d: any) => `${d.attempts}/${d.maxAttempts}` },
                { key: 'next', label: 'Next try', render: (d: any) => (d.status === 'FAILED' ? dt(d.nextAttemptAt) : '–') },
                { key: 'lastError', label: 'Last error', render: (d: any) => <span className="small">{d.lastError ?? ''}</span> },
                { key: 'subject', label: 'Subject', render: (d: any) => (d.subjectType === 'hsrp.order' ? <Link to={`/orders/${d.subjectId}`} onClick={(e) => e.stopPropagation()}>order</Link> : d.subjectType ?? '') },
                {
                  key: 'act',
                  label: '',
                  render: (d: any) =>
                    can('integration.replay') && ['FAILED', 'DEAD'].includes(d.status) && (
                      <Button small variant="primary" busy={busy === d.id} onClick={(e) => { e.stopPropagation(); run(d.id, () => api.post(`/integration/deliveries/${d.id}/replay`), 'Replaying now').then(refresh); }}>
                        Replay
                      </Button>
                    ),
                },
              ]}
              rows={deliveries.data?.items}
              empty="Nothing in the queue. All external calls are delivered."
            />
            {deliveries.data && <Pager page={page} pageSize={25} total={deliveries.data.total} onPage={setPage} />}
          </>
        )}
        {tab === 'calls' && (
          <>
            <div className="filters">
              <Field label="System"><Select value={system} onChange={(e) => setSystem(e.target.value)} placeholder="All" options={['VAHAN', 'OEM', 'PAYMENT', 'SMS', 'EMAIL']} /></Field>
            </div>
            <Table
              onRowClick={setOpen}
              columns={[
                { key: 'createdAt', label: 'When', render: (c: any) => dt(c.createdAt) },
                { key: 'system', label: 'System', render: (c: any) => <Badge tone="info">{c.system}</Badge> },
                { key: 'operation', label: 'Operation' },
                { key: 'outcome', label: 'Outcome', render: (c: any) => <StatusBadge status={c.outcome} /> },
                { key: 'durationMs', label: 'ms', align: 'right' },
                { key: 'error', label: 'Error', render: (c: any) => <span className="small">{c.error ?? ''}</span> },
              ]}
              rows={calls.data?.items}
            />
            {calls.data && <Pager page={page} pageSize={25} total={calls.data.total} onPage={setPage} />}
          </>
        )}
        {tab === 'subs' && (
          <Table
            rowKey={(r: any) => `${r.eventType}-${r.subscriber}`}
            columns={[
              { key: 'eventType', label: 'Event' },
              { key: 'subscriber', label: 'Subscriber', render: (r: any) => <Mono>{r.subscriber}</Mono> },
              { key: 'open', label: 'Open deliveries', render: (r: any) => (s?.open ?? []).filter((o: any) => o.subscriber === r.subscriber).map((o: any) => `${o.count} ${o.status.toLowerCase()}`).join(', ') || '–' },
            ]}
            rows={s?.subscriptions}
          />
        )}
        {tab === 'jobs' && (
          <Table
            rowKey={(r: any) => r.name}
            columns={[
              { key: 'name', label: 'Job', render: (j: any) => <Mono>{j.name}</Mono> },
              { key: 'everyMs', label: 'Every', render: (j: any) => `${Math.round(j.everyMs / 1000)} s` },
              { key: 'lastRun', label: 'Last run', render: (j: any) => dt(j.lastRun) },
              { key: 'act', label: '', render: (j: any) => can('integration.replay') && <Button small busy={busy === j.name} onClick={() => run(j.name, () => api.post(`/admin/jobs/${j.name}/run`), 'Job ran')}>Run now</Button> },
            ]}
            rows={jobs.data}
          />
        )}
      </Card>
      <Modal open={Boolean(open)} wide title={open?.subscriber ?? `${open?.system} ${open?.operation}`} onClose={() => setOpen(null)}>
        <Json value={open} />
      </Modal>
    </Page>
  );
}
