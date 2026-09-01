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
    expect(SRC).toContain('id="jobs-post-job-btn"');
    expect(SRC).toContain('Post a Job');
    expect(SRC).toContain('id="jobs-become-worker-btn"');
    expect(SRC).toContain('Become a Worker');
  });

  it('wires the buttons to existing post-ad and signup routes', () => {
    expect(SRC).toContain("stateEngine.setUI({ authIntent: 'post_job' })");
    expect(SRC).toContain('pathForRoute(ROUTE_POST_AD)');
    expect(SRC).toContain('stateEngine.setRoute({ kind: ROUTE_POST_AD, id: null })');
    expect(SRC).toContain("stateEngine.setUI({ authIntent: 'worker' })");
    expect(SRC).toContain('pathForRoute(ROUTE_AUTH)');
    expect(SRC).toContain("stateEngine.setPortal('signup')");
  });
});
