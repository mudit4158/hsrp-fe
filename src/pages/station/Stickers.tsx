import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../../api';
import { useAuth } from '../../auth';
import { Badge, Button, Card, Field, Input, Modal, Mono, Page, StatusBadge, Table, useAction } from '../../ui';
import { useStation } from './useStation';

export function Stickers() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { stationId, picker } = useStation();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [reprint, setReprint] = useState<any>(null);
  const [reason, setReason] = useState('');
  const queue = useQuery({ queryKey: ['stickers', stationId], queryFn: () => api.get('/station/stickers', { stationId }), enabled: Boolean(stationId), refetchInterval: 8000 });
  const printed = useQuery({
    queryKey: ['printed', stationId, search],
    queryFn: () => api.get('/orders', { stationId, q: search, status: 'STICKER_PRINTED,DISPATCHED,INWARDED,FITTED', pageSize: 20 }),
    enabled: Boolean(stationId),
  });

  const print = (o: any) =>
    run(`print-${o.id}`, () => openFile('POST', `/station/stickers/${o.id}/print`, { body: { reprint: false } }), `Sticker printed for ${o.regnNo}`).then(() => {
      qc.invalidateQueries({ queryKey: ['stickers'] });
      qc.invalidateQueries({ queryKey: ['printed'] });
    });

  return (
    <Page title="Sticker printing" subtitle="Third registration sticker with registration, laser codes, engine and chassis numbers; BS-VI vehicles get a green strip. Vehicles that need no sticker skip this step automatically.">
      <Card title="Waiting for the first print">
        <div className="filters">{picker}</div>
        <Table
          columns={[
            { key: 'orderNo', label: 'Order', render: (o: any) => <Link to={`/orders/${o.id}`}><Mono>{o.orderNo}</Mono></Link> },
            { key: 'regnNo', label: 'Registration', render: (o: any) => <span className="plate">{o.regnNo}</span> },
            { key: 'vehicle', label: 'Vehicle', render: (o: any) => [o.vehicleClass, o.fuel].filter(Boolean).join(' · ') },
            { key: 'green', label: 'Strip', render: (o: any) => (o.greenStrip ? <Badge tone="ok">BS-VI green</Badge> : <span className="muted small">none</span>) },
            { key: 'act', label: '', render: (o: any) => can('station.operate') && <Button small variant="primary" busy={busy === `print-${o.id}`} onClick={() => print(o)}>Print</Button> },
          ]}
          rows={queue.data}
          empty="No stickers waiting."
        />
      </Card>
      <Card title="Reprint" actions={<Input placeholder="Registration or order no" value={search} onChange={(e) => setSearch(e.target.value)} />}>
        <p className="muted small">Reprints are allowed only after a first print and need a reason. Every print and reprint is logged.</p>
        <Table
          columns={[
            { key: 'orderNo', label: 'Order', render: (o: any) => <Mono>{o.orderNo}</Mono> },
            { key: 'regnNo', label: 'Registration', render: (o: any) => <span className="plate">{o.regnNo}</span> },
            { key: 'status', label: 'Status', render: (o: any) => <StatusBadge status={o.status} /> },
            { key: 'act', label: '', render: (o: any) => o.stickerRequired && can('station.operate') && <Button small onClick={() => { setReprint(o); setReason(''); }}>Reprint</Button> },
          ]}
          rows={printed.data?.items}
          empty="No printed stickers match."
        />
      </Card>
      <Modal
        open={Boolean(reprint)}
        title={`Reprint sticker for ${reprint?.regnNo}`}
        onClose={() => setReprint(null)}
        footer={
          <Button
            variant="primary"
            disabled={reason.trim().length < 3}
            busy={busy === 'reprint'}
            onClick={() => run('reprint', () => openFile('POST', `/station/stickers/${reprint.id}/print`, { body: { reprint: true, reason } }), 'Reprint logged').then(() => setReprint(null))}
          >
            Reprint
          </Button>
        }
      >
        <Field label="Reason (mandatory)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. printer jam, sticker torn" autoFocus />
        </Field>
      </Modal>
    </Page>
  );
}
