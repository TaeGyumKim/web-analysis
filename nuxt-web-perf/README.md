# Web Performance Analyzer

웹 페이지 로딩 성능을 분석하고 시각화하는 도구입니다. Nuxt 3와 Puppeteer로 구축되어 디자이너와 비개발자도 쉽게 페이지 성능 메트릭을 이해할 수 있습니다.

## Features

- 🎯 **8개 탭 분석 시스템**: 프레임 분석, 네트워크 타임라인, 로딩 분포, 일괄 분석, 분석 이력, 성능 예산, Lighthouse, 커스텀 메트릭
- 📊 **종합 성능 분석**: FCP, LCP, TBT, CLS, TTFB 등 핵심 메트릭 측정
- 🎬 **프레임별 렌더링 과정**: 페이지 로드 과정을 프레임 단위로 캡처 및 재생
- 🌊 **네트워크 워터폴 차트**: 모든 네트워크 요청을 타임라인으로 시각화
- 📈 **고급 인터랙티브 시각화**:
  - **Radar Chart**: Core Web Vitals 성능 메트릭 분포
  - **Doughnut Chart**: 종합 성능 점수 시각화
  - **Heatmap**: 네트워크 요청 타입별/시간대별 분포
  - **Animated Progress Bars**: 실시간 메트릭 진행 상태
  - **Timeline Bar Chart**: 로딩 이벤트 순서 시각화
- 🎨 **깔끔한 UI**: 16px 보더 라디우스와 부드러운 섀도우를 활용한 모던한 디자인
- ⚙️ **설정 가능한 테스트 환경**: 네트워크 속도(3G/4G/Wi-Fi), 장비 사양(Desktop/Mobile) 선택
- 📉 **Long Task 히스토그램**: 메인 스레드 차단 작업 시각화 및 분석
- 💾 **결과 내보내기**: JSON, 텍스트 리포트, CSV, **PDF 리포트** 형식으로 분석 결과 저장
- 🔄 **일괄 분석**: 여러 URL을 동시에 분석하고 성능 비교
- 📜 **분석 이력**: 과거 데이터 저장 및 추이 차트 생성 (최대 50개)
- 💰 **성능 예산**: 목표 메트릭 설정 및 실제 성능 비교
- 🔍 **Lighthouse 통합**: Google Lighthouse 기반 성능, 접근성, SEO, PWA 분석
- 🎛️ **커스텀 메트릭**: 사용자 정의 성능 지표 생성 및 추적
  - **User Timing API**: performance.mark()/measure() 기반 메트릭
  - **Element Timing**: 특정 요소의 렌더링 시간 측정
  - **계산된 메트릭**: 기존 메트릭 조합으로 새로운 지표 생성
  - **임계값 설정**: 양호/개선 필요/나쁨 기준 커스터마이징

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **Styling**: Custom CSS (HTML 디자인 기반) + Tailwind CSS
- **Charts**: Chart.js (바 차트, 라인 차트)
- **Backend**: Nuxt Server API
- **Performance Collection**: Puppeteer (CDP protocol), Lighthouse
- **Scoring Algorithm**: C# WebPerf 구현 기반

## Installation

### Prerequisites

- Node.js 20+
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

### Docker Deployment

Build and run with Docker:
```bash
# 단일 컨테이너 실행
docker build -t web-perf-analyzer ./nuxt-web-perf
docker run -p 3000:3000 web-perf-analyzer

# Docker Compose 사용
docker-compose up -d

# Nginx 프록시와 함께 실행
docker-compose --profile with-nginx up -d
```

Pull from GitHub Container Registry:
```bash
docker pull ghcr.io/TaeGyumKim/web-analysis:latest
docker run -p 3000:3000 ghcr.io/TaeGyumKim/web-analysis:latest
```

### Using the Analyzer

#### 1. 분석 시작
상단 제어바에서:
- **네트워크 속도** 선택: 3G, 4G, Wi-Fi, Slow 3G
- **장비 사양** 선택: Desktop, Mobile (High-end/Mid-range/Low-end)
- **URL 입력**: 분석할 웹 페이지 주소 입력
- **Lighthouse 사용** 체크박스: Google Lighthouse 분석 활성화 (선택)
- **시작 버튼** 클릭: 분석 시작 (자동으로 스크린샷 캡처)

#### 2. 결과 확인 - 8개 탭 시스템

