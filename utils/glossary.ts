/**
 * 성능 분석 용어 사전
 * 비개발자(디자이너)를 위한 쉬운 설명
 */

export const glossary = {
  // Core Web Vitals
  fcp: {
    title: 'FCP (First Contentful Paint)',
    description:
      '사용자가 페이지에 처음 접속했을 때, 화면에 첫 번째 콘텐츠(텍스트, 이미지 등)가 나타나기까지 걸린 시간입니다. 빠를수록 좋습니다. (1초 이하 권장)'
  },
  lcp: {
    title: 'LCP (Largest Contentful Paint)',
    description:
      '페이지에서 가장 큰 콘텐츠(메인 이미지, 큰 텍스트 블록 등)가 화면에 나타나기까지 걸린 시간입니다. 사용자가 페이지가 로딩되었다고 느끼는 시점입니다. (2.5초 이하 권장)'
  },
  tbt: {
    title: 'TBT (Total Blocking Time)',
    description:
      '페이지 로딩 중 메인 스레드가 차단되어 사용자 입력에 반응하지 못한 총 시간입니다. 이 값이 높으면 버튼 클릭이나 스크롤이 느리게 느껴집니다. (200ms 이하 권장)'
  },
  cls: {
    title: 'CLS (Cumulative Layout Shift)',
    description:
      '페이지 로딩 중 콘텐츠가 예상치 않게 움직인 정도를 나타냅니다. 광고나 이미지가 늦게 로딩되어 텍스트가 밀리는 현상 등이 해당됩니다. (0.1 이하 권장)'
  },
  ttfb: {
    title: 'TTFB (Time to First Byte)',
    description:
      '사용자가 페이지를 요청한 후 서버로부터 첫 데이터를 받기까지 걸린 시간입니다. 서버와 네트워크 성능을 나타냅니다. (600ms 이하 권장)'
  },
  fid: {
    title: 'FID (First Input Delay)',
    description:
      '사용자가 처음으로 페이지와 상호작용(클릭, 탭 등)을 시도했을 때부터 브라우저가 실제로 반응하기까지 걸린 시간입니다. (100ms 이하 권장)'
  },

  // 네트워크 관련
  networkThrottling: {
    title: '네트워크 스로틀링',
    description:
      '느린 인터넷 환경을 시뮬레이션하는 기능입니다. 3G, 4G 등 다양한 네트워크 속도에서 페이지가 어떻게 동작하는지 테스트할 수 있습니다.'
  },
  cpuThrottling: {
    title: 'CPU 스로틀링',
    description:
      '저사양 기기를 시뮬레이션하는 기능입니다. 배율이 높을수록 느린 CPU 환경을 재현하여 저사양 기기에서의 성능을 테스트할 수 있습니다.'
  },
  domContentLoaded: {
    title: 'DOMContentLoaded',
    description:
      'HTML 문서가 완전히 파싱되고 DOM 트리가 구성된 시점입니다. 이미지나 스타일시트는 아직 로딩 중일 수 있습니다.'
  },
  loadComplete: {
    title: 'Load Complete',
    description:
      '페이지의 모든 리소스(이미지, 스타일시트, 스크립트 등)가 완전히 로딩된 시점입니다. 페이지 로딩이 완료되었다고 볼 수 있습니다.'
  },

  // Long Tasks
  longTask: {
    title: 'Long Task (긴 작업)',
    description:
      '50ms 이상 걸린 JavaScript 작업을 의미합니다. 이런 작업이 실행되는 동안에는 사용자 입력에 반응할 수 없어 페이지가 멈춘 것처럼 느껴집니다.'
  },

  // Lighthouse
  lighthouse: {
    title: 'Google Lighthouse',
    description:
      'Google에서 제공하는 웹 페이지 품질 자동 분석 도구입니다. 성능, 접근성, SEO, PWA 등 5가지 카테고리를 0-100점으로 평가합니다.'
  },
  performance: {
    title: '성능 (Performance)',
    description:
      '페이지 로딩 속도와 반응성을 평가합니다. 점수가 높을수록 빠르고 부드러운 사용자 경험을 제공합니다.'
  },
  accessibility: {
    title: '접근성 (Accessibility)',
    description:
      '장애가 있는 사용자도 웹사이트를 쉽게 사용할 수 있는지 평가합니다. 스크린 리더, 키보드 탐색, 색상 대비 등을 검사합니다.'
  },
  bestPractices: {
    title: '권장사항 (Best Practices)',
    description:
      '웹 개발 모범 사례를 따르는지 평가합니다. 보안, HTTPS 사용, 콘솔 에러 등을 검사합니다.'
  },
  seo: {
    title: 'SEO (검색 엔진 최적화)',
    description:
      '검색 엔진이 페이지를 잘 이해하고 색인할 수 있는지 평가합니다. 메타 태그, 제목, 설명 등을 검사합니다.'
  },
  pwa: {
    title: 'PWA (Progressive Web App)',
    description:
      '웹 페이지가 앱처럼 동작할 수 있는지 평가합니다. 오프라인 지원, 홈 화면 추가, 푸시 알림 등을 검사합니다.'
  },

  // 기타
  viewport: {
    title: '뷰포트 (Viewport)',
    description:
      '브라우저에서 웹 페이지가 보이는 영역의 크기입니다. 데스크톱, 태블릿, 모바일 등 다양한 화면 크기를 시뮬레이션할 수 있습니다.'
  },
  performanceScore: {
    title: '성능 점수',
    description:
      '0-100점 사이의 종합 성능 점수입니다. 메트릭(50%), 네트워크(35%), 프레임(15%)의 가중 평균으로 계산됩니다.'
  },
  performanceBudget: {
    title: '성능 예산 (Performance Budget)',
    description:
      '페이지가 달성해야 할 성능 목표를 설정하는 기능입니다. 목표를 초과하면 알림을 받아 성능 저하를 사전에 방지할 수 있습니다.'
  },
  customMetrics: {
    title: '커스텀 메트릭',
    description:
      '기본 메트릭 외에 사용자가 직접 정의한 성능 지표입니다. 특정 요소의 로딩 시간이나 중요한 이벤트 시점 등을 측정할 수 있습니다.'
  },

  // JS 번들 분석
  totalJsSize: {
    title: '총 JS 크기',
    description:
      '페이지에서 로드된 모든 JavaScript 파일의 총 크기입니다. JS 크기가 클수록 로딩 시간이 길어지고, 파싱/실행에 더 많은 시간이 소요됩니다. (200KB 이하 권장)'
  },
  firstPartyScript: {
    title: '자사 스크립트',
    description:
      '분석 중인 사이트와 동일한 도메인에서 로드되는 JavaScript입니다. 직접 제어 가능하므로 최적화하기 쉽습니다.'
  },
  thirdPartyScript: {
    title: '서드파티 스크립트',
    description:
      '외부 도메인에서 로드되는 JavaScript입니다 (예: 분석 도구, 광고, 소셜 미디어 위젯). 직접 제어가 어렵고 성능에 큰 영향을 줄 수 있습니다.'
  },
  bundleOptimization: {
    title: '최적화 제안',
    description:
      'JavaScript 번들 분석을 기반으로 한 최적화 권장사항입니다. 코드 분할, 지연 로딩, 압축 등의 기법으로 성능을 개선할 수 있습니다.'
  },
  domainDistribution: {
    title: '도메인별 분포',
    description:
      'JavaScript 파일이 어떤 도메인에서 로드되는지 보여줍니다. 서드파티 도메인이 많으면 성능 저하와 보안 위험이 증가할 수 있습니다.'
  },
  libraryDistribution: {
    title: '라이브러리별 분포',
    description:
      '사용 중인 JavaScript 라이브러리와 그 크기를 보여줍니다. 불필요하거나 중복된 라이브러리를 식별하여 번들 크기를 줄일 수 있습니다.'
  },
  largestBundles: {
    title: '가장 큰 번들',
    description:
      '크기가 큰 JavaScript 파일 목록입니다. 큰 번들은 로딩 시간에 큰 영향을 미치므로 코드 분할(Code Splitting)이나 트리 쉐이킹(Tree Shaking)을 고려해보세요.'
  },
  domainBreakdown: {
    title: '도메인별 상세',
    description:
      '각 도메인에서 로드된 JavaScript 파일 수와 총 크기를 보여줍니다. 서드파티 스크립트의 영향을 파악하는 데 유용합니다.'
  }
};

export type GlossaryKey = keyof typeof glossary;
