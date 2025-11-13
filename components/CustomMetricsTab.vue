<template>
  <div>
    <!-- 커스텀 메트릭 관리 컴포넌트 -->
    <CustomMetricsManager ref="metricsManager" />

    <!-- 커스텀 메트릭 결과 -->
    <div v-if="result && result.customMetrics && result.customMetrics.length > 0" class="card" style="margin-top: 20px;">
      <h3>커스텀 메트릭 결과</h3>

      <!-- 메트릭 카드 그리드 -->
      <div class="metrics-grid">
        <div
          v-for="metric in result.customMetrics"
          :key="metric.id"
          class="metric-card"
          :class="getStatusClass(metric.status)"
        >
          <div class="metric-name">{{ metric.name }}</div>
          <div class="metric-value">
            {{ formatValue(metric.value, metric.unit) }}
          </div>
          <div class="metric-status">
            <span class="status-badge" :class="getStatusClass(metric.status)">
              {{ getStatusLabel(metric.status) }}
            </span>
            <span class="metric-score">점수: {{ metric.score }}/100</span>
          </div>

          <!-- 진행 바 -->
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="getStatusClass(metric.status)"
              :style="{ width: metric.score + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 시간별 추이 차트 (히스토리가 있을 경우) -->
      <div v-if="hasHistory" style="margin-top: 30px;">
        <h3>커스텀 메트릭 추이</h3>
        <canvas ref="trendChart"></canvas>
      </div>
    </div>

    <!-- 결과가 없을 때 -->
    <div v-else-if="result" class="card" style="margin-top: 20px; text-align: center; padding: 40px; color: #999;">
      커스텀 메트릭이 정의되지 않았거나 측정된 데이터가 없습니다.
      <br />
      위에서 커스텀 메트릭을 추가하고 분석을 다시 실행하세요.
    </div>

    <!-- 도움말 -->
    <div class="card" style="margin-top: 20px; background: #f0f9ff; border-left: 4px solid #3b82f6;">
      <h4 style="margin: 0 0 12px 0; color: #1e40af;">💡 커스텀 메트릭 사용 팁</h4>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
        <li><strong>User Timing API:</strong> 웹사이트 코드에서 <code>performance.mark()</code> 또는 <code>performance.measure()</code>를 사용하여 측정한 메트릭을 추적할 수 있습니다.</li>
        <li><strong>Element Timing:</strong> 특정 요소(이미지, 텍스트 등)의 렌더링 시간을 측정합니다. 요소에 <code>elementtiming</code> 속성이 필요합니다.</li>
        <li><strong>계산된 메트릭:</strong> 기존 메트릭을 조합하여 새로운 메트릭을 만듭니다 (예: LCP - FCP = 컨텐츠 렌더링 시간).</li>
        <li><strong>임계값:</strong> 각 메트릭에 대한 양호/개선필요/나쁨 기준을 설정하여 성능을 평가할 수 있습니다.</li>
      </ul>
    </div>

    <!-- 커스텀 메트릭 예제 -->
    <div class="card" style="margin-top: 20px;">
      <h4 style="margin: 0 0 12px 0;">📋 커스텀 메트릭 예제</h4>

      <div style="display: grid; gap: 16px;">
        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <strong>히어로 이미지 로딩 시간</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            타입: Element Timing | 선택자: <code>.hero-image</code> | 임계값: 1000ms / 2500ms
          </div>
        </div>

        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <strong>API 응답 시간</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            타입: User Timing | Measure: <code>api-response</code> | 임계값: 500ms / 1000ms
          </div>
        </div>

        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <strong>컨텐츠 렌더링 시간</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            타입: 계산 | 수식: <code>lcp - fcp</code> | 임계값: 500ms / 1500ms
          </div>
        </div>

        <div style="padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <strong>리소스 개수</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            타입: 계산 | 수식: <code>networkRequests.length</code> | 임계값: 50 / 100
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import type { AnalysisResult, CustomMetricResult } from '~/types/performance';

Chart.register(...registerables);

const props = defineProps<{
  result: AnalysisResult | null;
}>();

const metricsManager = ref();
const trendChart = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const hasHistory = ref(false); // TODO: Implement history tracking

onMounted(() => {
  // TODO: Load history from localStorage
  initTrendChart();
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});

watch(() => props.result, (newResult) => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (newResult) {
    nextTick(() => {
      initTrendChart();
    });
  }
});

function initTrendChart() {
  if (!trendChart.value || !hasHistory.value) return;

  // TODO: Use real historical data
  // For now, this is placeholder code
  chartInstance = new Chart(trendChart.value, {
    type: 'line',
    data: {
      labels: ['분석 1', '분석 2', '분석 3', '분석 4', '분석 5'],
      datasets: []
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function formatValue(value: number, unit: string): string {
  if (unit === 'ms') {
    return `${value.toFixed(0)} ms`;
  } else if (unit === 's') {
    return `${value.toFixed(2)} s`;
  } else if (unit === 'bytes') {
    return formatBytes(value);
  } else if (unit === 'count') {
    return value.toString();
  } else if (unit === 'score') {
    return value.toFixed(0);
  }
  return `${value} ${unit}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'good': '양호',
    'needs-improvement': '개선 필요',
    'poor': '나쁨'
  };
  return labels[status] || status;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    'good': 'status-good',
    'needs-improvement': 'status-warning',
    'poor': 'status-poor'
  };
  return classes[status] || '';
}
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.metric-card {
  padding: 20px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: white;
  transition: all 0.2s;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.metric-card.status-good {
  border-color: #10b981;
  background: linear-gradient(to bottom, white, #f0fdf4);
}

.metric-card.status-warning {
  border-color: #f59e0b;
  background: linear-gradient(to bottom, white, #fffbeb);
}

.metric-card.status-poor {
  border-color: #ef4444;
  background: linear-gradient(to bottom, white, #fef2f2);
}

.metric-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #111827;
  margin-bottom: 12px;
}

.metric-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-good {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.status-warning {
  background-color: #fed7aa;
  color: #92400e;
}

.status-badge.status-poor {
  background-color: #fee2e2;
  color: #991b1b;
}

.metric-score {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-fill.status-good {
  background-color: #10b981;
}

.progress-fill.status-warning {
  background-color: #f59e0b;
}

.progress-fill.status-poor {
  background-color: #ef4444;
}

code {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}
</style>
