import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Field, Select } from '../../ui';

/** Station users work in their own station; staff pick one. */
export function useStation() {
  const { me } = useAuth();
  const stations = useQuery({ queryKey: ['masters', 'stations'], queryFn: () => api.get('/masters/stations') });
  const own = (stations.data ?? []).find((s: any) => s.orgId && s.orgId === me?.orgId);
  const [picked, setPicked] = useState('');
  useEffect(() => {
    if (!picked && stations.data?.length) setPicked(own?.id ?? stations.data[0].id);
  }, [stations.data, own, picked]);
  const stationId = own?.id ?? picked;
  const picker = own ? null : (
    <Field label="Station">
      <Select value={stationId} onChange={(e) => setPicked(e.target.value)} options={(stations.data ?? []).map((s: any) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} />
    </Field>
  );
  return { stationId, station: (stations.data ?? []).find((s: any) => s.id === stationId), picker, fixed: Boolean(own) };
}

export function useStationDealers(stationId: string) {
  const dealers = useQuery({ queryKey: ['masters', 'dealers'], queryFn: () => api.get('/masters/dealers') });
  return (dealers.data ?? []).filter((d: any) => d.stationId === stationId);
}
