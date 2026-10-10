import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api';
import { dt } from '../../format';
import { Card, Field, Input, Json, Modal, Mono, Page, Pager, Table } from '../../ui';

export function Audit() {
  const [f, setF] = useState({ action: '', subjectId: '', actorId: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<any>(null);
  const q = useQuery({ queryKey: ['audit', f, page], queryFn: () => api.get('/audit', { ...f, page, pageSize: 50 }), placeholderData: keepPreviousData });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF({ ...f, [k]: e.target.value });
    setPage(1);
  };
  return (
    <Page title="Audit log" subtitle="Append-only: who did what to which record, with before and after values, IP and device. The database refuses updates and deletes.">
      <Card>
        <div className="filters">
          <Field label="Action contains"><Input value={f.action} onChange={set('action')} placeholder="order.create, auth.login, price.set…" /></Field>
          <Field label="Subject id"><Input value={f.subjectId} onChange={set('subjectId')} /></Field>
          <Field label="Actor id"><Input value={f.actorId} onChange={set('actorId')} /></Field>
        </div>
        <Table
          onRowClick={setOpen}
          columns={[
            { key: 'createdAt', label: 'When', render: (r: any) => dt(r.createdAt) },
            { key: 'actor', label: 'Who', render: (r: any) => r.actorName ?? r.actorId ?? r.actorType },
            { key: 'action', label: 'Action', render: (r: any) => <Mono>{r.action}</Mono> },
            { key: 'subject', label: 'Subject', render: (r: any) => (r.subjectType ? `${r.subjectType} ${String(r.subjectId ?? '').slice(0, 12)}` : '–') },
            { key: 'ip', label: 'IP / device', render: (r: any) => [r.ip, r.device].filter(Boolean).join(' · ') || '–' },
          ]}
          rows={q.data?.items}
        />
        {q.data && <Pager page={page} pageSize={50} total={q.data.total} onPage={setPage} />}
      </Card>
      <Modal open={Boolean(open)} wide title={open?.action} onClose={() => setOpen(null)}>
        <div className="grid grid-2">
          <div><b>Before</b><Json value={open?.before ?? null} /></div>
          <div><b>After</b><Json value={open?.after ?? null} /></div>
        </div>
      </Modal>
    </Page>
  );
}
