# CLI Tool Documentation

Web Performance Analysis를 명령줄에서 실행할 수 있는 CLI 도구입니다. CI/CD 파이프라인에 통합하여 자동화된 성능 테스트를 수행할 수 있습니다.

## Installation

### Local Installation

```bash
npm install
npm link
```

### Global Installation

```bash
npm install -g .
```

## Usage

### Basic Usage

```bash
web-analysis <url>
```

### With Options

```bash
web-analysis https://example.com \
  --threshold 80 \
  --output markdown \
  --file report.md \
  --lighthouse \
  --network 4g
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output format (json\|html\|markdown) | `json` |
| `--file` | `-f` | Output file path | stdout |
| `--threshold` | | Performance score threshold (0-100) | `75` |
| `--network` | | Network throttling (none\|slow-3g\|fast-3g\|4g) | `none` |
| `--device` | | Device type (desktop\|mobile-high\|mobile-mid\|mobile-low) | `desktop` |
| `--timeout` | | Page load timeout in milliseconds | `60000` |
| `--lighthouse` | | Enable Lighthouse audit | `false` |
| `--no-screenshots` | | Disable screenshot capture | `false` |
| `--help` | `-h` | Show help message | |

## Examples

### 1. Basic Analysis

```bash
web-analysis https://example.com
```

출력: JSON 형식의 분석 결과를 stdout으로 출력

### 2. Save Results to File

```bash
web-analysis https://example.com --output json --file results.json
```

### 3. Generate Markdown Report

```bash
web-analysis https://example.com --output markdown --file report.md
```

### 4. With Custom Threshold

```bash
web-analysis https://example.com --threshold 90
```

성능 점수가 90점 미만이면 exit code 1로 종료

### 5. Full Analysis with Lighthouse

```bash
web-analysis https://example.com \
  --lighthouse \
  --network 4g \
  --device mobile-mid \
  --output markdown \
  --file full-report.md
```

### 6. CI/CD Integration

```bash
# GitHub Actions example
web-analysis ${{ env.STAGING_URL }} --threshold 85 || exit 1
```

```yaml
# .github/workflows/performance.yml
name: Performance Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Start Server
        run: npm run dev &

      - name: Wait for Server
        run: sleep 10

      - name: Run Performance Analysis
        run: |
          npm run cli -- https://localhost:3000 \
            --threshold 80 \
            --output markdown \
            --file performance-report.md

      - name: Upload Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-report
          path: performance-report.md
```

### 7. GitLab CI Example

```yaml
# .gitlab-ci.yml
performance:
  stage: test
  script:
    - npm install
    - npm run dev &
    - sleep 10
    - npm run cli -- $STAGING_URL --threshold 80 --file report.md
  artifacts:
    paths:
      - report.md
    expire_in: 30 days
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Analysis successful and score >= threshold |
| 1 | Analysis failed or score < threshold |
| 2 | Invalid arguments or configuration error |

## Output Formats

### JSON

Complete analysis data including all metrics, network requests, and performance scores.

```json
{
  "url": "https://example.com",
  "timestamp": 1234567890,
  "performanceScore": {
    "overall": 85,
    "metrics": 90,
    "network": 80,
    "frames": 85
  },
  "metrics": {
    "fcp": 1200,
    "lcp": 2000,
    "tbt": 150,
    "cls": 0.05
  },
  ...
}
```

### Markdown

Human-readable report with tables and formatted metrics.

```markdown
# Performance Analysis Report

**URL:** https://example.com
**Overall Score:** 85/100

## Core Web Vitals

| Metric | Value | Status |
|--------|-------|--------|
| FCP | 1200ms | ✅ Good |
| LCP | 2000ms | ✅ Good |
...
```

## Use Cases

### 1. Pre-deployment Check

```bash
#!/bin/bash
# Check staging before deploying to production

SCORE=$(web-analysis $STAGING_URL --output json | jq '.performanceScore.overall')

if [ $SCORE -lt 80 ]; then
  echo "❌ Performance score too low: $SCORE"
  exit 1
fi

echo "✅ Performance check passed: $SCORE"
```

### 2. Performance Regression Detection

```bash
#!/bin/bash
# Compare current vs previous performance

# Analyze current version
web-analysis $CURRENT_URL --file current.json

# Analyze previous version
web-analysis $PREVIOUS_URL --file previous.json

# Compare scores
CURRENT_SCORE=$(jq '.performanceScore.overall' current.json)
PREVIOUS_SCORE=$(jq '.performanceScore.overall' previous.json)

if [ $CURRENT_SCORE -lt $PREVIOUS_SCORE ]; then
  echo "⚠️  Performance regression detected!"
  echo "Previous: $PREVIOUS_SCORE, Current: $CURRENT_SCORE"
  exit 1
fi
```

### 3. Scheduled Monitoring

```bash
#!/bin/bash
# Cron job for daily performance monitoring

web-analysis $PRODUCTION_URL \
  --lighthouse \
  --output markdown \
  --file "reports/$(date +%Y-%m-%d)-report.md"

# Send notification if score drops
SCORE=$(web-analysis $PRODUCTION_URL --output json | jq '.performanceScore.overall')

if [ $SCORE -lt 85 ]; then
  # Send alert (email, Slack, etc.)
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"⚠️  Performance score dropped to $SCORE\"}"
fi
```

## Troubleshooting

### Server Not Running

The CLI requires the Nuxt server to be running. If you see connection errors:

```bash
# Start the server first
npm run dev

# Then run CLI in another terminal
web-analysis https://example.com
```

Or use the server in the background:

```bash
npm run dev &
sleep 10
web-analysis https://example.com
```

### Timeout Errors

Increase the timeout for slow pages:

```bash
web-analysis https://slow-site.com --timeout 120000
```

### Memory Issues

Disable screenshots for memory-constrained environments:

```bash
web-analysis https://example.com --no-screenshots
```

## Advanced Usage

### Custom Scoring Logic

The CLI uses the default threshold of 75. You can adjust this based on your requirements:

- **Strict** (90+): Production-critical pages
- **Standard** (75-89): Regular pages
- **Relaxed** (60-74): Development/staging environments

### Network Throttling Profiles

| Profile | Download | Upload | Latency |
|---------|----------|--------|---------|
| slow-3g | 500 Kbps | 500 Kbps | 400ms |
| fast-3g | 1.6 Mbps | 750 Kbps | 150ms |
| 4g | 4 Mbps | 3 Mbps | 20ms |

### Device Profiles

| Device | CPU Throttling | Viewport |
|--------|---------------|----------|
| desktop | 1x | 1920x1080 |
| mobile-high | 2x | 390x844 |
| mobile-mid | 4x | 390x844 |
| mobile-low | 6x | 360x800 |

## API Integration

You can also use the analysis functionality programmatically:

```javascript
const { spawn } = require('child_process');

function runAnalysis(url) {
  return new Promise((resolve, reject) => {
    const cli = spawn('web-analysis', [url, '--output', 'json']);
    let output = '';

    cli.stdout.on('data', (data) => {
      output += data.toString();
    });

    cli.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error(`Analysis failed with code ${code}`));
      }
    });
  });
}

// Usage
runAnalysis('https://example.com')
  .then(result => {
    console.log('Score:', result.performanceScore.overall);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/TaeGyumKim/web-analysis/issues
- Documentation: See README.md

## License

MIT
