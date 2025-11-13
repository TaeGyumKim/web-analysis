# API Documentation

## POST /api/analyze

웹 페이지의 성능을 분석합니다.

### Request

**Endpoint**: `POST /api/analyze`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "url": "https://www.example.com",
  "options": {
    "captureScreenshots": true,
    "networkThrottling": "4g",
    "cpuThrottling": 1,
    "waitUntil": "networkidle0"
  }
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✅ | 분석할 웹 페이지 URL |
| `options` | object | ❌ | 분석 옵션 |

### Options Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `captureScreenshots` | boolean | `true` | 프레임 캡처 여부 (100ms 간격) |
| `networkThrottling` | string | `"none"` | 네트워크 스로틀링: `"none"`, `"slow-3g"`, `"fast-3g"`, `"4g"` |
| `cpuThrottling` | number | `1` | CPU 스로틀링 배율: `1` (없음), `2`, `4`, `6` |
| `waitUntil` | string | `"networkidle0"` | 로드 완료 조건: `"load"`, `"domcontentloaded"`, `"networkidle0"`, `"networkidle2"` |
| `viewportWidth` | number | `1920` | 뷰포트 너비 (픽셀) |
| `viewportHeight` | number | `1080` | 뷰포트 높이 (픽셀) |
| `useLighthouse` | boolean | `false` | Google Lighthouse 분석 실행 여부 |
| `lighthouseFormFactor` | string | `"desktop"` | Lighthouse 폼 팩터: `"mobile"`, `"desktop"` |
| `customMetrics` | CustomMetricDefinition[] | `[]` | 사용자 정의 커스텀 메트릭 목록 |

### Response

**Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "url": "https://www.example.com",
    "timestamp": 1699876543210,
    "runningTime": 5432,
    "metrics": {
      "fcp": 1274,
      "lcp": 2349,
      "tbt": 156,
      "cls": 0.045,
      "ttfb": 234,
      "domContentLoaded": 1250,
      "loadComplete": 2256
    },
    "networkRequests": [
      {
        "id": "request-1",
        "url": "https://www.example.com/",
        "type": "document",
        "startTime": 0.123,
        "endTime": 0.567,
        "duration": 444,
        "size": 42000,
        "status": 200
      }
    ],
    "frames": [
      {
        "timestamp": 0.1,
        "screenshot": "base64-encoded-png-data",
        "metadata": {}
      }
    ],
    "longTasks": [
      {
        "name": "self",
        "startTime": 1234.5,
        "duration": 125.3,
        "attribution": "script"
      }
    ],
    "performanceScore": {
      "overall": 85,
      "metrics": 90,
      "network": 82,
      "frames": 88,
      "details": [
        {
          "name": "Metrics Score",
          "value": 90,
          "score": 90,
          "weight": 0.5
        }
      ]
    }
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "success": false,
  "statusCode": 400,
  "statusMessage": "Invalid URL provided"
}
```

**Error (500 Internal Server Error)**:
```json
{
  "success": false,
  "statusCode": 500,
  "statusMessage": "Failed to analyze page performance"
}
```

## Response Data Structure

### AnalysisResult

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | 분석한 URL |
| `timestamp` | number | 분석 시작 타임스탬프 (ms) |
| `runningTime` | number | 총 실행 시간 (ms) |
| `metrics` | PerformanceMetrics | 성능 메트릭 |
| `networkRequests` | NetworkRequest[] | 네트워크 요청 목록 |
| `frames` | FrameCapture[] | 캡처된 프레임 목록 |
| `longTasks` | LongTask[] | Long Task 목록 (50ms 이상 차단 작업) |
| `performanceScore` | PerformanceScore | 성능 점수 |
| `lighthouse` | LighthouseResult | Lighthouse 분석 결과 (useLighthouse가 true일 때) |
| `customMetrics` | CustomMetricResult[] | 커스텀 메트릭 측정 결과 |

### PerformanceMetrics

| Field | Type | Description |
|-------|------|-------------|
| `fcp` | number | First Contentful Paint (ms) |
| `lcp` | number | Largest Contentful Paint (ms) |
| `tbt` | number | Total Blocking Time (ms) |
| `cls` | number | Cumulative Layout Shift |
| `fid` | number | First Input Delay (ms) |
| `ttfb` | number | Time to First Byte (ms) |
| `domContentLoaded` | number | DOMContentLoaded 시간 (ms) |
| `loadComplete` | number | Load 완료 시간 (ms) |

### NetworkRequest

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 요청 ID |
| `url` | string | 요청 URL |
| `type` | string | 리소스 타입 (document, stylesheet, script, image, font, xhr, fetch) |
| `startTime` | number | 시작 시간 (초) |
| `endTime` | number | 종료 시간 (초) |
| `duration` | number | 소요 시간 (ms) |
| `size` | number | 전송 크기 (bytes) |
| `status` | number | HTTP 상태 코드 |

### FrameCapture

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | number | 타임스탬프 (초) |
| `screenshot` | string | Base64 인코딩된 PNG 이미지 |
| `metadata` | object | 메타데이터 (선택적) |

### LongTask

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | 작업 이름 (예: "self", "unknown") |
| `startTime` | number | 시작 시간 (ms) |
| `duration` | number | 지속 시간 (ms) |
| `attribution` | string | 원인 출처 (선택적, 예: "script") |

### PerformanceScore

| Field | Type | Description |
|-------|------|-------------|
| `overall` | number | 전체 점수 (0-100) |
| `metrics` | number | 메트릭 점수 (0-100) |
| `network` | number | 네트워크 점수 (0-100) |
| `frames` | number | 프레임 점수 (0-100) |
| `details` | ScoreDetail[] | 상세 점수 정보 |

## Usage Examples

### JavaScript/Fetch

```javascript
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://www.example.com',
    options: {
      captureScreenshots: true,
      networkThrottling: '4g',
      cpuThrottling: 1,
      waitUntil: 'networkidle0'
    }
  })
});

