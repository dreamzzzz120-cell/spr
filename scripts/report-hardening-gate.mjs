import fs from 'node:fs';

const files = [
  'src/components/ReportsView.tsx',
  'src/utils/pdfGenerator.ts',
];

const forbidden = [
  ['Aegis Cyber Solutions', 'hardcoded MSP identity'],
  ['10.0.4.12', 'synthetic private IP'],
  ['127.0.0.1', 'synthetic loopback IP'],
  ['patchedCves = 32', 'hardcoded CVE metric'],
  ['CERTIFIED COMPLIANCE', 'unsupported certification wording'],
  ['Certified Controls', 'unsupported certification wording'],
  ['setTimeout(() => {', 'simulated report completion'],
];

const errors = [];
for (const file of files) {
  if (!fs.existsSync(file)) {
    errors.push(`${file}: missing`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const [needle, reason] of forbidden) {
    if (text.includes(needle)) errors.push(`${file}: ${reason} (${needle})`);
  }
}

if (!fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8').includes('export function generateReportPDF')) {
  errors.push('pdfGenerator.ts: canonical report generator missing');
}
if (!fs.readFileSync('src/components/ReportsView.tsx', 'utf8').includes('generateReportPDF')) {
  errors.push('ReportsView.tsx: report templates are not wired to the canonical generator');
}

if (errors.length) {
  console.error('REPORT HARDENING GATE: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('REPORT HARDENING GATE: PASS');
