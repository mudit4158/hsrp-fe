import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../api';
import { dt } from '../format';
import { Alert, Badge, Button, Card, Field, Input, Modal, Page, Select, StatusBadge, Table, useAction } from '../ui';

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
              { key: 'resultRef', label: 'Created', render: (r: any) => (r.resultRef && job.data.job.targetType === 'hsrp.oem-order' ? <Link to={`/orders/${r.resultRef}`}>Open order</Link> : '') },
            ]}
            rows={job.data.rows}
          />
        </Modal>
      )}
    </Page>
  );
}
