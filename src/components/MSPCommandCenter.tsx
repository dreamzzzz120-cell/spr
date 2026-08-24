import React, { useEffect, useState } from 'react';
import { Alert, Client, Scan, SoftwarePassport, Vendor } from '../types';
import { apiFetch } from '../utils/apiClient';
import TodayCommandCenter from './TodayCommandCenter';

interface Props { clients: Client[]; alerts: Alert[]; onSelectClient: (id: string) => void; onNavigate: (tab: string) => void; }

/** Compatibility shell: the historical dashboard route is now SPR's daily operating surface. */
export default function MSPCommandCenter({ clients, alerts, onSelectClient, onNavigate }: Props) {
  const [passports, setPassports] = useState<SoftwarePassport[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch('/api/passports').then(r => r.ok ? r.json() : []),
      apiFetch('/api/vendors').then(r => r.ok ? r.json() : []),
      apiFetch('/api/scans').then(r => r.ok ? r.json() : [])
    ]).then(([p, v, s]) => { if (!alive) return; setPassports(Array.isArray(p) ? p : []); setVendors(Array.isArray(v) ? v : []); setScans(Array.isArray(s) ? s : []); }).catch(() => { if (alive) { setPassports([]); setVendors([]); setScans([]); } });
    return () => { alive = false; };
  }, []);
  return <TodayCommandCenter clients={clients} alerts={alerts} scans={scans} passports={passports} vendors={vendors} onNavigate={(tab) => { if (tab === 'clients') { const first = clients[0]; if (first) onSelectClient(first.id); } onNavigate(tab); }} onSearch={() => onNavigate('passports')} />;
}
