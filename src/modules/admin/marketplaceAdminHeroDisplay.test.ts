import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ADMIN = readFileSync('src/modules/admin/MarketplaceAdmin.js', 'utf8');
const STATE = readFileSync('src/store/stateEngine.js', 'utf8');

describe('Marketplace Admin hero image display controls', () => {
  it('lets admins tune each hero image without replacing the banner', () => {
    expect(ADMIN).toContain('class="btn btn-sm btn-secondary edit-banner-display-btn"');
    expect(ADMIN).toContain('function promptBannerDisplayEdit');
    expect(ADMIN).toContain('stateEngine.updateBannerDisplay');
    expect(ADMIN).toContain('data-hero-key="fit"');
    expect(ADMIN).toContain('data-hero-key="position"');
    expect(ADMIN).toContain('data-hero-key="scale"');
    expect(ADMIN).toContain('data-hero-key="x"');
    expect(ADMIN).toContain('data-hero-key="y"');
    expect(ADMIN).toContain("['fill', 'Fill']");
    expect(ADMIN).toContain("['cover', 'Cover']");
    expect(ADMIN).toContain("['contain', 'Contain']");
  });

  it('sends display settings when creating and patching hero slides', () => {
    expect(STATE).toContain('async createBanner(title, imageUrl, { targetUrl = null, display = null } = {})');
    expect(STATE).toContain('api.post(\'/advertisements\', { title, imageUrl, targetUrl, display })');
    expect(STATE).toContain('async updateBannerDisplay(bannerId, display)');
    expect(STATE).toContain('api.patch(`/advertisements/${bannerId}/display`, { display })');
  });
});
