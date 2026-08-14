/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  Search,
  X,
  ArrowRight,
  Building2,
  Plug,
  Layers,
  BarChart2,
  Network,
  Workflow,
  Share2,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
  Sparkles,
  Database,
  Terminal,
  Activity,
  FileText,
  Clock,
  Plus,
  Compass,
  ShoppingBag,
  Sliders,
  Award,
  DollarSign,
  TrendingUp,
  Scale,
  Zap,
  Users,
  MessageSquare,
  Send,
  Download,
  Code,
  Globe,
  Lock,
  LockKeyhole,
  FileSignature
} from 'lucide-react';
import { SoftwarePassport, Client } from '../types';

interface TrustOSViewProps {
  passports: SoftwarePassport[];
  clients: Client[];
  selectedClientId: string;
}

// Model for elements in "The Trust Universe"
interface MapNode {
  id: string;
  label: string;
  category: 'Company' | 'Vendor' | 'Software' | 'AI System' | 'Dependency' | 'Infrastructure';
  status: 'Trusted' | 'Needs Review' | 'Risk Identified';
  description: string;
  purpose: string;
  businessImportance: 'Critical' | 'High' | 'Medium' | 'Low';
  connections: string[];
  metrics: {
    security: number;
    reliability: number;
    transparency: number;
  };
  humanExplanation: string;
  history: { date: string; event: string; details: string }[];
  whoUsesIt: string;
  sprRecommendation: string;
  globalReputation?: {
    adoption: string;
    stability: string;
    maturity: string;
    confidence: string;
  };
}

