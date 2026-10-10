import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, openFile } from '../api';
import { Button, Card, ErrorBox, Field, Grid, Input, Page, Select, Table, useAction } from '../ui';

export function Reports() {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const reports = useQuery({ queryKey: ['reports'], queryFn: () => api.get('/reports') });
  const saved = useQuery({ queryKey: ['saved-reports'], queryFn: () => api.get('/reports/saved') });
  const [code, setCode] = useState('orders-register');
  const [params, setParams] = useState<Record<string, string>>({});
  const [ran, setRan] = useState<{ code: string; params: Record<string, string> } | null>(null);
  const [saveName, setSaveName] = useState('');
  const def = (reports.data ?? []).find((r: any) => r.code === code);
  const result = useQuery({ queryKey: ['report', ran], queryFn: () => api.get(`/reports/${ran!.code}`, ran!.params), enabled: Boolean(ran) });

  return (
    <Page title="Reports" subtitle="Read-only reports with CSV export. Save a parameter set to rerun it later.">
      <Grid cols={3}>
        <Card title="Reports">
          <Table
            rowKey={(r: any) => r.code}
            onRowClick={(r: any) => { setCode(r.code); setParams({}); setRan(null); }}
            columns={[{ key: 'name', label: 'Report', render: (r: any) => <div><b style={{ color: r.code === code ? 'var(--brand-2)' : undefined }}>{r.name}</b><div className="small muted">{r.description}</div></div> }]}
            rows={reports.data}
          />
          <h2 style={{ margin: '16px 0 8px' }}>Saved</h2>
          <Table
            onRowClick={(r: any) => { setCode(r.reportCode); setParams(r.params); setRan({ code: r.reportCode, params: r.params }); }}
            columns={[{ key: 'name', label: 'Saved report' }, { key: 'reportCode', label: 'Report' }]}
            rows={saved.data}
            empty="None saved yet."
          />
        </Card>
        {def && (
          <Card className="span-2" title={def.name}>
            <div className="filters">
              {def.params.map((p: any) => (
                <Field key={p.name} label={p.label}>
                  {p.type === 'select' ? (
                    <Select value={params[p.name] ?? ''} onChange={(e) => setParams({ ...params, [p.name]: e.target.value })} placeholder="All" options={p.options} />
                  ) : (
                    <Input type={p.type === 'date' ? 'date' : 'text'} value={params[p.name] ?? ''} onChange={(e) => setParams({ ...params, [p.name]: e.target.value })} />
                  )}
                </Field>
              ))}
              <Button variant="primary" onClick={() => setRan({ code, params: { ...params } })}>
                Run
              </Button>
              <Button onClick={() => openFile('GET', `/reports/${code}/csv`, { query: params, download: `${code}.csv` })}>Export CSV</Button>
            </div>
            <ErrorBox error={result.error} />
            {result.data && (
              <>
                <p className="muted small">{result.data.rows.length} rows</p>
                <Table rowKey={(_r, i) => String(i)} columns={result.data.columns.map((c: any) => ({ key: c.key, label: c.label }))} rows={result.data.rows.slice(0, 300)} />
                {result.data.rows.length > 300 && <p className="muted small">Showing the first 300 rows. Export CSV for all.</p>}
                <div className="filters" style={{ marginTop: 12 }}>
                  <Field label="Save these parameters as">
                    <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} />
                  </Field>
                  <Button disabled={saveName.trim().length < 2} busy={busy === 'save'} onClick={() => run('save', () => api.post('/reports/saved', { reportCode: code, name: saveName, params }), 'Saved').then(() => qc.invalidateQueries({ queryKey: ['saved-reports'] }))}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </Grid>
    </Page>
  );
}
