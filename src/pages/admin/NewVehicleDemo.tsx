import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, openFile } from '../../api';
import { dt } from '../../format';
import { Alert, Badge, Button, Card, Mono, Table, useAction } from '../../ui';

const ROLE_TONE: Record<string, string> = { NOT_IN_OEM_DATA: 'bad', ENGINE_MISMATCH: 'bad', VALID: 'ok' };

/**
 * New-vehicle walkthrough (README "New-vehicle simulation"): fresh fictional vehicles in mock VAHAN, Kranti's
 * vehicle data file for them, and which vehicle plays which part.
 */
export function NewVehicleDemo() {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [job, setJob] = useState<any>(null);
  const sheet = useQuery({ queryKey: ['sim-new-vehicle-demo'], queryFn: () => api.get('/simulator/new-vehicle-demo') });
  const s = sheet.data;

  async function prepare() {
    const r = await run('prepare', () => api.post('/simulator/new-vehicle-demo', {}), 'New batch ready: 7 vehicles registered in mock VAHAN (the previous batch stays in VAHAN)');
    if (r) {
      setJob(null);
      qc.invalidateQueries({ queryKey: ['sim-new-vehicle-demo'] });
    }
  }

  return (
    <Card
      title="New-vehicle demo batch"
      actions={
        <div className="row gap">
          <Button variant={s ? 'secondary' : 'primary'} busy={busy === 'prepare'} onClick={prepare}>
            {s ? 'Prepare a new batch' : 'Prepare a batch'}
          </Button>
          <Button disabled={!s} onClick={() => openFile('GET', '/simulator/new-vehicle-demo/csv', { download: 'kranti-vehicle-data.csv' })}>
            Download Kranti vehicle file
          </Button>
          <Button variant="primary" disabled={!s} busy={busy === 'upload'} onClick={() => run('upload', () => api.post('/simulator/new-vehicle-demo/upload', {}), 'Kranti vehicle file sent to the import').then((r) => r && setJob(r))}>
            Send Kranti file to the import
          </Button>
        </div>
      }
    >
      <p className="muted small">
        Seven fictional new vehicles (Kranti Autos, dealer WB01, West Bengal) are registered in mock VAHAN. Kranti's vehicle data file lists all of them
        except vehicle 2, plus two rows the import refuses (no chassis; a dealer that does not sell Kranti). Place each order on{' '}
        <Link to="/orders/new">Place an order</Link> as dealer WB01 with OEM <b>Kranti Autos</b>, then follow the "What happens" column.
      </p>
      {job && (
        <Alert tone="ok">
          File {job.filename} is being processed. See <Link to="/imports">OEM files & uploads</Link> for the rows and the error report.
        </Alert>
      )}
      {s ? (
        <>
          <p className="muted small">Prepared {dt(s.createdAt)} · OEM {s.oemCode} · dealer {s.dealerCode}</p>
          <Table
            rowKey={(v: any) => v.regnNo}
            columns={[
              { key: 'no', label: '#' },
              { key: 'title', label: 'Part', render: (v: any) => <Badge tone={ROLE_TONE[v.role] ?? 'info'}>{v.title}</Badge> },
              { key: 'regnNo', label: 'Registration', render: (v: any) => <span className="plate">{v.regnNo}</span> },
              { key: 'chassisNo', label: 'Chassis', render: (v: any) => <Mono>{v.chassisNo}</Mono> },
              {
                key: 'orderEngineNo',
                label: 'Engine to type',
                render: (v: any) => (
                  <span>
                    <Mono>{v.orderEngineNo}</Mono>
                    {v.orderEngineNo !== v.engineNo && <div className="small muted">OEM file: {v.engineNo}</div>}
                  </span>
                ),
              },
              { key: 'model', label: 'Model', render: (v: any) => <span className="small">{v.model} · {v.vchCatg}</span> },
              { key: 'inOemFile', label: 'In Kranti file', render: (v: any) => (v.inOemFile ? 'yes' : <Badge tone="bad">no</Badge>) },
              { key: 'expected', label: 'What happens', render: (v: any) => <span className="small">{v.expected}</span> },
            ]}
            rows={s.vehicles}
          />
        </>
      ) : (
        <p className="muted">No batch yet. Prepare one to start the walkthrough.</p>
      )}
    </Card>
  );
}
