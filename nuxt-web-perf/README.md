# Web Performance Analyzer

A web-based tool for analyzing and visualizing web page loading performance. Built with Nuxt 3 and Puppeteer, this tool makes it easy for designers and non-developers to understand page performance metrics.

## Features

- 📊 **Comprehensive Performance Analysis**: Analyze FCP, LCP, TBT, TTFB, and more
- 🎯 **Performance Scoring**: Get an overall score (0-100) based on metrics, network, and frame analysis
- 🌊 **Network Waterfall**: Visualize all network requests in a timeline
- 📸 **Frame Capture**: See how your page loads frame-by-frame
- 🎮 **Interactive Controls**: Filter, sort, and drill down into performance data
- 🎨 **Beautiful UI**: Clean, modern interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Nuxt Server API
- **Performance Collection**: Puppeteer (CDP protocol)
- **Scoring Algorithm**: Based on the original C# WebPerf implementation

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
npm install
```

For Puppeteer to work, you need Chrome/Chromium installed. If you're on a server environment:

```bash
# Install Chrome dependencies on Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y chromium-browser

# Or use the bundled Chromium (download during install)
npm install puppeteer
```

## Usage

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production

Build for production:
```bash
npm run build
```

Start the production server:
```bash
npm run preview
```

### Using the Analyzer

1. **Enter URL**: Type or paste the URL you want to analyze
2. **Configure Options**:
   - **Network Throttling**: Simulate different connection speeds (None, Slow 3G, Fast 3G, 4G)
   - **CPU Throttling**: Simulate slower devices (1x, 2x, 4x, 6x slowdown)
   - **Wait Until**: Choose when to consider page load complete
   - **Screenshots**: Enable/disable frame capture
3. **Start Analysis**: Click the button and wait for the analysis to complete
4. **Review Results**:
   - **Performance Overview**: See overall score and sub-scores
   - **Metrics Card**: Detailed performance metrics with explanations
   - **Network Waterfall**: Visualize network requests timeline
   - **Frame Timeline**: Play through captured frames

## Project Structure

```
nuxt-web-perf/
├── app/                      # App entry point
├── assets/                   # CSS and static assets
│   └── css/
│       └── main.css         # Tailwind and custom styles
├── components/              # Vue components
│   ├── FrameTimeline.vue   # Frame-by-frame viewer
│   ├── MetricBadge.vue     # Individual metric display
│   ├── MetricsCard.vue     # Metrics dashboard
│   ├── NetworkWaterfall.vue # Network timeline chart
│   └── PerformanceOverview.vue # Summary scores
├── pages/                   # Nuxt pages (routes)
│   └── index.vue           # Main analyzer page
├── server/                  # Backend API
│   ├── api/
│   │   └── analyze.post.ts # Analysis endpoint
│   └── utils/
│       └── performanceCollector.ts # Puppeteer-based collector
├── types/                   # TypeScript type definitions
│   └── performance.ts
├── utils/                   # Shared utilities
│   └── scoreCalculator.ts  # Scoring algorithm
└── nuxt.config.ts          # Nuxt configuration
```

## Performance Scoring

The tool calculates an overall performance score (0-100) based on three components:

### Metrics Score (50% weight)
- Evaluates FCP, LCP, TBT, TTFB, and DOM timing
- Each metric is scored using thresholds:
  - ≤1000ms: 100 points
  - 1000-3000ms: Linear decrease to 75
  - 3000-7000ms: Linear decrease to 30
  - >7000ms: Slow decrease

### Network Score (35% weight)
Penalties based on:
- Total transfer size (>5MB)
- Number of requests (>40)
- Longest request duration (>2000ms)

### Frames Score (15% weight)
Based on frame capture consistency:
- Average interval ≤100ms: 100 points
- Average interval ≤200ms: 90 points
- Average interval ≤400ms: 75 points
- Otherwise: 60 points

## Migration from C# WebPerf

This Nuxt 3 application is a modern web-based reimplementation of the original C# WebView2 desktop application. Key improvements:

- ✅ Cross-platform web access (no Windows-only requirement)
- ✅ Modern, responsive UI
- ✅ RESTful API for integration with other tools
- ✅ Same scoring algorithm and metrics collection
- ✅ Enhanced visualization capabilities

## Future Enhancements

- [ ] CLS (Cumulative Layout Shift) metric
- [ ] Long Task histogram visualization
- [ ] Export results as JSON/PDF
- [ ] Batch analysis for multiple URLs
- [ ] Historical comparison and trending
- [ ] Custom performance budgets
- [ ] Integration with CI/CD pipelines

## License

MIT License

Check out the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) and [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
