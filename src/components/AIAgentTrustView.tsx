import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, CheckCircle2, Copy, KeyRound, Lock, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

interface AgentRecord {
  id: string;
  name: string;
  status: string;
  api_key_prefix: string;
  allowedActions: string[];
  allowedTools: string[];
  metadata: Record<string, string>;
  created_at: string;
  last_seen_at?: string | null;
  last_decision_at?: string | null;
  last_event_at?: string | null;
}

interface AgentEvent {
  id: string;
  event_id: string;
  event_type: string;
  action?: string | null;
  tool?: string | null;
  resource?: string | null;
  outcome?: string | null;
  boundary_state: string;
  observed_at: string;
  payload_hash: string;
}

const ACTIONS = ['read', 'write', 'create', 'update', 'delete', 'send', 'execute', 'purchase', 'deploy'];

export default function AIAgentTrustView() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [allowedActions, setAllowedActions] = useState<string[]>(['read']);
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => agents.find(agent => agent.id === selectedId) || agents[0], [agents, selectedId]);

  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/agent-trust/agents');
      if (!response.ok) throw new Error('Agent records could not be loaded.');
      const data = await response.json();
      setAgents(Array.isArray(data) ? data : []);
      setSelectedId(current => current || data?.[0]?.id || '');
    } catch (err: any) {
      setError(err?.message || 'Agent Trust is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (agentId: string) => {
    const response = await apiFetch(`/api/agent-trust/agents/${encodeURIComponent(agentId)}/events?limit=100`);
    if (!response.ok) return;
    const data = await response.json();
    setEvents(Array.isArray(data) ? data : []);
  };

  useEffect(() => { void loadAgents(); }, []);
  useEffect(() => { if (selected?.id) void loadEvents(selected.id); else setEvents([]); }, [selected?.id]);

  const createAgent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const response = await apiFetch('/api/agent-trust/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), allowedActions, allowedTools, metadata: {} })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || 'Agent could not be created.');
      setNewKey(data.apiKey || null);
      setName('');
      await loadAgents();
      setSelectedId(data.id);
    } catch (err: any) {
      setError(err?.message || 'Agent could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!selected) return;
    const response = await apiFetch(`/api/agent-trust/agents/${encodeURIComponent(selected.id)}/revoke`, { method: 'POST' });
    if (!response.ok) {
      setError('The agent was not revoked.');
      return;
    }
    await loadAgents();
  };

  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-mono text-[10px] font-bold uppercase tracking-widest">
            <Bot className="w-4 h-4" /> AI Agent Trust
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">AI Agent Trust & Runtime Boundary</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            SPR records what the connected agent reports and can make a pre-action allow/deny decision against its configured boundary. It does not infer intent or add facts that were not observed.
          </p>
        </div>
        <button onClick={() => void loadAgents()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Connected Agents</h2><p className="text-[10px] text-slate-500 mt-0.5">Server-backed identities only</p></div>
            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-full">{agents.length}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-900">
            {loading ? <div className="p-6 text-xs text-slate-500">Loading observed agent records…</div> : agents.length === 0 ? <div className="p-6 text-xs text-slate-500">No agent identities have been created.</div> : agents.map(agent => (
              <button key={agent.id} onClick={() => setSelectedId(agent.id)} className={`w-full text-left p-4 transition ${selected?.id === agent.id ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-bold text-xs text-slate-900 dark:text-white truncate">{agent.name}</span><span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${agent.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{agent.status}</span></div>
                <div className="mt-2 text-[9px] font-mono text-slate-500">{agent.api_key_prefix}…</div>
                <div className="mt-2 flex gap-1 flex-wrap">{agent.allowedActions.slice(0, 5).map(action => <span key={action} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-[9px] text-slate-600 dark:text-slate-400">{action}</span>)}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          {selected ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Metric label="Status" value={selected.status} icon={ShieldCheck} />
                <Metric label="Actions" value={String(selected.allowedActions.length)} icon={Lock} />
                <Metric label="Tools" value={String(selected.allowedTools.length)} icon={Activity} />
                <Metric label="Events" value={String(events.length)} icon={Bot} />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Observed Operating Boundary</h2><p className="text-[10px] text-slate-500 mt-1">Exact configured values. No inferred permissions.</p></div>
                  {selected.status === 'ACTIVE' && <button onClick={() => void revoke()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-bold"><XCircle className="w-3.5 h-3.5" /> Revoke agent key</button>}
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <Boundary title="Allowed actions" values={selected.allowedActions} />
                  <Boundary title="Allowed tools" values={selected.allowedTools} />
                </div>
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 text-[10px] text-slate-500 font-mono">
                  Pre-action enforcement: <strong className="text-slate-800 dark:text-slate-200">available when the agent calls POST /api/agent-trust/authorize before the consequential action.</strong>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Live Event Ledger</h2><p className="text-[10px] text-slate-500 mt-1">Newest observations first. Payload hashes are retained; sensitive payload fields are redacted server-side.</p></div>
                {events.length === 0 ? <div className="p-6 text-xs text-slate-500">No runtime events observed for this agent.</div> : <div className="divide-y divide-slate-100 dark:divide-slate-900">{events.map(event => <div key={event.id} className="p-4 flex gap-3"><div className={`mt-0.5 ${event.boundary_state === 'OUT_OF_BOUNDARY' ? 'text-rose-600' : 'text-emerald-600'}`}>{event.boundary_state === 'OUT_OF_BOUNDARY' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-900 dark:text-white">{event.action || 'Action not observed'}</span><span className="text-[9px] font-mono text-slate-500">{event.event_type}</span><span className={`text-[9px] font-bold ${event.boundary_state === 'OUT_OF_BOUNDARY' ? 'text-rose-600' : 'text-emerald-600'}`}>{event.boundary_state}</span></div><div className="text-[10px] text-slate-500 mt-1">tool={event.tool || 'not observed'} · resource={event.resource || 'not observed'} · outcome={event.outcome || 'not observed'}</div><div className="text-[9px] font-mono text-slate-400 mt-1">{event.observed_at} · sha256:{event.payload_hash}</div></div></div>)}</div>}
              </div>
            </>
          ) : <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-sm text-slate-500">Create an agent identity to begin observing it.</div>}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
        <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-600" /><h2 className="text-sm font-bold text-slate-900 dark:text-white">Register an Agent</h2></div>
        <form onSubmit={createAgent} className="mt-4 space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Agent name" maxLength={160} required className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs" />
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Allowed actions</p><div className="flex flex-wrap gap-2">{ACTIONS.map(action => <button type="button" key={action} onClick={() => toggle(action, allowedActions, setAllowedActions)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${allowedActions.includes(action) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>{action}</button>)}</div></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Allowed tools</p><input value={allowedTools.join(', ')} onChange={e => setAllowedTools(e.target.value.split(',').map(v => v.trim()).filter(Boolean).slice(0, 50))} placeholder="crm.read, ticket.create, email.send" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs font-mono" /></div>
          <button disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-bold"><KeyRound className="w-4 h-4" /> {creating ? 'Creating…' : 'Create secure agent identity'}</button>
        </form>
      </section>

      {newKey && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"><div className="max-w-xl w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 shadow-2xl p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900 dark:text-white">Agent key — shown once</h2><p className="text-xs text-slate-500 mt-1">SPR stores only a SHA-256 digest. Copy this key into the agent's server-side secret store.</p></div><button onClick={() => setNewKey(null)}><X className="w-5 h-5 text-slate-500" /></button></div><div className="mt-5 p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] break-all">{newKey}</div><button onClick={() => navigator.clipboard?.writeText(newKey)} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"><Copy className="w-3.5 h-3.5" /> Copy key</button></div></div>}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><Icon className="w-4 h-4 text-indigo-500" /><div className="text-[9px] uppercase tracking-wider text-slate-500 mt-3">{label}</div><div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{value}</div></div>;
}

function Boundary({ title, values }: { title: string; values: string[] }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</div>{values.length === 0 ? <div className="text-xs text-slate-400">None configured.</div> : <div className="flex flex-wrap gap-1.5">{values.map(value => <span key={value} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-mono">{value}</span>)}</div>}</div>;
}
