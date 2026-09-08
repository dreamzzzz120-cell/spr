import React, { useMemo, useState } from 'react';
import { Download, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Client } from '../types';
import { generateReportPDF, generatePassportEvidenceReport, generateCoBrandedTrustReport } from '../utils/pdfGenerator';
import { apiFetch } from '../utils/apiClient';

const REPORT_PRODUCTS = [
  { id: 'free-snapshot', name: 'Free Software Trust Snapshot', description: 'Evidence-first snapshot of the selected persisted software/client posture.', kind: 'pdf', template: 'rep-ceo' },
  { id: 'security-report', name: 'Software Trust & Security Report', description: 'Security posture, software inventory and risk indicators.', kind: 'pdf', template: 'rep-vuln' },
  { id: 'client-compliance', name: 'MSP Client Security & Compliance Report', description: 'Client posture and reported compliance framework evidence.', kind: 'pdf', template: 'dynamic-compliance' },
  { id: 'vendor-risk', name: 'Vendor Risk Portfolio', description: 'Registered software, risk indicators and evidence gaps.', kind: 'pdf', template: 'rep-investor' },
  { id: 'compliance-evidence', name: 'Compliance Evidence Report', description: 'Reported framework status mapped to available evidence.', kind: 'pdf', template: 'rep-auditor' },
  { id: 'vulnerability-findings', name: 'Vulnerability Findings Report', description: 'Observed vulnerability and remediation indicators.', kind: 'pdf', template: 'rep-vuln' },
  { id: 'audit-30', name: '30-Day Audit Evidence Export', description: 'Authoritative audit-chain evidence for the last 30 days.', kind: 'audit-csv' },
  { id: 'msp-executive', name: 'MSP Executive Portfolio Report', description: 'Executive view of all persisted client records in the current tenant.', kind: 'portfolio-csv' },
  { id: 'passport-evidence', name: 'Passport Evidence Report', description: 'Evidence-first report using the selected client passport inventory.', kind: 'pdf', template: 'rep-auditor' },
  { id: 'cobranded', name: 'MSP Co-Branded Trust Report', description: 'Operator-branded report without altering system-observed metrics.', kind: 'cobranded' },
  { id: 'executive-json', name: 'Executive JSON Export', description: 'Machine-readable posture, inventory, compliance and audit-chain export.', kind: 'json' },
  { id: 'multi-tenant-csv', name: 'Multi-Tenant Executive CSV', description: 'Tenant-scoped portfolio summary sourced from persisted client records.', kind: 'portfolio-csv' },
  { id: 'dynamic-pdf', name: 'Dynamic Compliance PDF', description: 'Dynamic client compliance PDF from persisted workspace evidence.', kind: 'pdf', template: 'dynamic-compliance' },
  { id: 'dynamic-csv', name: 'Dynamic Compliance CSV', description: 'Dynamic compliance framework export from persisted workspace evidence.', kind: 'compliance-csv' },
] as const;

