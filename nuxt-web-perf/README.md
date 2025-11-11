# Web Performance Analyzer

웹 페이지 로딩 성능을 분석하고 시각화하는 도구입니다. Nuxt 3와 Puppeteer로 구축되어 디자이너와 비개발자도 쉽게 페이지 성능 메트릭을 이해할 수 있습니다.

## Features

- 🎯 **7개 탭 분석 시스템**: 프레임 분석, 네트워크 타임라인, 로딩 분포, 일괄 분석, 분석 이력, 성능 예산, Lighthouse
- 📊 **종합 성능 분석**: FCP, LCP, TBT, CLS, TTFB 등 핵심 메트릭 측정
- 🎬 **프레임별 렌더링 과정**: 페이지 로드 과정을 프레임 단위로 캡처 및 재생
- 🌊 **네트워크 워터폴 차트**: 모든 네트워크 요청을 타임라인으로 시각화
- 📈 **Chart.js 통합**: 네트워크 속도별, 장비별 로딩 시간 분포 차트
- 🎨 **깔끔한 UI**: 16px 보더 라디우스와 부드러운 섀도우를 활용한 모던한 디자인
- ⚙️ **설정 가능한 테스트 환경**: 네트워크 속도(3G/4G/Wi-Fi), 장비 사양(Desktop/Mobile) 선택
- 📉 **Long Task 히스토그램**: 메인 스레드 차단 작업 시각화 및 분석
- 💾 **결과 내보내기**: JSON, 텍스트 리포트, CSV 형식으로 분석 결과 저장
- 🔄 **일괄 분석**: 여러 URL을 동시에 분석하고 성능 비교
- 📜 **분석 이력**: 과거 데이터 저장 및 추이 차트 생성 (최대 50개)
- 💰 **성능 예산**: 목표 메트릭 설정 및 실제 성능 비교
- 🔍 **Lighthouse 통합**: Google Lighthouse 기반 성능, 접근성, SEO, PWA 분석

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

#### 2. 결과 확인 - 7개 탭 시스템

**📸 프레임 분석 탭**
- 좌측: 프레임별 렌더링 과정 뷰어
  - 슬라이더로 프레임 이동
  - 이전/다음/재생 버튼으로 제어
- 우측: 메트릭 정보 (340px 고정폭)
  - 현재 프레임 정보 (시간, 상태)
  - 로드된 리소스 통계
  - 핵심 메트릭 (FCP, LCP, TBT, CLS) 색상 바 표시
  - Long Tasks 요약 (개수, 평균, 최대)

**🌐 네트워크 타임라인 탭**
- 리소스별 요청 워터폴 차트 테이블
- 리소스 타입별 색상 구분 (Document, CSS, JS, Image)
- 각 요청의 시작/종료 시간, 크기 표시
- 요약 통계: 총 요청 수, 전송 크기, DCL, Load 시간

**📊 로딩 분포 탭**
- Chart.js 차트 3종:
  - 네트워크 속도별 로딩 시간 분포 (바 차트)
  - 장비별 로딩 시간 분포 (바 차트)
  - 24시간 로딩 시간 추이 (라인 차트)
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

## Project Structure

```
nuxt-web-perf/
├── app.vue                        # App entry point
├── assets/
│   └── css/
│       └── main.css              # Custom CSS (HTML 디자인 기반)
├── components/
│   ├── FrameAnalysisTab.vue      # 프레임 분석 탭 (좌우 레이아웃)
│   ├── NetworkTimelineTab.vue    # 네트워크 타임라인 탭 (워터폴 차트)
│   ├── LoadingDistributionTab.vue # 로딩 분포 탭 (Chart.js)
│   ├── BatchAnalysis.vue         # 일괄 분석 탭 (여러 URL 비교)
│   ├── HistoryViewer.vue         # 분석 이력 탭 (추이 차트)
│   ├── PerformanceBudget.vue     # 성능 예산 탭 (목표 설정)
│   ├── LighthouseTab.vue         # Lighthouse 탭 (5개 카테고리 점수) ⭐
│   ├── LongTaskHistogram.vue     # Long Task 히스토그램 컴포넌트
│   ├── FrameTimeline.vue         # 프레임 타임라인 뷰어 (레거시)
│   ├── MetricBadge.vue           # 메트릭 배지 (레거시)
│   ├── MetricsCard.vue           # 메트릭 카드 (레거시)
│   ├── NetworkWaterfall.vue      # 네트워크 워터폴 (레거시)
│   └── PerformanceOverview.vue   # 성능 개요 (레거시)
├── pages/
│   └── index.vue                 # 메인 페이지 (상단 제어바 + 7탭)
├── server/
│   ├── api/
│   │   └── analyze.post.ts       # POST /api/analyze 엔드포인트
│   └── utils/
│       ├── performanceCollector.ts # Puppeteer 기반 수집기
│       └── lighthouseCollector.ts  # Lighthouse 수집기 ⭐
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

## Implemented Enhancements ✅

- [x] **CLS 메트릭 추가**: Cumulative Layout Shift 측정 및 시각화
- [x] **Long Task 히스토그램**: 50ms 이상 차단 작업 분석 및 통계
- [x] **결과 내보내기**: JSON, 텍스트 리포트, CSV 형식 지원
- [x] **여러 URL 일괄 분석**: 동시 분석 및 성능 비교 테이블
- [x] **과거 데이터 비교**: 분석 이력 저장 및 추이 차트 (Chart.js)
- [x] **성능 예산 설정**: 목표 값 설정 및 실제 성능 대비 분석
- [x] **Lighthouse API 통합**: Performance, Accessibility, SEO, PWA, Best Practices 분석
- [x] **CI/CD 파이프라인**: GitHub Actions 기반 자동 빌드/테스트/배포

## Future Enhancements

- [ ] 실시간 모니터링 대시보드
- [ ] PDF 보고서 생성 (현재는 텍스트만 지원)
- [ ] 다국어 지원 (현재 한국어만)
- [ ] Lighthouse 결과 PDF 리포트 생성
- [ ] Kubernetes 배포 매니페스트

## License

MIT License

Check out the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) and [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
