import type { NetworkRequest } from '~/types/performance';

export interface BundleInfo {
  url: string;
  size: number;
  domain: string;
  library?: string;
  type: 'first-party' | 'third-party';
}

export interface BundleAnalysis {
  totalSize: number;
  totalCount: number;
  firstPartySize: number;
  thirdPartySize: number;
  bundles: BundleInfo[];
  byDomain: Map<string, { size: number; count: number }>;
  byLibrary: Map<string, { size: number; count: number }>;
  largestBundles: BundleInfo[];
}

/**
 * Common JavaScript libraries and their CDN patterns
 */
const LIBRARY_PATTERNS = [
  { name: 'React', patterns: [/react[.\-_]/, /react-dom/, /\/react\//] },
  { name: 'Vue', patterns: [/vue[.\-_]/, /\/vue\//, /@vue\//] },
  { name: 'Angular', patterns: [/angular[.\-_]/, /@angular\//] },
  { name: 'jQuery', patterns: [/jquery[.\-_]/, /\/jquery\//] },
  { name: 'Lodash', patterns: [/lodash[.\-_]/, /\/lodash\//] },
  { name: 'Moment.js', patterns: [/moment[.\-_]/, /\/moment\//] },
  { name: 'Chart.js', patterns: [/chart[.\-_]?js/, /chartjs/] },
  { name: 'D3.js', patterns: [/\/d3[.\-_]/, /\/d3\//] },
  { name: 'Three.js', patterns: [/three[.\-_]/, /threejs/] },
  { name: 'Bootstrap', patterns: [/bootstrap[.\-_]/, /\/bootstrap\//] },
  { name: 'Tailwind', patterns: [/tailwind/] },
  { name: 'Next.js', patterns: [/\/_next\//, /next[.\-_]/] },
  { name: 'Nuxt', patterns: [/\/_nuxt\//, /nuxt[.\-_]/] },
  { name: 'Webpack', patterns: [/webpack/, /webpackJsonp/] },
  { name: 'Babel', patterns: [/babel/] },
  { name: 'Polyfill', patterns: [/polyfill/, /core-js/] },
  { name: 'Google Analytics', patterns: [/google-analytics/, /\/ga\.js/, /gtag/, /analytics\.js/] },
  { name: 'Google Tag Manager', patterns: [/googletagmanager/, /gtm\.js/] },
  { name: 'Facebook SDK', patterns: [/connect\.facebook/, /fbevents/, /fb-root/] },
  { name: 'Twitter', patterns: [/platform\.twitter/, /widgets\.js/] },
  { name: 'Font Awesome', patterns: [/font-?awesome/, /fontawesome/] },
  { name: 'Axios', patterns: [/axios[.\-_]/, /\/axios\//] },
  { name: 'Sentry', patterns: [/sentry[.\-_]/, /\/sentry\//] },
  { name: 'Swiper', patterns: [/swiper[.\-_]/, /\/swiper\//] },
  { name: 'GSAP', patterns: [/gsap[.\-_]/, /greensock/] },
  { name: 'Lottie', patterns: [/lottie/] },
  { name: 'Kakao SDK', patterns: [/developers\.kakao/, /kakao[.\-_]?sdk/] },
  { name: 'Naver SDK', patterns: [/openapi\.map\.naver/, /naver[.\-_]?sdk/] }
] as const;

/**
 * Detect library from URL
 */
function detectLibrary(url: string): string | undefined {
  const lowerUrl = url.toLowerCase();

  for (const lib of LIBRARY_PATTERNS) {
    if (lib.patterns.some(pattern => pattern.test(lowerUrl))) {
      return lib.name;
    }
  }

  return undefined;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Determine if a script is first-party or third-party
 */
function isFirstParty(scriptDomain: string, pageDomain: string): boolean {
  // Remove www. prefix for comparison
  const normalizedScript = scriptDomain.replace(/^www\./, '');
  const normalizedPage = pageDomain.replace(/^www\./, '');

  // Check if domains match or if script is subdomain of page
  return (
    normalizedScript === normalizedPage ||
    normalizedScript.endsWith(`.${normalizedPage}`) ||
    normalizedPage.endsWith(`.${normalizedScript}`)
  );
}

/**
 * Analyze JavaScript bundles from network requests
 */
export function analyzeBundles(
  networkRequests: NetworkRequest[],
  pageUrl: string
): BundleAnalysis {
  // Debug: log incoming data
  if (process.dev) {
    console.log('[BundleAnalyzer] Total network requests:', networkRequests.length);
    console.log('[BundleAnalyzer] Request types:', [...new Set(networkRequests.map(r => r.type))]);
  }

  // Filter JavaScript requests (type is case-insensitive since CDP returns 'Script')
  const jsRequests = networkRequests.filter(req => {
    const type = req.type?.toLowerCase() || '';
    const url = req.url?.toLowerCase() || '';

    // Check for script type or JavaScript file extensions
    const isScript = type === 'script';
    const hasJsExtension =
      url.endsWith('.js') ||
      url.endsWith('.mjs') ||
      url.includes('.js?') ||
      url.includes('.js#');

    // Also check for common script content types in URL patterns
    const isJsContentType =
      url.includes('/javascript') ||
      url.includes('application/javascript') ||
      url.includes('text/javascript');

    return isScript || hasJsExtension || isJsContentType;
  });

  // Debug: log filtered results
  if (process.dev) {
    console.log('[BundleAnalyzer] JS requests found:', jsRequests.length);
    if (jsRequests.length > 0) {
      console.log('[BundleAnalyzer] Sample JS request:', {
        url: jsRequests[0].url.substring(0, 100),
        type: jsRequests[0].type,
        size: jsRequests[0].size
      });
    }
  }

  const pageDomain = extractDomain(pageUrl);
  const bundles: BundleInfo[] = [];
  const byDomain = new Map<string, { size: number; count: number }>();
  const byLibrary = new Map<string, { size: number; count: number }>();

  let totalSize = 0;
  let firstPartySize = 0;
  let thirdPartySize = 0;

  for (const request of jsRequests) {
    const domain = extractDomain(request.url);
    const library = detectLibrary(request.url);
    const firstParty = isFirstParty(domain, pageDomain);
    const size = request.size || 0;

    // Create bundle info
    const bundle: BundleInfo = {
      url: request.url,
      size,
      domain,
      library,
      type: firstParty ? 'first-party' : 'third-party'
    };

    bundles.push(bundle);

    // Aggregate stats
    totalSize += size;
    if (firstParty) {
      firstPartySize += size;
    } else {
      thirdPartySize += size;
    }

    // By domain
    const domainStats = byDomain.get(domain) || { size: 0, count: 0 };
    domainStats.size += size;
    domainStats.count += 1;
    byDomain.set(domain, domainStats);

    // By library
    if (library) {
      const libStats = byLibrary.get(library) || { size: 0, count: 0 };
      libStats.size += size;
      libStats.count += 1;
      byLibrary.set(library, libStats);
    }
  }

  // Sort bundles by size (largest first), filter out size 0 items
  const largestBundles = [...bundles]
    .filter(b => b.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return {
    totalSize,
    totalCount: bundles.length,
    firstPartySize,
    thirdPartySize,
    bundles,
    byDomain,
    byLibrary,
    largestBundles
  };
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get suggestions for bundle optimization
 */
export function getBundleOptimizationSuggestions(analysis: BundleAnalysis): string[] {
  const suggestions: string[] = [];

  // Large total size
  if (analysis.totalSize > 1024 * 1024) {
    // > 1MB
    suggestions.push(
      `전체 JavaScript 크기가 ${formatBytes(analysis.totalSize)}로 큽니다. 코드 분할(code splitting)을 고려하세요.`
    );
  }

  // Too many bundles
  if (analysis.totalCount > 20) {
    suggestions.push(
      `JavaScript 파일이 ${analysis.totalCount}개로 많습니다. 번들을 병합하여 HTTP 요청 수를 줄이세요.`
    );
  }

  // Large third-party scripts
  if (analysis.thirdPartySize > analysis.totalSize * 0.5) {
    suggestions.push(
      `서드파티 스크립트가 전체의 ${((analysis.thirdPartySize / analysis.totalSize) * 100).toFixed(0)}%를 차지합니다. 필수적이지 않은 스크립트를 제거하거나 지연 로딩을 사용하세요.`
    );
  }

  // Check for known heavy libraries
  if (analysis.byLibrary.has('Moment.js')) {
    suggestions.push(
      'Moment.js는 무겁습니다. date-fns나 Day.js 같은 더 가벼운 대안을 고려하세요.'
    );
  }

  if (analysis.byLibrary.has('Lodash')) {
    const lodashSize = analysis.byLibrary.get('Lodash')?.size || 0;
    if (lodashSize > 50 * 1024) {
      // > 50KB
      suggestions.push(
        'Lodash 전체를 import하고 있습니다. 필요한 함수만 개별적으로 import하세요.'
      );
    }
  }

  // Large individual bundles
  const veryLargeBundles = analysis.largestBundles.filter(b => b.size > 500 * 1024); // > 500KB
  if (veryLargeBundles.length > 0) {
    suggestions.push(
      `${veryLargeBundles.length}개의 매우 큰 번들(각 >500KB)이 있습니다. 압축과 minification이 적용되었는지 확인하세요.`
    );
  }

  return suggestions;
}
