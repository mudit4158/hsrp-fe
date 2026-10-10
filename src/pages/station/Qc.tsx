import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Badge, Button, Card, Field, Input, Modal, Mono, Page, Select, Table, Textarea, useAction } from '../../ui';
import { useStation } from './useStation';

export function Qc() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { stationId, picker } = useStation();
  const { busy, run } = useAction();
  const [reject, setReject] = useState<any>(null);
  const [positions, setPositions] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [sw, setSw] = useState<any>(null);
  const [swForm, setSwForm] = useState({ position: 'FRONT', newLaserCode: '', reason: '' });
  const queue = useQuery({ queryKey: ['qc', stationId], queryFn: () => api.get('/station/qc', { stationId }), enabled: Boolean(stationId), refetchInterval: 8000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['qc'] });

  return (
    <Page title="Quality check" subtitle="Pass embossed plates, reject a front or rear plate with a reason (it goes to rejection approval), or switch a wrongly picked laser code.">
      <Card>
        <div className="filters">{picker}</div>
        <Table
          columns={[
            { key: 'orderNo', label: 'Order', render: (o: any) => <Link to={`/orders/${o.id}`}><Mono>{o.orderNo}</Mono></Link> },
            { key: 'regnNo', label: 'Registration', render: (o: any) => <span className="plate">{o.regnNo}</span> },
            { key: 'vehicleClass', label: 'Class' },
            { key: 'codes', label: 'Laser codes', render: (o: any) => o.allocations.map((a: any) => <div key={a.id} className="small">{a.position}: <Mono>{a.laserCode}</Mono></div>) },
            { key: 'sticker', label: 'Sticker', render: (o: any) => (o.stickerRequired ? <Badge tone="info">{o.greenStrip ? 'green strip' : 'required'}</Badge> : <span className="muted small">not needed</span>) },
            {
              key: 'act',
              label: '',
              render: (o: any) =>
                can('station.operate') && (
                  <div className="row gap">
                    <Button small variant="primary" busy={busy === `pass-${o.id}`} onClick={() => run(`pass-${o.id}`, () => api.post(`/station/qc/${o.id}`, { result: 'PASS' }), `${o.orderNo} passed`).then(refresh)}>
                      Pass
                    </Button>
                    <Button small variant="danger" onClick={() => { setReject(o); setPositions([]); setReason(''); }}>
                      Reject
                    </Button>
                    <Button small onClick={() => { setSw(o); setSwForm({ position: o.allocations[0]?.position ?? 'FRONT', newLaserCode: '', reason: '' }); }}>
                      Switch code
                    </Button>
                  </div>
                ),
            },
          ]}
          rows={queue.data}
          empty="Nothing waiting for QC."
        />
      </Card>
      <Modal
        open={Boolean(reject)}
        title={`Reject plate(s) of ${reject?.orderNo}`}
        onClose={() => setReject(null)}
        footer={
          <Button
            variant="danger"
            disabled={!positions.length || reason.trim().length < 3}
            busy={busy === 'reject'}
            onClick={() =>
              run('reject', () => api.post(`/station/qc/${reject.id}`, { result: 'REJECT', rejectPositions: positions, reason }), 'Sent to rejection approval').then((r) => {
                if (r) {
                  setReject(null);
                  refresh();
                }
              })
            }
          >
            Reject
          </Button>
        }
      >
        <div className="stack">
          <div className="row gap-lg">
            {(reject?.allocations ?? []).map((a: any) => (
              <label key={a.position} className="check">
                <input type="checkbox" checked={positions.includes(a.position)} onChange={(e) => setPositions((p) => (e.target.checked ? [...p, a.position] : p.filter((x) => x !== a.position)))} />
                {a.position} <Mono>{a.laserCode}</Mono>
              </label>
            ))}
          </div>
          <Field label="Reason (mandatory)">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. embossing uneven, hologram misaligned" />
          </Field>
        </div>
      </Modal>
      <Modal
        open={Boolean(sw)}
        title={`Switch laser code on ${sw?.orderNo}`}
        onClose={() => setSw(null)}
        footer={
          <Button
            variant="primary"
            disabled={!/^[A-Z]{2}\d{10}$/.test(swForm.newLaserCode) || swForm.reason.trim().length < 3}
            busy={busy === 'switch'}
            onClick={() =>
              run('switch', () => api.post(`/station/qc/${sw.id}/switch-laser`, swForm), 'Laser code switched; the old allocation is kept in history').then((r) => {
                if (r) {
                  setSw(null);
                  refresh();
                }
              })
            }
          >
            Switch
          </Button>
        }
      >
        <div className="form">
          <Field label="Position">
            <Select value={swForm.position} onChange={(e) => setSwForm({ ...swForm, position: e.target.value })} options={(sw?.allocations ?? []).map((a: any) => ({ value: a.position, label: `${a.position} (now ${a.laserCode})` }))} />
          </Field>
          <Field label="New laser code" hint="Two letters + ten digits, available at this station">
            <Input value={swForm.newLaserCode} onChange={(e) => setSwForm({ ...swForm, newLaserCode: e.target.value.toUpperCase().trim() })} />
          </Field>
          <Field label="Reason" wide>
            <Input value={swForm.reason} onChange={(e) => setSwForm({ ...swForm, reason: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </Page>
  );
}
