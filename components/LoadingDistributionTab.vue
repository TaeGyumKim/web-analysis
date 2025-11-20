<template>
  <div>
    <!-- 분석 전 초기 화면 -->
    <div v-if="!result" class="empty-state">
      <div style="text-align: center; padding: 60px 20px">
        <div style="font-size: 48px; margin-bottom: 16px">📊</div>
        <h3 style="color: #6b7280; margin: 0 0 8px 0">로딩 분포 분석</h3>
        <p style="color: #9ca3af; margin: 0">
          페이지 분석을 시작하면 네트워크 속도별, 장비별 로딩 시간 분포를 확인할 수 있습니다.
        </p>
      </div>
    </div>

    <!-- 분석 결과 화면 -->
    <div v-else>
      <!-- 인터랙티브 차트 안내 -->
      <div
        style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        "
      >
        <div style="font-size: 24px">🔍</div>
        <div>
          <strong>인터랙티브 차트</strong> – 마우스 휠로 줌 인/아웃, 드래그로 차트 이동이
          가능합니다.
        </div>
      </div>

      <!-- 차트 그리드 -->
      <div class="chart-grid">
        <div class="chart-container">
          <h3 style="display: flex; align-items: center">
            네트워크 속도별 로딩 시간 분포
            <HelpTooltip
              :text="glossary.networkThrottling.description"
              :title="glossary.networkThrottling.title"
              position="top"
            />
          </h3>
          <canvas ref="chartNetwork"></canvas>
        </div>
        <div class="chart-container">
          <h3 style="display: flex; align-items: center">
            장비별 로딩 시간 분포
            <HelpTooltip
              :text="glossary.cpuThrottling.description"
              :title="glossary.cpuThrottling.title"
              position="top"
            />
          </h3>
          <canvas ref="chartDevice"></canvas>
        </div>
      </div>

      <!-- 추이 차트 -->
      <div class="chart-container" style="margin-top: 20px">
        <h3>24시간 로딩 시간 추이</h3>
        <canvas ref="chartTrend"></canvas>
      </div>

      <!-- 요약 카드 -->
      <div class="summary-cards">
        <div class="summary-card">
          <strong>평균 로딩 시간</strong><br />
          <div style="font-size: 24px; font-weight: bold; margin: 8px 0">
            {{ averageLoadTime }}
          </div>
          <span style="color: #48d178">12% 개선</span>
        </div>
        <div class="summary-card">
          <strong>성능 점수</strong><br />
          <div style="font-size: 24px; font-weight: bold; margin: 8px 0">
            {{ performanceScore }} / 100
          </div>
          양호
        </div>
        <div class="summary-card">
          <strong>사용자 만족도</strong><br />
          <div style="font-size: 24px; font-weight: bold; margin: 8px 0">76%</div>
          목표 달성
        </div>
        <div class="summary-card">
          <strong>최적화 가능성</strong><br />
          <div style="font-size: 24px; font-weight: bold; margin: 8px 0">중간</div>
          <span style="color: #e67e22">개선 필요</span>
        </div>
      </div>

      <!-- 성능 개선 제안 -->
      <div class="card" style="margin-top: 20px">
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

      <!-- Long Task 히스토그램 -->
      <div v-if="result.longTasks" style="margin-top: 20px">
        <LongTaskHistogram :long-tasks="result.longTasks" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { AnalysisResult } from '~/types/performance';
import { glossary } from '~/utils/glossary';

Chart.register(...registerables, zoomPlugin);

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

  return sug.length > 0
    ? sug
    : [
        {
          title: '이미지 최적화',
          description: 'WebP 형식으로 변환 시 약 40% 절감 가능',
          class: 'yellow-bg'
        },
        { title: 'CSS 경량화', description: '중복 규칙 제거로 크기 절감 가능', class: 'blue-bg' },
        {
          title: '리소스 사전 로딩',
          description: '<link rel="preload"> 태그 권장',
          class: 'green-bg'
        }
      ];
});

onMounted(() => {
  if (props.result) {
    nextTick(() => {
      initCharts();
    });
  }
});

onUnmounted(() => {
  destroyCharts();
});

watch(
  () => props.result,
  newResult => {
    destroyCharts();
    if (newResult) {
      nextTick(() => {
        initCharts();
      });
    }
  }
);

