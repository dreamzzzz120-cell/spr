import React, { useMemo, useState } from 'react';
import { Download, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Client } from '../types';
import { generateClientCompliancePDF, generateReportPDF, generateCoBrandedTrustReport } from '../utils/pdfGenerator';
import { apiFetch } from '../utils/apiClient';

const REPORT_TEMPLATES = [
  { id: 'rep-ceo', name: 'Executive Trust Summary', description: 'Evidence-backed trust posture for leadership review.' },
  { id: 'rep-investor', name: 'Vendor Risk Portfolio', description: 'Registered software, risk indicators, dependencies and evidence gaps.' },
  { id: 'rep-auditor', name: 'Compliance Evidence Report', description: 'Reported framework status mapped to available evidence.' },
  { id: 'rep-vuln', name: 'Vulnerability Findings Summary', description: 'Observed vulnerability findings and remediation state.' },
] as const;

interface ReportsViewProps { clients?: Client[]; }
type AuditRecord = { timestamp?: string; actionType?: string; userEmail?: string; ip?: string; outcome?: string; details?: string };

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function csvCell(value: unknown) { return `"${String(value ?? 'Not available').replace(/"/g, '""')}"`; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client'; }

export default function ReportsView({ clients = [] }: ReportsViewProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mspName, setMspName] = useState('');
  const [reportTitle, setReportTitle] = useState('Software Supply Chain Trust Report');
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const run = async (id: string, action: () => void | Promise<void>) => {
    setError(null); setBusy(id);
    try { await action(); } catch (e) { console.error(`[SPR report ${id}]`, e); setError(e instanceof Error ? e.message : 'Report generation failed. No artifact was created.'); }
    finally { setBusy(null); }
  };
  const generateTemplate = (id: typeof REPORT_TEMPLATES[number]['id']) => {
    if (!selectedClient) return setError('Select a client with persisted workspace data before generating a report.');
    void run(id, () => generateReportPDF(selectedClient, id));
  };
  const generateDynamicPdf = () => {
    if (!selectedClient) return setError('Select a client before generating the compliance PDF.');
    void run('dynamic-pdf', () => generateClientCompliancePDF(selectedClient));
  };
  const generateAuditCsv = () => {
    if (!selectedClient) return setError('Select a client before generating the audit export.');
    void run('audit-csv', async () => {
      const res = await apiFetch('/api/auth/audit-chain');
      if (!res.ok) throw new Error(`Authoritative audit source unavailable (${res.status}).`);
      const chain = await res.json();
      if (!Array.isArray(chain)) throw new Error('Authoritative audit source returned invalid data.');
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const records = chain.map((item: { block?: AuditRecord }) => item?.block || {}).filter((b: AuditRecord) => !b.timestamp || new Date(b.timestamp).getTime() >= cutoff);
      const rows = [['Timestamp (UTC)', 'Event Type', 'Operator', 'IP Address', 'Outcome', 'Audit Description'], ...records.map((b: AuditRecord) => [b.timestamp || 'Not available', b.actionType || 'Not available', b.userEmail || 'Not available', b.ip || 'Not recorded', b.outcome || 'Not available', b.details || 'Not available'])];
      downloadText(`30-day-audit-evidence-${slug(selectedClient.name)}.csv`, rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
    });
  };
  const generateJson = () => {
    if (!selectedClient) return setError('Select a client before generating the JSON export.');
    void run('json', async () => {
      const res = await apiFetch('/api/auth/audit-chain');
      if (!res.ok) throw new Error(`Authoritative audit source unavailable (${res.status}).`);
      const chain = await res.json();
      if (!Array.isArray(chain)) throw new Error('Authoritative audit source returned invalid data.');
      const payload = { reportVersion: '1.0', generatedAt: new Date().toISOString(), provenance: 'SPR persisted workspace data and authoritative audit chain', limitations: 'SPR reports observed and reported evidence; it does not independently certify regulatory compliance.', tenant: { id: selectedClient.id, name: selectedClient.name, domain: selectedClient.domain }, posture: { trustScore: selectedClient.trustScore, riskLevel: selectedClient.riskLevel, complianceProgress: selectedClient.complianceProgress, criticalRisks: selectedClient.criticalRisksCount }, reportedComplianceFrameworks: selectedClient.complianceStatus || [], softwareInventory: selectedClient.softwareInventory || [], auditChain: chain };
      downloadText(`executive-trust-export-${slug(selectedClient.name)}.json`, JSON.stringify(payload, null, 2), 'application/json');
    });
  };
  const generateMultiTenantCsv = () => void run('multi-csv', () => {
    const rows = [['Client Name', 'Domain', 'Trust Score', 'Compliance Progress', 'Passports', 'Critical Risks', 'Risk Level'], ...clients.map(c => [c.name, c.domain, c.trustScore, c.complianceProgress, c.softwareInventory?.length || 0, c.criticalRisksCount, c.riskLevel])];
    downloadText('msp-portfolio-executive-summary.csv', rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  });
  const generateCobrand = () => {
    if (!selectedClient) return setError('Select a client before generating the co-branded report.');
    if (!mspName.trim()) return setError('Enter the MSP name that should appear as an operator-provided brand label.');
    void run('cobrand', () => generateCoBrandedTrustReport(selectedClient, mspName.trim(), '#0f172a', reportTitle.trim() || 'Software Supply Chain Trust Report', undefined, undefined, undefined, true, true, true, true, true, selectedClient.softwareInventory?.map(item => item.name) || []));
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">Reports</h1><p className="text-sm text-slate-500 mt-1">Evidence-first reports generated from persisted workspace data. Missing evidence is never replaced with synthetic values.</p></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="rounded-xl border bg-white p-4 space-y-3"><label className="text-sm font-medium">Client</label><select className="w-full rounded-lg border p-2" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}><option value="">Select a client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{selectedClient && <div className="text-xs text-slate-500 flex items-center gap-2"><ShieldCheck size={14}/> Data source: persisted client/workspace record</div>}</div>
    <div className="grid gap-4 md:grid-cols-2">{REPORT_TEMPLATES.map(report => <div key={report.id} className="rounded-xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{report.name}</h2><p className="text-sm text-slate-500 mt-1">{report.description}</p></div><FileText size={20}/></div><button disabled={!!busy} onClick={() => generateTemplate(report.id)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"><Download size={16}/> {busy === report.id ? 'Generating…' : 'Generate PDF'}</button></div>)}</div>
    <div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Evidence exports</h2><p className="text-sm text-slate-500 mt-1">Exports fail closed when the authoritative audit source cannot be read.</p><div className="flex flex-wrap gap-2 mt-4"><button disabled={!!busy} onClick={generateDynamicPdf} className="rounded-lg border px-4 py-2 text-sm">Compliance PDF</button><button disabled={!!busy} onClick={generateAuditCsv} className="rounded-lg border px-4 py-2 text-sm">30-Day Audit CSV</button><button disabled={!!busy} onClick={generateJson} className="rounded-lg border px-4 py-2 text-sm">Executive JSON</button><button disabled={!!busy} onClick={generateMultiTenantCsv} className="rounded-lg border px-4 py-2 text-sm">Portfolio CSV</button></div></div>
    <div className="rounded-xl border bg-white p-5 space-y-3"><div><h2 className="font-semibold">MSP co-branded report</h2><p className="text-sm text-slate-500">Brand labels are operator-provided. Security metrics remain sourced from the selected client record.</p></div><input className="w-full rounded-lg border p-2" placeholder="MSP name" value={mspName} onChange={e => setMspName(e.target.value)}/><input className="w-full rounded-lg border p-2" placeholder="Report title" value={reportTitle} onChange={e => setReportTitle(e.target.value)}/><button disabled={!!busy} onClick={generateCobrand} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">Generate co-branded PDF</button></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2"><ShieldAlert size={18} className="shrink-0"/><span>SPR reports observed and reported evidence. A report is not a regulatory certification unless a separate authorized certification workflow exists.</span></div>
  </div>;
}
