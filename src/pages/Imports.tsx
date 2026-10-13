import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../api';
import { dt } from '../format';
import { Alert, Badge, Button, Card, Field, Input, Modal, Mono, Page, Pager, Select, StatusBadge, Table, useAction } from '../ui';

export function Imports() {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [profileCode, setProfileCode] = useState('OEM_KRANTI_CSV');
  const [file, setFile] = useState<File | null>(null);
  const [openJob, setOpenJob] = useState<string | null>(null);
  const profiles = useQuery({ queryKey: ['import-profiles'], queryFn: () => api.get('/imports/profiles') });
  const jobs = useQuery({ queryKey: ['import-jobs'], queryFn: () => api.get('/imports', { pageSize: 50 }), refetchInterval: 4000 });
  const job = useQuery({ queryKey: ['import-job', openJob], queryFn: () => api.get(`/imports/${openJob}`), enabled: Boolean(openJob), refetchInterval: 2000 });
  const profile = (profiles.data ?? []).find((p: any) => p.code === profileCode);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    fd.set('profileCode', profileCode);
    const r = await run('upload', () => api.post('/imports', undefined, { form: fd }), 'File received. Rows are being processed.');
    if (r) {
      setOpenJob(r.id);
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
    }
  }

  return (
    <Page title="OEM files & uploads" subtitle="Each source has a mapping profile: its own column names are mapped to our fields, every row is checked, and bad rows go to an error report.">
      <Card title="Upload a file">
        <form className="stack" onSubmit={upload}>
          <div className="form">
            <Field label="Profile">
              <Select value={profileCode} onChange={(e) => setProfileCode(e.target.value)} options={(profiles.data ?? []).map((p: any) => ({ value: p.code, label: `${p.name} (${p.sourceName})` }))} />
            </Field>
            <Field label="CSV file">
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            </Field>
          </div>
          {profile && (
            <Alert tone="info">
              Expected columns: {Object.values<any>(profile.mapping.columns).map((c) => `${c.from}${c.required ? '*' : ''}`).join(', ')}
            </Alert>
          )}
          <div className="row gap">
            <Button variant="primary" type="submit" busy={busy === 'upload'} disabled={!file}>
              Upload
            </Button>
            <span className="muted small">
              Need a sample? The <Link to="/admin/simulator">simulator</Link> generates a Kranti order file with good and bad rows.
            </span>
          </div>
        </form>
      </Card>
      <Card title="Recent files">
        <Table
          onRowClick={(r: any) => setOpenJob(r.id)}
          columns={[
            { key: 'createdAt', label: 'Uploaded', render: (r: any) => dt(r.createdAt) },
            { key: 'profileCode', label: 'Profile' },
            { key: 'filename', label: 'File' },
            { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status === 'DONE' ? 'DONE' : 'RUNNING'} /> },
            { key: 'totalRows', label: 'Rows', align: 'right' },
            { key: 'okRows', label: 'Imported', align: 'right' },
            { key: 'errorRows', label: 'Errors', align: 'right', render: (r: any) => (r.errorRows ? <Badge tone="bad">{r.errorRows}</Badge> : 0) },
          ]}
          rows={jobs.data?.items}
          empty="No files uploaded yet."
        />
      </Card>
      <BulkOemUpload onUploaded={(id) => { setOpenJob(id); qc.invalidateQueries({ queryKey: ['import-jobs'] }); }} />
      <OemVehicleData />
      {openJob && job.data && (
        <Modal
          wide
          open
          title={`${job.data.job.filename}`}
          onClose={() => setOpenJob(null)}
          footer={
            <Button disabled={!job.data.job.errorRows} onClick={() => openFile('GET', `/imports/${openJob}/error-report`, { download: `errors-${job.data.job.filename}` })}>
              Download error report
            </Button>
          }
        >
          <p className="muted">
            {job.data.job.totalRows} rows · {job.data.job.okRows} imported · {job.data.job.errorRows} with errors · {job.data.job.status === 'DONE' ? 'finished' : 'processing…'}
          </p>
          <Table
            columns={[
              { key: 'rowNo', label: 'Row' },
              { key: 'status', label: 'Result', render: (r: any) => <StatusBadge status={r.status === 'PENDING' ? 'PENDING' : r.status} /> },
              { key: 'summary', label: 'Data', render: (r: any) => <span className="small">{Object.values(r.mapped ?? {}).slice(0, 4).join(' · ')}</span> },
              { key: 'errors', label: 'Errors', render: (r: any) => (r.errors ?? []).join('; ') },
              {
                key: 'resultRef',
                label: 'Created',
                render: (r: any) =>
                  r.resultRef && job.data.job.targetType === 'hsrp.oem-order' ? <Link to={`/orders/${r.resultRef}`}>Open order</Link> : r.resultRef && job.data.job.targetType === 'hsrp.oem-vehicle' ? 'Vehicle on file' : '',
              },
            ]}
            rows={job.data.rows}
          />
        </Modal>
      )}
    </Page>
  );
}

