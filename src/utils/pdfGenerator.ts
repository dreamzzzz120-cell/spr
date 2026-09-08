import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client } from '../types';

export type ReportType = 'rep-ceo' | 'rep-investor' | 'rep-auditor' | 'rep-vuln' | 'dynamic-compliance';

const REPORT_TITLES: Record<ReportType, string> = {
  'rep-ceo': 'Executive Trust Summary',
  'rep-investor': 'Vendor Risk Portfolio',
  'rep-auditor': 'Compliance Evidence Report',
  'rep-vuln': 'Vulnerability Findings Summary',
  'dynamic-compliance': 'MSP Client Security & Compliance Report',
};

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
}

function valueOrUnavailable(value: unknown) {
  return value === null || value === undefined || value === '' ? 'Not available' : String(value);
}

function addHeader(doc: jsPDF, title: string, client: Client) {
  const generatedAt = new Date().toISOString();
  doc.setFillColor(15, 23, 42);
  doc.rect(15, 15, 180, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SOFTWARE PASSPORT REGISTRY', 21, 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(title, 21, 35);
  doc.text(`Generated ${generatedAt}`, 21, 41);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(`Tenant: ${valueOrUnavailable(client.name)} | Domain: ${valueOrUnavailable(client.domain)}`, 15, 53);
}

function addEvidenceNotice(doc: jsPDF, y: number) {
  doc.setFillColor(245, 158, 11);
  doc.rect(15, y, 180, 18, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('EVIDENCE-FIRST REPORT', 20, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('SPR reports observed, reported, derived, unverified and missing evidence. It does not issue regulatory certification.', 20, y + 13);
  return y + 25;
}

export function generateReportPDF(client: Client, reportType: ReportType) {
  const doc = new jsPDF('p', 'mm', 'a4');
  addHeader(doc, REPORT_TITLES[reportType], client);
  let y = addEvidenceNotice(doc, 59);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Observed / Reported Posture', 15, y);
  y += 7;
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Evidence state']],
    body: [
      ['Trust score', valueOrUnavailable(client.trustScore), 'REPORTED / DERIVED'],
      ['Compliance progress', valueOrUnavailable(client.complianceProgress), 'REPORTED / DERIVED'],
      ['Risk level', valueOrUnavailable(client.riskLevel), 'REPORTED'],
      ['Critical risks', valueOrUnavailable(client.criticalRisksCount), 'REPORTED'],
      ['Software passports', String(client.softwareInventory?.length || 0), 'OBSERVED IN INVENTORY'],
    ],
    theme: 'grid',
    styles: { fontSize: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (reportType === 'rep-auditor' || reportType === 'dynamic-compliance') {
    doc.setFont('helvetica', 'bold');
    doc.text('Reported Compliance Frameworks', 15, y);
    y += 5;
    const frameworks = client.complianceStatus || [];
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Framework', 'Progress', 'Controls', 'Reported status']],
      body: frameworks.length ? frameworks.map(f => [valueOrUnavailable(f.code), valueOrUnavailable(f.name), valueOrUnavailable(f.progress), `${valueOrUnavailable(f.compliantControls)} / ${valueOrUnavailable(f.totalControls)}`, valueOrUnavailable(f.status)]) : [['Not available', 'No framework evidence recorded', 'Not available', 'Not available', 'MISSING EVIDENCE']],
      theme: 'grid', styles: { fontSize: 7 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (reportType === 'rep-investor' || reportType === 'dynamic-compliance') {
    doc.setFont('helvetica', 'bold');
    doc.text('Software Inventory / Vendor Risk', 15, y);
    y += 5;
    const inventory = client.softwareInventory || [];
    autoTable(doc, {
      startY: y,
      head: [['Software', 'Version', 'Last scan', 'Trust score', 'Risk']],
      body: inventory.length ? inventory.map(i => [valueOrUnavailable(i.name), valueOrUnavailable(i.version), valueOrUnavailable(i.lastScanDate), valueOrUnavailable(i.overallScore), valueOrUnavailable(i.riskStatus)]) : [['Not available', 'Not available', 'Not available', 'Not available', 'MISSING EVIDENCE']],
      theme: 'grid', styles: { fontSize: 7 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (reportType === 'rep-vuln' || reportType === 'dynamic-compliance') {
    doc.setFont('helvetica', 'bold');
    doc.text('Vulnerability / Risk Indicators', 15, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Indicator', 'Value', 'State']],
      body: [
        ['Critical risks', valueOrUnavailable(client.criticalRisksCount), client.criticalRisksCount > 0 ? 'ACTION REQUIRED' : 'REPORTED'],
        ['Risk level', valueOrUnavailable(client.riskLevel), 'REPORTED'],
      ],
      theme: 'grid', styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Limitations & Provenance', 15, Math.min(y, 250));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const limitation = 'Metrics in this report originate from the selected persisted client/workspace record. A reported score or compliance percentage is not independently certified by this document. Missing source evidence is explicitly labelled.';
  doc.text(doc.splitTextToSize(limitation, 180), 15, Math.min(y + 6, 257));
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`SPR report version 1.0 | Generated ${new Date().toISOString()}`, 15, 290);
  doc.save(`${safeSlug(REPORT_TITLES[reportType])}-${safeSlug(client.name)}.pdf`);
}

export function generateClientCompliancePDF(client: Client) {
  generateReportPDF(client, 'dynamic-compliance');
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 15, g: 23, b: 42 };
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

export function generateCoBrandedTrustReport(
  client: Client,
  mspName: string,
  brandColorHex: string,
  customTitle: string,
  _patchedCvesCount?: number,
  _executiveSummary?: string,
  logoBase64?: string,
  includeSummary = true,
  includeMetrics = true,
  includeInventory = true,
  includeComplianceChecklist = true,
  includeSignatures = true,
  selectedAssetNames: string[] = []
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const rgb = hexToRgb(brandColorHex || '#0f172a');
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(15, 15, 180, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(customTitle || 'Software Supply Chain Trust Report', 21, 29);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Operator-provided brand: ${valueOrUnavailable(mspName)}`, 21, 38);
  doc.text(`Tenant: ${valueOrUnavailable(client.name)}`, 21, 44);
  if (logoBase64) doc.setFontSize(6);

  let y = 59;
  y = addEvidenceNotice(doc, y);
  if (includeSummary) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text('Executive evidence summary', 15, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(doc.splitTextToSize('This report contains persisted client metrics and evidence-state labels. Operator branding does not alter system-observed values.', 180), 15, y); y += 15;
  }
  if (includeMetrics) {
    autoTable(doc, { startY: y, head: [['Metric', 'Value', 'State']], body: [
      ['Trust score', valueOrUnavailable(client.trustScore), 'REPORTED / DERIVED'],
      ['Compliance progress', valueOrUnavailable(client.complianceProgress), 'REPORTED / DERIVED'],
      ['Critical risks', valueOrUnavailable(client.criticalRisksCount), 'REPORTED'],
    ], theme: 'grid', styles: { fontSize: 8 } });
    y = (doc as any).lastAutoTable.finalY + 8;
  }
  if (includeInventory) {
    const selected = selectedAssetNames.length ? (client.softwareInventory || []).filter(i => selectedAssetNames.includes(i.name)) : (client.softwareInventory || []);
    autoTable(doc, { startY: y, head: [['Software', 'Version', 'Last scan', 'Score', 'Risk']], body: selected.length ? selected.map(i => [valueOrUnavailable(i.name), valueOrUnavailable(i.version), valueOrUnavailable(i.lastScanDate), valueOrUnavailable(i.overallScore), valueOrUnavailable(i.riskStatus)]) : [['Not available', 'Not available', 'Not available', 'Not available', 'MISSING EVIDENCE']], theme: 'grid', styles: { fontSize: 7 } });
    y = (doc as any).lastAutoTable.finalY + 8;
  }
  if (includeComplianceChecklist) {
    autoTable(doc, { startY: y, head: [['Framework', 'Progress', 'Controls', 'Reported status']], body: (client.complianceStatus || []).length ? client.complianceStatus.map(f => [valueOrUnavailable(f.name), valueOrUnavailable(f.progress), `${valueOrUnavailable(f.compliantControls)} / ${valueOrUnavailable(f.totalControls)}`, valueOrUnavailable(f.status)]) : [['Not available', 'Not available', 'Not available', 'MISSING EVIDENCE']], theme: 'grid', styles: { fontSize: 7 } });
    y = (doc as any).lastAutoTable.finalY + 8;
  }
  if (includeSignatures) {
    doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text('Signature / approval: ______________________________   Date: ______________', 15, Math.min(y, 275));
  }
  doc.setFontSize(6); doc.text(`SPR report version 1.0 | Generated ${new Date().toISOString()} | Operator branding is not evidence`, 15, 290);
  doc.save(`co-branded-trust-report-${safeSlug(client.name)}.pdf`);
}
