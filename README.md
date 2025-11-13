# Web Performance Analyzer

웹 페이지 로딩 성능을 분석하고 시각화하는 Nuxt 3 기반 웹 애플리케이션입니다.

## 프로젝트 구조

이 저장소는 웹 기반 성능 분석 도구를 제공합니다:
- **nuxt-web-perf**: Nuxt 3 + Puppeteer 기반 웹 성능 분석 애플리케이션

## 빠른 시작

프로젝트의 메인 애플리케이션은 `nuxt-web-perf` 디렉토리에 있습니다.

자세한 설치 및 사용 방법은 [nuxt-web-perf/README.md](./nuxt-web-perf/README.md)를 참조하세요.

### 설치

```bash
cd nuxt-web-perf
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

애플리케이션은 `http://localhost:3000`에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

## Docker로 실행

```bash
docker-compose up -d
```

또는 GitHub Container Registry에서:

```bash
docker pull ghcr.io/TaeGyumKim/web-analysis:latest
docker run -p 3000:3000 ghcr.io/TaeGyumKim/web-analysis:latest
```

## 주요 기능

- 🎯 **8개 탭 분석 시스템**: 프레임 분석, 네트워크 타임라인, 로딩 분포, 일괄 분석, 분석 이력, 성능 예산, Lighthouse, 커스텀 메트릭
- 📊 **Core Web Vitals 측정**: FCP, LCP, TBT, CLS, TTFB
- 📱 **Viewport 프리셋**: Desktop, Tablet, Mobile 다양한 화면 크기 지원
- 📈 **고급 시각화**: Radar Chart, Doughnut Chart, Heatmap, 워터폴 차트
- 💾 **다양한 내보내기**: JSON, CSV, Text Report, PDF
- 🔍 **Lighthouse 통합**: Google Lighthouse API 지원
- 🎛️ **커스텀 메트릭**: 사용자 정의 성능 지표 추적

## 문서

전체 문서는 [nuxt-web-perf/README.md](./nuxt-web-perf/README.md)에서 확인하세요.

## 라이센스

MIT License
