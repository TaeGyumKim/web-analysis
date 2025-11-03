# WebPerf — README

간단 요약
- WebPerf는 WebView2 + DevTools CDP를 이용해 웹 페이지 로드 과정을 캡처(프레임 스크린샷, 네트워크 이벤트, performance metrics)하고, 프레임·리소스 단위로 분석해 사람이 읽기 쉬운 텍스트 및 간단한 성능 점수를 제공하는 프로토타입입니다.
- 목표: Lighthouse 스타일의 핵심 지표(예: FCP/LCP/TBT)와 네트워크·프레임 관점의 원인 분석을 빠르게 확인하고, AI에 전달할 텍스트를 만들기 위한 전처리/시각화.

목차
1. 요구사항
2. 실행 방법
3. 아키텍처 및 데이터 흐름
4. 수집되는 데이터(포맷)
5. 점수 산출 방식(상세)
6. UI/출력 요약
7. 제약·주의사항
8. 향후 확장 제안

1. 요구사항
- .NET Framework 4.8, C# 7.3
- Visual Studio 2022 권장
- NuGet 패키지: `Microsoft.Web.WebView2`
- 실행 환경에 WebView2 런타임 설치 필요 (Edge Chromium 기반 런타임)

2. 실행 방법
- 솔루션 열기 → 빌드
- __NuGet 패키지 관리자__에서 `Microsoft.Web.WebView2` 확인/설치
- 프로그램 실행 → 메인 창에 URL 입력 → 네트워크/CPU 프로파일 선택 → Start
- 페이지 로딩 완료 후 Stop → 결과 창에서 DevTools/Frames 확인

3. 아키텍처 및 데이터 흐름 (요약)
- `WebPerfForm` (사용자 입력) → `WebViewerForm` (수집) → `WebPerfResultForm` (시각화/분석)
- 수집:
  - Network: CDP 이벤트 `Network.requestWillBeSent`, `Network.loadingFinished` → `NetworkPerfModel`에 `RequestRecord`로 저장
  - 스크린샷(프레임): CDP `Page.captureScreenshot`을 100ms 간격으로 호출하여 `FrameModel` 저장
  - DevTools/performance: `Performance.getMetrics`, `performance.getEntries()`를 수집
  - 페이지 주입 스크립트로 LCP/FCP/longtask/TBT 수집(see `WebViewerForm`의 스크립트 주입)
- 표시: `WebPerfResultForm`가 `PerfResultModel`(RunningTime, NetworkPerfResult, DevTools JSON, Frames)을 받아 표시

4. 수집되는 데이터(포맷)
- `PerfResultModel.DevToolsPerformanceJson` — JSON:  
  - `metrics` : `Performance.getMetrics` 원본  
  - `navigationTiming` : navigation timing object  
  - `performanceEntries` : `performance.getEntries()` 결과  
  - `webperfMetrics` : 주입 스크립트로 수집된 `{ lcp: { time, tag, snippet }, fcp: ms, longTasks: [{start,duration}], tbt: ms }`
- `NetworkPerfModel._requestLists` : 각 요청에 대해 `RequestRecord { Id, Url, Type, StartSec, EndSec, Size }`
- `Frames` : `FrameModel { TimestampSec, Base64Png, Metadata }`

5. 점수 산출 방식 — 상세(중요)
- 최종 점수는 세 축(메트릭, 네트워크, 프레임) 가중합으로 계산됩니다.
  - 기본 가중치:
    - Metrics: `PERF_WEIGHT_METRICS = 0.5`
    - Network: `PERF_WEIGHT_NETWORK = 0.35`
    - Frames: `PERF_WEIGHT_FRAMES = 0.15`
  - (메트릭이 없거나 `PERF_WEIGHT_METRICS`를 0으로 설정하면 네트워크/프레임 가중치 정규화)

