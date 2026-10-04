import React, { useMemo, useState } from 'react';
import { Building2, CheckCircle2, FileSearch, GitCompareArrows, Landmark, Network, PackageCheck, Scale, ShieldCheck, Store, Users, XCircle } from 'lucide-react';
import { Client, SoftwarePassport, Vendor } from '../types';

type Lens = 'buyer' | 'vendor' | 'operator' | 'auditor' | 'executive';

interface Props {
  clients: Client[];
  passports: SoftwarePassport[];
  vendors: Vendor[];
  onNavigate: (tab: string, itemId?: string) => void;
}

const lenses: { id: Lens; label: string; icon: any; description: string }[] = [
  { id: 'buyer', label: 'Buyer', icon: Store, description: 'Decide whether software is ready for procurement.' },
  { id: 'vendor', label: 'Vendor', icon: Building2, description: 'See which evidence customers still need.' },
  { id: 'operator', label: 'Operator', icon: Network, description: 'Track software actually present in the environment.' },
  { id: 'auditor', label: 'Auditor', icon: Scale, description: 'Trace claims back to evidence and source records.' },
  { id: 'executive', label: 'Executive', icon: Landmark, description: 'See exposure, unknowns, and decision status.' },
];

function evidenceState(passport: SoftwarePassport) {
  const evidence = Array.isArray((passport as any).evidence) ? (passport as any).evidence : [];
  const hash = String((passport as any).fileHash || '').trim();
  const sbom = Array.isArray((passport as any).sbom) ? (passport as any).sbom : [];
  const observed = evidence.length + (hash ? 1 : 0) + (sbom.length ? 1 : 0);
  return {
    observed,
    evidenceCount: evidence.length,
    hasHash: !!hash,
    hasSbom: sbom.length > 0,
    state: observed >= 3 ? 'EVIDENCE PRESENT' : observed > 0 ? 'PARTIAL' : 'UNKNOWN'
  };
}

