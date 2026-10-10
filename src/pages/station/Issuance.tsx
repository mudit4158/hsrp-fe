import { VEHICLE_CLASSES } from '@hsrp/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../../api';
import { useAuth } from '../../auth';
import { dt, todayIst } from '../../format';
import { Alert, Badge, Button, Card, Field, Input, Mono, Page, Select, Table, useAction } from '../../ui';
import { useStation, useStationDealers } from './useStation';

export function Issuance() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { stationId, picker } = useStation();
  const dealers = useStationDealers(stationId);
  const [dealerId, setDealerId] = useState('');
  const [date, setDate] = useState(todayIst());
  const [vehicleClass, setVehicleClass] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [boxText, setBoxText] = useState('');
  const [locked, setLocked] = useState<any[] | null>(null);
  const [lastCard, setLastCard] = useState<any>(null);
  const { busy, run } = useAction();

  const pending = useQuery({
    queryKey: ['issuance', stationId, dealerId, date, vehicleClass, vehicleType],
    queryFn: () => api.get('/station/issuance/pending', { stationId, dealerId, date, vehicleClass, vehicleType }),
    enabled: Boolean(stationId),
  });
  const boxes = useQuery({ queryKey: ['open-boxes', stationId], queryFn: () => api.get('/inventory/boxes', { stationId, status: 'OPEN' }), enabled: Boolean(stationId) });
  const cards = useQuery({ queryKey: ['job-cards', stationId], queryFn: () => api.get('/station/job-cards', { stationId }), enabled: Boolean(stationId) });
  const boxNos = boxText.split(/[\s,]+/).map((b) => b.trim().toUpperCase()).filter(Boolean);
  const orders: any[] = pending.data?.orders ?? [];
  const chosen = orders.filter((o) => selected.includes(o.id));
  const need = new Map<string, number>();
  for (const o of chosen) for (const p of o.pendingPositions) {
    const code = p === 'FRONT' ? o.frontProductCode : o.rearProductCode;
    need.set(code, (need.get(code) ?? 0) + 1);
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Page title="Issuance & job cards" subtitle="Pick a dealer, choose confirmed orders, enter the box numbers you are embossing from, and the system allocates laser-coded plates.">
      <Card>
        <div className="filters">
          {picker}
          <Field label="Dealer">
            <Select value={dealerId} onChange={(e) => { setDealerId(e.target.value); setSelected([]); }} placeholder="Choose dealer" options={dealers.map((d: any) => ({ value: d.id, label: `${d.code} · ${d.name}` }))} />
          </Field>
          <Field label="Confirmed on or before">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Vehicle class">
            <Select value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value)} placeholder="All" options={[...VEHICLE_CLASSES]} />
          </Field>
          <Field label="Vehicle type">
            <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="All" options={[{ value: 'NON_TRANSPORT', label: 'Non-transport' }, { value: 'TRANSPORT', label: 'Transport' }]} />
          </Field>
        </div>
        {!dealerId && <Alert tone="info">A job card covers one dealer. Choose a dealer to select orders.</Alert>}
        <Table
          columns={[
            { key: 'sel', label: dealerId ? <input type="checkbox" checked={orders.length > 0 && selected.length === orders.length} onChange={(e) => setSelected(e.target.checked ? orders.map((o) => o.id) : [])} /> : '', render: (o: any) => <input type="checkbox" disabled={!dealerId} checked={selected.includes(o.id)} onChange={() => toggle(o.id)} /> },
            { key: 'orderNo', label: 'Order', render: (o: any) => <Link to={`/orders/${o.id}`}><Mono>{o.orderNo}</Mono></Link> },
            { key: 'regnNo', label: 'Registration', render: (o: any) => <span className="plate">{o.regnNo}</span> },
            { key: 'vehicleClass', label: 'Class' },
            { key: 'positions', label: 'Plates needed', render: (o: any) => o.pendingPositions.map((p: string) => `${p} ${p === 'FRONT' ? o.frontProductCode : o.rearProductCode}`).join(' · ') },
            { key: 'confirmedAt', label: 'Confirmed', render: (o: any) => dt(o.confirmedAt) },
            { key: 'green', label: '', render: (o: any) => (o.greenStrip ? <Badge tone="ok">BS-VI</Badge> : '') },
          ]}
          rows={pending.data?.orders}
          empty="No confirmed orders waiting for plates."
        />
      </Card>
      {chosen.length > 0 && (
        <Card title={`Allocate plates for ${chosen.length} order(s)`}>
          <p>
            Plates needed: {[...need.entries()].map(([k, v]) => <Badge key={k} tone="info">{`${v} × ${k}`}</Badge>)}
          </p>
          <div className="form">
            <Field label="Box numbers" hint="Comma or space separated. Locked to you while you allocate." wide>
              <Input value={boxText} onChange={(e) => { setBoxText(e.target.value); setLocked(null); }} placeholder="BX-KOL1-005, BX-KOL1-011" />
            </Field>
          </div>
          <p className="small muted">
            Open boxes with stock:{' '}
            {(boxes.data ?? [])
              .filter((b: any) => need.has(b.productCode) && b.available > 0)
              .slice(0, 8)
              .map((b: any) => (
                <button key={b.id} className="btn btn-ghost btn-sm" onClick={() => setBoxText((t) => [...new Set([...t.split(/[\s,]+/).filter(Boolean), b.boxNo])].join(', '))}>
                  {b.boxNo} ({b.productCode}, {b.available} left{b.lockedBy ? ', locked' : ''})
                </button>
              ))}
          </p>
          {locked && (
            <Alert tone="ok">
              Locked: {locked.map((b) => `${b.boxNo} (${b.productCode}, ${b.available} available)`).join(' · ')}
            </Alert>
          )}
          <div className="row gap">
            <Button disabled={!boxNos.length || !can('station.operate')} busy={busy === 'lock'} onClick={() => run('lock', () => api.post('/inventory/boxes/lock', { stationId, boxNos }), 'Boxes locked').then((r) => r && setLocked(r))}>
              Lock boxes
            </Button>
            <Button
              variant="primary"
              disabled={!boxNos.length || !can('station.operate')}
              busy={busy === 'issue'}
              onClick={() =>
                run('issue', () => api.post('/station/issuance', { stationId, dealerId, orderIds: selected, boxNos }), 'Plates allocated, job card created').then((r) => {
                  if (!r) return;
                  setLastCard(r);
                  setSelected([]);
                  setLocked(null);
                  qc.invalidateQueries({ queryKey: ['issuance'] });
                  qc.invalidateQueries({ queryKey: ['job-cards'] });
                  qc.invalidateQueries({ queryKey: ['open-boxes'] });
                })
              }
            >
              Allocate & create job card
            </Button>
          </div>
        </Card>
      )}
      {lastCard && (
        <Alert tone="ok">
          Job card <b>{lastCard.jobCardNo}</b> created with {lastCard.plateCount} plates.{' '}
          <Button small onClick={() => openFile('GET', `/station/job-cards/${lastCard.id}/pdf`)}>Open job card PDF</Button> Next: <Link to="/station/qc">quality check</Link>.
        </Alert>
      )}
      <Card title="Recent job cards">
        <Table
          columns={[
            { key: 'jobCardNo', label: 'Job card', render: (r: any) => <Mono>{r.jobCardNo}</Mono> },
            { key: 'createdAt', label: 'Created', render: (r: any) => dt(r.createdAt) },
            { key: 'dealer', label: 'Dealer', render: (r: any) => dealers.find((d: any) => d.id === r.dealerId)?.name ?? '–' },
            { key: 'orders', label: 'Orders', align: 'right', render: (r: any) => r.orderIds.length },
            { key: 'plateCount', label: 'Plates', align: 'right' },
            { key: 'boxNos', label: 'Boxes', render: (r: any) => r.boxNos.join(', ') },
            { key: 'pdf', label: '', render: (r: any) => <Button small onClick={() => openFile('GET', `/station/job-cards/${r.id}/pdf`)}>PDF</Button> },
          ]}
          rows={cards.data}
        />
      </Card>
    </Page>
  );
}