type AuditRecord = { timestamp?: string; actionType?: string; userEmail?: string; ip?: string; outcome?: string; details?: string };
interface ReportsViewProps { clients?: Client[]; }
function downloadText(filename: string, content: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function csvCell(value: unknown) { return `"${String(value ?? 'Not available').replace(/"/g, '""')}"`; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client'; }

export default function ReportsView({ clients = [] }: ReportsViewProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const [mspName, setMspName] = useState(''); const [reportTitle, setReportTitle] = useState('Software Supply Chain Trust Report');
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const run = async (id: string, action: () => void | Promise<void>) => { setError(null); setBusy(id); try { await action(); } catch (e) { console.error(`[SPR report ${id}]`, e); setError(e instanceof Error ? e.message : 'Report generation failed. No artifact was created.'); } finally { setBusy(null); } };
  const authorizeProduct = async (productId: string, clientId?: string) => {
    if (productId === 'free-snapshot') return;
    const query = new URLSearchParams({ productId }); if (clientId) query.set('clientId', clientId);
    const res = await apiFetch(`/api/reports/authorize?${query.toString()}`);
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.message || `Report entitlement denied (${res.status}).`); }
  };
  const fetchAuditChain = async () => { const res = await apiFetch('/api/auth/audit-chain'); if (!res.ok) throw new Error(`Authoritative audit source unavailable (${res.status}).`); const chain = await res.json(); if (!Array.isArray(chain)) throw new Error('Authoritative audit source returned invalid data.'); return chain; };
  const generateAuditCsv = () => { if (!selectedClient) return setError('Select a client before generating the audit export.'); void run('audit-30', async () => { await authorizeProduct('audit-30', selectedClient.id); const chain = await fetchAuditChain(); const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; const records = chain.map((item: { block?: AuditRecord }) => item?.block || {}).filter((b: AuditRecord) => !b.timestamp || new Date(b.timestamp).getTime() >= cutoff); const rows = [['Timestamp (UTC)', 'Event Type', 'Operator', 'IP Address', 'Outcome', 'Audit Description'], ...records.map((b: AuditRecord) => [b.timestamp || 'Not available', b.actionType || 'Not available', b.userEmail || 'Not available', b.ip || 'Not recorded', b.outcome || 'Not available', b.details || 'Not available'])]; downloadText(`30-day-audit-evidence-${slug(selectedClient.name)}.csv`, rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8'); }); };
  const generateJson = () => { if (!selectedClient) return setError('Select a client before generating the JSON export.'); void run('executive-json', async () => { await authorizeProduct('executive-json', selectedClient.id); const chain = await fetchAuditChain(); const payload = { reportVersion: '1.0', generatedAt: new Date().toISOString(), provenance: 'SPR persisted workspace data and authoritative audit chain', limitations: 'SPR reports observed and reported evidence; it does not independently certify regulatory compliance.', tenant: { id: selectedClient.id, name: selectedClient.name, domain: selectedClient.domain }, posture: { trustScore: selectedClient.trustScore, riskLevel: selectedClient.riskLevel, complianceProgress: selectedClient.complianceProgress, criticalRisks: selectedClient.criticalRisksCount }, reportedComplianceFrameworks: selectedClient.complianceStatus || [], softwareInventory: selectedClient.softwareInventory || [], auditChain: chain }; downloadText(`executive-trust-export-${slug(selectedClient.name)}.json`, JSON.stringify(payload, null, 2), 'application/json'); }); };
  const generateMultiTenantCsv = (productId: string) => void run(productId, async () => { await authorizeProduct(productId); const rows = [['Client Name', 'Domain', 'Trust Score', 'Compliance Progress', 'Passports', 'Critical Risks', 'Risk Level'], ...clients.map(c => [c.name, c.domain, c.trustScore, c.complianceProgress, c.softwareInventory?.length || 0, c.criticalRisksCount, c.riskLevel])]; downloadText('msp-portfolio-executive-summary.csv', rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8'); });
  const generateComplianceCsv = () => { if (!selectedClient) return setError('Select a client before generating the compliance CSV.'); void run('dynamic-csv', async () => { await authorizeProduct('dynamic-csv', selectedClient.id); const frameworks = selectedClient.complianceStatus || []; const rows = [['Framework Code', 'Framework', 'Progress', 'Compliant Controls', 'Total Controls', 'Reported Status'], ...frameworks.map(f => [f.code, f.name, f.progress, f.compliantControls, f.totalControls, f.status])]; if (!frameworks.length) rows.push(['Not available', 'Not available', 'Not available', 'Not available', 'Not available', 'MISSING EVIDENCE']); downloadText(`dynamic-compliance-${slug(selectedClient.name)}.csv`, rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8'); }); };

  const generateProduct = (product: typeof REPORT_PRODUCTS[number]) => {
    if (product.kind === 'portfolio-csv') return generateMultiTenantCsv(product.id);
    if (product.kind === 'audit-csv') return generateAuditCsv();
    if (product.kind === 'json') return generateJson();
    if (product.kind === 'compliance-csv') return generateComplianceCsv();
    if (product.kind === 'cobranded') { if (!selectedClient) return setError('Select a client before generating the co-branded report.'); if (!mspName.trim()) return setError('Enter the MSP name that should appear as an operator-provided brand label.'); return void run(product.id, async () => { await authorizeProduct(product.id, selectedClient.id); generateCoBrandedTrustReport(selectedClient, mspName.trim(), '#0f172a', reportTitle.trim() || 'Software Supply Chain Trust Report', undefined, undefined, undefined, true, true, true, true, true, selectedClient.softwareInventory?.map(item => item.name) || []); }); }
    if (!selectedClient) return setError('Select a client with persisted workspace data before generating a report.');
    return void run(product.id, async () => { await authorizeProduct(product.id, selectedClient.id); generateReportPDF(selectedClient, product.template as 'rep-ceo' | 'rep-investor' | 'rep-auditor' | 'rep-vuln' | 'dynamic-compliance'); });
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">Reports</h1><p className="text-sm text-slate-500 mt-1">Evidence-first reports generated from persisted workspace data. Paid reports and exports require server-side entitlement authorization.</p></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="rounded-xl border bg-white p-4 space-y-3"><label className="text-sm font-medium">Client</label><select className="w-full rounded-lg border p-2" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}><option value="">Select a client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{selectedClient && <div className="text-xs text-slate-500 flex items-center gap-2"><ShieldCheck size={14}/> Data source: persisted client/workspace record</div>}</div>
    <div className="grid gap-4 md:grid-cols-2">{REPORT_PRODUCTS.map(product => <div key={product.id} className="rounded-xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{product.name}</h2><p className="text-sm text-slate-500 mt-1">{product.description}</p></div><FileText size={20}/></div><button disabled={!!busy} onClick={() => generateProduct(product)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"><Download size={16}/> {busy === product.id ? 'Generating…' : 'Generate / Export'}</button></div>)}</div>
    <div className="rounded-xl border bg-white p-5 space-y-3"><div><h2 className="font-semibold">MSP co-branded report settings</h2><p className="text-sm text-slate-500">Brand labels are operator-provided. Security metrics remain sourced from the selected client record.</p></div><input className="w-full rounded-lg border p-2" placeholder="MSP name" value={mspName} onChange={e => setMspName(e.target.value)}/><input className="w-full rounded-lg border p-2" placeholder="Report title" value={reportTitle} onChange={e => setReportTitle(e.target.value)}/></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2"><ShieldAlert size={18} className="shrink-0"/><span>SPR reports observed and reported evidence. A report is not a regulatory certification unless a separate authorized certification workflow exists.</span></div>
  </div>;
}