**📸 프레임 분석 탭**
- **PerformanceMetricsChart 시각화** (NEW ✨):
  - **Radar Chart**: FCP, LCP, TBT, CLS, TTFB 성능 점수 분포
  - **Doughnut Chart**: 종합 성능 점수 (0-100) 중앙 오버레이
  - **Animated Metric Bars**: 각 메트릭의 실시간 진행 상태 (색상 코딩)
  - **Timeline Bar Chart**: TTFB → FCP → LCP → DCL → Load 순서 표시
- 좌측: 프레임별 렌더링 과정 뷰어
  - 슬라이더로 프레임 이동
  - 이전/다음/재생 버튼으로 제어
- 우측: 메트릭 정보 (340px 고정폭)
  - 현재 프레임 정보 (시간, 상태)
  - 로드된 리소스 통계
  - 핵심 메트릭 (FCP, LCP, TBT, CLS) 색상 바 표시
  - Long Tasks 요약 (개수, 평균, 최대)

**🌐 네트워크 타임라인 탭**
- **NetworkHeatmap 히트맵** (NEW ✨):
  - **인터랙티브 히트맵**: 리소스 타입별(document, stylesheet, script, image, font, xhr, fetch) / 시간대별(10 구간) 요청 분포
  - **클릭 상세 정보**: 히트맵 셀 클릭 시 해당 시간대의 요청 목록 모달 표시
  - **Size Distribution Chart**: 타입별 전체 크기 바 차트
  - **Color-coded Heat Levels**: 요청 수에 따른 5단계 색상 구분
- **NetworkWaterfall 워터폴 차트** (Enhanced):
  - 필터링: 타입별 요청 필터 (All/Document/Stylesheet/Script/Image/Font/XHR/Fetch)
  - 요약 통계: 총 크기, 요청 수, 평균/최장 지속시간
  - 상세 정보 모달: 클릭 시 URL, 타입, 상태, 크기, 지속시간, 시간대 표시
- 리소스별 요청 타임라인 테이블
- 리소스 타입별 색상 구분 (Document, CSS, JS, Image)
- 각 요청의 시작/종료 시간, 크기 표시
- 요약 통계: 총 요청 수, 전송 크기, DCL, Load 시간

**📊 로딩 분포 탭**
- Chart.js 차트 3종:
  - 네트워크 속도별 로딩 시간 분포 (바 차트)
  - 장비별 로딩 시간 분포 (바 차트)
  - 24시간 로딩 시간 추이 (라인 차트)
  - ⚠️ Note: 현재 mock 데이터 사용 (향후 히스토리 데이터 연동 예정)
- 4개 요약 카드: 평균 로딩 시간, 성능 점수, 사용자 만족도, 최적화 가능성
- 성능 개선 제안 (이미지 최적화, CSS 경량화, 리소스 사전 로딩)
- Long Task 히스토그램 (지속시간 분포, 상위 작업)

**🔄 일괄 분석 탭**
- 여러 URL 추가 및 동시 분석
- 진행률 표시 및 결과 비교 테이블
- 평균 통계 및 최고 성능 사이트 표시
- 비교 결과 JSON/텍스트로 내보내기

**📜 분석 이력 탭**
- URL별 분석 이력 조회 (최대 50개 저장)
- 2개 결과 선택하여 메트릭 변화 비교
- 평균 메트릭 통계
- 추이 차트 (Overall Score, FCP, LCP)

**💰 성능 예산 탭**
- 메트릭별 목표 값 설정 (FCP, LCP, TBT, CLS, 요청 수, 전송 크기)
- 3가지 프리셋 (엄격한/보통/여유 기준)
- 예산 vs 실제 성능 비교 테이블
- 통과/초과 상태 및 통계
- 실패한 메트릭에 대한 개선 권장사항

**🔍 Lighthouse 탭**
- 5개 카테고리 점수 (Performance, Accessibility, Best Practices, SEO, PWA)
- 원형 게이지 차트로 각 점수 시각화
- Lighthouse 메트릭 (FCP, LCP, TBT, CLS, Speed Index, TTI, FMP)
- 성능 개선 기회 (Opportunities) 목록 및 예상 절감량
- 진단 결과 (Diagnostics) 테이블
- Mobile/Desktop 선택에 따른 자동 Form Factor 설정

**🎛️ 커스텀 메트릭 탭** (NEW ✨)
- **메트릭 관리**:
  - 커스텀 메트릭 추가/편집/삭제
  - 메트릭 활성화/비활성화 토글
  - 3가지 메트릭 타입 지원:
    - **User Timing API**: performance.mark()/measure() 기반
    - **Element Timing**: 특정 요소의 렌더링 시간
    - **계산된 메트릭**: 기존 메트릭 조합 (예: lcp - fcp)
  - 임계값 설정 (양호/개선 필요/나쁨)
  - 단위 선택 (ms, s, score, bytes, count)
