import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(path.join(root, 'src/components/PartnerProgramView.tsx'), 'utf8');
const sidebar = readFileSync(path.join(root, 'src/components/Sidebar.tsx'), 'utf8');
const app = readFileSync(path.join(root, 'src/App.tsx'), 'utf8');

describe('MSP Partner Program page', () => {
  it('is available through the existing application navigation', () => {
    expect(sidebar).toContain("id: 'partner-program'");
    expect(app).toContain("activeTab === 'partner-program'");
    expect(app).toContain('<PartnerProgramView />');
  });

  it('contains the required evidence-first positioning and clean-scan language', () => {
    expect(page).toContain('If SPR cannot observe it, SPR does not claim it.');
    expect(page).toContain('No known vulnerabilities were returned by the configured provider for the observed components and versions at the time of the scan.');
    expect(page).toContain('What SPR observes');
    expect(page).toContain('What SPR does not claim');
    expect(page).toContain('SPR compared with a standard vulnerability scanner');
  });

  it('marks unavailable MSP product capabilities as planned', () => {
    expect(page).toContain('White-label and co-branded report templates are not currently verified');
    expect(page).toContain('repository schedules, automated alerts, co-branded exports, and integrated recurring billing');
    expect(page.match(/Planned/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('does not include prohibited outcome claims or fabricated social proof', () => {
    expect(page).not.toMatch(/Fully secure|Guaranteed compliant|Certified secure|No vulnerabilities exist|100% trusted|Unhackable/i);
    expect(page).not.toMatch(/testimonial|customers trust|revenue generated|SOC 2 certified/i);
  });

  it('states that the CTA opens email rather than claiming backend persistence', () => {
    expect(page).toContain('mailto:stackdigitz@gmail.com');
    expect(page).toContain('does not silently save or submit data to SPR');
  });
});
