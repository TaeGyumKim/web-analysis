#!/usr/bin/env node

/**
 * Web Performance Analysis CLI
 *
 * Usage:
 *   web-analysis <url> [options]
 *
 * Options:
 *   --output, -o      Output format (json|html|markdown) [default: json]
 *   --file, -f        Output file path
 *   --threshold       Performance score threshold (0-100) [default: 75]
 *   --network         Network throttling (none|slow-3g|fast-3g|4g) [default: none]
 *   --device          Device type (desktop|mobile-high|mobile-mid|mobile-low) [default: desktop]
 *   --timeout         Page load timeout in ms [default: 60000]
 *   --lighthouse      Enable Lighthouse audit
 *   --no-screenshots  Disable screenshot capture
 *   --help, -h        Show help
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: null,
    output: 'json',
    file: null,
    threshold: 75,
    network: 'none',
    device: 'desktop',
    timeout: 60000,
    lighthouse: false,
    screenshots: true,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (arg === '--threshold') {
      options.threshold = parseInt(args[++i], 10);
    } else if (arg === '--network') {
      options.network = args[++i];
    } else if (arg === '--device') {
      options.device = args[++i];
    } else if (arg === '--timeout') {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--lighthouse') {
      options.lighthouse = true;
    } else if (arg === '--no-screenshots') {
      options.screenshots = false;
    } else if (!arg.startsWith('-')) {
      options.url = arg;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Web Performance Analysis CLI

Usage:
  web-analysis <url> [options]

Options:
  --output, -o <format>    Output format (json|html|markdown) [default: json]
  --file, -f <path>        Output file path
  --threshold <score>      Performance score threshold (0-100) [default: 75]
  --network <type>         Network throttling (none|slow-3g|fast-3g|4g) [default: none]
  --device <type>          Device type (desktop|mobile-high|mobile-mid|mobile-low) [default: desktop]
  --timeout <ms>           Page load timeout in milliseconds [default: 60000]
  --lighthouse             Enable Lighthouse audit
  --no-screenshots         Disable screenshot capture
  --help, -h               Show this help message

Examples:
  # Analyze a website with default settings
  web-analysis https://example.com

  # Analyze with custom threshold and output
  web-analysis https://example.com --threshold 80 --output markdown --file report.md

  # Analyze with Lighthouse and network throttling
  web-analysis https://example.com --lighthouse --network 4g

  # Use in CI/CD (exits with code 1 if score < threshold)
  web-analysis https://example.com --threshold 90 || exit 1

Exit Codes:
  0 - Analysis successful and score >= threshold
  1 - Analysis failed or score < threshold
  2 - Invalid arguments or configuration error
`);
}

// Get device settings
function getDeviceSettings(device) {
  const settings = {
    desktop: { cpuThrottling: 1, viewport: { width: 1920, height: 1080 } },
    'mobile-high': { cpuThrottling: 2, viewport: { width: 390, height: 844 } },
    'mobile-mid': { cpuThrottling: 4, viewport: { width: 390, height: 844 } },
    'mobile-low': { cpuThrottling: 6, viewport: { width: 360, height: 800 } }
  };
  return settings[device] || settings.desktop;
}

// Map network throttling
function mapNetworkThrottling(network) {
  const mapping = {
    'slow-3g': 'slow-3g',
    '3g': 'fast-3g',
    'fast-3g': 'fast-3g',
    '4g': '4g',
    none: 'none'
  };
  return mapping[network] || 'none';
}

// Start Nuxt server if not running
async function ensureServerRunning() {
  return new Promise((resolve) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      console.log('Starting Nuxt server...');
      const server = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        detached: true
      });

      server.unref();

      // Wait for server to start
      setTimeout(() => resolve(true), 10000);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Perform analysis
async function analyze(url, options) {
  const http = require('http');

  const deviceSettings = getDeviceSettings(options.device);
  const requestData = JSON.stringify({
    url,
    options: {
      captureScreenshots: options.screenshots,
      networkThrottling: mapNetworkThrottling(options.network),
      cpuThrottling: deviceSettings.cpuThrottling,
      viewportWidth: deviceSettings.viewport.width,
      viewportHeight: deviceSettings.viewport.height,
      timeout: options.timeout,
      useLighthouse: options.lighthouse,
      waitUntil: 'networkidle0'
    }
  });

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/analyze',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        },
        timeout: options.timeout + 30000 // Add 30s buffer
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.success) {
              resolve(result.data);
            } else {
              reject(new Error(result.error?.message || 'Analysis failed'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      }
    );

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Analysis timed out'));
    });

    req.write(requestData);
    req.end();
  });
}

// Format output
function formatOutput(result, format) {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'markdown') {
    const score = result.performanceScore.overall;
    const metrics = result.metrics;

    return `# Performance Analysis Report

**URL:** ${result.url}
**Timestamp:** ${new Date(result.timestamp).toLocaleString()}
**Overall Score:** ${score.toFixed(0)}/100

## Core Web Vitals

| Metric | Value | Status |
|--------|-------|--------|
| FCP | ${metrics.fcp?.toFixed(0) || 'N/A'}ms | ${getStatus(metrics.fcp, 1800)} |
| LCP | ${metrics.lcp?.toFixed(0) || 'N/A'}ms | ${getStatus(metrics.lcp, 2500)} |
| TBT | ${metrics.tbt?.toFixed(0) || 'N/A'}ms | ${getStatus(metrics.tbt, 200)} |
| CLS | ${metrics.cls?.toFixed(3) || 'N/A'} | ${getStatus(metrics.cls, 0.1)} |
| TTFB | ${metrics.ttfb?.toFixed(0) || 'N/A'}ms | ${getStatus(metrics.ttfb, 800)} |

## Network Summary

- **Total Requests:** ${result.networkRequests.length}
- **Total Size:** ${formatBytes(getTotalSize(result))}
- **Load Time:** ${result.runningTime}ms

${result.lighthouse ? `
## Lighthouse Scores

- **Performance:** ${result.lighthouse.scores.performance}/100
- **Accessibility:** ${result.lighthouse.scores.accessibility}/100
- **Best Practices:** ${result.lighthouse.scores.bestPractices}/100
- **SEO:** ${result.lighthouse.scores.seo}/100
` : ''}
`;
  }

  return JSON.stringify(result, null, 2);
}

function getStatus(value, threshold) {
  if (!value) return '⚪ N/A';
  return value <= threshold ? '✅ Good' : '⚠️ Needs Improvement';
}

function getTotalSize(result) {
  return result.networkRequests.reduce((sum, req) => sum + (req.size || 0), 0);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Main function
async function main() {
  const options = parseArgs();

  if (options.help || !options.url) {
    showHelp();
    process.exit(options.url ? 0 : 2);
  }

  console.log(`🔍 Analyzing: ${options.url}`);
  console.log(`📊 Threshold: ${options.threshold}/100`);
  console.log('');

  try {
    // Ensure server is running
    await ensureServerRunning();

    // Perform analysis
    const result = await analyze(options.url, options);

    const score = result.performanceScore.overall;
    const passed = score >= options.threshold;

    console.log(`✅ Analysis complete!`);
    console.log(`📈 Performance Score: ${score.toFixed(0)}/100`);
    console.log('');

    // Format and output result
    const output = formatOutput(result, options.output);

    if (options.file) {
      fs.writeFileSync(options.file, output, 'utf8');
      console.log(`💾 Report saved to: ${options.file}`);
    } else {
      console.log(output);
    }

    if (!passed) {
      console.error('');
      console.error(
        `❌ Performance score ${score.toFixed(0)} is below threshold ${options.threshold}`
      );
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run
main();
