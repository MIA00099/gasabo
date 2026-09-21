import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const REAL_ESTATE_VIEW = readFileSync('src/modules/realestate/RealEstateView.js', 'utf8');

describe('Gasabo real estate property detail scrolling', () => {
  it('uses a mobile viewport aware scroll overlay for property pages', () => {
    expect(REAL_ESTATE_VIEW).toContain('PROPERTY_DETAIL_OVERLAY_STYLE');
    expect(REAL_ESTATE_VIEW).toContain('height: 100dvh');
    expect(REAL_ESTATE_VIEW).toContain('max-height: 100dvh');
    expect(REAL_ESTATE_VIEW).toContain('-webkit-overflow-scrolling: touch');
    expect(REAL_ESTATE_VIEW).toContain('overscroll-behavior-y: contain');
    expect(REAL_ESTATE_VIEW).toContain('touch-action: pan-y');
  });
});