const result = await response.json();
if (result.success) {
  console.log('Performance Score:', result.data.performanceScore.overall);
  console.log('FCP:', result.data.metrics.fcp, 'ms');
  console.log('Total Requests:', result.data.networkRequests.length);
}
```

### cURL

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example.com",
    "options": {
      "captureScreenshots": true,
      "networkThrottling": "4g",
      "cpuThrottling": 1,
      "waitUntil": "networkidle0"
    }
  }'
```

### Python

```python
import requests

response = requests.post('http://localhost:3000/api/analyze', json={
    'url': 'https://www.example.com',
    'options': {
        'captureScreenshots': True,
        'networkThrottling': '4g',
        'cpuThrottling': 1,
        'waitUntil': 'networkidle0'
    }
})

result = response.json()
if result['success']:
    print(f"Performance Score: {result['data']['performanceScore']['overall']}")
    print(f"FCP: {result['data']['metrics']['fcp']} ms")
```

## Error Handling

API는 다음과 같은 HTTP 상태 코드를 반환합니다:

- **200 OK**: 성공적으로 분석 완료
- **400 Bad Request**: 잘못된 요청 (URL 형식 오류 등)
- **500 Internal Server Error**: 서버 오류 (분석 실패 등)

모든 오류 응답은 다음 형식을 따릅니다:

```json
{
  "success": false,
  "statusCode": 400,
  "statusMessage": "Error message description"
}
```

## Rate Limiting

현재 Rate Limiting이 적용되지 않았습니다. 프로덕션 환경에서는 적절한 제한을 설정하는 것을 권장합니다.

### CustomMetricDefinition

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 메트릭 고유 ID |
| `name` | string | 메트릭 이름 |
| `description` | string | 메트릭 설명 |
| `type` | string | 메트릭 타입: `"user-timing"`, `"element-timing"`, `"calculated"` |
| `markName` | string | User Timing API 마크 이름 (type이 "user-timing"일 때) |
| `measureName` | string | User Timing API 측정 이름 (type이 "user-timing"일 때) |
| `elementSelector` | string | CSS 선택자 (type이 "element-timing"일 때) |
| `formula` | string | 계산 수식 (type이 "calculated"일 때, 예: "lcp - fcp") |
| `thresholds` | object | 임계값 설정 { good, needsImprovement, poor } |
| `unit` | string | 단위: `"ms"`, `"s"`, `"score"`, `"bytes"`, `"count"` |
| `enabled` | boolean | 활성화 여부 |

### CustomMetricResult

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 메트릭 ID (CustomMetricDefinition의 id와 일치) |
| `name` | string | 메트릭 이름 |
| `value` | number | 측정된 값 |
| `unit` | string | 단위 |
| `score` | number | 점수 (0-100) |
| `status` | string | 상태: `"good"`, `"needs-improvement"`, `"poor"` |
| `timestamp` | number | 측정 시간 타임스탬프 |

### LighthouseResult

| Field | Type | Description |
|-------|------|-------------|
| `scores` | object | 카테고리별 점수 { performance, accessibility, bestPractices, seo, pwa } |
| `audits` | object | 상세 감사 항목 결과 |

---

## POST /api/generate-pdf

분석 결과를 PDF 리포트로 생성합니다.

### Request

**Endpoint**: `POST /api/generate-pdf`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "result": {
    "url": "https://www.example.com",
    "timestamp": 1699876543210,
    "runningTime": 5432,
    "metrics": { ... },
    "networkRequests": [ ... ],
    "frames": [ ... ],
    "longTasks": [ ... ],
    "performanceScore": { ... }
  }
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `result` | AnalysisResult | ✅ | 분석 결과 객체 (POST /api/analyze의 응답 데이터) |

### Response

**Success (200 OK)**:
```json
{
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL...",
  "filename": "performance-report-2024-11-13.pdf"
}
```

**Error (400 Bad Request)**:
```json
{
  "statusCode": 400,
  "statusMessage": "No result data provided"
}
```

**Error (500 Internal Server Error)**:
```json
{
  "statusCode": 500,
  "statusMessage": "Failed to generate PDF",
  "data": {
    "message": "Error details..."
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `pdfBase64` | string | Base64로 인코딩된 PDF 파일 데이터 |
| `filename` | string | 생성된 PDF 파일명 |

### Usage Example

```javascript
// 1. 먼저 분석 수행
const analyzeResponse = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.example.com',
    options: { captureScreenshots: true }
  })
});
const analyzeResult = await analyzeResponse.json();

// 2. PDF 생성
const pdfResponse = await fetch('/api/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    result: analyzeResult.data
  })
});
const pdfData = await pdfResponse.json();

// 3. PDF 다운로드
const pdfBlob = Uint8Array.from(atob(pdfData.pdfBase64), c => c.charCodeAt(0));
const blob = new Blob([pdfBlob], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = pdfData.filename;
a.click();
URL.revokeObjectURL(url);
```

---

## Notes

- 분석 시간은 페이지 복잡도와 네트워크 상태에 따라 5초~60초 소요될 수 있습니다
- `captureScreenshots: true`는 메모리 사용량을 증가시킵니다
- Puppeteer는 Chromium 브라우저가 필요합니다
- 동시 요청 수가 많을 경우 서버 리소스를 고려해야 합니다
- Lighthouse 분석은 추가로 10-30초 소요될 수 있습니다
- PDF 생성은 분석 결과 크기에 따라 5-15초 소요됩니다
