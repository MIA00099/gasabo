/**
 * Jobs is a marketplace catalog context, not a separate backend model yet.
 * The catalog still needs clear entry points for posting work and joining as
 * a worker, both backed by existing routes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/modules/marketplace/ProductsPage.js', 'utf8');

describe('ProductsPage jobs actions', () => {
  it('detects the Jobs catalog by category name or shortcut search', () => {
    expect(SRC).toContain('const jobsPattern = /\\b(job|jobs|employ|career|vacanc|worker)\\b/i;');
    expect(SRC).toContain("const isJobsView = jobsPattern.test(activeCat?.name || '') || jobsPattern.test(filters.searchQuery || '');");
    expect(SRC).toContain("isJobsView ? 'Jobs' : 'All Categories'");
  });

  it('renders clear jobs calls to action', () => {
    expect(SRC).toContain('jobs-action-buttons');
    expect(SRC).toContain('id="jobs-post-job-btn"');
    expect(SRC).toContain('Post a Job');
    expect(SRC).toContain('id="jobs-become-worker-btn"');
    expect(SRC).toContain('Become a Worker');
    expect(SRC).toContain('min-w-[190px]');
  });

  it('wires job posting to seller posting and keeps workers in the jobs list', () => {
    expect(SRC).toContain("stateEngine.setUI({ authIntent: 'post_job', sellerDashboardTab: 'new_product', productAdType: 'job', jobsNotice: '' })");
    expect(SRC).toContain('pathForRoute(ROUTE_POST_AD)');
    expect(SRC).toContain('stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null })');
    expect(SRC).toContain('Employers post jobs from a seller account.');
    expect(SRC).toContain('Worker accounts are not separate yet.');
    expect(SRC).not.toContain("authIntent: 'worker'");
    expect(SRC).not.toContain('ROUTE_AUTH');
    expect(SRC).not.toContain("stateEngine.setPortal('signup')");
  });
});
