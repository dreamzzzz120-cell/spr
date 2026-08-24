/** SPR platform navigation: small by default, capability-driven, role-aware. */
import React, { useMemo, useState } from 'react';
import SPRLogo from './SPRLogo';
import { Activity, Bell, Boxes, Building2, ChevronDown, FileBarChart2, FileCheck, LayoutDashboard, Network, PackageOpen, Search, Settings, Shield, Sparkles, Workflow } from 'lucide-react';
import { Client } from '../types';
interface Props { clients: Client[]; selectedClientId: string; setSelectedClientId: (id: string) => void; activeTab: string; setActiveTab: (tab: string) => void; alertCount: number; installedExtensions: string[]; userRole: string; }
const capabilityMap: Record<string, { id: string; label: string; icon: any }[]> = {
  'sec-vuln': [{ id: 'security', label: 'Security', icon: Shield }, { id: 'alerts', label: 'Attention', icon: Bell }],
  'ai-brain': [{ id: 'trust-brain', label: 'AI Intelligence', icon: Sparkles }],
  'ai-swarm': [{ id: 'ai-swarm', label: 'AI Monitoring', icon: Activity }],
  'comp-soc2': [{ id: 'compliance', label: 'Compliance', icon: FileCheck }, { id: 'enterprise-audit', label: 'Audit', icon: FileBarChart2 }],
  'ops-cmdb': [{ id: 'clients', label: 'Client Operations', icon: Building2 }],
  'vendor-risk': [{ id: 'vendors', label: 'Vendor Assurance', icon: Network }],
  'disc-m365': [{ id: 'integrations', label: 'Integrations', icon: Workflow }],
  'disc-github': [{ id: 'integrations', label: 'Integrations', icon: Workflow }],
  'fin-license': [{ id: 'billing', label: 'Billing', icon: PackageOpen }],
  'exec-board': [{ id: 'reports', label: 'Reports', icon: FileBarChart2 }]
};
export default function Sidebar({ clients, selectedClientId, setSelectedClientId, activeTab, setActiveTab, alertCount, installedExtensions, userRole }: Props) {
  const [open, setOpen] = useState(false); const selected = clients.find(c => c.id === selectedClientId);
  const spaces = useMemo(() => { const seen = new Set<string>(); return installedExtensions.flatMap(id => capabilityMap[id] || []).filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }); }, [installedExtensions]);
  return <aside id="spr-platform-sidebar" className="w-[260px] bg-[#070a12] border-r border-slate-800/80 flex flex-col h-full text-slate-300 select-none z-40 shrink-0 font-sans">
    <div className="h-16 px-5 border-b border-slate-800/80 flex items-center shrink-0"><SPRLogo size="md" subtext="TRUST INFRASTRUCTURE" /></div>
    <div className="px-4 py-3 border-b border-slate-800/60 bg-[#0d1322]/50 relative"><span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1.5">SCOPE</span><button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#141c2e] hover:bg-[#1e293b] text-slate-100 border border-slate-700/60 text-left text-xs"><div className="flex items-center gap-2 min-w-0"><Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /><span className="font-semibold truncate">{selectedClientId === 'global' ? 'Organization' : selected?.name || 'Organization'}</span></div><ChevronDown className="w-3.5 h-3.5 text-slate-400" /></button>
      {open && <div className="absolute left-4 right-4 top-[66px] bg-[#0d1322] border border-slate-700 rounded-xl shadow-2xl z-50 py-1 max-h-64 overflow-y-auto"><button onClick={() => { setSelectedClientId('global'); setOpen(false); }} className="w-full px-3 py-2.5 text-xs text-left hover:bg-slate-800">Organization / all workloads</button>{clients.map(c => <button key={c.id} onClick={() => { setSelectedClientId(c.id); setOpen(false); }} className="w-full px-3 py-2.5 text-xs text-left hover:bg-slate-800 flex justify-between"><span>{c.name}</span>{c.criticalRisksCount > 0 && <span className="text-rose-400 font-mono">{c.criticalRisksCount}</span>}</button>)}</div>}
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 sidebar-scrollbar">
      <Section title="Command"><Item id="dashboard" label="Today" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={setActiveTab} /></Section>
      <Section title="My World"><Item id="clients" label="Workloads & Clients" icon={Building2} active={activeTab === 'clients'} onClick={setActiveTab} /><Item id="assets" label="Resources" icon={Boxes} active={activeTab === 'assets'} onClick={setActiveTab} /><Item id="passports" label="Evidence & Passports" icon={FileCheck} active={activeTab === 'passports'} onClick={setActiveTab} /><Item id="scans" label="Monitoring" icon={Activity} active={activeTab === 'scans'} onClick={setActiveTab} /></Section>
      {spaces.length > 0 && <Section title="My Spaces">{spaces.map(item => <Item key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeTab === item.id} onClick={setActiveTab} badge={item.id === 'alerts' && alertCount ? String(alertCount) : undefined} />)}</Section>}
      <Section title="Platform"><Item id="marketplace" label="Add Capability" icon={Sparkles} active={activeTab === 'marketplace'} onClick={setActiveTab} /><Item id="reports" label="Reports" icon={FileBarChart2} active={activeTab === 'reports'} onClick={setActiveTab} /><Item id="integrations" label="Connections" icon={Workflow} active={activeTab === 'integrations'} onClick={setActiveTab} /><Item id="settings" label="Administration" icon={Settings} active={activeTab === 'settings'} onClick={setActiveTab} /></Section>
    </div>
    <div className="p-3 border-t border-slate-800/80"><button onClick={() => setActiveTab('ai-agent-trust')} className="w-full flex items-center gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 px-3 py-2.5 text-left transition"><Search className="w-4 h-4 text-indigo-300" /><div><div className="text-[10px] font-bold text-white">Ask SPR</div><div className="text-[8px] text-indigo-300">Evidence-first intelligence</div></div></button><div className="mt-2 px-2 text-[8px] font-mono text-slate-600 uppercase tracking-widest">{userRole} · {installedExtensions.length} capabilities active</div></div>
  </aside>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <div className="space-y-1"><span className="px-3 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2">{title}</span>{children}</div>; }
function Item({ id, label, icon: Icon, active, onClick, badge }: { id: string; label: string; icon: any; active: boolean; onClick: (id: string) => void; badge?: string }) { return <button onClick={() => onClick(id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${active ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-100 hover:bg-[#141c2e]'}`}><span className="flex items-center gap-2.5 min-w-0"><Icon className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span></span>{badge && <span className="rounded-full bg-rose-600 text-white px-1.5 py-0.5 text-[8px] font-bold">{badge}</span>}</button>; }
