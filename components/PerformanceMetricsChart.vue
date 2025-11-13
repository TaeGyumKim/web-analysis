<template>
  <div class="card">
    <h3 class="text-2xl font-bold text-gray-900 mb-6">Core Web Vitals 시각화</h3>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Radar Chart -->
      <div class="bg-white p-6 rounded-lg border border-gray-200">
        <h4 class="text-lg font-semibold mb-4 text-gray-700">성능 메트릭 분포</h4>
        <canvas ref="radarChart"></canvas>
      </div>

      <!-- Doughnut Chart for Score -->
      <div class="bg-white p-6 rounded-lg border border-gray-200">
        <h4 class="text-lg font-semibold mb-4 text-gray-700">종합 성능 점수</h4>
        <div class="relative">
          <canvas ref="scoreChart"></canvas>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <div class="text-4xl font-bold" :style="{ color: getScoreColor(overallScore) }">
                {{ overallScore }}
              </div>
              <div class="text-sm text-gray-500">/ 100</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Metric Bars with Animations -->
    <div class="bg-white p-6 rounded-lg border border-gray-200">
      <h4 class="text-lg font-semibold mb-4 text-gray-700">메트릭 상세</h4>
      <div class="space-y-4">
        <div v-for="metric in metricsData" :key="metric.name" class="space-y-2">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-700">{{ metric.label }}</span>
              <span class="text-xs px-2 py-1 rounded" :style="{
                backgroundColor: getMetricBadgeColor(metric.value, metric.thresholds),
                color: 'white'
              }">
                {{ formatMetricValue(metric.value, metric.unit) }}
              </span>
            </div>
            <span class="text-sm text-gray-500">
              목표: {{ metric.thresholds.good }}{{ metric.unit }}
            </span>
          </div>
          <div class="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="absolute h-full transition-all duration-1000 ease-out rounded-full"
              :style="{
                width: `${getMetricPercentage(metric.value, metric.thresholds)}%`,
                backgroundColor: getMetricBarColor(metric.value, metric.thresholds)
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline Visualization -->
    <div class="bg-white p-6 rounded-lg border border-gray-200 mt-6">
      <h4 class="text-lg font-semibold mb-4 text-gray-700">로딩 타임라인</h4>
      <canvas ref="timelineChart"></canvas>
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

const radarChart = ref<HTMLCanvasElement | null>(null);
const scoreChart = ref<HTMLCanvasElement | null>(null);
const timelineChart = ref<HTMLCanvasElement | null>(null);

let radarChartInstance: Chart | null = null;
let scoreChartInstance: Chart | null = null;
let timelineChartInstance: Chart | null = null;

const overallScore = computed(() => {
  if (!props.result) return 0;
  return props.result.performanceScore.overall;
});

const metricsData = computed(() => {
  if (!props.result) return [];

  return [
    {
      name: 'fcp',
      label: 'FCP (First Contentful Paint)',
      value: props.result.metrics.fcp || 0,
      unit: 'ms',
      thresholds: { good: 1800, needsImprovement: 3000 }
    },
    {
      name: 'lcp',
      label: 'LCP (Largest Contentful Paint)',
      value: props.result.metrics.lcp || 0,
      unit: 'ms',
      thresholds: { good: 2500, needsImprovement: 4000 }
    },
    {
      name: 'tbt',
      label: 'TBT (Total Blocking Time)',
      value: props.result.metrics.tbt || 0,
      unit: 'ms',
      thresholds: { good: 200, needsImprovement: 600 }
    },
    {
      name: 'cls',
      label: 'CLS (Cumulative Layout Shift)',
      value: props.result.metrics.cls !== undefined ? props.result.metrics.cls * 1000 : 0,
      unit: '',
      thresholds: { good: 100, needsImprovement: 250 },
      displayValue: props.result.metrics.cls !== undefined ? props.result.metrics.cls.toFixed(3) : '0'
    },
    {
      name: 'ttfb',
      label: 'TTFB (Time to First Byte)',
      value: props.result.metrics.ttfb || 0,
      unit: 'ms',
      thresholds: { good: 800, needsImprovement: 1800 }
    }
  ];
});

onMounted(() => {
  initCharts();
});