- **메트릭 결과 시각화**:
  - 상태별 색상 코딩 (양호=녹색, 개선필요=노랑, 나쁨=빨강)
  - 0-100 점수 표시
  - 진행 바로 점수 시각화
- **사용 팁 및 예제**:
  - User Timing API 사용법
  - Element Timing 설정 방법
  - 계산된 메트릭 예제 (히어로 이미지 로딩 시간, API 응답 시간, 컨텐츠 렌더링 시간, 리소스 개수)

## Project Structure

```
nuxt-web-perf/
├── app.vue                        # App entry point
├── assets/
│   └── css/
│       └── main.css              # Custom CSS (HTML 디자인 기반)
├── components/
│   ├── FrameAnalysisTab.vue         # 프레임 분석 탭 (좌우 레이아웃)
│   ├── NetworkTimelineTab.vue       # 네트워크 타임라인 탭 (워터폴 차트)
│   ├── LoadingDistributionTab.vue   # 로딩 분포 탭 (Chart.js)
│   ├── BatchAnalysis.vue            # 일괄 분석 탭 (여러 URL 비교)
│   ├── HistoryViewer.vue            # 분석 이력 탭 (추이 차트)
│   ├── PerformanceBudget.vue        # 성능 예산 탭 (목표 설정)
│   ├── LighthouseTab.vue            # Lighthouse 탭 (5개 카테고리 점수) ⭐
│   ├── LongTaskHistogram.vue        # Long Task 히스토그램 컴포넌트
│   ├── PerformanceMetricsChart.vue  # Core Web Vitals 인터랙티브 차트 ⭐ NEW
│   ├── NetworkHeatmap.vue           # 네트워크 요청 히트맵 시각화 ⭐ NEW
│   ├── NetworkWaterfall.vue         # 네트워크 워터폴 차트 (Enhanced)
│   ├── CustomMetricsManager.vue     # 커스텀 메트릭 관리 컴포넌트 ⭐ NEW
│   ├── CustomMetricsTab.vue         # 커스텀 메트릭 결과 시각화 탭 ⭐ NEW
│   ├── FrameTimeline.vue            # 프레임 타임라인 뷰어 (레거시)
│   ├── MetricBadge.vue              # 메트릭 배지 (레거시)
│   ├── MetricsCard.vue              # 메트릭 카드 (레거시)
│   └── PerformanceOverview.vue      # 성능 개요 (레거시)
├── pages/
│   └── index.vue                 # 메인 페이지 (상단 제어바 + 8탭)
├── server/
│   ├── api/
│   │   ├── analyze.post.ts        # POST /api/analyze 엔드포인트
│   │   ├── generate-pdf.post.ts   # POST /api/generate-pdf 엔드포인트 ⭐ NEW
│   │   └── health.get.ts          # GET /api/health 엔드포인트
│   └── utils/
│       ├── performanceCollector.ts    # Puppeteer 기반 수집기
│       ├── lighthouseCollector.ts     # Lighthouse 수집기 ⭐
│       └── customMetricsCalculator.ts # 커스텀 메트릭 계산 유틸리티 ⭐ NEW
├── types/
│   └── performance.ts            # TypeScript 타입 정의
├── utils/
│   ├── scoreCalculator.ts        # 성능 점수 계산 로직
│   ├── exportUtils.ts            # 결과 내보내기 유틸리티
│   └── historyManager.ts         # 분석 이력 관리 유틸리티
└── nuxt.config.ts                # Nuxt 설정
```

## Performance Scoring

성능 점수는 세 가지 요소의 가중 평균으로 계산됩니다 (0-100점):

### 메트릭 점수 (50% 가중치)
FCP, LCP, TBT, TTFB, DOM 타이밍 평가:
- **≤1000ms**: 100점 (녹색 바)
- **1000-3000ms**: 선형 감소 → 75점 (노란색 바)
- **3000-7000ms**: 선형 감소 → 30점 (주황색 바)
- **>7000ms**: 느린 감소

### 네트워크 점수 (35% 가중치)
패널티 기준:
- 총 전송 크기 > 5MB
- 요청 수 > 40개
- 최장 요청 시간 > 2000ms

### 프레임 점수 (15% 가중치)
프레임 캡처 일관성 기준:
- 평균 간격 ≤100ms: 100점
- 평균 간격 ≤200ms: 90점
- 평균 간격 ≤400ms: 75점
- 그 외: 60점