export default function TrustOSView({ passports, clients, selectedClientId }: TrustOSViewProps) {
  // --- STATE SYSTEM ---
  const activeClientName = useMemo(() => {
    const client = clients.find(c => c.id === selectedClientId);
    return client ? client.name : 'Sovereign Core Ops';
  }, [clients, selectedClientId]);

  // Toast notification states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Opening Experience state
  const [hasEnteredUniverse, setHasEnteredUniverse] = useState<boolean>(() => {
    return localStorage.getItem('spr_universe_entered') === 'true';
  });
  const [activeMappingStep, setActiveMappingStep] = useState<number>(0);
  const [mappingProgress, setMappingProgress] = useState<number>(0);

  // List of concentric systems mapped dynamically
  const mappingCategories = [
    { name: 'Communication 📧', desc: 'Secure message loops & VoIP assets' },
    { name: 'Finance 💰', desc: 'Ledgers, payment gateways & billing' },
    { name: 'Customer Systems 👥', desc: 'CRM platforms, records & pipelines' },
    { name: 'Operations 🛠', desc: 'Project boards & inventory trackers' },
    { name: 'Cloud ☁', desc: 'Sovereign servers & CDN nodes' },
    { name: 'AI Tools 🤖', desc: 'LLM fine-tunes & vector storage' },
    { name: 'Security 🔐', desc: 'Intrusion shields & identity rails' },
    { name: 'Vendors 🤝', desc: 'External SLA tracking & risks' }
  ];

  // Dynamic mapper routine for the onboarding theater
  useEffect(() => {
    if (!hasEnteredUniverse) {
      const interval = setInterval(() => {
        setActiveMappingStep(prev => {
          if (prev < mappingCategories.length - 1) {
            setMappingProgress(p => p + 12.5);
            return prev + 1;
          } else {
            setMappingProgress(100);
            clearInterval(interval);
            return prev;
          }
        });
      }, 900);
      return () => clearInterval(interval);
    }
  }, [hasEnteredUniverse]);

  const handleEnterUniverse = () => {
    localStorage.setItem('spr_universe_entered', 'true');
    setHasEnteredUniverse(true);
  };

  // Reset the onboarding animation for visual evaluation
  const handleResetUniverseAnimation = () => {
    localStorage.removeItem('spr_universe_entered');
    setActiveMappingStep(0);
    setMappingProgress(0);
    setHasEnteredUniverse(false);
  };

  // 2. Trust Universe Interactive Map states
  const [selectedNodeCategory, setSelectedNodeCategory] = useState<string>('All');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-salesforce');
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Define complete structured nodes representing "The Software Universe"
  const universeNodes: MapNode[] = useMemo(() => [
    {
      id: 'node-company',
      label: activeClientName,
      category: 'Company',
      status: 'Trusted',
      description: 'The root hub of all organizational software networks.',
      purpose: 'Coordinates modern operations, services, and secure software distribution.',
      businessImportance: 'Critical',
      connections: ['node-salesforce', 'node-slack', 'node-stripe', 'node-openai', 'node-aws', 'node-postgres'],
      metrics: { security: 95, reliability: 99, transparency: 94 },
      humanExplanation: `This represents the core of your company, ${activeClientName}. All technology systems mapped in this dashboard directly feed into or interact with this root node. If security declines on any branch, your central business resilience is directly impacted.`,
      history: [
        { date: '2026-07-20', event: 'Workspace Mapped', details: 'Core ledger mapping initialized for the organization.' },
        { date: '2026-07-19', event: 'Identities Unified', details: 'Single sign-on and core permissions compiled.' }
      ],
      whoUsesIt: 'All staff / Executives',
      sprRecommendation: 'Core enterprise hub — keep and monitor continuously.',
      globalReputation: {
        adoption: 'Internal Corporate Node',
        stability: 'Sovereign Core Control',
        maturity: 'Highly Custom',
        confidence: '99.9% Secured'
      }
    },
    {
      id: 'node-salesforce',
      label: 'Salesforce CRM',
      category: 'Software',
      status: 'Trusted',
      description: 'Enterprise customer relationship management pipeline.',
      purpose: 'Manages sales pipelines, customer databases, and partner tracking.',
      businessImportance: 'Critical',
      connections: ['node-company', 'node-slack', 'node-postgres'],
      metrics: { security: 90, reliability: 98, transparency: 85 },
      humanExplanation: 'This application handles customer relationships and stores secure client interaction history. 35 employees depend on it daily. It connects to Slack for real-time notifications and is backed up to a PostgreSQL database. Replacing it would severely disrupt sales workflows.',
      history: [
        { date: '2026-06-15', event: 'SLA Audit Passed', details: 'Continuous uptime verified against vendor agreements.' },
        { date: '2026-05-10', event: 'Version Updated', details: 'Patched core package API interface without downtime.' }
      ],
      whoUsesIt: '35 employees',
      sprRecommendation: 'Keep — important business CRM; central customer pipeline.',
      globalReputation: {
        adoption: 'Used by 250,000+ organizations',
        stability: '99.9% SLA Stability',
        maturity: 'AAA Rated',
        confidence: '99.4% Community Trust'
      }
    },
    {
      id: 'node-slack',
      label: 'Slack Suite',
      category: 'Software',
      status: 'Trusted',
      description: 'Universal company-wide messaging and chat ops platform.',
      purpose: 'Allows synchronous communication between development, sales, and management.',
      businessImportance: 'High',
      connections: ['node-company', 'node-salesforce', 'node-openai'],
      metrics: { security: 94, reliability: 96, transparency: 90 },
      humanExplanation: 'This is the communication spine of your company. It keeps everyone connected instantly. It has an intelligent AI helper integration powered by OpenAI and receives automated alerts from Salesforce. Over 120,000 corporate records are discussed here monthly.',
      history: [
        { date: '2026-07-01', event: 'Access Control Audited', details: 'Verified compliance with zero external guest leak risks.' }
      ],
      whoUsesIt: '120 employees',
      sprRecommendation: 'Keep — vital communication spine and developer chatbot interface.',
      globalReputation: {
        adoption: 'Used by 450,000+ organizations',
        stability: '99.95% SLA Stability',
        maturity: 'AA+ Rated',
        confidence: '98.8% Community Trust'
      }
    },
    {
      id: 'node-stripe',
      label: 'Stripe Gateway',
      category: 'Software',
      status: 'Trusted',
      description: 'Secure credit card billing and checkout platform.',
      purpose: 'Processes client transactions, subscriptions, and recurring invoices.',
      businessImportance: 'Critical',
      connections: ['node-company', 'node-postgres'],
      metrics: { security: 98, reliability: 99, transparency: 95 },
      humanExplanation: 'This software manages all checkout systems and financial incoming streams. It handles secure credit card processing, so maintaining 98%+ security is mandatory. It directly pipes transactional records to your database.',
      history: [
        { date: '2026-07-11', event: 'PCI-DSS Attestation', details: 'Passed complete payment compliance verification.' }
      ],
      whoUsesIt: '15 financial managers / Billing systems',
      sprRecommendation: 'Keep — critical billing gateway and payment controller.',
      globalReputation: {
        adoption: 'Used by 2,000,000+ businesses',
        stability: '99.99% SLA Stability',
        maturity: 'AAA Rated',
        confidence: '99.9% Community Trust'
      }
    },
    {
      id: 'node-openai',
      label: 'OpenAI GPT-4 API',
      category: 'AI System',
      status: 'Needs Review',
      description: 'Third-party large language model synthesis endpoint.',
      purpose: 'Provides smart customer replies and automates draft generation.',
      businessImportance: 'Medium',
      connections: ['node-company', 'node-slack'],
      metrics: { security: 74, reliability: 92, transparency: 65 },
      humanExplanation: 'This AI integration powers smart features inside your Slack chat channels. It accesses internal messages to assist employees. Because data is processed externally by OpenAI, we advise reviewing what private information is shared.',
      history: [
        { date: '2026-07-18', event: 'Data Policy Updated', details: 'Vendor clarified opt-out parameters for model training data.' }
      ],
      whoUsesIt: '8 developers / Product interfaces',
      sprRecommendation: 'Needs Review — monitor prompt privacy boundaries and formalize data storage opt-outs.',
      globalReputation: {
        adoption: 'Used by 85,000+ API builders',
        stability: 'API Volatility Detected',
        maturity: 'A- Rated',
        confidence: '84.2% Community Trust'
      }
    },
    {
      id: 'node-postgres',
      label: 'PostgreSQL DB',
      category: 'Infrastructure',
      status: 'Trusted',
      description: 'Relational database housing sensitive corporate records.',
      purpose: 'Stores transactions, user accounts, and historical logs.',
      businessImportance: 'Critical',
      connections: ['node-company', 'node-stripe', 'node-salesforce', 'node-openssl'],
      metrics: { security: 92, reliability: 97, transparency: 88 },
      humanExplanation: 'This relational database holds all structured information about your clients and finances. If this server fails, your applications will be unable to load or save data. It relies on standard OpenSSL cryptography to prevent intrusion.',
      history: [
        { date: '2026-07-14', event: 'Replica Synced', details: 'Uptime fallback node configured in a secure redundant region.' }
      ],
      whoUsesIt: 'Engineering / Backend applications',
      sprRecommendation: 'Keep — central transactional database repository.',
      globalReputation: {
        adoption: 'Millions of deployments globally',
        stability: 'Highly Resilient (Self-Hosted)',
        maturity: 'AAA Rated',
        confidence: '99.9% Community Trust'
      }
    },
    {
      id: 'node-openssl',
      label: 'OpenSSL Library',
      category: 'Dependency',
      status: 'Risk Identified',
      description: 'Cryptographic library securing web transit tunnels.',
      purpose: 'Enforces secure SSL/TLS communication layers.',
      businessImportance: 'High',
      connections: ['node-postgres', 'node-aws'],
      metrics: { security: 45, reliability: 90, transparency: 80 },
      humanExplanation: 'This is a deeply nested code module that encrypts data as it moves over the internet. A vulnerability was found in this version which could allow attackers to decrypt server logs. Upgrading this library is highly recommended.',
      history: [
        { date: '2026-07-20', event: 'Vulnerability Detected', details: 'Matched critical CVE-2026-9914 buffer overflow.' }
      ],
      whoUsesIt: 'All secure cloud connections',
      sprRecommendation: 'Upgrade Required — patch immediately to v3.1.2 to resolve critical vulnerability CVE-2026-9914.',
      globalReputation: {
        adoption: '90% of encrypted internet servers',
        stability: 'Vulnerable in v3.1.1',
        maturity: 'B Rated (Legacy Vulnerability)',
        confidence: '62.0% (Action Required)'
      }
    },
    {
      id: 'node-aws',
      label: 'AWS Cloud Run',
      category: 'Infrastructure',
      status: 'Trusted',
      description: 'Elastic virtual container scaling platform.',
      purpose: 'Runs your website servers and schedules computing jobs dynamically.',
      businessImportance: 'Critical',
      connections: ['node-company', 'node-openssl'],
      metrics: { security: 96, reliability: 99, transparency: 92 },
      humanExplanation: 'This cloud architecture hosts your website and servers. It handles computing scalability instantly during traffic spikes. It relies on OpenSSL to protect active customer web connections.',
      history: [
        { date: '2026-07-02', event: 'IAM Matrix Hardened', details: 'De-authorized unused administrator key sets.' }
      ],
      whoUsesIt: 'Operations / Systems DevOps',
      sprRecommendation: 'Keep — reliable enterprise hosting server; continue multi-region sync.',
      globalReputation: {
        adoption: 'Used by 1,000,000+ active servers',
        stability: '99.99% AWS Standard SLA',
        maturity: 'AAA Rated',
        confidence: '99.9% Community Trust'
      }
    }
  ], [activeClientName]);

  const activeNode = useMemo(() => {
    return universeNodes.find(n => n.id === selectedNodeId) || universeNodes[0];
  }, [universeNodes, selectedNodeId]);

  // Filter nodes for categorization menu
  const filteredNodes = useMemo(() => {
    if (selectedNodeCategory === 'All') return universeNodes;
    return universeNodes.filter(n => n.category === selectedNodeCategory);
  }, [universeNodes, selectedNodeCategory]);

  // Global search inside Trust OS View
  const [osSearch, setOsSearch] = useState('');
  const osMatches = useMemo(() => {
    if (!osSearch.trim()) return [];
    return universeNodes.filter(n =>
      n.label.toLowerCase().includes(osSearch.toLowerCase()) ||
      n.category.toLowerCase().includes(osSearch.toLowerCase()) ||
      n.description.toLowerCase().includes(osSearch.toLowerCase())
    );
  }, [universeNodes, osSearch]);

  // 3. Floating Trust Advisor State
  const [advisorQuery, setAdvisorQuery] = useState('');
  const [advisorResponses, setAdvisorResponses] = useState<{ query: string; reply: string }[]>([
    {
      query: 'I know your software environment. Ask me anything.',
      reply: 'Hello! I am the SPR Trust Advisor. I continuously track and analyze your software universe, vendor stability index, and compliance records. Feel free to ask me anything about your digital infrastructure.'
    }
  ]);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  const advisorPresets = [
    'Are we ready for an audit?',
    'What software should we replace?',
    'Which vendors are risky?',
    'Where are we exposed?'
  ];

  const handleAskAdvisor = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAdvisorLoading(true);
    setAdvisorQuery('');

    try {
      const response = await apiFetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText })
      });
      if (!response.ok) throw new Error(`Advisor unavailable (${response.status})`);
      const data = await response.json();
      const reply = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply
        : 'Advisor returned no analysis.';
      setAdvisorResponses(prev => [...prev, { query: queryText, reply }]);
    } catch (error) {
      console.error('[Trust Advisor] Request failed:', error);
      setAdvisorResponses(prev => [
        ...prev,
        { query: queryText, reply: 'Advisor unavailable. No analysis was generated.' }
      ]);
    } finally {
      setIsAdvisorLoading(false);
    }
    return;

    /* Removed from execution: legacy canned advisor response block.
    // Simulate smart analytical reply from the Trust Advisor based on the specific prompt
    setTimeout(() => {
      let responseText = '';
      const q = queryText.toLowerCase();

      if (q.includes('audit')) {
        responseText = 'Based on our current technology rating, we are **87% ready** for an audit. To achieve 100% compliance:\n\n1. **Upgrade OpenSSL Library** to v3.1.2 immediately to resolve the critical CVE-2026-9914 security vulnerability.\n2. **Review OpenAI GPT-4 API** configuration to ensure client conversation data is fully opted-out of model training.\n3. **De-authorize unused developer access keys** in AWS Cloud Run.';
      } else if (q.includes('replace') || q.includes('software should we')) {
        responseText = 'We recommend checking **OpenSSL Library** (Dependency) and **OpenAI GPT-4 API** (AI System):\n\n- **OpenSSL Library**: Needs immediate patch or replacement of the vulnerable module.\n- **OpenAI GPT-4 API**: Currently flagged as *Needs Review* due to data policy. Consider replacing with a self-hosted sovereign model inside our secure AWS instance if compliance rules forbid third-party API processing.';
      } else if (q.includes('vendor') || q.includes('risky')) {
        responseText = 'Our continuous vendor risk assessment highlights:\n\n1. **OpenAI GPT-4** (🟡 Needs Review): Transmits prompt data to third-party servers. Recommended to negotiate an enterprise SLA.\n2. **OpenSSL** (🔴 Risk Identified): Though an open-source dependency rather than a paid SaaS vendor, it currently exposes postgres connections to buffer overflow.';
      } else if (q.includes('exposed') || q.includes('exposure')) {
        responseText = 'Our current structural exposure lies in **OpenSSL Library v3.1.1** which secures **PostgreSQL DB** and **AWS Cloud Run**. Because this library is vulnerable, transit tunnels connecting Stripe and PostgreSQL are potentially exposed to decryption. Upgrading this library is your highest security priority.';
      } else {
        responseText = `Based on our Software Universe analysis for ${activeClientName}, the technology layer is 87% compliant. No other outstanding network hazard vectors are detected. I am continuously monitoring code integrity signatures on the backend.`;
      }

      setAdvisorResponses(prev => [
        ...prev,
        { query: queryText, reply: responseText }
      ]);
      setIsAdvisorLoading(false);
    }, 1200);
    */
  };

  // 4. Future Marketplace States
  const [purchasedExtensions, setPurchasedExtensions] = useState<Record<string, boolean>>({});
  const marketplaceItems = [
    {
      category: 'Business Operations',
      items: [
        { name: 'Software Inventory Tracker', desc: 'Auto-discovery of shadows SaaS products.', impact: 'Uptime & Asset mapping visibility', cost: '$99/mo' },
        { name: 'License Optimization', desc: 'Avoid expensive double billing on SaaS seats.', impact: 'Cost optimization baseline', cost: '$149/mo' },
        { name: 'Cost Intelligence Agent', desc: 'Analyzes server compute sprawl patterns.', impact: 'Spend reduction feedback', cost: '$199/mo' }
      ]
    },
    {
      category: 'Security Hub',
      items: [
        { name: 'Vulnerability Intelligence', desc: 'Continuous dynamic checks with the NVD.', impact: 'Automated hazard assessment', cost: 'Included' },
        { name: 'Active Threat Monitoring', desc: 'Monitors public databases for publisher leaks.', impact: 'Early danger warning', cost: '$249/mo' },
        { name: 'Incident History Recorder', desc: 'Secure blockchain log of server restarts.', impact: 'Audit trail validation', cost: '$120/mo' }
      ]
    },
    {
      category: 'Governance & Compliance',
      items: [
        { name: 'Audit Preparation Guard', desc: 'Generates evidence templates for ISO & SOC2.', impact: 'Automates proof logging', cost: 'Included' },
        { name: 'Policy Management Engine', desc: 'Standardizes corporate code rules.', impact: 'RBAC boundary validation', cost: '$180/mo' }
      ]
    },
    {
      category: 'Enterprise Gateways',
      items: [
        { name: 'M&A Tech Due Diligence', desc: 'Inspects third-party software before buyouts.', impact: 'Clarity on legacy acquisitions', cost: '$499/mo' },
        { name: 'AI Governance Suite', desc: 'Monitors prompt logs and controls AI toxicity.', impact: 'Safe external LLM queries', cost: '$299/mo' }
      ]
    }
  ];

  return (
    <div className="space-y-8 text-left font-sans text-slate-900 dark:text-zinc-50" id="trust-os-universe-workspace">
      
      {/* Dynamic Toast Element */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-zinc-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-zinc-800"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
            SPR Trust OS Workspace
          </span>
          <h1 className="text-2xl font-display font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-500 animate-pulse" />
            <span>Digital Trust Command Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Visualizing the technology ecosystem, analyzing hidden risks, and translating complex systems for business leaders.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetUniverseAnimation}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Replay Loading Stage</span>
          </button>
        </div>
      </div>

      {/* --- THE PLAY THEATER: OPENING EXPERIENCE ANIMATION --- */}
      <AnimatePresence mode="wait">
        {!hasEnteredUniverse && (
          <motion.div
            key="onboarding-theater"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-950 text-white rounded-3xl p-8 lg:p-12 relative overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between min-h-[550px]"
          >
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>
            
            {/* Ambient blur circles */}
            <div className="absolute -top-12 -left-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header Content */}
            <div className="max-w-2xl space-y-4 relative z-10">
              <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                Illustrative architecture map
              </span>
              <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-white leading-tight">
                Explore a proposed digital-service map
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                This diagram is a planning model for <strong className="text-indigo-400">{activeClientName}</strong>, not a discovered inventory. Connect integrations and import evidence before treating any node as operational.
              </p>
            </div>

            {/* LIVE THEATER STAGE: CONCENTRIC MAP COME ALIVE */}
            <div className="my-8 relative z-10 flex flex-col items-center justify-center py-6">
              {/* Radial System Rings */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border border-slate-800/60 flex items-center justify-center animate-spin-slow">
                <div className="absolute w-48 h-48 rounded-full border border-slate-800/40 flex items-center justify-center">
                  <div className="absolute w-32 h-32 rounded-full border border-indigo-900/30"></div>
                </div>

                {/* Company Central Node */}
                <div className="absolute z-20 w-16 h-16 rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/50 flex flex-col items-center justify-center border-2 border-white animate-pulse">
                  <Building2 className="w-7 h-7 text-white" />
                </div>

                {/* Rotating Categories (Mapped based on incremental mapping steps) */}
                {mappingCategories.map((cat, idx) => {
                  const angle = (idx * 360) / mappingCategories.length;
                  const isVisible = idx <= activeMappingStep;
                  return (
                    <motion.div
                      key={idx}
                      style={{
                        transform: `rotate(${angle}deg) translate(${idx % 2 === 0 ? '130px' : '110px'}) rotate(-${angle}deg)`
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                      className="absolute p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-xl whitespace-nowrap"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                      <span className="text-[10px] font-mono font-bold tracking-tight text-slate-300">{cat.name}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Loader Subtitles */}
              <div className="mt-8 text-center space-y-2 max-w-md">
                <p className="text-xs font-mono text-indigo-400 font-bold tracking-wide">
                  {activeMappingStep < mappingCategories.length - 1 
                    ? `[Ingesting] Mapping: ${mappingCategories[activeMappingStep]?.name}...` 
                    : '✓ Mapping Complete. Integrity signatures generated.'}
                </p>
                <div className="w-48 h-1 bg-slate-900 rounded-full mx-auto overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-700 ease-out"
                    style={{ width: `${mappingProgress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-500 block leading-relaxed">
                  Scanning connected third-party code packages, parsing SBOMs, and aligning compliance records on ledger.
                </span>
              </div>
            </div>

            {/* Action Trigger footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-900 pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs text-slate-400 font-medium">
                  Continuous Ledger scanning active. 0 threat bypasses logged.
                </span>
              </div>
              
              <button
                onClick={handleEnterUniverse}
                disabled={activeMappingStep < mappingCategories.length - 1}
                className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeMappingStep < mappingCategories.length - 1
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                }`}
              >
                <span>Enter Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- THE MAIN SCREEN: THE TRUST UNIVERSE --- */}
      {hasEnteredUniverse && (
        <div className="space-y-8 animate-fade-in" id="workspace-unlocked-stage">
          
          {/* SEARCH SYSTEM SUBBAR */}
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative z-10">
            <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 px-3.5 py-2.5 rounded-xl">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search the Tech Universe... (e.g. Salesforce, Nginx, AI, Database)"
                value={osSearch}
                onChange={(e) => setOsSearch(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-none w-full font-medium"
              />
              {osSearch && (
                <button onClick={() => setOsSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {osSearch.trim() && (
              <div className="absolute left-4 right-4 top-16 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-850">
                <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Tech Universe Suggestions ({osMatches.length})
                </div>
                {osMatches.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setOsSearch('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-900 flex justify-between items-center transition-all group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-zinc-200 text-xs">{node.label}</span>
                        <span className="bg-slate-100 dark:bg-zinc-850 text-slate-600 dark:text-zinc-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {node.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans">{node.description}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${
                      node.status === 'Trusted' ? 'text-emerald-500' : node.status === 'Needs Review' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {node.status}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['All', 'Company', 'Vendor', 'Software', 'AI System', 'Dependency', 'Infrastructure'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedNodeCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-tight transition-all cursor-pointer border ${
                    selectedNodeCategory === cat
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-zinc-950 border-slate-250 dark:border-zinc-850 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* DIGITAL INTELLIGENCE HUD: CREDIT-STYLE HEALTH SCORE & DAILY BRIEF */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            
            {/* TECHNOLOGY HEALTH SCORE (4 COLS) */}
            <div className="xl:col-span-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                  SYSTEM PORTFOLIO ANALYSIS
                </span>
                <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  <span>Technology Health Rating</span>
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Continuous assessment of company compliance, reliability, and security integrity.
                </p>
              </div>

              {/* HEALTH SCORE GRAPHICS */}
              <div className="py-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                
                {/* Radial Credit Ring */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-slate-100 dark:text-zinc-900"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000"
                      strokeWidth="10"
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * 87) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-display font-black text-slate-900 dark:text-white">87</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">OUT OF 100</span>
                  </div>
                </div>

                {/* Breakdown items */}
                <div className="space-y-2.5 font-sans flex-1">
                  <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-900 pb-1.5">
                    <span className="text-slate-500 font-medium">Security Matrix</span>
                    <span className="font-mono font-bold text-emerald-500">89 / Excellent</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-900 pb-1.5">
                    <span className="text-slate-500 font-medium">Vendor Stability</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">92 / Stable</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-900 pb-1.5">
                    <span className="text-slate-500 font-medium">Reliability (SLA)</span>
                    <span className="font-mono font-bold text-indigo-500">96 / Highly Reliable</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-zinc-900 pb-1.5">
                    <span className="text-slate-500 font-medium">Compliance Index</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">85 / Guarded</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Cost Efficiency</span>
                    <span className="font-mono font-bold text-amber-500">74 / Waste Detected</span>
                  </div>
                </div>

              </div>

              {/* Health Score Disclaimer */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold leading-snug">
                  Tech score updated this morning. Risk in OpenSSL restricts further progress to 95+.
                </span>
              </div>

            </div>

            {/* SPR DAILY BRIEF (7 COLS) */}
            <div className="xl:col-span-7 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  DAILY EXECUTIVE TELEMETRY
                </span>
                <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span>SPR Daily Brief</span>
                </h3>
                <p className="text-slate-400 text-[11px]">
                  "Good morning. Here is what changed in your technology world."
                </p>
              </div>

              {/* Live telemetry items */}
              <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                <div className="p-3.5 bg-slate-50/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-850 flex items-start gap-3">
                  <span className="text-base">✅</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 block">New database added</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">PostgreSQL container successfully mapped and ledger initialized.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-850 flex items-start gap-3">
                  <span className="text-base">⚠</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 block">Vendor changed ownership</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">OpenAI GPT-4 API updated opt-out training specifications on core channels.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-850 flex items-start gap-3">
                  <span className="text-base">⚠</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 block">Security vulnerability found</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">OpenSSL Library matches critical CVE-2026-9914 buffer overflow risk.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-850 flex items-start gap-3">
                  <span className="text-base">💰</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 block">License waste detected</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">Salesforce CRM has 4 inactive accounts. Potential optimization: -$340/mo.</span>
                  </div>
                </div>

              </div>

              {/* Bottom footer bar for what changed today */}
              <div className="border-t border-slate-100 dark:border-zinc-900 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>🔗 New connection discovered in chat channels</span>
                <button 
                  onClick={() => showToast("Daily Brief acknowledged. Logging continuous session state.")} 
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-900 dark:bg-zinc-900 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Acknowledge Brief
                </button>
              </div>

            </div>

          </div>

          {/* TWO COLUMN GRID: UNIVERSE INTERACTIVE MAP vs THE PASSPORT SIDEBAR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* LEFT SIDE: "THE TRUST UNIVERSE" INTERACTIVE MAP (7 COLS) */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-[#0c1224] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[500px]">
              
              {/* Layout description watermark */}
              <div className="absolute top-4 left-6 z-10 pointer-events-none">
                <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase block">
                  LIVING 2D TOPOLOGY MODEL
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Select nodes to inspect digital passports.
                </p>
              </div>

              {/* THE RADIAL/GRID TOPOLOGY GRAPH DISPLAY */}
              <div className="relative flex-1 flex items-center justify-center my-6 min-h-[380px]">
                {/* Connecting Web Lines under the nodes */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg className="w-full h-full opacity-60 dark:opacity-45" viewBox="0 0 500 400">
                    {/* Soft line connections to center company node (250, 200) */}
                    <line x1="250" y1="200" x2="110" y2="90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="250" y1="200" x2="390" y2="90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="250" y1="200" x2="110" y2="280" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="250" y1="200" x2="390" y2="280" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="250" y1="200" x2="250" y2="70" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="250" y1="200" x2="250" y2="330" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                  </svg>
                </div>

                {/* CENTRAL CORE HUB NODE */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('node-company')}
                  className={`absolute z-20 w-24 h-24 rounded-full flex flex-col items-center justify-center p-2 text-center shadow-2xl transition-all cursor-pointer ${
                    selectedNodeId === 'node-company'
                      ? 'bg-indigo-600 text-white border-4 border-indigo-300 dark:border-indigo-900/60 shadow-indigo-600/35'
                      : 'bg-white dark:bg-white text-slate-900 dark:text-slate-900 border border-slate-200'
                  }`}
                >
                  <Building2 className="w-7 h-7 mb-1 text-indigo-600" />
                  <span className="text-[10px] font-sans font-black leading-tight uppercase tracking-tight">
                    {activeClientName.split(' ')[0]} Hub
                  </span>
                </motion.button>

                {/* SATELLITE SYSTEM NODES */}
                {[
                  { id: 'node-salesforce', x: 'left-8 top-12', label: 'Salesforce CRM', cat: 'CRM' },
                  { id: 'node-slack', x: 'right-8 top-12', label: 'Slack Suite', cat: 'Chat' },
                  { id: 'node-stripe', x: 'left-8 bottom-12', label: 'Stripe Gateway', cat: 'Billing' },
                  { id: 'node-openai', x: 'right-8 bottom-12', label: 'OpenAI GPT-4', cat: 'AI' },
                  { id: 'node-postgres', x: 'left-1/2 -translate-x-1/2 top-4', label: 'PostgreSQL DB', cat: 'Data' },
                  { id: 'node-openssl', x: 'left-1/2 -translate-x-1/2 bottom-4', label: 'OpenSSL Crypto', cat: 'Code' },
                  { id: 'node-aws', x: 'left-8 top-1/2 -translate-y-1/2', label: 'AWS Cloud Run', cat: 'Compute' }
                ].map((node) => {
                  const data = universeNodes.find(n => n.id === node.id);
                  if (!data) return null;

                  const isFocused = selectedNodeId === node.id;
                  const isFilteredOut = selectedNodeCategory !== 'All' && data.category !== selectedNodeCategory;

                  // Compute colors based on trust status
                  let statusColor = 'bg-emerald-500';
                  let borderHighlight = 'border-slate-200 dark:border-slate-300';
                  let riskGlow = '';
                  
                  if (data.status === 'Needs Review') {
                    statusColor = 'bg-amber-500';
                    borderHighlight = 'border-amber-400 dark:border-amber-400 ring-1 ring-amber-400/25';
                  } else if (data.status === 'Risk Identified') {
                    statusColor = 'bg-rose-600';
                    borderHighlight = 'border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/40';
                    riskGlow = 'animate-pulse';
                  }

                  if (isFocused) {
                    borderHighlight = 'border-indigo-600 dark:border-indigo-600 ring-4 ring-indigo-500/30';
                  }

                  return (
                    <motion.button
                      key={node.id}
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        showToast(`Interrogating Passport data for ${node.label}`);
                      }}
                      className={`absolute z-10 p-3.5 rounded-xl bg-white dark:bg-white text-slate-900 dark:text-slate-900 border text-left shadow-lg transition-all cursor-pointer ${node.x} ${borderHighlight} ${
                        isFilteredOut ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusColor} ${riskGlow}`}></span>
                        <span className="text-[11px] font-black text-slate-900 font-sans tracking-tight">{node.label}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1.5 text-[9px] font-mono gap-4">
                        <span className="text-slate-500 uppercase font-bold">{node.cat}</span>
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] ${
                          data.status === 'Risk Identified' 
                            ? 'bg-rose-100 text-rose-700 font-black' 
                            : data.status === 'Needs Review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {data.metrics.security}% Sec
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* MAP FOOTER / LEGEND */}
              <div className="border-t border-slate-100 dark:border-zinc-900 pt-4 flex flex-wrap justify-between items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>🟢 Trusted</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>🟡 Needs Review</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>🔴 Risk Identified</span>
                  </span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Total mapped elements: {universeNodes.length} nodes
                </div>
              </div>

            </div>

            {/* RIGHT SIDE: EVERY SOFTWARE GETS A LIVING IDENTITY (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* DIGITAL PASSPORT CONTAINER */}
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

                {/* Passport Stamp and Identity Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                        SOFTWARE CARD & IDENTITY
                      </span>
                      <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FileSignature className="w-4.5 h-4.5 text-indigo-500" />
                        <span>{activeNode.label}</span>
                      </h3>
                    </div>

                    {/* Simple Trust Status as Business Language */}
                    <div className="text-right">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border shadow-sm ${
                        activeNode.status === 'Trusted'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : activeNode.status === 'Needs Review'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                          : 'bg-rose-600 text-white border-rose-500'
                      }`}>
                        {activeNode.status === 'Trusted' ? '🟢 Trusted' : activeNode.status === 'Needs Review' ? '🟡 Needs Review' : '🔴 Risk Identified'}
                      </span>
                    </div>
                  </div>

                  {/* PASSPORT DETAIL CORE */}
                  <div className="space-y-4.5">
                    {/* What it does */}
                    <div className="space-y-1 bg-slate-50/50 dark:bg-zinc-900/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-850/50">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase block">What it does</span>
                      <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                        {activeNode.description}
                      </p>
                    </div>

                    {/* Who uses it & Importance */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50/30 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-zinc-850/30">
                        <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase block">Who uses it</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-sans">
                          {activeNode.whoUsesIt || 'No user logs'}
                        </span>
                      </div>
                      <div className="bg-slate-50/30 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-zinc-850/30">
                        <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase block">Business Importance</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-sans flex items-center gap-1">
                          ⭐ {activeNode.businessImportance}
                        </span>
                      </div>
                    </div>

                    {/* Connected Systems */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase block">Connected Systems</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeNode.connections.map((connId) => {
                          const name = universeNodes.find(n => n.id === connId)?.label || connId;
                          return (
                            <span key={connId} className="bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 text-[9px] font-mono font-bold px-2 py-1 rounded border border-slate-100 dark:border-zinc-850">
                              🔗 {name}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* SPR Recommendation Box */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100/80 dark:border-indigo-900/30 relative">
                      <span className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                        SPR RECOMMENDATION
                      </span>
                      <p className="text-xs text-slate-800 dark:text-zinc-200 font-bold font-sans">
                        {activeNode.sprRecommendation}
                      </p>
                    </div>

                    {/* Software Reputation Network (5-Year Vision) */}
                    {activeNode.globalReputation && (
                      <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                            GLOBAL REPUTATION LAYER
                          </span>
                          <span className="text-[8px] font-mono bg-indigo-950/60 text-indigo-400 border border-indigo-900/40 px-1.5 py-0.5 rounded font-bold">
                            FUTURE NETWORK
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-400">Global Adoption:</span>
                            <span className="font-bold text-white">{activeNode.globalReputation.adoption}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-400">Stability:</span>
                            <span className="font-bold text-white">{activeNode.globalReputation.stability}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-400">Maturity:</span>
                            <span className="font-bold text-white">{activeNode.globalReputation.maturity}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span className="text-slate-400">Confidence:</span>
                            <span className="font-bold text-indigo-400">{activeNode.globalReputation.confidence}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TRUST HEALTH BARS */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-900">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase block">Trust Health Breakdown</span>
                      
                      {/* Security bar */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-500 dark:text-zinc-400">Security Score</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{activeNode.metrics.security}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              activeNode.metrics.security > 80 ? 'bg-emerald-500' : activeNode.metrics.security > 60 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${activeNode.metrics.security}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Reliability bar */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-500 dark:text-zinc-400">Uptime Reliability</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{activeNode.metrics.reliability}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${activeNode.metrics.reliability}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Transparency bar */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-500 dark:text-zinc-400">Vendor Transparency</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{activeNode.metrics.transparency}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-400 transition-all duration-500"
                            style={{ width: `${activeNode.metrics.transparency}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* THE "EXPLAIN THIS" ACTION BUTTON */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-900">
                  <button
                    onClick={() => setIsExplainModalOpen(true)}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <HelpCircle className="w-4.5 h-4.5 text-indigo-500" />
                    <span>Explain this (Why does this exist?)</span>
                  </button>
                </div>

              </div>

            </div>

          </div>

          {/* DYNAMIC MODAL: EXPLAIN MY TECHNOLOGY (No developer jargon!) */}
          <AnimatePresence>
            {isExplainModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left font-sans"
                >
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                        Explaining {activeNode.label} for Business Leaders
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsExplainModalOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-zinc-900/60 p-4.5 rounded-2xl border border-slate-100 dark:border-zinc-850">
                      <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed italic">
                        "{activeNode.humanExplanation}"
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase block">Why this matters:</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-600 dark:text-zinc-400 font-sans leading-relaxed">
                        <li>Eliminates complex tech jargon so management can make rapid procurement decisions.</li>
                        <li>Traces immediate business impacts (e.g. replacing this application would lock up operational pipelines).</li>
                        <li>Drives visibility into cost-sprawl and vendor reputation records on ledger.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-900 flex justify-end">
                    <button
                      onClick={() => setIsExplainModalOpen(false)}
                      className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                    >
                      Understood, Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* THE TRUST ADVISOR (FLOATING / COLLAPSIBLE PANEL) */}
          <div className="bg-[#111625] border border-slate-800/80 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row gap-6 justify-between items-stretch">
              {/* Advisor Pitch */}
              <div className="space-y-3.5 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider">
                    MAIN ADVISOR CORE
                  </span>
                </div>
                <h3 className="text-base font-display font-black text-white">
                  SPR Advisor
                </h3>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  “I know your software environment. Ask me anything.”
                </p>

                {/* Presets Grid */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Quick Inquiries</span>
                  <div className="flex flex-wrap gap-1.5">
                    {advisorPresets.map((p) => (
                      <button
                        key={p}
                        onClick={() => handleAskAdvisor(p)}
                        className="bg-[#1a2035] hover:bg-indigo-900/40 text-slate-200 hover:text-white border border-slate-750 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer text-left shadow-sm"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat Thread Area */}
              <div className="flex-1 bg-[#0a0e1a] border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between min-h-[220px]">
                <div className="space-y-3.5 max-h-44 overflow-y-auto pr-1">
                  {advisorResponses.map((res, idx) => (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-indigo-400 font-bold uppercase">[You Asked]</span>
                        <p className="font-bold text-slate-200">{res.query}</p>
                      </div>
                      <div className="bg-[#111625] border border-slate-800/60 p-3 rounded-xl text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                        {res.reply}
                      </div>
                    </div>
                  ))}
                  {isAdvisorLoading && (
                    <div className="flex items-center gap-2.5 text-indigo-400 text-xs font-mono">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                      <span>Advisor analyzing SBOM indexes...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskAdvisor(advisorQuery);
                  }}
                  className="flex gap-2 border-t border-slate-800/80 pt-3 mt-3"
                >
                  <input
                    type="text"
                    placeholder="Ask Advisor: 'What is our compliance index?' or 'Are we audit ready?'"
                    value={advisorQuery}
                    onChange={(e) => setAdvisorQuery(e.target.value)}
                    className="flex-1 bg-[#151b2d] border border-slate-700/80 text-xs rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4.5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm text-xs flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>Ask Advisor</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* THE FUTURE MARKETPLACE (MANAGING YOUR TECHNOLOGY INTEGRATIONS) */}
          <div className="space-y-4">
            <div className="space-y-1 text-left">
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                Continuous Integration Portal
              </span>
              <h3 className="text-base font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                <span>The Future Technology Marketplace</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Acquire continuous auditing modules to track licensing, cost-sprawl, or sovereign container changes securely.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {marketplaceItems.map((cat, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl p-4.5 space-y-4 shadow-sm text-left">
                  <span className="text-[10px] font-mono font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block border-b border-slate-100 dark:border-zinc-900 pb-2">
                    {cat.category}
                  </span>
                  
                  <div className="space-y-3">
                    {cat.items.map((item, idy) => {
                      const isAcquired = purchasedExtensions[item.name] || item.cost === 'Included';
                      return (
                        <div key={idy} className="bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-100/50 dark:border-zinc-850/60 flex flex-col justify-between gap-2.5 min-h-[110px]">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs leading-tight">{item.name}</h4>
                              <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">{item.cost}</span>
                            </div>
                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-sans mt-1 leading-normal">{item.desc}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/40 dark:border-zinc-800/40">
                            <span className="text-[8px] font-mono text-slate-400">Impact: {item.impact}</span>
                            <button
                              onClick={() => {
                                if (isAcquired) return;
                                setPurchasedExtensions(prev => ({ ...prev, [item.name]: true }));
                                showToast(`Activated dynamic extension: ${item.name}! Added to ledger.`);
                              }}
                              className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                                isAcquired 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' 
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                            >
                              {isAcquired ? 'Active' : 'Acquire'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* THE 5-YEAR VISION BRAND CARD */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden text-left text-white">
            <div className="space-y-2 max-w-2xl">
              <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider">
                THE 5-YEAR VISION FOR SPR PASSPORTS
              </span>
              <h3 className="text-base font-display font-black text-slate-100">
                A Permanent Trust Identity for the Technology Era
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Just like SSL certificates protect website transit or credit scores rate company solvency, the SPR Software Passport is becoming the universal standard before purchasing any technology asset. We make the invisible visible.
              </p>
            </div>
            
            <div className="flex gap-4 items-center shrink-0">
              <div className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-center shadow-xl">
                <span className="text-[10px] font-mono text-indigo-400 uppercase block font-bold">SSL Certificate</span>
                <p className="text-xs text-slate-500 font-medium mt-1">For Websites</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-center shadow-xl">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block font-bold">SPR Passport</span>
                <p className="text-xs text-slate-500 font-medium mt-1">For Enterprise Trust</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
