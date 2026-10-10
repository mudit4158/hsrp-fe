import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api';
import { dt } from '../../format';
import { Alert, Badge, Button, Card, Field, Input, Modal, Mono, Page, Select, Table, Tabs, Textarea, useAction } from '../../ui';

export function Users() {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [tab, setTab] = useState('users');
  const [edit, setEdit] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [issued, setIssued] = useState<any>(null);
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get('/iam/users') });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/iam/roles') });
  const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => api.get('/iam/orgs') });
  const devices = useQuery({ queryKey: ['devices'], queryFn: () => api.get('/iam/devices'), enabled: tab === 'devices' });
  const clients = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/iam/api-clients'), enabled: tab === 'clients' });
  const orgName = (id?: string) => (orgs.data ?? []).find((o: any) => o.id === id)?.name ?? '–';
  const userName = (id: string) => (users.data ?? []).find((u: any) => u.id === id)?.username ?? id;

  const saveUser = () => {
    const body: any = { displayName: edit.displayName, roles: [edit.role], orgId: edit.orgId || null, active: edit.active };
    if (edit.password) body.password = edit.password;
    return run('user', () => (edit.id ? api.patch(`/iam/users/${edit.id}`, body) : api.post('/iam/users', { ...body, username: edit.username, password: edit.password })), 'User saved').then((r) => {
      if (r) {
        setEdit(null);
        qc.invalidateQueries({ queryKey: ['users'] });
      }
    });
  };

  return (
    <Page title="Users & roles" subtitle="Organisations in a hierarchy, users with roles, permission strings, registered devices and API clients.">
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'users', label: 'Users' }, { key: 'roles', label: 'Roles & permissions' }, { key: 'devices', label: 'Devices' }, { key: 'clients', label: 'API clients' }, { key: 'orgs', label: 'Organisations' }]} />
      {tab === 'users' && (
        <Card actions={<Button variant="primary" onClick={() => setEdit({ role: 'DEALER', active: true })}>Add user</Button>}>
          <Table
            onRowClick={(u: any) => setEdit({ ...u, role: u.roles[0], password: '' })}
            columns={[
              { key: 'username', label: 'Username', render: (u: any) => <Mono>{u.username}</Mono> },
              { key: 'displayName', label: 'Name' },
              { key: 'roles', label: 'Role', render: (u: any) => u.roles.join(', ') },
              { key: 'org', label: 'Organisation', render: (u: any) => orgName(u.orgId) },
              { key: 'active', label: 'Active', render: (u: any) => (u.active ? <Badge tone="ok">active</Badge> : <Badge tone="muted">disabled</Badge>) },
              { key: 'lastLoginAt', label: 'Last sign-in', render: (u: any) => dt(u.lastLoginAt) },
            ]}
            rows={users.data}
          />
        </Card>
      )}
      {tab === 'roles' && (
        <Card>
          <Table
            rowKey={(r: any) => r.code}
            onRowClick={(r: any) => setRole({ ...r, text: r.permissions.join('\n') })}
            columns={[
              { key: 'code', label: 'Role', render: (r: any) => <Mono>{r.code}</Mono> },
              { key: 'name', label: 'Name' },
              { key: 'permissions', label: 'Permissions', render: (r: any) => <span className="small">{r.permissions.join(', ')}</span> },
            ]}
            rows={roles.data}
          />
        </Card>
      )}
      {tab === 'devices' && (
        <Card>
          <p className="muted small">Android devices register at sign-in. A session bound to a device stops working when the device is deactivated.</p>
          <Table
            columns={[
              { key: 'user', label: 'User', render: (d: any) => userName(d.userId) },
              { key: 'deviceId', label: 'Device', render: (d: any) => <Mono>{d.deviceId}</Mono> },
              { key: 'name', label: 'Name' },
              { key: 'lastSeenAt', label: 'Last seen', render: (d: any) => dt(d.lastSeenAt) },
              { key: 'active', label: '', render: (d: any) => <Button small variant={d.active ? 'danger' : 'secondary'} onClick={() => run('dev', () => api.patch(`/iam/devices/${d.id}`, { active: !d.active }), d.active ? 'Device deactivated' : 'Device activated').then(() => qc.invalidateQueries({ queryKey: ['devices'] }))}>{d.active ? 'Deactivate' : 'Activate'}</Button> },
            ]}
            rows={devices.data}
            empty="No devices registered yet."
          />
        </Card>
      )}
      {tab === 'clients' && (
        <Card actions={<Button variant="primary" onClick={() => setClient({ name: '', orgId: '' })}>New API client</Button>}>
          <p className="muted small">OEM systems call the order API with an API key, an HMAC-SHA256 signature of the body (X-Signature) and an Idempotency-Key. Only a hash of the key is stored.</p>
          <Table columns={[{ key: 'name', label: 'Client' }, { key: 'org', label: 'Organisation', render: (c: any) => orgName(c.orgId) }, { key: 'roles', label: 'Roles', render: (c: any) => c.roles.join(', ') }, { key: 'createdAt', label: 'Created', render: (c: any) => dt(c.createdAt) }]} rows={clients.data} />
        </Card>
      )}
      {tab === 'orgs' && (
        <Card>
          <Table
            columns={[
              { key: 'code', label: 'Code', render: (o: any) => <Mono>{o.code}</Mono> },
              { key: 'name', label: 'Name' },
              { key: 'orgType', label: 'Type' },
              { key: 'parent', label: 'Parent', render: (o: any) => orgName(o.parentId) },
            ]}
            rows={orgs.data}
          />
        </Card>
      )}

      <Modal open={Boolean(edit)} title={edit?.id ? `Edit ${edit.username}` : 'Add user'} onClose={() => setEdit(null)} footer={<Button variant="primary" busy={busy === 'user'} onClick={saveUser}>Save</Button>}>
        {edit && (
          <div className="form">
            {!edit.id && <Field label="Username"><Input value={edit.username ?? ''} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></Field>}
            <Field label="Display name"><Input value={edit.displayName ?? ''} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} /></Field>
            <Field label="Role"><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} options={(roles.data ?? []).filter((r: any) => !['CUSTOMER', 'OEM_CLIENT'].includes(r.code)).map((r: any) => r.code)} /></Field>
            <Field label="Organisation" hint="Dealers and station users must belong to their dealer or station."><Select value={edit.orgId ?? ''} onChange={(e) => setEdit({ ...edit, orgId: e.target.value })} placeholder="None" options={(orgs.data ?? []).map((o: any) => ({ value: o.id, label: `${o.orgType} · ${o.name}` }))} /></Field>
            <Field label={edit.id ? 'New password (optional)' : 'Password'} hint="At least 8 characters"><Input type="password" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label>
          </div>
        )}
      </Modal>
      <Modal open={Boolean(role)} title={`Permissions of ${role?.code}`} onClose={() => setRole(null)} footer={<Button variant="primary" busy={busy === 'role'} onClick={() => run('role', () => api.patch(`/iam/roles/${role.code}`, { permissions: role.text.split(/\s+/).filter(Boolean) }), 'Permissions saved; users get them at their next sign-in').then((r) => { if (r) { setRole(null); qc.invalidateQueries({ queryKey: ['roles'] }); } })}>Save</Button>}>
        <Field label="One permission per line ( * = everything )"><Textarea rows={12} value={role?.text ?? ''} onChange={(e) => setRole({ ...role, text: e.target.value })} /></Field>
      </Modal>
      <Modal open={Boolean(client)} title="New API client" onClose={() => setClient(null)} footer={<Button variant="primary" busy={busy === 'client'} onClick={() => run('client', () => api.post('/iam/api-clients', { ...client, roles: ['OEM_CLIENT'] }), 'Client created').then((r) => { if (r) { setIssued(r); setClient(null); qc.invalidateQueries({ queryKey: ['clients'] }); } })}>Create</Button>}>
        {client && (
          <div className="form">
            <Field label="Name"><Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} /></Field>
            <Field label="OEM organisation"><Select value={client.orgId} onChange={(e) => setClient({ ...client, orgId: e.target.value })} placeholder="Choose" options={(orgs.data ?? []).filter((o: any) => o.orgType === 'OEM').map((o: any) => ({ value: o.id, label: o.name }))} /></Field>
          </div>
        )}
      </Modal>
      <Modal open={Boolean(issued)} title="Copy these now" onClose={() => setIssued(null)}>
        <Alert tone="warn">The API key and secret are shown once. Give them to the OEM over a safe channel.</Alert>
        <p>API key: <Mono>{issued?.apiKey}</Mono></p>
        <p>Signing secret: <Mono>{issued?.secret}</Mono></p>
      </Modal>
    </Page>
  );
}