async function initCharts() {
  if (!chartNetwork.value || !chartDevice.value || !chartTrend.value) {
    return;
  }

  if (!props.result) {
    return;
  }

  // Load historical data from server
  const historyData = await loadHistoryData();

  // Filter history data to only include entries with the same URL
  const currentUrl = props.result.url;
  const filteredHistory = historyData.filter(entry => entry.url === currentUrl);

  // Add current result to history data for chart calculations
  const currentEntry: HistoryEntry = {
    id: `${props.result.url}-${props.result.timestamp}`,
    url: props.result.url,
    timestamp: props.result.timestamp,
    result: props.result
  };
  const allData = [currentEntry, ...filteredHistory];

  // Calculate statistics from all data (current + historical)
  const networkStats = calculateNetworkStats(allData);
  const deviceStats = calculateDeviceStats(allData);
  const trendStats = calculateTrendStats(allData);

  // 네트워크 속도별 차트
  networkChart = new Chart(chartNetwork.value, {
    type: 'bar',
    data: {
      labels: ['Slow 3G', '3G', '4G', 'Wi-Fi'],
      datasets: [
        { label: 'P50', data: networkStats.p50, backgroundColor: '#7b91f0' },
        { label: 'P95', data: networkStats.p95, backgroundColor: '#f3b94a' },
        { label: '평균', data: networkStats.avg, backgroundColor: '#68ca84' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '로딩 시간 (ms)' } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: context => {
              const dataCount = networkStats.counts[context.dataIndex];
              return `샘플 수: ${dataCount}`;
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'y'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'y'
          }
        }
      }
    }
  });

  // 장비별 차트
  deviceChart = new Chart(chartDevice.value, {
    type: 'bar',
    data: {
      labels: ['Desktop', 'Mobile High', 'Mobile Mid', 'Mobile Low'],
      datasets: [
        { label: 'P50', data: deviceStats.p50, backgroundColor: '#7b91f0' },
        { label: 'P95', data: deviceStats.p95, backgroundColor: '#f3b94a' },
        { label: '평균', data: deviceStats.avg, backgroundColor: '#68ca84' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '로딩 시간 (ms)' } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: context => {
              const dataCount = deviceStats.counts[context.dataIndex];
              return `샘플 수: ${dataCount}`;
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'y'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'y'
          }
        }
      }
    }
  });

  // 24시간 추이 차트
  trendChart = new Chart(chartTrend.value, {
    type: 'line',
    data: {
      labels: trendStats.labels,
      datasets: [
        {
          label: '평균 로딩 시간',
          data: trendStats.data,
          borderColor: '#3b82f6',
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '로딩 시간 (ms)' } },
        x: { title: { display: true, text: '시간' } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: context => {
              const dataCount = trendStats.counts[context.dataIndex];
              return `샘플 수: ${dataCount}`;
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'xy'
          }
        }
      }
    }
  });
}

interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  result: AnalysisResult;
}

async function loadHistoryData(): Promise<HistoryEntry[]> {
  try {
    const response = await $fetch('/api/history');
    if (response.success && response.data) {
      return response.data as HistoryEntry[];
    }
  } catch (error) {
    console.error('Failed to load history from server:', error);
  }
  return [];
}

function calculateNetworkStats(history: HistoryEntry[]) {
  const categories = ['slow-3g', 'fast-3g', '4g', 'none'];
  const data = {
    p50: [] as number[],
    p95: [] as number[],
    avg: [] as number[],
    counts: [] as number[]
  };

  for (const category of categories) {
    const samples = history
      .filter(h => h.result?.options?.networkThrottling === category)
      .map(h => h.result.runningTime)
      .filter(t => typeof t === 'number' && t > 0);

    if (samples.length === 0) {
      data.p50.push(0);
      data.p95.push(0);
      data.avg.push(0);
      data.counts.push(0);
    } else {
      samples.sort((a, b) => a - b);
      const p50 = percentile(samples, 50);
      const p95 = percentile(samples, 95);
      const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;

      data.p50.push(Math.round(p50));
      data.p95.push(Math.round(p95));
      data.avg.push(Math.round(avg));
      data.counts.push(samples.length);
    }
  }

  return data;
}

function calculateDeviceStats(history: HistoryEntry[]) {
  // Map CPU throttling to device categories
  const categories = [1, 2, 4, 6];
  const data = {
    p50: [] as number[],
    p95: [] as number[],
    avg: [] as number[],
    counts: [] as number[]
  };

  for (const category of categories) {
    const samples = history
      .filter(h => h.result?.options?.cpuThrottling === category)
      .map(h => h.result.runningTime)
      .filter(t => typeof t === 'number' && t > 0);

    if (samples.length === 0) {
      data.p50.push(0);
      data.p95.push(0);
      data.avg.push(0);
      data.counts.push(0);
    } else {
      samples.sort((a, b) => a - b);
      const p50 = percentile(samples, 50);
      const p95 = percentile(samples, 95);
      const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;

      data.p50.push(Math.round(p50));
      data.p95.push(Math.round(p95));
      data.avg.push(Math.round(avg));
      data.counts.push(samples.length);
    }
  }

  return data;
}

function calculateTrendStats(history: HistoryEntry[]) {
  // Group by hour of day (0-23)
  const hourBuckets: Record<number, number[]> = {};

  for (let i = 0; i < 24; i++) {
    hourBuckets[i] = [];
  }

  for (const entry of history) {
    if (!entry.timestamp || !entry.result?.runningTime) continue;

    const date = new Date(entry.timestamp);
    const hour = date.getHours();

    if (typeof entry.result.runningTime === 'number' && entry.result.runningTime > 0) {
      hourBuckets[hour].push(entry.result.runningTime);
    }
  }

  const labels = [];
  const data = [];
  const counts = [];

  for (let hour = 0; hour < 24; hour++) {
    labels.push(`${hour}:00`);

    const samples = hourBuckets[hour];
    if (samples.length === 0) {
      data.push(null); // Show gap in chart
      counts.push(0);
    } else {
      const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;
      data.push(Math.round(avg));
      counts.push(samples.length);
    }
  }

  return { labels, data, counts };
}

function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;

  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedArray[lower];
  }

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
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