onUnmounted(() => {
  destroyCharts();
});

watch(() => props.result, (newResult) => {
  destroyCharts();
  if (newResult) {
    nextTick(() => {
      initCharts();
    });
  }
}, { deep: true });

function initCharts() {
  if (!props.result) return;

  initRadarChart();
  initScoreChart();
  initTimelineChart();
}

function initRadarChart() {
  if (!radarChart.value || !props.result) return;

  const metrics = metricsData.value;
  const scores = metrics.map(m => {
    const score = getMetricScore(m.value, m.thresholds);
    return score;
  });

  radarChartInstance = new Chart(radarChart.value, {
    type: 'radar',
    data: {
      labels: metrics.map(m => m.name.toUpperCase()),
      datasets: [{
        label: '성능 점수',
        data: scores,
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `점수: ${context.parsed.r.toFixed(0)}/100`;
            }
          }
        }
      }
    }
  });
}

function initScoreChart() {
  if (!scoreChart.value || !props.result) return;

  const score = props.result.performanceScore.overall;
  const remaining = 100 - score;

  scoreChartInstance = new Chart(scoreChart.value, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, remaining],
        backgroundColor: [
          getScoreColor(score),
          'rgba(229, 231, 235, 0.3)'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '80%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      }
    }
  });
}

function initTimelineChart() {
  if (!timelineChart.value || !props.result) return;

  const metrics = props.result.metrics;
  const events = [
    { label: 'TTFB', value: metrics.ttfb || 0, color: '#8b5cf6' },
    { label: 'FCP', value: metrics.fcp || 0, color: '#3b82f6' },
    { label: 'LCP', value: metrics.lcp || 0, color: '#10b981' },
    { label: 'DCL', value: metrics.domContentLoaded || 0, color: '#f59e0b' },
    { label: 'Load', value: metrics.loadComplete || 0, color: '#ef4444' }
  ].sort((a, b) => a.value - b.value);

  timelineChartInstance = new Chart(timelineChart.value, {
    type: 'bar',
    data: {
      labels: events.map(e => e.label),
      datasets: [{
        label: '시간 (ms)',
        data: events.map(e => e.value),
        backgroundColor: events.map(e => e.color),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.x.toFixed(0)}ms`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: '시간 (ms)'
          }
        }
      }
    }
  });
}

function destroyCharts() {
  if (radarChartInstance) {
    radarChartInstance.destroy();
    radarChartInstance = null;
  }
  if (scoreChartInstance) {
    scoreChartInstance.destroy();
    scoreChartInstance = null;
  }
  if (timelineChartInstance) {
    timelineChartInstance.destroy();
    timelineChartInstance = null;
  }
}

function getMetricScore(value: number, thresholds: { good: number; needsImprovement: number }): number {
  if (value <= thresholds.good) {
    return 100;
  } else if (value <= thresholds.needsImprovement) {
    const range = thresholds.needsImprovement - thresholds.good;
    const position = value - thresholds.good;
    return Math.max(50, 100 - (position / range) * 50);
  } else {
    return Math.max(0, 50 - ((value - thresholds.needsImprovement) / thresholds.needsImprovement) * 50);
  }
}

function getMetricPercentage(value: number, thresholds: { good: number; needsImprovement: number }): number {
  const max = thresholds.needsImprovement * 1.5;
  return Math.min((value / max) * 100, 100);
}

function getMetricBarColor(value: number, thresholds: { good: number; needsImprovement: number }): string {
  if (value <= thresholds.good) {
    return '#10b981'; // Green
  } else if (value <= thresholds.needsImprovement) {
    return '#f59e0b'; // Yellow
  } else {
    return '#ef4444'; // Red
  }
}

function getMetricBadgeColor(value: number, thresholds: { good: number; needsImprovement: number }): string {
  if (value <= thresholds.good) {
    return '#10b981';
  } else if (value <= thresholds.needsImprovement) {
    return '#f59e0b';
  } else {
    return '#ef4444';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981'; // Green
  if (score >= 50) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === '') {
    return (value / 1000).toFixed(3);
  }
  return `${value.toFixed(0)}${unit}`;
}
</script>

<style scoped>
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
</style>
