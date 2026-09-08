import fs from 'node:fs';
import path from 'node:path';

// Customer-facing report surfaces only. Infrastructure localhost values are not
// report/customer evidence and are intentionally outside this regression scan.
const sourceRoots = ['src/components/ReportsView.tsx', 'src/components/PassportsView.tsx', 'src/utils/pdfGenerator.ts'];
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs']);

const forbidden = [
  ['Aegis Cyber Solutions', 'hardcoded MSP identity'],
  ['10.0.4.12', 'synthetic private IP'],
  ['127.0.0.1', 'synthetic loopback IP in customer-facing report surface'],
  ['patchedCves = 32', 'hardcoded CVE metric'],
  ['CERTIFIED COMPLIANCE', 'unsupported certification wording'],
  ['Certified Controls', 'unsupported certification wording'],
  ['setTimeout(() => {', 'simulated report completion'],
];

const requiredReportProducts = [
  'Free Software Trust Snapshot', 'Software Trust & Security Report', 'MSP Client Security & Compliance Report',
  'Vendor Risk Portfolio', 'Compliance Evidence Report', 'Vulnerability Findings Report', '30-Day Audit Evidence Export',
  'MSP Executive Portfolio Report', 'Passport Evidence Report', 'MSP Co-Branded Trust Report', 'Executive JSON Export',
  'Multi-Tenant Executive CSV', 'Dynamic Compliance PDF', 'Dynamic Compliance CSV',
];

function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return extensions.has(path.extname(target)) ? [target] : [];
  const out = [];
  for (const entry of fs.readdirSync(target)) out.push(...collectFiles(path.join(target, entry)));
  return out;
}

const files = sourceRoots.flatMap(collectFiles);
const errors = [];
const texts = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8'); texts.set(file, text);
  for (const [needle, reason] of forbidden) if (text.includes(needle)) errors.push(`${file}: ${reason} (${needle})`);
}

const reportsView = texts.get('src/components/ReportsView.tsx') || '';
const pdfGenerator = texts.get('src/utils/pdfGenerator.ts') || '';
if (!pdfGenerator.includes('export function generateReportPDF')) errors.push('pdfGenerator.ts: canonical report generator missing');
if (!pdfGenerator.includes('export function generatePassportEvidenceReport')) errors.push('pdfGenerator.ts: passport evidence generator missing');
if (!reportsView.includes('generateReportPDF')) errors.push('ReportsView.tsx: report products are not wired to the canonical generator');
for (const product of requiredReportProducts) if (!reportsView.includes(product) && !pdfGenerator.includes(product)) errors.push(`report catalog: missing explicit product '${product}'`);

if (errors.length) {
  console.error('REPORT HARDENING GATE: FAIL'); for (const error of errors) console.error(`- ${error}`); process.exit(1);
}
console.log(`REPORT HARDENING GATE: PASS (${files.length} customer-facing report files scanned)`);
