import { ORDER_TYPES, PLATE_SETS, VEHICLE_CLASSES, VEHICLE_TYPES } from '@hsrp/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { date, rupees } from '../format';
import { Alert, Badge, Button, Card, Field, Input, Modal, Mono, Page, Select, StatusBadge, Table, Tabs, useAction } from '../ui';

type FieldDef = { key: string; label: string; type?: 'text' | 'bool' | 'select' | 'ref'; options?: readonly string[]; ref?: string; table?: boolean; required?: boolean };

const RES: Record<string, { label: string; fields: FieldDef[] }> = {
  states: { label: 'States', fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'rulePack', label: 'Rule pack', required: true }, { key: 'active', label: 'Active', type: 'bool' }] },
  companies: { label: 'Companies', fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'gstin', label: 'GSTIN' }, { key: 'address', label: 'Address' }] },
  stations: {
    label: 'Stations',
    fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'companyId', label: 'Company', type: 'ref', ref: 'companies', required: true }, { key: 'stateCode', label: 'State', required: true }, { key: 'city', label: 'City', required: true }, { key: 'active', label: 'Active', type: 'bool' }],
  },
  oems: {
    label: 'OEMs',
    fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'integration', label: 'Integration', type: 'select', options: ['API', 'CSV'] }, { key: 'requiresCatalogueCheck', label: 'Catalogue check', type: 'bool' }, { key: 'importProfileCode', label: 'CSV profile' }, { key: 'active', label: 'Active', type: 'bool' }],
  },
  dealers: {
    label: 'Dealers',
    fields: [
      { key: 'code', label: 'Code', required: true },
      { key: 'name', label: 'Name', required: true },
      { key: 'stateCode', label: 'State', required: true },
      { key: 'city', label: 'City', required: true },
      { key: 'stationId', label: 'Station', type: 'ref', ref: 'stations', required: true },
      { key: 'walletGroup', label: 'Wallet group', required: true },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'E-mail', table: false },
      { key: 'address', label: 'Address', table: false },
      { key: 'acceptsCustomerOrders', label: 'Fits for customers', type: 'bool' },
    ],
  },
  'dealer-oems': { label: 'Dealer ↔ OEM', fields: [{ key: 'dealerId', label: 'Dealer', type: 'ref', ref: 'dealers', required: true }, { key: 'oemId', label: 'OEM', type: 'ref', ref: 'oems', required: true }] },
  products: { label: 'Products', fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'sizeMm', label: 'Size (mm)', required: true }, { key: 'active', label: 'Active', type: 'bool' }] },
  'vehicle-categories': {
    label: 'Vehicle categories',
    fields: [
      { key: 'vahanCategory', label: 'VAHAN category', required: true },
      { key: 'description', label: 'Description', required: true },
      { key: 'vehicleClass', label: 'Class', type: 'select', options: VEHICLE_CLASSES },
      { key: 'vehicleType', label: 'Type', type: 'select', options: VEHICLE_TYPES },
      { key: 'frontProductCode', label: 'Front product', required: true },
      { key: 'rearProductCode', label: 'Rear product', required: true },
      { key: 'stickerRequired', label: 'Sticker', type: 'bool' },
    ],
  },
};

