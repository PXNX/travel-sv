import { test, expect } from '@playwright/test';

// T69 — E2E: full journey creation flow
test.describe('Journey creation flow', () => {
    test('create → add stops → reorder → save', async ({ page }) => {
        // This test requires auth setup — use a test account or mock session
        test.skip(true, 'Requires auth setup for CI');

        await page.goto('/');
        await page.click('text=New Journey');
        await expect(page).toHaveURL(/\/journeys\/\d+/);

        // Add first stop
        await page.click('text=Add Stop');
        await page.fill('input[placeholder="Search for a place..."]', 'Berlin');
        await page.waitForSelector('.menu button');
        await page.click('.menu button >> nth=0');

        // Verify stop was added
        await expect(page.locator('.card')).toHaveCount(1);
    });
});

// T70 — E2E: auth redirect flow
test.describe('Auth redirect flow', () => {
    test('unauthenticated user is redirected to login', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('login page has next param', async ({ page }) => {
        await page.goto('/journeys/1');
        await expect(page).toHaveURL(/\/auth\/login\?next=/);
    });
});

// T56 — E2E: share journey
test.describe('Share journey', () => {
    test('publish journey → open share link → verify read-only', async ({ page }) => {
        test.skip(true, 'Requires auth setup and published journey');
    });
});

// T57 — E2E: import journey
test.describe('Import journey', () => {
    test('import journey as different user → verify new ownership', async ({ page }) => {
        test.skip(true, 'Requires two test accounts');
    });
});

// T63 — E2E: offline behavior
test.describe('Offline behavior', () => {
    test('offline → journey renders from cache → editor redirects to read view', async ({
        page,
        context
    }) => {
        test.skip(true, 'Requires auth and cached journey data');
    });
});

// T71 — E2E: share → import → verify copy is independent
test.describe('Share → Import → Independence', () => {
    test('imported journey is independent of original', async ({ page }) => {
        test.skip(true, 'Requires two test accounts');
    });
});