## UI Design

### 색상 테마
- **배경**: `#f6f7f9` (밝은 회색)
- **카드**: 흰색 배경, 16px 보더 라디우스, 부드러운 섀도우
- **메트릭 색상**:
  - 녹색: `#48d178` (좋음)
  - 노란색: `#e6b421` (보통)
  - 주황색: `#e67e22` (개선 필요)
- **리소스 타입 색상**:
  - Document: `#5b8efc`
  - CSS: `#c08eff`
  - JS: `#f4b940`
  - Image: `#60c989`

### 레이아웃
- **상단 제어바**: 네트워크/장비 선택, URL 입력, 버튼
- **탭 네비게이션**: 3개 탭 (프레임 분석 | 네트워크 타임라인 | 로딩 분포)
- **프레임 분석**: 좌우 분할 (프레임 뷰어 + 메트릭 사이드바 340px)
- **네트워크**: 워터폴 차트 테이블
- **로딩 분포**: 2열 그리드 차트 + 추이 차트 + 요약 카드

## Migration from C# WebPerf

C# WebView2 데스크톱 애플리케이션의 웹 기반 재구현:

- ✅ **크로스 플랫폼**: Windows 전용 → 모든 브라우저에서 접근
- ✅ **모던 UI**: HTML 디자인 파일 기반의 깔끔한 인터페이스
- ✅ **3탭 시스템**: 프레임/네트워크/분포를 분리된 탭으로 제공
- ✅ **RESTful API**: 다른 도구와 통합 가능
- ✅ **동일한 알고리즘**: 점수 계산 로직 유지
- ✅ **Chart.js**: 고급 차트 시각화

## CI/CD Pipeline

### GitHub Actions 워크플로우

이 프로젝트는 자동화된 CI/CD 파이프라인을 제공합니다:

#### 🔄 CI (Continuous Integration)
자동 실행 조건: PR 생성, `main`/`master`/`develop`/`claude/**` 브랜치에 푸시

**Build and Test Job**
- Node.js 20.x 테스트
- 의존성 설치 (npm ci)
- 프로덕션 빌드 검증
- 빌드 아티팩트 업로드 (7일 보관)

**Code Quality Job**
- TypeScript 타입 체크 (`nuxi typecheck`)
- 보안 취약점 스캔 (`npm audit`)

**Lighthouse Integration Check**
- Chromium 의존성 설치
- Lighthouse 패키지 검증
- Puppeteer 통합 테스트

#### 🚀 CD (Continuous Deployment)
자동 배포 조건: `main`/`master` 브랜치에 푸시, 태그 생성 (`v*`)

**Docker Build & Push**
- 멀티 스테이지 빌드로 최적화된 이미지 생성
- GitHub Container Registry (ghcr.io)에 자동 푸시
- 이미지 태그: `latest`, `브랜치명`, `SHA`, 버전 태그
- GitHub Actions 캐시로 빌드 속도 향상

**GitHub Pages 배포**
- Static Site Generation (SSG)
- `npm run generate`로 정적 사이트 생성
- GitHub Pages에 자동 배포
- 배포 URL: `https://[username].github.io/[repo]`

**Release 자동 생성**
- 버전 태그 푸시 시 자동 릴리즈 생성
- 변경 로그 자동 생성
- Docker 이미지 pull 명령어 포함

### 워크플로우 파일

- `.github/workflows/ci.yml` - CI 파이프라인
- `.github/workflows/cd.yml` - CD 파이프라인

### Health Check Endpoint

Docker 컨테이너 헬스 체크를 위한 API:
```bash
curl http://localhost:3000/api/health
```

응답 예시:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "checks": {
    "api": "ok",
    "memory": "ok",
    "puppeteer": "ok"
  },
  "memory": {
    "rss": 256,
    "heapTotal": 128,
    "heapUsed": 64,
    "external": 8
  },
  "responseTime": "5ms"
}
```

### E2E Testing with Playwright

**Test Suite** (`tests/e2e/analyzer.spec.ts`):

**UI Tests** (Always Run):
- **Homepage Load**: Verifies all UI elements are visible
- **7 Tabs Display**: Checks all tabs exist and are visible
- **Tab Navigation**: Tests switching between empty tabs (7 screenshots)
- **URL Input**: Validates URL input and button enabling
- **Export Buttons**: Checks export UI area
- **Lighthouse Checkbox**: Validates Lighthouse option

**Analysis Tests** (Skipped in CI):
- **Full Analysis Flow**: Tests actual performance analysis
- Note: Skipped in CI due to Puppeteer reliability in headless environments
- Can be run locally with `npm run test:headed`

**Running Tests Locally**:
```bash
cd nuxt-web-perf

