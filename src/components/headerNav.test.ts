/**
 * The header and mobile tab bar tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const HEADER = readFileSync('src/components/Header.js', 'utf8');
const MAIN = readFileSync('src/main.js', 'utf8');

const markup = (src: string) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*(\/\/|\*|\/\*).*$/gm, '');

describe('the Post an Ad button', () => {
  it('wears its intended colour without being hovered', () => {
    const tag = HEADER.match(/<button[^>]*id="header-post-ad-btn"[\s\S]{0,300}?>/);
    expect(tag, 'the Post an Ad button moved').toBeTruthy();
    expect(tag![0], 'resting colour').toContain('bg-orange-500');
    expect(tag![0], 'hover colour').toContain('hover:bg-brand-orange');
  });
});

describe('a signed-in person is never offered a sign-up form', () => {
  it('routes Post an Ad and the account tab by role', () => {
    expect(MAIN).toContain('function goAccountOrSignup()');
    expect(MAIN).toContain('stateEngine.routeToDashboard()');
  });

  it('gives them a way back to their own dashboard from the shop', () => {
    expect(markup(HEADER)).toContain('id="header-dashboard-btn"');
    expect(HEADER).toContain("on('#header-dashboard-btn', 'click', goDashboard)");
    expect(MAIN).toContain('goDashboard: () => stateEngine.routeToDashboard()');
  });

  it('binds logo in Footer to return home', () => {
    const FOOTER = readFileSync('src/components/Footer.js', 'utf8');
    expect(FOOTER).toContain('id="foot-brand-home"');
    expect(FOOTER).toContain('pushHome()');
    expect(FOOTER).toContain("stateEngine.setPortal('marketplace')");
  });

  it('resets route on header and mobile navigation links', () => {
    expect(MAIN).toContain('goStores: () =>');
    expect(MAIN).toContain('goVehicles: () =>');
    expect(MAIN).toContain('goRealEstateCategory: () =>');
    expect(MAIN).toContain('goServices: () =>');
    expect(MAIN).toContain('goJobs: () =>');
    const STATE_ENGINE = readFileSync('src/store/stateEngine.js', 'utf8');
    expect(STATE_ENGINE).toContain("if (portalName !== 'marketplace' && this.data.route?.kind === ROUTE_PRODUCT)");
  });
});