/** Vehicles the OEMs reported in their vehicle data files; new-vehicle orders are checked against these (D42). */
function OemVehicleData() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['oem-vehicles', q, page], queryFn: () => api.get('/oem-vehicles', { q, page, pageSize: 10 }), refetchInterval: 5000 });
  return (
    <Card title="OEM vehicle data on file">
      <p className="muted small">
        Loaded from each OEM's vehicle data file. A new-vehicle order for that OEM must match a chassis here, with the same engine number and dealer
        (validation step "OEM vehicle data").
      </p>
      <div className="filters">
        <Field label="Chassis, engine or model">
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </Field>
      </div>
      <Table
        columns={[
          { key: 'updatedAt', label: 'Updated', render: (v: any) => dt(v.updatedAt) },
          { key: 'oemCode', label: 'OEM' },
          { key: 'chassisNo', label: 'Chassis', render: (v: any) => <Mono>{v.chassisNo}</Mono> },
          { key: 'engineNo', label: 'Engine', render: (v: any) => <Mono>{v.engineNo}</Mono> },
          { key: 'model', label: 'Model' },
          { key: 'vahanCategory', label: 'Category' },
          { key: 'dealerCode', label: 'Dealer', render: (v: any) => v.dealerCode ?? '–' },
          { key: 'invoice', label: 'Invoice', render: (v: any) => (v.invoiceNo ? `${v.invoiceNo} · ${v.invoiceDate ?? ''}` : '–') },
          { key: 'source', label: 'Source', render: (v: any) => <Badge tone={v.source === 'FILE' ? 'info' : 'muted'}>{v.source === 'FILE' ? 'file' : 'seed'}</Badge> },
        ]}
        rows={list.data?.items}
        empty="No OEM vehicle data yet."
      />
      {list.data && <Pager page={page} pageSize={10} total={list.data.total} onPage={setPage} />}
    </Card>
  );
}

const BULK_TYPES = [
  { value: 'OEM_VEHICLES_STANDARD', label: 'Vehicle data (vehicles built and supplied to dealers)' },
  { value: 'OEM_ORDERS_STANDARD', label: 'Orders (HSRP orders placed by the OEM)' },
];

/**
 * Bulk upload of OEM data from the admin portal (D47): one standard template per data type for every OEM, the OEM
 * chosen here. For OEMs without an integration, or to load data an integrated OEM did not send.
 */
function BulkOemUpload({ onUploaded }: { onUploaded: (jobId: string) => void }) {
  const { busy, run } = useAction();
  const oems = useQuery({ queryKey: ['masters', 'oems'], queryFn: () => api.get('/masters/oems') });
  const [oemCode, setOemCode] = useState('');
  const [profileCode, setProfileCode] = useState(BULK_TYPES[0].value);
  const [file, setFile] = useState<File | null>(null);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || !oemCode) return;
    const fd = new FormData();
    fd.set('file', file);
    fd.set('profileCode', profileCode);
    fd.set('context', JSON.stringify({ oemCode }));
    const r = await run('bulk', () => api.post('/imports', undefined, { form: fd }), 'File received. Rows are being loaded.');
    if (r) onUploaded(r.id);
  }

  return (
    <Card title="Bulk upload OEM data">
      <form className="stack" onSubmit={upload}>
        <p className="muted small">
          One standard template for every OEM. Choose the OEM and the kind of data, download the template, fill it in and upload it. Every row is checked; bad rows
          go to the error report.
        </p>
        <div className="form">
          <Field label="OEM">
            <Select required value={oemCode} onChange={(e) => setOemCode(e.target.value)} placeholder="Choose OEM" options={(oems.data ?? []).map((o: any) => ({ value: o.code, label: o.name }))} />
          </Field>
          <Field label="Data">
            <Select value={profileCode} onChange={(e) => setProfileCode(e.target.value)} options={BULK_TYPES} />
          </Field>
          <Field label="Filled template (CSV)">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </Field>
        </div>
        <div className="row gap">
          <Button variant="primary" type="submit" busy={busy === 'bulk'} disabled={!file || !oemCode}>
            Upload and load
          </Button>
          <Button type="button" variant="ghost" onClick={() => openFile('GET', `/imports/profiles/${profileCode}/template`, { download: `${profileCode.toLowerCase()}-template.csv` })}>
            Download template
          </Button>
        </div>
      </form>
    </Card>
  );
}