# Install Playwright browsers (first time only)
npx playwright install chromium

# Run tests headless
npm test

# Run with visible browser
npm run test:headed

# Open Playwright UI tool
npm run test:ui
```

**CI/CD Integration**:
- UI tests run automatically on every commit (fast, reliable)
- Analysis tests skipped in CI (can run locally)
- 3 artifacts uploaded (30-day retention):
  - **e2e-screenshots**: Visual proof of UI (12+ screenshots)
  - **playwright-report**: Detailed HTML test report
  - **test-results**: Complete results including videos

**Screenshots Captured in CI**:
1. Homepage with all UI elements (01)
2. All 7 tabs visible verification (02)
3-9. Individual tab navigation (03-09):
   - Frame Analysis
   - Network Timeline
   - Loading Distribution
   - Batch Analysis
   - History
   - Performance Budget
   - Lighthouse
10. URL input test (10)
11. Export area (11)
12. Lighthouse checkbox area (12)

**Local Analysis Tests** (npm run test:headed):
- Captures full analysis flow with 20-30 second wait
- Screenshots before, during, and after analysis
- Tests actual Puppeteer-based performance collection

## Implemented Enhancements ✅

- [x] **CLS 메트릭 추가**: Cumulative Layout Shift 측정 및 시각화
- [x] **Long Task 히스토그램**: 50ms 이상 차단 작업 분석 및 통계
- [x] **결과 내보내기**: JSON, 텍스트 리포트, CSV, PDF 리포트 형식 지원
- [x] **여러 URL 일괄 분석**: 동시 분석 및 성능 비교 테이블
- [x] **과거 데이터 비교**: 분석 이력 저장 및 추이 차트 (Chart.js)
- [x] **성능 예산 설정**: 목표 값 설정 및 실제 성능 대비 분석
- [x] **Lighthouse API 통합**: Performance, Accessibility, SEO, PWA, Best Practices 분석
- [x] **CI/CD 파이프라인**: GitHub Actions 기반 자동 빌드/테스트/배포
- [x] **E2E 테스트**: Playwright 기반 자동화 테스트 및 스크린샷 캡처
- [x] **고급 인터랙티브 시각화** ✨ NEW:
  - **PerformanceMetricsChart**: Radar, Doughnut, Animated Bars, Timeline
  - **NetworkHeatmap**: 타입별/시간대별 히트맵 + 클릭 상세 정보
- [x] **PDF 리포트 생성** ✨ NEW:
  - **Puppeteer 기반 고품질 PDF**: 서버 사이드에서 HTML을 PDF로 변환
  - **자동 포맷팅**: Core Web Vitals, 네트워크 요약, Long Tasks 등 전체 리포트
  - **다운로드 버튼**: 상단 제어바에서 원클릭 PDF 다운로드
- [x] **커스텀 메트릭** ✨ NEW:
  - **User Timing API 지원**: performance.mark()/measure() 기반 메트릭 추적
  - **Element Timing 지원**: 특정 요소의 렌더링 시간 측정
  - **계산된 메트릭**: 기존 메트릭 조합으로 새로운 지표 생성 (예: lcp - fcp)
  - **임계값 커스터마이징**: 양호/개선 필요/나쁨 기준 사용자 정의
  - **메트릭 관리 UI**: 메트릭 추가/편집/삭제/활성화/비활성화
  - **시각화**: 상태별 색상 코딩, 점수 표시, 진행 바

## Future Enhancements

### High Priority
- [x] **PDF 리포트 생성**: ✅ Puppeteer 기반 고품질 PDF 리포트 구현 완료
- [x] **커스텀 메트릭**: ✅ 사용자 정의 성능 지표 추적 시스템 구현 완료

### Medium Priority (추천 기능 #8 완료)
- [x] **고급 시각화**: ✅ Radar, Doughnut, Heatmap, Animated Charts 구현 완료
- [ ] **로딩 분포 실제 데이터 연동**: 현재 mock 데이터 사용, 히스토리 데이터 활용 필요
- [ ] **인터랙티브 차트 추가 개선**: D3.js 도입, 줌/팬 기능

### Low Priority
- [ ] 실시간 모니터링 대시보드
- [ ] 다국어 지원 (현재 한국어만)
- [ ] Kubernetes 배포 매니페스트

## License

MIT License

Check out the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) and [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
