import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Web Performance Analyzer
 * Tests all 7 tabs with real URL analysis
 */

const TEST_URL = 'https://example.com'; // Simple, fast test URL
const ANALYSIS_TIMEOUT = 90000; // 90 seconds for complete analysis

test.describe('Web Performance Analyzer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the analyzer
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Web Performance Analyzer');
  });

  test('should load the homepage successfully', async ({ page }) => {
    // Check that main elements are visible
    const urlInput = page.locator('input[placeholder*="URL"]');
    await expect(urlInput).toBeVisible();

    const startButton = page.locator('button').filter({ hasText: '시작' });
    await expect(startButton).toBeVisible();

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/screenshots/01-homepage.png',
      fullPage: true
    });
  });

  test('should perform analysis and capture all 7 tabs', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes timeout for this test

    // Configure analysis options - find selects by their nearby text
    const networkSelect = page.locator('select').first();
    await networkSelect.selectOption({ index: 1 }); // 4G or similar

    const deviceSelect = page.locator('select').nth(1);
    await deviceSelect.selectOption({ index: 0 }); // Desktop

    // Enter test URL
    const urlInput = page.locator('input[placeholder*="URL"]').or(
      page.locator('input[type="text"]').first()
    );
    await urlInput.fill(TEST_URL);
    await urlInput.press('Enter'); // Sometimes helps to trigger validation

    // Take screenshot of configured state
    await page.screenshot({
      path: 'test-results/screenshots/02-configured.png',
      fullPage: true
    });

    // Find and click the start button
    const startButton = page.locator('button').filter({ hasText: '시작' });
    await startButton.click();

    // Wait for analysis to start - look for loading indicators or tab changes
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'test-results/screenshots/03-analysis-started.png',
      fullPage: true
    });

    // Wait for analysis to complete
    // Strategy: Check if content appears in tabs or wait for longer period
    console.log('Waiting for analysis to complete...');

    // Wait long enough for example.com to be analyzed
    await page.waitForTimeout(20000); // 20 seconds should be enough for example.com

    // Additional wait for UI to stabilize
    await page.waitForTimeout(3000);

    console.log('Analysis should be complete, capturing tabs...');

    // Tab 1: 프레임 분석 (Frame Analysis)
    await test.step('Tab 1: Frame Analysis', async () => {
      const frameTab = page.locator('.tab').filter({ hasText: '프레임 분석' });
      if (await frameTab.count() > 0) {
        await frameTab.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({
        path: 'test-results/screenshots/04-tab1-frame-analysis.png',
        fullPage: true
      });
    });

    // Tab 2: 네트워크 타임라인 (Network Timeline)
    await test.step('Tab 2: Network Timeline', async () => {
      const networkTab = page.locator('.tab').filter({ hasText: '네트워크 타임라인' });
      if (await networkTab.count() > 0) {
        await networkTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/05-tab2-network-timeline.png',
        fullPage: true
      });
    });

    // Tab 3: 로딩 분포 (Loading Distribution)
    await test.step('Tab 3: Loading Distribution', async () => {
      const loadingTab = page.locator('.tab').filter({ hasText: '로딩 분포' });
      if (await loadingTab.count() > 0) {
        await loadingTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/06-tab3-loading-distribution.png',
        fullPage: true
      });
    });

    // Tab 4: 일괄 분석 (Batch Analysis)
    await test.step('Tab 4: Batch Analysis', async () => {
      const batchTab = page.locator('.tab').filter({ hasText: '일괄 분석' });
      if (await batchTab.count() > 0) {
        await batchTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/07-tab4-batch-analysis.png',
        fullPage: true
      });
    });

    // Tab 5: 분석 이력 (History)
    await test.step('Tab 5: History', async () => {
      const historyTab = page.locator('.tab').filter({ hasText: '분석 이력' });
      if (await historyTab.count() > 0) {
        await historyTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/08-tab5-history.png',
        fullPage: true
      });
    });

    // Tab 6: 성능 예산 (Performance Budget)
    await test.step('Tab 6: Performance Budget', async () => {
      const budgetTab = page.locator('.tab').filter({ hasText: '성능 예산' });
      if (await budgetTab.count() > 0) {
        await budgetTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/09-tab6-performance-budget.png',
        fullPage: true
      });
    });

    // Tab 7: Lighthouse
    await test.step('Tab 7: Lighthouse', async () => {
      const lighthouseTab = page.locator('.tab').filter({ hasText: 'Lighthouse' });
      if (await lighthouseTab.count() > 0) {
        await lighthouseTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/10-tab7-lighthouse.png',
        fullPage: true
      });
    });

    // Return to first tab for final screenshot
    await test.step('Final: Return to Frame Analysis', async () => {
      const frameTab = page.locator('.tab').filter({ hasText: '프레임 분석' });
      if (await frameTab.count() > 0) {
        await frameTab.click();
        await page.waitForTimeout(1500);
      }

      await page.screenshot({
        path: 'test-results/screenshots/11-final-state.png',
        fullPage: true
      });
    });
  });

  test('should display all UI elements correctly', async ({ page }) => {
    // Test that all major UI components are present
    const urlInput = page.locator('input[placeholder*="URL"]').or(
      page.locator('input[type="text"]').first()
    );
    await expect(urlInput).toBeVisible();

    // Check for select dropdowns
    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(2);

    // Check for start button
    const startButton = page.locator('button').filter({ hasText: '시작' });
    await expect(startButton).toBeVisible();

    // Check for tabs
    const tabs = page.locator('.tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(7);

    await page.screenshot({
      path: 'test-results/screenshots/12-ui-elements.png',
      fullPage: true
    });
  });

  test('should navigate between tabs without analysis', async ({ page }) => {
    // Test tab navigation without running analysis
    const tabNames = [
      '프레임 분석',
      '네트워크 타임라인',
      '로딩 분포',
      '일괄 분석',
      '분석 이력',
      '성능 예산',
      'Lighthouse'
    ];

    let screenshotIndex = 13;
    for (const tabName of tabNames) {
      const tab = page.locator('.tab').filter({ hasText: tabName });
      if (await tab.count() > 0) {
        await tab.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `test-results/screenshots/${screenshotIndex}-empty-${tabName.replace(/\s+/g, '-')}.png`,
          fullPage: true
        });
        screenshotIndex++;
      }
    }
  });
});