export default function EvidenceExchangeView({ clients, passports, vendors, onNavigate }: Props) {
  const [lens, setLens] = useState<Lens>('buyer');
  const [selectedId, setSelectedId] = useState<string | null>(passports[0]?.id || null);
  const selected = passports.find(p => p.id === selectedId) || passports[0] || null;

  const stats = useMemo(() => {
    const states = passports.map(evidenceState);
    return {
      software: passports.length,
      vendors: vendors.length,
      organizations: clients.length,
      evidencePresent: states.filter(s => s.state === 'EVIDENCE PRESENT').length,
      partial: states.filter(s => s.state === 'PARTIAL').length,
      unknown: states.filter(s => s.state === 'UNKNOWN').length,
    };
  }, [clients.length, passports, vendors.length]);

  if (!passports.length) {
    return <div className="max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-[#0b1020] p-10 text-slate-200">
      <PackageCheck className="w-8 h-8 text-indigo-300 mb-4" />
      <h1 className="text-xl font-bold text-white">Evidence Exchange</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-2xl">SPR can serve buyers, vendors, operators, auditors, and executives from the same evidence record. No software passports are available yet, so SPR will not fabricate an example.</p>
      <button onClick={() => onNavigate('passports')} className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500">Register or investigate software</button>
    </div>;
  }

  const state = selected ? evidenceState(selected) : null;

  return <div className="max-w-7xl mx-auto space-y-6 text-slate-200">
    <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-400/5 pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="text-[10px] font-mono tracking-[0.24em] text-indigo-300 uppercase">Software trust infrastructure</div>
          <h1 className="mt-2 text-2xl font-bold text-white">Evidence Exchange</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">One evidence layer for software buyers, vendors, operators, auditors, and executives. SPR separates what was observed from what was asserted, and keeps unknowns visible.</p>
        </div>
        <button onClick={() => onNavigate('passports', selected?.id)} className="shrink-0 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20">Open source passport</button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Metric label="Software" value={stats.software} />
      <Metric label="Vendors" value={stats.vendors} />
      <Metric label="Organizations" value={stats.organizations} />
      <Metric label="Evidence present" value={stats.evidencePresent} good />
      <Metric label="Partial" value={stats.partial} />
      <Metric label="Unknown" value={stats.unknown} warn />
    </div>

    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <aside className="rounded-2xl border border-slate-800 bg-[#0b1020] p-3 h-fit">
        <div className="px-2 py-2 text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase">Choose perspective</div>
        {lenses.map(item => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => setLens(item.id)} className={`w-full rounded-xl p-3 text-left transition mb-1 ${lens === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800/70 text-slate-300'}`}>
            <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="text-xs font-bold">{item.label}</span></div>
            <div className={`mt-1 text-[10px] leading-4 ${lens === item.id ? 'text-indigo-100' : 'text-slate-500'}`}>{item.description}</div>
          </button>;
        })}
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-[#0b1020] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-widest font-mono text-slate-500">{lens} lens</div>
              <h2 className="mt-1 text-lg font-bold text-white">{selected?.name} <span className="text-slate-500 font-normal">v{selected?.version}</span></h2>
              <p className="text-xs text-slate-500 mt-1">{selected?.publisher || 'Publisher not recorded'}</p>
            </div>
            <select value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
              {passports.map(p => <option key={p.id} value={p.id}>{p.name} · {p.version}</option>)}
            </select>
          </div>

          <div className="mt-5 grid md:grid-cols-3 gap-3">
            <EvidenceFact label="Observed evidence records" value={String(state?.evidenceCount ?? 0)} known={(state?.evidenceCount ?? 0) > 0} />
            <EvidenceFact label="Artifact hash" value={state?.hasHash ? 'Recorded' : 'Unknown'} known={!!state?.hasHash} />
            <EvidenceFact label="SBOM" value={state?.hasSbom ? 'Recorded' : 'Unknown'} known={!!state?.hasSbom} />
          </div>
        </div>

        <DecisionTrace passport={selected!} />

        <LensPanel lens={lens} passport={selected!} state={state!} onNavigate={onNavigate} />

        <div className="grid md:grid-cols-3 gap-4">
          <ActionCard icon={FileSearch} title="Show your work" text="Open the passport and inspect evidence, provenance, findings, and history behind the result." action="Inspect evidence" onClick={() => onNavigate('passports', selected?.id)} />
          <ActionCard icon={GitCompareArrows} title="Trust diff" text="Compare recorded software state over time. If no historical evidence exists, SPR keeps the comparison unknown." action="Monitor changes" onClick={() => onNavigate('scans')} />
          <ActionCard icon={ShieldCheck} title="Procurement gate" text="Use observed evidence to support an approve, conditional, escalate, or reject decision without turning unknowns into failures." action="Review reports" onClick={() => onNavigate('reports')} />
        </div>
      </section>
    </div>
  </div>;
}