function MasterTable({ resource }: { resource: string }) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const def = RES[resource];
  const { busy, run } = useAction();
  const [edit, setEdit] = useState<any>(null);
  const rows = useQuery({ queryKey: ['masters', resource], queryFn: () => api.get(`/masters/${resource}`) });
  const refs = Object.fromEntries(
    [...new Set(def.fields.filter((f) => f.ref).map((f) => f.ref!))].map((r) => [r, useQuery({ queryKey: ['masters', r], queryFn: () => api.get(`/masters/${r}`) }).data ?? []]), // eslint-disable-line react-hooks/rules-of-hooks
  ) as Record<string, any[]>;
  const refLabel = (f: FieldDef, id: string) => {
    const r = refs[f.ref!]?.find((x) => x.id === id);
    return r ? `${r.code} ${r.name}` : id;
  };
  const save = () => {
    const body = Object.fromEntries(def.fields.map((f) => [f.key, f.type === 'bool' ? Boolean(edit[f.key]) : edit[f.key] === '' ? undefined : edit[f.key]]));
    return run('save', () => (edit.id ? api.patch(`/masters/${resource}/${edit.id}`, body) : api.post(`/masters/${resource}`, body)), 'Saved (change recorded in the audit log)').then((r) => {
      if (r) {
        setEdit(null);
        qc.invalidateQueries({ queryKey: ['masters', resource] });
      }
    });
  };
  return (
    <>
      {resource === 'dealers' && <Alert tone="info">A new dealer gets an organisation, a wallet (shared with dealers in the same wallet group), a fitment calendar, and waits for onboarding approval by operations.</Alert>}
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="muted small">{rows.data?.length ?? 0} records</span>
        {can('masters.manage') && <Button variant="primary" onClick={() => setEdit({ active: true, acceptsCustomerOrders: true })}>Add</Button>}
      </div>
      <Table
        onRowClick={can('masters.manage') && resource !== 'dealer-oems' ? (r: any) => setEdit({ ...r }) : undefined}
        columns={[
          ...def.fields.filter((f) => f.table !== false).map((f) => ({
            key: f.key,
            label: f.label,
            render: (r: any) => (f.type === 'bool' ? (r[f.key] ? '✓' : '–') : f.type === 'ref' ? refLabel(f, r[f.key]) : f.key === 'code' ? <Mono>{r[f.key]}</Mono> : String(r[f.key] ?? '–')),
          })),
          ...(resource === 'dealers' ? [{ key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status === 'ACTIVE' ? 'ACTIVE' : r.status} /> }] : []),
        ]}
        rows={rows.data}
      />
      <Modal
        open={Boolean(edit)}
        title={edit?.id ? `Edit ${def.label.toLowerCase()}` : `Add to ${def.label.toLowerCase()}`}
        onClose={() => setEdit(null)}
        footer={<Button variant="primary" busy={busy === 'save'} onClick={save}>Save</Button>}
      >
        <div className="form">
          {def.fields.map((f) => (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
              {f.type === 'bool' ? (
                <label className="check">
                  <input type="checkbox" checked={Boolean(edit?.[f.key])} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.checked })} /> yes
                </label>
              ) : f.type === 'select' ? (
                <Select value={edit?.[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} placeholder="Choose" options={[...(f.options ?? [])]} />
              ) : f.type === 'ref' ? (
                <Select value={edit?.[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} placeholder="Choose" options={(refs[f.ref!] ?? []).map((x: any) => ({ value: x.id, label: `${x.code} · ${x.name}` }))} />
              ) : (
                <Input value={edit?.[f.key] ?? ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
      </Modal>
    </>
  );
}

function Prices() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { busy, run } = useAction();
  const [stateCode, setStateCode] = useState('WB');
  const [add, setAdd] = useState<any>(null);
  const rules = useQuery({ queryKey: ['prices', stateCode], queryFn: () => api.get('/pricing/rules', { stateCode, current: 'true' }) });
  const extras = useQuery({ queryKey: ['extras'], queryFn: () => api.get('/pricing/extra-charges') });
  return (
    <>
      <div className="filters">
        <Field label="State">
          <Select value={stateCode} onChange={(e) => setStateCode(e.target.value)} options={[{ value: 'WB', label: 'West Bengal' }, { value: 'OD', label: 'Odisha' }]} />
        </Field>
        {can('pricing.manage') && <Button variant="primary" onClick={() => setAdd({ stateCode, vehicleClass: 'LMV', orderType: 'NEW', plateSet: 'BOTH', amountRupees: '', oemCode: '', published: stateCode === 'OD' })}>New price</Button>}
      </div>
      <p className="muted small">Prices are effective-dated: a new price closes the previous one from its start date, and old prices stay for history. An OEM-specific price beats the generic one.</p>
      <Table
        columns={[
          { key: 'vehicleClass', label: 'Class' },
          { key: 'vehicleType', label: 'Type', render: (r: any) => r.vehicleType ?? 'any' },
          { key: 'oemCode', label: 'OEM', render: (r: any) => r.oemCode ?? 'any' },
          { key: 'orderType', label: 'Order type' },
          { key: 'plateSet', label: 'Plates' },
          { key: 'amountPaise', label: 'Price', align: 'right', render: (r: any) => rupees(r.amountPaise) },
          { key: 'published', label: 'Published', render: (r: any) => (r.published ? <Badge tone="ok">public</Badge> : '–') },
          { key: 'effectiveFrom', label: 'From', render: (r: any) => date(r.effectiveFrom) },
        ]}
        rows={rules.data}
      />
      <h2 style={{ margin: '18px 0 8px' }}>Extra charges</h2>
      <Table
        columns={[
          { key: 'code', label: 'Code', render: (r: any) => <Mono>{r.code}</Mono> },
          { key: 'name', label: 'Name' },
          { key: 'amountPaise', label: 'Amount', align: 'right', render: (r: any) => rupees(r.amountPaise) },
          { key: 'conditions', label: 'Applies when', render: (r: any) => JSON.stringify(r.conditions) },
        ]}
        rows={extras.data}
      />
      <Modal
        open={Boolean(add)}
        title="New price"
        onClose={() => setAdd(null)}
        footer={
          <Button variant="primary" busy={busy === 'price'} onClick={() => run('price', () => api.post('/pricing/rules', { ...add, oemCode: add.oemCode || null, amountRupees: Number(add.amountRupees) }), 'Price saved').then((r) => { if (r) { setAdd(null); qc.invalidateQueries({ queryKey: ['prices'] }); } })}>
            Save
          </Button>
        }
      >
        {add && (
          <div className="form">
            <Field label="Class"><Select value={add.vehicleClass} onChange={(e) => setAdd({ ...add, vehicleClass: e.target.value })} options={[...VEHICLE_CLASSES]} /></Field>
            <Field label="Order type"><Select value={add.orderType} onChange={(e) => setAdd({ ...add, orderType: e.target.value })} options={[...ORDER_TYPES]} /></Field>
            <Field label="Plates"><Select value={add.plateSet} onChange={(e) => setAdd({ ...add, plateSet: e.target.value })} options={[...PLATE_SETS]} /></Field>
            <Field label="OEM (blank = any)"><Input value={add.oemCode} onChange={(e) => setAdd({ ...add, oemCode: e.target.value.toUpperCase() })} /></Field>
            <Field label="Price (₹)"><Input type="number" value={add.amountRupees} onChange={(e) => setAdd({ ...add, amountRupees: e.target.value })} /></Field>
            <Field label="Effective from" hint="Blank = now"><Input type="datetime-local" onChange={(e) => setAdd({ ...add, effectiveFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
            <label className="check"><input type="checkbox" checked={add.published} onChange={(e) => setAdd({ ...add, published: e.target.checked })} /> Publish on the portal</label>
          </div>
        )}
      </Modal>
    </>
  );
}

export function Masters() {
  const [tab, setTab] = useState('dealers');
  return (
    <Page title="Masters & prices" subtitle="Reference data. Every change is audited with before and after values.">
      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[...Object.entries(RES).map(([k, v]) => ({ key: k, label: v.label })), { key: 'prices', label: 'Prices' }]} />
        {tab === 'prices' ? <Prices /> : <MasterTable key={tab} resource={tab} />}
      </Card>
    </Page>
  );
}