5.1. 메트릭 서브스코어 (metricsScore)
- 수집 가능한 메트릭:
  - DevTools `Performance.getMetrics` 항목들 (예: FirstContentfulPaint, FirstMeaningfulPaint, FirstPaint, DomContentLoaded, NavigationStart)
  - 주입된 `webperfMetrics` 항목: `LCP`, `FCP`, `TBT` (TBT = Total Blocking Time, longtask 기준 합계 초과분 합)
- 메트릭별 점수 산정은 공통 함수 `ScoreTimingMs(ms)` 로 매핑:
  - 입력: ms(밀리초). 출력: 서브스코어(0..100), 클수록 좋음.
  - 구현(휴리스틱):
    - ms <= 1000 → score = 100
    - 1000 < ms <= 3000 → 선형감소: 100 → 75
      - score = 100 - (ms - 1000) * (25 / 2000)
    - 3000 < ms <= 7000 → 선형감소: 75 → 30
      - score = 75 - (ms - 3000) * (45 / 4000)
    - ms > 7000 → 천천히 감소(매 1s마다 -1): score = max(0, 30 - (ms - 7000)/1000)
    - 특이사항: 음수/NaN/Inf/0 등 비정상 값은 100으로 간주(수집 실패 시 중립)
- 메트릭 집계:
  - 우선순위 가중치(`preferredWeights`)를 사용해 가중 평균을 계산:
    - 예: FirstContentfulPaint(0.28), FirstMeaningfulPaint(0.28), FirstPaint(0.12), DomContentLoaded(0.12), NavigationStart(0.20)
    - 추가로 LCP(0.2), FCP(0.12), TBT(0.18)가 가중치 목록에 포함되어 사용 가능
  - 이용 가능한 우선 메트릭만을 정규화하여 합산(가용 메트릭에 대해 상대적 비중 적용)
  - 결과 `metricsScore`는 0..100 범위(가중 평균)

5.2. 네트워크 점수 (ComputeNetworkScore)
- 기본 아이디어: 바이트 크기, 요청 수, 최장 요청 시간에 따른 감점(100에서 출발)
- 수식(코드에 구현된 로직):
  1. totalBytes (전체 바이트), mb = totalBytes / (1024*1024)
     - mb > 5 → 바이트 패널티 p1 = min(30, (mb - 5) * 3)
  2. reqCount (요청 수)
     - reqCount > 40 → 패널티 p2 = min(25, (reqCount - 40) * 0.8)
  3. longestMs (요청 중 최대 지속시간, ms)
     - longestMs > 2000 → 패널티 p3 = min(30, (longestMs - 2000)/500 * 3)
  4. score = 100 - (p1 + p2 + p3) → 정수 반올림 후 0..100 clamp
- 별도 항목:
  - `LongestRequestMs`에 대해서는 `ScoreTimingMs(longestMs)`로 별도 세부점수를 생성하여 분석에 노출
- 결과: `NetworkAggregate` (정수 0..100)

5.3. 프레임 점수 (ComputeFramesScore)
- 목적: 캡처된 프레임 간격(프레임 빈도 및 안정성)으로 간단 평가
- 계산:
  - 각 연속 프레임의 타임스탬프 차이를 ms로 계산 → 평균 avg (ms) 및 median
  - 점수 규칙:
    - avg <= 100 → 100
    - avg <= 200 → 90
    - avg <= 400 → 75
    - else → 60
- 결과: `FramesAggregate` (정수 0..100)

5.4. 최종 합산 (ComputePerformanceScore)
- metricsScore (0..100) × PERF_WEIGHT_METRICS
- NetworkAggregate (0..100) × PERF_WEIGHT_NETWORK
- FramesAggregate (0..100) × PERF_WEIGHT_FRAMES
- 최종 정수화: 반올림, 0..100 범위 clamp → `FinalScore`
- 내부적으로 각 개별 항목들은 `PerfScoreDetail` 리스트로 수집되어 상세보기에서 표시

