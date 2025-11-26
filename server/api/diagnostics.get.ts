import { existsSync } from 'fs';

export default defineEventHandler(async () => {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      CHROME_PATH: process.env.CHROME_PATH,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
    },
    paths: {} as Record<string, boolean>,
    dependencies: {} as Record<string, unknown>
  };

  // Check critical paths
  const pathsToCheck = [
    '/usr/bin/chromium-browser',
    '/app/node_modules/lighthouse',
    '/app/node_modules/puppeteer',
    '/app/node_modules/axe-core',
    '/app/node_modules/http-link-header',
    '/app/.output/server/node_modules/lighthouse',
    '/app/.output/server/node_modules/axe-core',
    '/app/.output/server/node_modules/http-link-header',
    '/app/.data/history'
  ];

  for (const path of pathsToCheck) {
    diagnostics.paths[path] = existsSync(path);
  }

  // Check if we can import critical modules
  try {
    const puppeteer = await import('puppeteer');
    diagnostics.dependencies.puppeteer = {
      available: true,
      executablePath: puppeteer.executablePath ? puppeteer.executablePath() : 'not found'
    };
  } catch (error) {
    diagnostics.dependencies.puppeteer = {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  try {
    await import('lighthouse');
    diagnostics.dependencies.lighthouse = { available: true };
  } catch (error) {
    diagnostics.dependencies.lighthouse = {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  try {
    await import('chrome-launcher');
    diagnostics.dependencies.chromeLauncher = { available: true };
  } catch (error) {
    diagnostics.dependencies.chromeLauncher = {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check if Chromium can be launched
  try {
    const puppeteer = await import('puppeteer');
    const execPath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_PATH ||
      puppeteer.executablePath();

    diagnostics.chromium = {
      executablePath: execPath,
      exists: existsSync(execPath)
    };

    // Try to launch (but don't keep it running)
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: execPath || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      await browser.close();
      diagnostics.chromium.canLaunch = true;
    } catch (launchError) {
      diagnostics.chromium.canLaunch = false;
      diagnostics.chromium.launchError =
        launchError instanceof Error ? launchError.message : 'Unknown error';
    }
  } catch (error) {
    diagnostics.chromium = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return diagnostics;
});
