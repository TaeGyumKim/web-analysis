<template>
  <div>
    <!-- 차트 그리드 -->
    <div class="chart-grid">
      <div class="chart-container">
        <h3>네트워크 속도별 로딩 시간 분포</h3>
        <canvas ref="chartNetwork"></canvas>
      </div>
      <div class="chart-container">
        <h3>장비별 로딩 시간 분포</h3>
        <canvas ref="chartDevice"></canvas>
      </div>
    </div>

    <!-- 추이 차트 -->
    <div class="chart-container" style="margin-top: 20px;">
      <h3>24시간 로딩 시간 추이</h3>
      <canvas ref="chartTrend"></canvas>
    </div>

    <!-- 요약 카드 -->
    <div class="summary-cards">
      <div class="summary-card">
        <strong>평균 로딩 시간</strong><br />
        <div style="font-size: 24px; font-weight: bold; margin: 8px 0;">
          {{ averageLoadTime }}
        </div>
        <span style="color: #48d178;">12% 개선</span>
      </div>
      <div class="summary-card">
        <strong>성능 점수</strong><br />
        <div style="font-size: 24px; font-weight: bold; margin: 8px 0;">
          {{ performanceScore }} / 100
        </div>
        양호
      </div>
      <div class="summary-card">
        <strong>사용자 만족도</strong><br />
        <div style="font-size: 24px; font-weight: bold; margin: 8px 0;">76%</div>
        목표 달성
      </div>
      <div class="summary-card">
        <strong>최적화 가능성</strong><br />
        <div style="font-size: 24px; font-weight: bold; margin: 8px 0;">중간</div>
        <span style="color: #e67e22;">개선 필요</span>
      </div>
    </div>

    <!-- 성능 개선 제안 -->
    <div class="card" style="margin-top: 20px;">
      <h3>성능 개선 제안</h3>
      <div v-if="result">
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          class="suggestion-card"
          :class="suggestion.class"
        >
          <strong>{{ index + 1 }}. {{ suggestion.title }}</strong> – {{ suggestion.description }}
        </div>
      </div>
      <div v-else>
        <div class="suggestion-card yellow-bg">
          1. <strong>이미지 최적화</strong> – WebP 형식으로 변환 시 약 40% 절감 가능
        </div>
        <div class="suggestion-card blue-bg">
          2. <strong>CSS 경량화</strong> – 중복 규칙 제거로 크기 절감 가능
        </div>
        <div class="suggestion-card green-bg">
          3. <strong>리소스 사전 로딩</strong> – &lt;link rel="preload"&gt; 태그 권장
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import type { AnalysisResult } from '~/types/performance';

Chart.register(...registerables);

const props = defineProps<{
  result: AnalysisResult | null;
}>();

const chartNetwork = ref<HTMLCanvasElement | null>(null);
const chartDevice = ref<HTMLCanvasElement | null>(null);
const chartTrend = ref<HTMLCanvasElement | null>(null);

let networkChart: Chart | null = null;
let deviceChart: Chart | null = null;
let trendChart: Chart | null = null;

const averageLoadTime = computed(() => {
  if (!props.result) return '3,234 ms';
  return `${props.result.runningTime.toFixed(0)} ms`;
});

const performanceScore = computed(() => {
  if (!props.result) return 69;
  return props.result.performanceScore.overall;
});

const suggestions = computed(() => {
  if (!props.result) return [];

  const sug = [];

  // 이미지 최적화 제안
  const images = props.result.networkRequests.filter(r => r.type.toLowerCase() === 'image');
  const largeImages = images.filter(r => r.size > 100000);
  if (largeImages.length > 0) {
    sug.push({
      title: '이미지 최적화',
      description: `${largeImages.length}개의 대용량 이미지를 WebP로 변환 시 약 40% 절감`,
      class: 'yellow-bg'
    });
  }

  // CSS 경량화 제안
  const css = props.result.networkRequests.filter(r => r.type.toLowerCase() === 'stylesheet');
  const largeCss = css.filter(r => r.size > 50000);
  if (largeCss.length > 0) {
    sug.push({
      title: 'CSS 경량화',
      description: '중복 규칙 제거 및 미사용 CSS 제거 권장',
      class: 'blue-bg'
    });
  }

  // 리소스 사전 로딩 제안
  if (props.result.metrics.fcp && props.result.metrics.fcp > 2000) {
    sug.push({
      title: '리소스 사전 로딩',
      description: '중요 리소스에 <link rel="preload"> 태그 사용 권장',
      class: 'green-bg'
    });
  }

  return sug.length > 0 ? sug : [
    { title: '이미지 최적화', description: 'WebP 형식으로 변환 시 약 40% 절감 가능', class: 'yellow-bg' },
    { title: 'CSS 경량화', description: '중복 규칙 제거로 크기 절감 가능', class: 'blue-bg' },
    { title: '리소스 사전 로딩', description: '<link rel="preload"> 태그 권장', class: 'green-bg' }
  ];
});

onMounted(() => {
  initCharts();
});

onUnmounted(() => {
  destroyCharts();
});

watch(() => props.result, () => {
  destroyCharts();
  nextTick(() => {
    initCharts();
  });
});

function initCharts() {
  if (!chartNetwork.value || !chartDevice.value || !chartTrend.value) return;

  // 네트워크 속도별 차트
  networkChart = new Chart(chartNetwork.value, {
    type: 'bar',
    data: {
      labels: ['3G', '4G', 'Wi-Fi'],
      datasets: [
        { label: 'P50', data: [5200, 3400, 1800], backgroundColor: '#7b91f0' },
        { label: 'P95', data: [6200, 4200, 2200], backgroundColor: '#f3b94a' },
        { label: '평균', data: [5800, 3600, 1900], backgroundColor: '#68ca84' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // 장비별 차트
  deviceChart = new Chart(chartDevice.value, {
    type: 'bar',
    data: {
      labels: ['Desktop', 'Mobile High', 'Mobile Mid', 'Mobile Low'],
      datasets: [
        { label: 'P50', data: [1500, 2200, 3900, 6500], backgroundColor: '#7b91f0' },
        { label: 'P95', data: [2000, 2900, 4300, 8000], backgroundColor: '#f3b94a' },
        { label: '평균', data: [1600, 2300, 3800, 6540], backgroundColor: '#68ca84' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // 24시간 추이 차트
  trendChart = new Chart(chartTrend.value, {
    type: 'line',
    data: {
      labels: ['0:00', '2:00', '4:00', '6:00', '8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
      datasets: [
        {
          label: '평균 로딩 시간',
          data: [3200, 3800, 3100, 3400, 3650, 3450, 3600, 3750, 3650, 3700, 3300, 3100],
          borderColor: '#3b82f6',
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function destroyCharts() {
  if (networkChart) {
    networkChart.destroy();
    networkChart = null;
  }
  if (deviceChart) {
    deviceChart.destroy();
    deviceChart = null;
  }
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }
}
</script>
