/** SPR navigation: organize the product around four jobs — Know, Prove, Watch, Use. */
import React, { useMemo, useState } from 'react';
import SPRLogo from './SPRLogo';
import { Activity, Bell, Boxes, Building2, ChevronDown, FileBarChart2, FileCheck, Globe2, LayoutDashboard, Network, PlugZap, Search, Settings, Shield, Sparkles, Workflow, Radar } from 'lucide-react';
import { Client } from '../types';
interface Props { clients: Client[]; selectedClientId: string; setSelectedClientId: (id: string) => void; activeTab: string; setActiveTab: (tab: string) => void; alertCount: number; installedExtensions: string[]; userRole: string; }
type NavItem = { id: string; label: string; icon: any; badge?: string };
const capabilityMap: Record<string, NavItem[]> = {
  'sec-vuln': [{ id: 'security', label: 'Security Evidence', icon: Shield }, { id: 'alerts', label: 'Attention', icon: Bell }],
  'ai-brain': [{ id: 'trust-brain', label: 'AI Intelligence', icon: Sparkles }],
  'ai-swarm': [{ id: 'ai-swarm', label: 'Continuous Verification', icon: Activity }],
  'comp-soc2': [{ id: 'compliance', label: 'Compliance Evidence', icon: FileCheck }, { id: 'enterprise-audit', label: 'Audit Evidence', icon: FileBarChart2 }],
  'ops-cmdb': [{ id: 'clients', label: 'Organizations', icon: Building2 }],
  'vendor-risk': [{ id: 'vendors', label: 'Vendors', icon: Network }],
  'disc-m365': [{ id: 'integrations', label: 'Connections', icon: Workflow }],
  'disc-github': [{ id: 'integrations', label: 'Connections', icon: Workflow }],
  'fin-license': [{ id: 'billing', label: 'Billing', icon: Boxes }],
  'exec-board': [{ id: 'reports', label: 'Reports', icon: FileBarChart2 }]
};
export default function Sidebar({ clients, selectedClientId, setSelectedClientId, activeTab, setActiveTab, alertCount, installedExtensions, userRole }: Props) {
  const [open, setOpen] = useState(false); const selected = clients.find(c => c.id === selectedClientId);
  const spaces = useMemo(() => { const seen = new Set<string>(); return installedExtensions.flatMap(id => capabilityMap[id] || []).filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }); }, [installedExtensions]);
  const go = (id: string) => setActiveTab(id);
  const isAny = (ids: string[]) => ids.includes(activeTab);
  return <aside id="spr-platform-sidebar" className="w-[272px] bg-[#070a12] border-r border-slate-800/80 flex flex-col h-full text-slate-300 select-none z-40 shrink-0 font-sans">
    <div className="h-16 px-5 border-b border-slate-800/80 flex items-center shrink-0"><SPRLogo size="md" subtext="EVIDENCE INFRASTRUCTURE" /></div>
    <div className="px-4 py-3 border-b border-slate-800/60 bg-[#0d1322]/50 relative"><span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1.5">WORKSPACE</span><button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#141c2e] hover:bg-[#1e293b] text-slate-100 border border-slate-700/60 text-left text-xs"><div className="flex items-center gap-2 min-w-0"><Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /><span className="font-semibold truncate">{selectedClientId === 'global' ? 'Organization' : selected?.name || 'Organization'}</span></div><ChevronDown className="w-3.5 h-3.5 text-slate-400" /></button>{open && <div className="absolute left-4 right-4 top-[66px] bg-[#0d1322] border border-slate-700 rounded-xl shadow-2xl z-50 py-1 max-h-64 overflow-y-auto"><button onClick={() => { setSelectedClientId('global'); setOpen(false); }} className="w-full px-3 py-2.5 text-xs text-left hover:bg-slate-800">Organization / all software</button>{clients.map(c => <button key={c.id} onClick={() => { setSelectedClientId(c.id); setOpen(false); }} className="w-full px-3 py-2.5 text-xs text-left hover:bg-slate-800 flex justify-between"><span>{c.name}</span>{c.criticalRisksCount > 0 && <span className="text-rose-400 font-mono">{c.criticalRisksCount}</span>}</button>)}</div>}</div>
    <div className="px-4 pt-4 pb-2"><button onClick={() => go('dashboard')} className={`w-full rounded-2xl border px-3 py-3 text-left transition ${activeTab === 'dashboard' ? 'border-indigo-400/40 bg-indigo-500/15' : 'border-slate-800 bg-[#0d1322] hover:bg-[#141c2e]'}`}><div className="flex items-center gap-2.5"><LayoutDashboard className="w-4 h-4 text-indigo-300" /><div><div className="text-xs font-bold text-white">Home</div><div className="text-[9px] text-slate-500">Your software trust command center</div></div></div></button></div>
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 sidebar-scrollbar">
      <NavSection title="01 · KNOW" subtitle="Discover & investigate" active={isAny(['passports','vendors','security','assets'])}>
        <NavItemButton item={{ id: 'passports', label: 'Investigate Software', icon: Search }} active={activeTab === 'passports'} onClick={go} />
        <NavItemButton item={{ id: 'vendors', label: 'Vendors & Products', icon: Globe2 }} active={activeTab === 'vendors'} onClick={go} />
        <NavItemButton item={{ id: 'security', label: 'Security Evidence', icon: Shield }} active={activeTab === 'security'} onClick={go} />
        <NavItemButton item={{ id: 'assets', label: 'Software Inventory', icon: Boxes }} active={activeTab === 'assets'} onClick={go} />
      </NavSection>
      <NavSection title="02 · PROVE" subtitle="Create & verify" active={isAny(['passports','integrations','reports','marketplace'])}>
        <NavItemButton item={{ id: 'passports', label: 'Software Passports', icon: FileCheck }} active={activeTab === 'passports'} onClick={go} />
        <NavItemButton item={{ id: 'integrations', label: 'Connect Evidence', icon: PlugZap }} active={activeTab === 'integrations'} onClick={go} />
        <NavItemButton item={{ id: 'reports', label: 'Verification Reports', icon: FileBarChart2 }} active={activeTab === 'reports'} onClick={go} />
        <NavItemButton item={{ id: 'marketplace', label: 'Add Sources', icon: Sparkles }} active={activeTab === 'marketplace'} onClick={go} />
      </NavSection>
      <NavSection title="03 · WATCH" subtitle="Continuous trust" active={isAny(['scans','alerts','compliance','ai-swarm'])}>
        <NavItemButton item={{ id: 'scans', label: 'Monitor Changes', icon: Radar }} active={activeTab === 'scans'} onClick={go} />
        <NavItemButton item={{ id: 'alerts', label: 'Alerts & Changes', icon: Bell, badge: alertCount ? String(alertCount) : undefined }} active={activeTab === 'alerts'} onClick={go} />
        <NavItemButton item={{ id: 'compliance', label: 'Compliance Evidence', icon: FileCheck }} active={activeTab === 'compliance'} onClick={go} />
        <NavItemButton item={{ id: 'ai-swarm', label: 'Continuous Verification', icon: Activity }} active={activeTab === 'ai-swarm'} onClick={go} />
      </NavSection>
      <NavSection title="04 · USE" subtitle="Build on SPR" active={isAny(['integrations','ai-agent-trust','settings'])}>
        <NavItemButton item={{ id: 'integrations', label: 'SPR Connections', icon: Workflow }} active={activeTab === 'integrations'} onClick={go} />
        <NavItemButton item={{ id: 'ai-agent-trust', label: 'Ask SPR', icon: Search }} active={activeTab === 'ai-agent-trust'} onClick={go} />
        <NavItemButton item={{ id: 'settings', label: 'Administration', icon: Settings }} active={activeTab === 'settings'} onClick={go} />
      </NavSection>
      {spaces.length > 0 && <NavSection title="ACTIVE CAPABILITIES" subtitle="Enabled in this workspace">{spaces.map(item => <NavItemButton key={item.id} item={{ ...item, badge: item.id === 'alerts' && alertCount ? String(alertCount) : item.badge }} active={activeTab === item.id} onClick={go} />)}</NavSection>}
    </div>
    <div className="p-3 border-t border-slate-800/80 bg-[#070a12]"><button onClick={() => go('ai-agent-trust')} className="w-full flex items-center gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 px-3 py-2.5 text-left transition"><Search className="w-4 h-4 text-indigo-300" /><div><div className="text-[10px] font-bold text-white">Ask SPR</div><div className="text-[8px] text-indigo-300">Evidence-first. No invented claims.</div></div></button><div className="mt-2 px-2 text-[8px] font-mono text-slate-600 uppercase tracking-widest">{userRole} · {installedExtensions.length} capabilities</div></div>
  </aside>;
}
function NavSection({ title, subtitle, active, children }: { title: string; subtitle: string; active?: boolean; children: React.ReactNode }) { return <section className="space-y-1.5"><div className="px-3 mb-2"><div className={`text-[9px] font-mono font-bold tracking-widest ${active ? 'text-indigo-300' : 'text-slate-400'}`}>{title}</div><div className="text-[8px] text-slate-600 mt-0.5">{subtitle}</div></div>{children}</section>; }
function NavItemButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: (id: string) => void }) { const Icon = item.icon; return <button onClick={() => onClick(item.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${active ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-indigo-950/30' : 'text-slate-400 hover:text-slate-100 hover:bg-[#141c2e]'}`}><span className="flex items-center gap-2.5 min-w-0"><Icon className="w-4 h-4 shrink-0" /><span className="truncate">{item.label}</span></span>{item.badge && <span className="rounded-full bg-rose-600 text-white px-1.5 py-0.5 text-[8px] font-bold">{item.badge}</span>}</button>; }
