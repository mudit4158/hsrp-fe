import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { dt } from '../format';
import { Alert, Button, Card, ErrorBox, Field, Grid, Input, Mono, Page, Select, StatusBadge, Table, Tabs } from '../ui';

export function Inventory() {
  const [tab, setTab] = useState('stock');
  const [stationId, setStationId] = useState('');
  const [status, setStatus] = useState('');
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState('');
  const stock = useQuery({ queryKey: ['stock'], queryFn: () => api.get('/inventory/stock') });
  const stations = useQuery({ queryKey: ['masters', 'stations'], queryFn: () => api.get('/masters/stations') });
  const boxes = useQuery({ queryKey: ['boxes', stationId, status], queryFn: () => api.get('/inventory/boxes', { stationId, status }), enabled: tab === 'boxes' });
  const history = useQuery({ queryKey: ['plate', lookup], queryFn: () => api.get(`/inventory/plates/${lookup}/history`), enabled: Boolean(lookup), retry: false });

  return (
    <Page title="Inventory" subtitle="Boxes of laser-coded plates per embossing station.">
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'stock', label: 'Stock by station' }, { key: 'boxes', label: 'Boxes' }, { key: 'plate', label: 'Laser code lookup' }, { key: 'receipt', label: 'Stock receipt' }]} />
      {tab === 'stock' && (
        <Grid cols={2}>
          {(stock.data ?? []).map((s: any) => (
            <Card key={s.stationId} title={`${s.stationCode} · ${s.stationName}`}>
              <Table
                rowKey={(r: any) => r.productCode}
                columns={[
                  { key: 'productCode', label: 'Product' },
                  { key: 'AVAILABLE', label: 'Available', align: 'right' },
                  { key: 'ALLOCATED', label: 'Allocated', align: 'right' },
                  { key: 'FITTED', label: 'Fitted', align: 'right' },
                  { key: 'SCRAPPED', label: 'Scrapped', align: 'right' },
                ]}
                rows={s.products}
              />
            </Card>
          ))}
        </Grid>
      )}
      {tab === 'boxes' && (
        <Card>
          <div className="filters">
            <Field label="Station">
              <Select value={stationId} onChange={(e) => setStationId(e.target.value)} placeholder="All" options={(stations.data ?? []).map((s: any) => ({ value: s.id, label: s.code }))} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All" options={['OPEN', 'EXHAUSTED']} />
            </Field>
          </div>
          <Table
            columns={[
              { key: 'boxNo', label: 'Box', render: (b: any) => <Mono>{b.boxNo}</Mono> },
              { key: 'station', label: 'Station', render: (b: any) => (stations.data ?? []).find((s: any) => s.id === b.stationId)?.code },
              { key: 'productCode', label: 'Product' },
              { key: 'plateCount', label: 'Plates', align: 'right' },
              { key: 'available', label: 'Available', align: 'right' },
              { key: 'status', label: 'Status', render: (b: any) => <StatusBadge status={b.status} /> },
              { key: 'lock', label: 'Lock', render: (b: any) => (b.lockedBy && new Date(b.lockedUntil) > new Date() ? `locked until ${dt(b.lockedUntil)}` : '–') },
              { key: 'receivedAt', label: 'Received', render: (b: any) => dt(b.receivedAt) },
            ]}
            rows={boxes.data}
          />
        </Card>
      )}
      {tab === 'plate' && (
        <Card>
          <form className="filters" onSubmit={(e) => { e.preventDefault(); setLookup(code.trim().toUpperCase()); }}>
            <Field label="Laser code">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KA0300500001" />
            </Field>
            <Button type="submit" variant="primary">Look up</Button>
          </form>
          <ErrorBox error={history.error} />
          {history.data && (
            <div className="stack">
              <p>
                <Mono>{history.data.plate.laserCode}</Mono> · {history.data.plate.productCode} · <StatusBadge status={history.data.plate.status} />
              </p>
              <Table
                columns={[
                  { key: 'createdAt', label: 'Allocated', render: (a: any) => dt(a.createdAt) },
                  { key: 'orderId', label: 'Order', render: (a: any) => <Link to={`/orders/${a.orderId}`}>open</Link> },
                  { key: 'position', label: 'Position' },
                  { key: 'status', label: 'Allocation', render: (a: any) => (a.status === 'ACTIVE' ? <StatusBadge status="ACTIVE" /> : 'closed') },
                  { key: 'closeReason', label: 'Closed because' },
                ]}
                rows={history.data.allocations}
                empty="Never allocated."
              />
            </div>
          )}
        </Card>
      )}
      {tab === 'receipt' && (
        <Card>
          <Alert tone="info">
            New stock arrives as a CSV with one row per plate: <Mono>Box No, Station, Product, Laser Code</Mono>. Upload it under <Link to="/imports">OEM files & uploads</Link> with the
            “Plate stock receipt” profile. Laser codes are two letters plus ten digits.
          </Alert>
          <pre className="json">{'Box No,Station,Product,Laser Code\nBX-KOL1-101,KOL1,500X120,KA0910100001\nBX-KOL1-101,KOL1,500X120,KA0910100002'}</pre>
        </Card>
      )}
    </Page>
  );
}