5.5. 예시 계산
- 가정: Metrics (FCP=800ms, LCP=1800ms), Network: total 6MB, 45 req, longest 2500ms, Frames avg 150ms
  - Metric sub-scores:
    - FCP 800ms → ScoreTimingMs=100
    - LCP 1800ms → in 1000-3000 ⇒ score ≈ 100 - (1800-1000)*(25/2000) = 100 - 800*0.0125 = 100 - 10 = 90
    - metricsScore (가중 예): suppose combined = 95
  - Network:
    - mb = 6 → p1 = min(30,(6-5)*3)=3
    - reqCount=45 → p2 = min(25,(45-40)*0.8)=4
    - longest=2500 → p3 = min(30,(2500-2000)/500*3) = (500/500*3)=3
    - score = 100 - (3+4+3) = 90 → NetworkAggregate=90
  - Frames avg 150ms → FramesAggregate = 90
  - Final = 95*0.5 + 90*0.35 + 90*0.15 = 47.5 + 31.5 + 13.5 = 92.5 → FinalScore = 93

6. UI / 출력 (어디서 확인)
- DevTools 탭:
  - 요약 메트릭 배지(자동으로 ExtractMetricsDict에서 추출된 값, LCP/FCP/TBT 포함)
  - Performance Score 배지(클릭 시 상세 창) — `PerfScoreDetail` 리스트 확인 가능
  - 원본 DevTools/performance JSON 트리
- Frames 탭:
  - 프레임 썸네일, 타임라인(네트워크 워터폴 + 프레임 마커), 프레임 선택 시 메타/DOM 렌더
  - "프레임 분석 (AI용 텍스트 생성)" 버튼으로 각 프레임과 관련된 네트워크 요청 요약 텍스트 생성

7. 제약·주의사항
- 점수 로직은 휴리스틱(간단 규칙 기반)입니다. Lighthouse와 동일한 알고리즘이 아니므로 수치 해석 시 유의하세요.
- 수집된 메트릭 품질은 페이지/환경에 따라 달라집니다(CSP, 브라우저 지원, iframe 등).
- 많은 요청/프레임 데이터는 UI 성능/메모리에 영향이 있음. 대량 데이터는 가상화 필요.
- WebView2 스크립트 주입은 외부 페이지와 상호작용하므로(다만 현재는 performance API만 사용) 보안·정책에 유의하세요.

8. 향후 개선·확장 제안 (우선순위)
- CLS 수집(PerformanceObserver('layout-shift')) 및 게이지 시각화
- Long Tasks 히스토그램(시간축) 및 프레임 연동
- 프레임 → 관련 요청 테이블(클릭 시 워터폴/타임라인 하이라이트)
- LCP 요소 하이라이트(WebView2 렌더러에서 강조)
- 결과 내보내기(JSON/CSV 및 AI 전송 페이로드 스키마

참고: 주요 구현 위치(파일/함수)
- 수집(스크립트 주입, screenshots): `WebViewerForm.cs`  
  - `EnsureWebView2Async()` — 스크립트 주입(`AddScriptToExecuteOnDocumentCreatedAsync`)  
  - `StartCaptureTimer()` — `Page.captureScreenshot` 반복 캡처  
  - `CollectDevToolsPerfAsync()` — `Performance.getMetrics`, `Runtime.evaluate` (performance.entries 및 주입된 `window.__webperf_metrics__`) 수집
- 네트워크 추적: `WebPerf\Model\NetworkPerfModel.cs` (`OnNetworkRequestStart` / `OnNetworkRequestEnd`)
- 분석/시각화/점수: `WebPerfResultForm.cs`  
  - `ExtractMetricsDict`, `ScoreTimingMs`, `ComputeNetworkScore`, `ComputeFramesScore`, `ComputePerformanceScore`

문의 및 다음 단계
- README를 프로젝트 루트에 `README.md`로 추가하길 원하시면 생성해 드립니다.
- 점수 산출 규칙(임계값·가중치)을 조정하거나, CLS/LongTask 시각화를 먼저 구현하길 원하면 선택해 주세요.  