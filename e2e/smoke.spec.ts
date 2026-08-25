import { test, expect } from '@playwright/test';

/**
 * Boot smoke tests for the marketplace homepage.
 *
 * The whole point of these is the failure the unit suite structurally cannot
 * see: the app rendering into a permanent loading screen because something
 * threw while building the header or view. They assert the shell actually
 * mounts and that nothing throws uncaught during boot, so a repeat of the
 * `extraCategories is not defined` outage would fail here instead of in
 * production. Everything checked below renders from the frontend alone, so the
 * run does not depend on the Express API or a database being up.
 */
test.describe('marketplace homepage boot', () => {
  test('mounts past the loading screen with a working header', async ({ page }) => {
    await page.goto('/');

    // The loading fallback must be gone and the real header nav present - i.e.
    // the app booted rather than getting stuck on the splash.
    await expect(page.locator('#header-mount nav')).toBeVisible();
    await expect(page.locator('#app-loading')).toHaveCount(0);

    // The pinned right-hand controls the header is built around.
    await expect(page.locator('#nav-link-more')).toBeVisible();
    await expect(page.locator('#header-post-ad-btn')).toBeVisible();
  });

  test('boots without any uncaught page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/');
    await expect(page.locator('#header-mount nav')).toBeVisible();
    // Give the async boot loaders a moment to run and (potentially) throw.
    await page.waitForTimeout(1500);

    expect(errors, `uncaught errors during boot:\n${errors.join('\n')}`).toEqual([]);
  });

  test('serves the marketplace title for search engines', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Kigali Market/i);
  });

  test('language switch translates the nav and back', async ({ page }) => {
    await page.goto('/');
    const firstNavItem = page.locator('#header-mount nav ul li button').first();
    await expect(firstNavItem).toHaveText('Home');

    await page.locator('.lang-pick[data-lang="rw"]').first().click();
    await expect(firstNavItem).toHaveText('Ahabanza');

    await page.locator('.lang-pick[data-lang="en"]').first().click();
    await expect(firstNavItem).toHaveText('Home');
  });
});