function LensPanel({ lens, passport, state, onNavigate }: { lens: Lens; passport: SoftwarePassport; state: ReturnType<typeof evidenceState>; onNavigate: Props['onNavigate'] }) {
  const content: Record<Lens, { title: string; bullets: string[]; action: string; target: string }> = {
    buyer: { title: 'Procurement decision support', bullets: ['Verify what evidence exists before purchase.', 'Keep missing provenance, SBOM, or assurance evidence explicitly unknown.', 'Send unresolved items into remediation instead of guessing.'], action: 'Review software evidence', target: 'passports' },
    vendor: { title: 'Reusable vendor evidence', bullets: ['See which product evidence is already recorded.', 'Prepare version-specific evidence once for authorized customers.', 'Treat vendor assertions separately from independently observed evidence.'], action: 'Review vendor record', target: 'vendors' },
    operator: { title: 'Operational software truth', bullets: ['Tie software records to the environments where they are used.', 'Watch for version, dependency, and behavior changes.', 'Escalate when previously verified evidence becomes stale or contradictory.'], action: 'Open monitoring', target: 'scans' },
    auditor: { title: 'Reconstructable assurance', bullets: ['Trace conclusions to source evidence and timestamps.', 'Preserve unknowns and historical states rather than overwriting them.', 'Require evidence-backed closure for remediation findings.'], action: 'Open reports', target: 'reports' },
    executive: { title: 'Decision-ready trust state', bullets: ['See how much software has evidence versus partial or unknown coverage.', 'Focus teams on unresolved exposure rather than unexplained scores.', 'Separate technical verification state from business risk acceptance.'], action: 'Open command center', target: 'dashboard' }
  };
  const c = content[lens];
  return <div className="rounded-2xl border border-slate-800 bg-[#0b1020] p-5">
    <div className="flex items-start justify-between gap-4">
      <div><h3 className="text-sm font-bold text-white">{c.title}</h3><p className="mt-1 text-xs text-slate-500">Current evidence state: <span className={state.state === 'EVIDENCE PRESENT' ? 'text-emerald-300' : state.state === 'PARTIAL' ? 'text-amber-300' : 'text-slate-300'}>{state.state}</span></p></div>
      <button onClick={() => onNavigate(c.target, passport.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800">{c.action}</button>
    </div>
    <div className="mt-4 space-y-2">{c.bullets.map(b => <div key={b} className="flex gap-2 text-xs text-slate-300"><CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" /><span>{b}</span></div>)}</div>
  </div>;
}

function Metric({ label, value, good, warn }: { label: string; value: number; good?: boolean; warn?: boolean }) {
  return <div className="rounded-xl border border-slate-800 bg-[#0b1020] p-3"><div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div><div className={`mt-1 text-xl font-bold ${good ? 'text-emerald-300' : warn ? 'text-amber-300' : 'text-white'}`}>{value}</div></div>;
}
function EvidenceFact({ label, value, known }: { label: string; value: string; known: boolean }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{label}</span>{known ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}</div><div className="mt-2 text-xs font-bold text-slate-200">{value}</div></div>;
}
function ActionCard({ icon: Icon, title, text, action, onClick }: { icon: any; title: string; text: string; action: string; onClick: () => void }) {
  return <div className="rounded-2xl border border-slate-800 bg-[#0b1020] p-4"><Icon className="w-5 h-5 text-indigo-300" /><h3 className="mt-3 text-sm font-bold text-white">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p><button onClick={onClick} className="mt-4 text-[10px] font-bold text-indigo-300 hover:text-indigo-200">{action} →</button></div>;
}

function DecisionTrace({ passport }: { passport: SoftwarePassport }) {
  const evidence = Array.isArray(passport.evidence) ? passport.evidence : [];
  const missing: { label: string; where: string; request: string }[] = [];
  if (!passport.fileHash) missing.push({
    label: 'Authoritative artifact hash',
    where: 'Vendor release/download portal, signed release manifest, package registry, or a hash computed from the exact installed artifact.',
    request: `Provide the SHA-256 release hash for ${passport.name} version ${passport.version}, preferably in a signed or authenticated release record.`
  });
  if (!passport.sbom?.length) missing.push({
    label: 'Software Bill of Materials',
    where: 'Vendor security portal, engineering team, release artifacts, CycloneDX/SPDX export, package lockfiles, or a reproducible SBOM generated from the exact artifact.',
    request: `Provide a version-specific CycloneDX or SPDX SBOM for ${passport.name} ${passport.version}.`
  });
  const hasSignature = evidence.some(e => e.type === 'Signature');
  if (!hasSignature) missing.push({
    label: 'Code-signing / provenance evidence',
    where: 'Executable signature, vendor signing certificate, notarization record, signed release manifest, build attestation, or authenticated repository release.',
    request: `Provide cryptographic signing or build provenance evidence for ${passport.name} ${passport.version} that can be matched to the assessed artifact.`
  });

  return <div className="rounded-2xl border border-slate-800 bg-[#0b1020] p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[9px] uppercase tracking-widest font-mono text-indigo-300">Decision trace</div>
        <h3 className="mt-1 text-sm font-bold text-white">Show your work</h3>
        <p className="mt-1 text-xs text-slate-500">SPR separates recorded source evidence from interpretation and keeps missing answers explicit.</p>
      </div>
      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[9px] font-mono text-slate-400">NO INVENTED EVIDENCE</span>
    </div>

    <div className="mt-5 grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[10px] font-bold text-slate-300">1 · WHAT SPR ACTUALLY HAS</div>
        <div className="mt-3 space-y-2">
          <TraceRow label="Software identity" value={`${passport.name} ${passport.version}`} />
          <TraceRow label="Publisher record" value={passport.publisher || 'UNKNOWN'} />
          <TraceRow label="Artifact hash" value={passport.fileHash || 'UNKNOWN'} mono />
          <TraceRow label="SBOM components" value={String(passport.sbom?.length || 0)} />
          <TraceRow label="Evidence records" value={String(evidence.length)} />
          <TraceRow label="Timeline events" value={String(passport.timeline?.length || 0)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[10px] font-bold text-slate-300">2 · SOURCE EVIDENCE</div>
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
          {evidence.length ? evidence.map(item => <div key={item.id} className="rounded-lg border border-slate-800 bg-[#0b1020] p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-white">{item.name}</span><span className="text-[9px] font-mono text-indigo-300">{item.status}</span></div>
            <div className="mt-1 text-[10px] text-slate-500">{item.type} · {item.timestamp || 'timestamp unknown'}</div>
            <div className="mt-2 grid grid-cols-1 gap-1 text-[10px]">
              <TraceRow label="Signer/source" value={item.signer || 'UNKNOWN'} />
              <TraceRow label="Hash" value={item.hash || item.checksum || 'UNKNOWN'} mono />
              <TraceRow label="Verifier" value={item.verifierEngineId || 'UNKNOWN'} />
            </div>
          </div>) : <div className="rounded-lg border border-dashed border-slate-700 p-4 text-xs text-slate-500">No evidence records are persisted for this passport. SPR therefore does not claim a verified evidence state.</div>}
        </div>
      </div>
    </div>

    <div className="mt-4 grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[10px] font-bold text-slate-300">3 · HOW SPR GOT THE ANSWER</div>
        <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
          <p>SPR checks the exact software record for persisted evidence, an artifact hash, and an SBOM. It does not convert a missing field into a security failure.</p>
          <p>If evidence exists, SPR shows its recorded status and source metadata. If it is absent, the corresponding property remains <span className="text-slate-200 font-bold">UNKNOWN</span> or <span className="text-amber-300 font-bold">PARTIAL</span>.</p>
          <p>This screen does not use an AI-generated substitute for missing proof.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[10px] font-bold text-slate-300">4 · WHERE TO GET THE MISSING ANSWER</div>
        <div className="mt-3 space-y-3">
          {missing.length ? missing.map(item => <div key={item.label} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="text-[11px] font-bold text-amber-200">{item.label}</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-400"><span className="text-slate-300 font-bold">Look here:</span> {item.where}</div>
            <div className="mt-2 text-[10px] leading-4 text-slate-400"><span className="text-slate-300 font-bold">Ask for:</span> {item.request}</div>
          </div>) : <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">Core evidence categories shown here are present. Individual evidence items still retain their own verification state and must not be treated as equivalent.</div>}
        </div>
      </div>
    </div>

    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="text-[10px] font-bold text-slate-300">5 · WHAT WOULD CHANGE THE ANSWER</div>
      <p className="mt-2 text-xs leading-5 text-slate-400">The state changes only when new evidence is persisted and validated for this exact product/version. A vendor statement alone is supporting evidence; it must not silently overwrite contradictory direct observation or a failed verification result.</p>
    </div>
  </div>;
}

function TraceRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-3 text-[10px]"><span className="text-slate-500">{label}</span><span className={`text-right text-slate-300 break-all ${mono ? 'font-mono' : ''}`}>{value}</span></div>;
}
