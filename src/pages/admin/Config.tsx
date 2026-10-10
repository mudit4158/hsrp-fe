import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { dt } from '../../format';
import { Alert, Button, Card, Field, Input, Json, Modal, Mono, Page, Select, Table, Tabs, Textarea, useAction } from '../../ui';

const HINTS: Record<string, string> = {
  'order.newVehicleCutoff': 'Manufactured / registered on or after this date counts as a new vehicle.',
  'order.validationSteps': 'Validation chain per OEM or state: oem-catalogue-check, vahan-check, state-eligibility-rules.',
  'state.rules': 'State rule pack (requireMobile, allowedVehicleClasses, rtoPrefixes, smsStatusUpdates, publishedPrices).',
  'fitment.photoRules': 'Which photos are mandatory at fitment.',
  'feature.mobileHoldBeforeFitment': 'Switch (off by default): hold fitment until the owner mobile is on the order.',
  'feature.homeFitment': 'Switch (off): home fitment is not built in the prototype.',
  'booking.horizonDays': 'How far ahead customers can book.',
};

export function Config() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { busy, run } = useAction();
  const [tab, setTab] = useState('settings');
  const [filter, setFilter] = useState('');
  const [history, setHistory] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const settings = useQuery({ queryKey: ['config', filter, history], queryFn: () => api.get('/config', { key: filter, history: String(history) }) });
  const templates = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/notifications/templates'), enabled: tab === 'templates' });
  const docs = useQuery({ queryKey: ['doc-templates'], queryFn: () => api.get('/documents/templates'), enabled: tab === 'documents' });
  const [jsonErr, setJsonErr] = useState('');

  const save = () => {
    let value: unknown;
    try {
      value = JSON.parse(edit.valueText);
    } catch {
      setJsonErr('Value must be valid JSON (strings in quotes).');
      return;
    }
    setJsonErr('');
    run('save', () => api.post('/config', { key: edit.key, scopeType: edit.scopeType, scopeId: edit.scopeId || '*', value, effectiveFrom: edit.effectiveFrom || undefined }), 'Setting saved; the previous value is kept in history').then((r) => {
      if (r) {
        setEdit(null);
        qc.invalidateQueries({ queryKey: ['config'] });
      }
    });
  };

  return (
    <Page title="Configuration" subtitle="Anything that varies by state, OEM or dealer is data: settings by scope with effective dates, feature switches, message templates and print layouts.">
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'settings', label: 'Settings & switches' }, { key: 'templates', label: 'SMS & e-mail templates' }, { key: 'documents', label: 'Print layouts' }]} />
      {tab === 'settings' && (
        <Card actions={can('config.manage') && <Button variant="primary" onClick={() => setEdit({ key: '', scopeType: 'global', scopeId: '*', valueText: '' })}>New setting</Button>}>
          <div className="filters">
            <Field label="Key contains"><Input value={filter} onChange={(e) => setFilter(e.target.value)} /></Field>
            <label className="check"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} /> Show history</label>
          </div>
          <Table
            onRowClick={can('config.manage') ? (s: any) => setEdit({ key: s.key, scopeType: s.scopeType, scopeId: s.scopeId, valueText: JSON.stringify(s.value, null, 2) }) : undefined}
            columns={[
              { key: 'key', label: 'Key', render: (s: any) => <div><Mono>{s.key}</Mono>{HINTS[s.key] && <div className="small muted">{HINTS[s.key]}</div>}</div> },
              { key: 'scope', label: 'Scope', render: (s: any) => (s.scopeType === 'global' ? 'global' : `${s.scopeType}: ${s.scopeId}`) },
              { key: 'value', label: 'Value', render: (s: any) => <span className="small">{JSON.stringify(s.value)}</span> },
              { key: 'effectiveFrom', label: 'From', render: (s: any) => dt(s.effectiveFrom) },
              { key: 'effectiveTo', label: 'Until', render: (s: any) => (s.effectiveTo ? dt(s.effectiveTo) : 'current') },
            ]}
            rows={settings.data}
          />
        </Card>
      )}
      {tab === 'templates' && (
        <Card>
          <Alert tone="info">Templates carry the sender ID and DLT template ID; callers pass variables only, so the wording stays fixed.</Alert>
          <Table
            columns={[
              { key: 'code', label: 'Template', render: (t: any) => <Mono>{t.code}</Mono> },
              { key: 'channel', label: 'Channel' },
              { key: 'senderId', label: 'Sender' },
              { key: 'dltTemplateId', label: 'DLT template' },
              { key: 'body', label: 'Wording', render: (t: any) => <span className="small">{t.subject ? <b>{t.subject} — </b> : null}{t.body}</span> },
            ]}
            rows={templates.data}
          />
        </Card>
      )}
      {tab === 'documents' && (
        <Card>
          <p className="muted small">Job card, challan, sticker and receipt are JSON layouts rendered to PDF; change them with PUT /api/v1/documents/templates/:code.</p>
          {(docs.data ?? []).map((d: any) => (
            <details key={d.code} style={{ marginBottom: 8 }}>
              <summary><b>{d.name}</b> <span className="muted small">({d.code}, version {d.version})</span></summary>
              <Json value={d.layout} />
            </details>
          ))}
        </Card>
      )}
      <Modal open={Boolean(edit)} title="Setting" onClose={() => setEdit(null)} footer={<Button variant="primary" busy={busy === 'save'} onClick={save}>Save</Button>}>
        {edit && (
          <div className="form">
            <Field label="Key" wide><Input value={edit.key} onChange={(e) => setEdit({ ...edit, key: e.target.value })} /></Field>
            <Field label="Scope"><Select value={edit.scopeType} onChange={(e) => setEdit({ ...edit, scopeType: e.target.value, scopeId: e.target.value === 'global' ? '*' : '' })} options={['global', 'state', 'oem', 'dealer']} /></Field>
            <Field label="Scope id" hint="State code, OEM code or dealer code"><Input value={edit.scopeId} disabled={edit.scopeType === 'global'} onChange={(e) => setEdit({ ...edit, scopeId: e.target.value.toUpperCase() })} /></Field>
            <Field label="Value (JSON)" wide error={jsonErr}><Textarea rows={6} value={edit.valueText} onChange={(e) => setEdit({ ...edit, valueText: e.target.value })} /></Field>
            <Field label="Effective from" hint="Blank = now"><Input type="datetime-local" onChange={(e) => setEdit({ ...edit, effectiveFrom: e.target.value ? new Date(e.target.value).toISOString() : '' })} /></Field>
          </div>
        )}
      </Modal>
    </Page>
  );
}
