/** SPR next-generation daily command center. */
import React, { useMemo } from 'react';
import { Alert, Client, Scan, SoftwarePassport, Vendor } from '../types';
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Clock3, FileCheck, Search, Shield, Sparkles, Activity } from 'lucide-react';

interface Props {
  clients: Client[];
  alerts: Alert[];
  scans: Scan[];
  passports: SoftwarePassport[];
  vendors: Vendor[];
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
}

export default function TodayCommandCenter({ clients, alerts, scans, passports, vendors, onNavigate, onSearch }: Props) {
  const activeAlerts = useMemo(() => alerts.filter(a => a.status === 'Active'), [alerts]);
  const critical = activeAlerts.filter(a => a.severity === 'Critical').length;
  const monitored = scans.filter(s => s.status !== 'Resolved').length;
  const ask = (value: string) => { onSearch(value); onNavigate('passports'); };

  return (
    <div className="max-w-[1500px] mx-auto space-y-7 pb-12" id="spr-today-command">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.13),transparent_38%)] pointer-events-none" />
        <div className="relative p-7 lg:p-9">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-7">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> SPR COMMAND</div>
              <h1 className="mt-3 text-3xl lg:text-4xl font-display font-bold tracking-tight text-slate-950 dark:text-white">Good morning. Here’s what matters.</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-zinc-400">One operating view across workloads, software, evidence, changes and decisions. Everything else stays out of your way.</p>
            </div>
            <button onClick={() => onNavigate('marketplace')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:border-indigo-300 hover:text-indigo-600 transition"><Sparkles className="w-4 h-4" /> Add capability</button>
          </div>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button onClick={() => onNavigate('alerts')} className="text-left rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 p-4 hover:border-rose-300 transition"><div className="flex items-center justify-between"><Bell className="w-4 h-4 text-rose-500" /><span className="text-[10px] font-mono text-slate-400">ATTENTION</span></div><div className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{activeAlerts.length}</div><div className="text-[11px] text-slate-500">{critical} critical</div></button>
            <button onClick={() => onNavigate('scans')} className="text-left rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 p-4 hover:border-indigo-300 transition"><div className="flex items-center justify-between"><Activity className="w-4 h-4 text-indigo-500" /><span className="text-[10px] font-mono text-slate-400">OBSERVATIONS</span></div><div className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{scans.length}</div><div className="text-[11px] text-slate-500">recorded resources</div></button>
            <button onClick={() => onNavigate('passports')} className="text-left rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 p-4 hover:border-emerald-300 transition"><div className="flex items-center justify-between"><FileCheck className="w-4 h-4 text-emerald-500" /><span className="text-[10px] font-mono text-slate-400">EVIDENCE</span></div><div className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{passports.length}</div><div className="text-[11px] text-slate-500">software passports</div></button>
            <button onClick={() => onNavigate('scans')} className="text-left rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 p-4 hover:border-amber-300 transition"><div className="flex items-center justify-between"><Clock3 className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-mono text-slate-400">MONITORED</span></div><div className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{monitored}</div><div className="text-[11px] text-slate-500">active records</div></button>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.35fr_0.65fr] gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between"><div><h2 className="font-bold text-slate-950 dark:text-white">Needs attention</h2><p className="text-xs text-slate-500 mt-1">Only items that can require action are surfaced here.</p></div><button onClick={() => onNavigate('alerts')} className="text-xs font-bold text-indigo-600">View all</button></div>
          {activeAlerts.slice(0, 5).map(alert => <button key={alert.id} onClick={() => onNavigate('alerts')} className="w-full text-left p-5 border-b last:border-b-0 border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 transition flex items-start gap-4"><div className="mt-0.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 p-2"><AlertTriangle className="w-4 h-4 text-rose-500" /></div><div className="min-w-0 flex-1"><div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{alert.title}</div><div className="mt-1 text-xs text-slate-500 truncate">{alert.clientName} · {alert.severity}</div></div><ArrowRight className="w-4 h-4 text-slate-300 mt-1" /></button>)}
          {activeAlerts.length === 0 && <div className="p-10 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" /><div className="mt-3 font-semibold text-slate-900 dark:text-white">Everything is clear.</div><p className="mt-1 text-xs text-slate-500">No active attention items are currently recorded.</p></div>}
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
          <h2 className="font-bold text-slate-950 dark:text-white">Your world</h2><p className="text-xs text-slate-500 mt-1">Jump directly to the objects you operate.</p>
          <div className="mt-5 space-y-2">
            <button onClick={() => onNavigate('clients')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 hover:bg-indigo-50 transition"><span className="text-xs font-semibold">Organizations / clients</span><span className="font-mono text-xs text-slate-500">{clients.length}</span></button>
            <button onClick={() => onNavigate('passports')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 hover:bg-indigo-50 transition"><span className="text-xs font-semibold">Software passports</span><span className="font-mono text-xs text-slate-500">{passports.length}</span></button>
            <button onClick={() => onNavigate('vendors')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 hover:bg-indigo-50 transition"><span className="text-xs font-semibold">Vendors</span><span className="font-mono text-xs text-slate-500">{vendors.length}</span></button>
            <button onClick={() => onNavigate('scans')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 hover:bg-indigo-50 transition"><span className="text-xs font-semibold">Observed resources</span><span className="font-mono text-xs text-slate-500">{scans.length}</span></button>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800"><button onClick={() => ask('')} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-zinc-950 py-3 text-xs font-bold hover:opacity-90 transition"><Search className="w-4 h-4" /> Check SPR</button></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-r from-slate-950 to-indigo-950 text-white p-6 lg:p-7"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"><div><div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] text-indigo-300 uppercase"><Shield className="w-3.5 h-3.5" /> Trust infrastructure</div><h2 className="mt-2 text-xl font-bold">Need to know something about software?</h2><p className="mt-1 text-xs text-slate-300">Check SPR first. Search the evidence-backed record instead of hunting across systems.</p></div><button onClick={() => ask('')} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-950 px-5 py-3 text-xs font-bold hover:bg-slate-100 transition"><Search className="w-4 h-4" /> Check SPR</button></div></section>
    </div>
  );
}
