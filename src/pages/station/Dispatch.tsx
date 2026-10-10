import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../../api';
import { useAuth } from '../../auth';
import { dt } from '../../format';
import { Alert, Button, Card, Field, Input, Modal, Mono, Page, Select, StatusBadge, Table, Tabs, useAction } from '../../ui';
import { useStation, useStationDealers } from './useStation';

export function Dispatch() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { stationId, picker } = useStation();
  const dealers = useStationDealers(stationId);
  const { busy, run } = useAction();
  const [dealerId, setDealerId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState('CREATED');
  const [view, setView] = useState<string | null>(null);
  const [cancel, setCancel] = useState<any>(null);
  const [reason, setReason] = useState('');
  const ready = useQuery({ queryKey: ['ready', stationId, dealerId], queryFn: () => api.get('/dispatch/ready', { stationId, dealerId }), enabled: Boolean(stationId) });
  const challans = useQuery({ queryKey: ['challans', stationId, tab], queryFn: () => api.get('/dispatch/challans', { stationId, status: tab === 'ALL' ? undefined : tab }), enabled: Boolean(stationId) });
  const detail = useQuery({ queryKey: ['challan', view], queryFn: () => api.get(`/dispatch/challans/${view}`), enabled: Boolean(view) });
  const rows: any[] = ready.data ?? [];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['ready'] });
    qc.invalidateQueries({ queryKey: ['challans'] });
  };

  return (
    <Page title="Delivery challans" subtitle="A challan holds one dealer's plates, has a unique number and cannot be edited: cancel and recreate it instead. A challan can be inwarded once.">
      <Card title="Ready to dispatch">
        <div className="filters">
          {picker}
          <Field label="Dealer">
            <Select value={dealerId} onChange={(e) => { setDealerId(e.target.value); setSelected([]); }} placeholder="Choose dealer" options={dealers.map((d: any) => ({ value: d.id, label: `${d.code} · ${d.name}` }))} />
          </Field>
        </div>
        {!dealerId && <Alert tone="info">Choose a dealer to build a challan.</Alert>}
        <Table
          columns={[
            { key: 'sel', label: '', render: (o: any) => <input type="checkbox" disabled={!dealerId} checked={selected.includes(o.id)} onChange={() => setSelected((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))} /> },
            { key: 'orderNo', label: 'Order', render: (o: any) => <Link to={`/orders/${o.id}`}><Mono>{o.orderNo}</Mono></Link> },
            { key: 'regnNo', label: 'Registration', render: (o: any) => <span className="plate">{o.regnNo}</span> },
            { key: 'dealer', label: 'Dealer', render: (o: any) => dealers.find((d: any) => d.id === o.dealerId)?.code },
            { key: 'plates', label: 'Plates on this challan', render: (o: any) => o.toDispatch.map((p: any) => `${p.position} ${p.laserCode}`).join(' · ') },
          ]}
          rows={rows}
          empty="Nothing ready. Orders appear here after sticker printing (or QC when no sticker is needed)."
        />
        <div className="row gap" style={{ marginTop: 12 }}>
          <Button
            variant="primary"
            disabled={!selected.length || !can('station.operate')}
            busy={busy === 'create'}
            onClick={() =>
              run('create', () => api.post('/dispatch/challans', { stationId, dealerId, orderIds: selected }), 'Challan created').then((c) => {
                if (!c) return;
                setSelected([]);
                refresh();
                openFile('GET', `/dispatch/challans/${c.id}/pdf`);
              })
            }
          >
            Create challan ({selected.length})
          </Button>
        </div>
      </Card>
      <Card title="Challans">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: 'CREATED', label: 'In transit' }, { key: 'INWARDED', label: 'Inwarded' }, { key: 'CANCELLED', label: 'Cancelled' }, { key: 'ALL', label: 'All' }]} />
        <Table
          onRowClick={(c: any) => setView(c.id)}
          columns={[
            { key: 'challanNo', label: 'Challan', render: (c: any) => <Mono>{c.challanNo}</Mono> },
            { key: 'createdAt', label: 'Created', render: (c: any) => dt(c.createdAt) },
            { key: 'dealerName', label: 'Dealer' },
            { key: 'plates', label: 'Plates', align: 'right' },
            { key: 'status', label: 'Status', render: (c: any) => <StatusBadge status={c.status === 'INWARDED' ? 'INWARDED' : c.status} /> },
            { key: 'inwardedAt', label: 'Inwarded', render: (c: any) => dt(c.inwardedAt) },
            {
              key: 'act',
              label: '',
              render: (c: any) => (
                <div className="row gap" onClick={(e) => e.stopPropagation()}>
                  <Button small onClick={() => openFile('GET', `/dispatch/challans/${c.id}/pdf`)}>PDF</Button>
                  {c.status === 'CREATED' && can('station.operate') && (
                    <Button small variant="danger" onClick={() => { setCancel(c); setReason(''); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={challans.data}
        />
      </Card>
      <Modal open={Boolean(view && detail.data)} wide title={`Challan ${detail.data?.challanNo ?? ''}`} onClose={() => setView(null)}>
        <Table
          columns={[
            { key: 'orderNo', label: 'Order', render: (l: any) => <Mono>{l.orderNo}</Mono> },
            { key: 'regnNo', label: 'Registration' },
            { key: 'position', label: 'Position' },
            { key: 'laserCode', label: 'Laser code', render: (l: any) => <Mono>{l.laserCode}</Mono> },
            { key: 'inwardStatus', label: 'Inward', render: (l: any) => <StatusBadge status={l.inwardStatus} /> },
            { key: 'rejectReason', label: 'Reason' },
          ]}
          rows={detail.data?.lines}
        />
      </Modal>
      <Modal
        open={Boolean(cancel)}
        title={`Cancel challan ${cancel?.challanNo}`}
        onClose={() => setCancel(null)}
        footer={
          <Button variant="danger" disabled={reason.trim().length < 3} busy={busy === 'cancel'} onClick={() => run('cancel', () => api.post(`/dispatch/challans/${cancel.id}/cancel`, { reason }), 'Challan cancelled; its orders are ready to dispatch again').then((r) => { if (r) { setCancel(null); refresh(); } })}>
            Cancel challan
          </Button>
        }
      >
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </Page>
  );
}
