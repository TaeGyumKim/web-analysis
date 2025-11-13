<template>
  <div class="card">
    <h3>과거 데이터 비교 및 추이 분석</h3>
    <p style="font-size: 14px; color: #666; margin-top: 8px">
      저장된 분석 결과를 확인하고 시간에 따른 성능 변화를 추적합니다
    </p>

    <!-- URL 선택 -->
    <div style="margin-top: 20px">
      <label style="display: block; font-weight: 600; margin-bottom: 8px">분석할 URL 선택:</label>
      <select
        v-model="selectedUrl"
        style="
          width: 100%;
          max-width: 500px;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        "
        @change="loadHistoryForUrl"
      >
        <option value="">URL을 선택하세요</option>
        <option v-for="url in uniqueUrls" :key="url" :value="url">{{ url }}</option>
      </select>
    </div>

    <!-- History Table -->
    <div v-if="selectedUrl && urlHistory.length > 0" style="margin-top: 24px">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        "
      >
        <h4>분석 이력 ({{ urlHistory.length }}건)</h4>
        <button class="btn" @click="clearUrlHistory">이력 삭제</button>
      </div>

      <div style="overflow-x: auto">
        <table style="width: 100%; border-collapse: collapse">
          <thead>
            <tr style="border-bottom: 2px solid #e0e0e0">
              <th style="padding: 12px 8px; text-align: left; font-weight: 600">분석 일시</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">종합 점수</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">FCP</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">LCP</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">TBT</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">CLS</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">비교</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in urlHistory"
              :key="entry.id"
              style="border-bottom: 1px solid #e0e0e0"
              :class="{ 'selected-row': selectedEntries.includes(entry.id) }"
            >
              <td style="padding: 8px">{{ formatDate(entry.timestamp) }}</td>
              <td style="padding: 8px; text-align: center">
                <span
                  :style="{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    background: getScoreColor(entry.result.performanceScore.overall),
                    color: '#fff',
                    fontWeight: '600'
                  }"
                >
                  {{ entry.result.performanceScore.overall }}
                </span>
              </td>
              <td style="padding: 8px; text-align: center">
                {{ entry.result.metrics.fcp?.toFixed(0) || '-' }}ms
              </td>
              <td style="padding: 8px; text-align: center">
                {{ entry.result.metrics.lcp?.toFixed(0) || '-' }}ms
              </td>
              <td style="padding: 8px; text-align: center">
                {{ entry.result.metrics.tbt?.toFixed(0) || '-' }}ms
              </td>
              <td style="padding: 8px; text-align: center">
                {{ entry.result.metrics.cls?.toFixed(3) || '-' }}
              </td>
              <td style="padding: 8px; text-align: center">
                <input
                  v-model="selectedEntries"
                  type="checkbox"
                  :value="entry.id"
                  :disabled="selectedEntries.length >= 2 && !selectedEntries.includes(entry.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Average Stats -->
      <div
        v-if="averageStats"
        style="margin-top: 24px; padding: 16px; background: #f6f7f9; border-radius: 8px"
      >
        <h4 style="margin-bottom: 12px">평균 메트릭</h4>
        <div
          style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
          "
        >
          <div v-if="averageStats.overall !== undefined">
            <div style="font-size: 12px; color: #666">평균 점수</div>
            <div style="font-size: 20px; font-weight: 600">
              {{ averageStats.overall.toFixed(0) }}/100
            </div>
          </div>
          <div v-if="averageStats.fcp !== undefined">
            <div style="font-size: 12px; color: #666">평균 FCP</div>
            <div style="font-size: 20px; font-weight: 600">{{ averageStats.fcp.toFixed(0) }}ms</div>
          </div>
          <div v-if="averageStats.lcp !== undefined">
            <div style="font-size: 12px; color: #666">평균 LCP</div>
            <div style="font-size: 20px; font-weight: 600">{{ averageStats.lcp.toFixed(0) }}ms</div>
          </div>
          <div v-if="averageStats.tbt !== undefined">
            <div style="font-size: 12px; color: #666">평균 TBT</div>
            <div style="font-size: 20px; font-weight: 600">{{ averageStats.tbt.toFixed(0) }}ms</div>
          </div>
          <div v-if="averageStats.cls !== undefined">
            <div style="font-size: 12px; color: #666">평균 CLS</div>
            <div style="font-size: 20px; font-weight: 600">{{ averageStats.cls.toFixed(3) }}</div>
          </div>
        </div>
      </div>

      <!-- Comparison -->
      <div v-if="selectedEntries.length === 2" style="margin-top: 24px">
        <h4>비교 분석</h4>
        <div style="overflow-x: auto; margin-top: 16px">
          <table style="width: 100%; border-collapse: collapse">
            <thead>
              <tr style="border-bottom: 2px solid #e0e0e0">
                <th style="padding: 12px 8px; text-align: left; font-weight: 600">메트릭</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600">이전</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600">현재</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600">변화</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600">변화율</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(data, metric) in comparisonData"
                :key="metric"
                style="border-bottom: 1px solid #e0e0e0"
              >
                <td style="padding: 8px; font-weight: 600">{{ metric.toUpperCase() }}</td>
                <td style="padding: 8px; text-align: center">
                  {{ formatMetricValue(metric, data.previous) }}
                </td>
                <td style="padding: 8px; text-align: center">
                  {{ formatMetricValue(metric, data.current) }}
                </td>
                <td style="padding: 8px; text-align: center">
                  <span :style="{ color: data.change > 0 ? '#e67e22' : '#48d178' }">
                    {{ data.change > 0 ? '+' : '' }}{{ formatMetricValue(metric, data.change) }}
                  </span>
                </td>
                <td style="padding: 8px; text-align: center">
                  <span
                    :style="{
                      color: data.changePercent > 0 ? '#e67e22' : '#48d178',
                      fontWeight: '600'
                    }"
                  >
                    {{ data.changePercent > 0 ? '+' : '' }}{{ data.changePercent.toFixed(1) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Trend Chart -->
      <div v-if="urlHistory.length >= 2" style="margin-top: 32px">
        <h4>추이 차트</h4>
        <div
          style="
            margin-top: 16px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
          "
        >
          <canvas ref="trendChart"></canvas>
        </div>
      </div>
    </div>

    <div
      v-else-if="selectedUrl"
      style="margin-top: 24px; text-align: center; padding: 40px; color: #999"
    >
      선택한 URL의 분석 이력이 없습니다
    </div>

    <div v-else style="margin-top: 24px; text-align: center; padding: 40px; color: #999">
      URL을 선택하여 분석 이력을 확인하세요
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import type { HistoryEntry } from '~/utils/historyManager';

Chart.register(...registerables);

const selectedUrl = ref('');
const urlHistory = ref<HistoryEntry[]>([]);
const selectedEntries = ref<string[]>([]);
const trendChart = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const uniqueUrls = computed(() => {
  if (typeof window === 'undefined') return [];
  const { getUniqueUrls } = useHistoryManager();
  return getUniqueUrls();
});

const averageStats = computed(() => {
  if (urlHistory.value.length === 0) return null;
  const { calculateAverageMetrics } = useHistoryManager();
  return calculateAverageMetrics(urlHistory.value);
});

const comparisonData = computed(() => {
  if (selectedEntries.value.length !== 2) return null;

  const entry1 = urlHistory.value.find(e => e.id === selectedEntries.value[0]);
  const entry2 = urlHistory.value.find(e => e.id === selectedEntries.value[1]);

  if (!entry1 || !entry2) return null;

  const { getComparisonData } = useHistoryManager();
  return getComparisonData(entry2.result, entry1.result);
});

function loadHistoryForUrl() {
  if (!selectedUrl.value) return;

  const { getHistoryByUrl } = useHistoryManager();
  urlHistory.value = getHistoryByUrl(selectedUrl.value);
  selectedEntries.value = [];

  // Render trend chart
  nextTick(() => {
    renderTrendChart();
  });
}

function clearUrlHistory() {
  if (!confirm('이 URL의 모든 분석 이력을 삭제하시겠습니까?')) return;

  const { deleteHistoryEntry } = useHistoryManager();
  urlHistory.value.forEach(entry => {
    deleteHistoryEntry(entry.id);
  });

  urlHistory.value = [];
  selectedEntries.value = [];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#48d178';
  if (score >= 50) return '#e6b421';
  return '#e67e22';
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'cls') {
    return value.toFixed(3);
  }
  return value.toFixed(0) + 'ms';
}

function renderTrendChart() {
  if (!trendChart.value || urlHistory.value.length < 2) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const sortedHistory = [...urlHistory.value].sort((a, b) => a.timestamp - b.timestamp);
  const labels = sortedHistory.map(entry => formatDate(entry.timestamp));

  const datasets = [
    {
      label: 'Overall Score',
      data: sortedHistory.map(e => e.result.performanceScore.overall),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.3,
      yAxisID: 'y'
    },
    {
      label: 'FCP (ms)',
      data: sortedHistory.map(e => e.result.metrics.fcp || null),
      borderColor: '#48d178',
      backgroundColor: 'rgba(72, 209, 120, 0.1)',
      tension: 0.3,
      yAxisID: 'y1'
    },
    {
      label: 'LCP (ms)',
      data: sortedHistory.map(e => e.result.metrics.lcp || null),
      borderColor: '#e6b421',
      backgroundColor: 'rgba(230, 180, 33, 0.1)',
      tension: 0.3,
      yAxisID: 'y1'
    }
  ];

  chartInstance = new Chart(trendChart.value, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Score (0-100)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Time (ms)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      }
    }
  });
}

function useHistoryManager() {
  return {
    getHistory: () => {
      if (typeof window === 'undefined') return [];
      try {
        const data = localStorage.getItem('performance-analysis-history');
        if (!data) return [];
        return JSON.parse(data);
      } catch {
        return [];
      }
    },
    getHistoryByUrl: (url: string) => {
      const history = useHistoryManager().getHistory();
      return history.filter((entry: HistoryEntry) => entry.url === url);
    },
    getUniqueUrls: () => {
      const history = useHistoryManager().getHistory();
      const urls = new Set<string>();
      history.forEach((entry: HistoryEntry) => urls.add(entry.url));
      return Array.from(urls);
    },
    deleteHistoryEntry: (id: string) => {
      if (typeof window === 'undefined') return;
      const history = useHistoryManager().getHistory();
      const filtered = history.filter((entry: HistoryEntry) => entry.id !== id);
      localStorage.setItem('performance-analysis-history', JSON.stringify(filtered));
    },
    getComparisonData: (result1: any, result2: any) => {
      const metrics = ['fcp', 'lcp', 'tbt', 'cls', 'ttfb'] as const;
      const comparison: Record<string, any> = {};

      for (const metric of metrics) {
        const current = result1.metrics[metric];
        const previous = result2.metrics[metric];

        if (current !== undefined && previous !== undefined) {
          const change = current - previous;
          const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

          comparison[metric] = {
            current,
            previous,
            change,
            changePercent
          };
        }
      }

      return comparison;
    },
    calculateAverageMetrics: (entries: HistoryEntry[]) => {
      if (entries.length === 0) return null;

      const sums = { fcp: 0, lcp: 0, tbt: 0, cls: 0, ttfb: 0, overall: 0 };
      const counts = { fcp: 0, lcp: 0, tbt: 0, cls: 0, ttfb: 0, overall: 0 };

      for (const entry of entries) {
        if (entry.result.metrics.fcp) {
          sums.fcp += entry.result.metrics.fcp;
          counts.fcp++;
        }
        if (entry.result.metrics.lcp) {
          sums.lcp += entry.result.metrics.lcp;
          counts.lcp++;
        }
        if (entry.result.metrics.tbt) {
          sums.tbt += entry.result.metrics.tbt;
          counts.tbt++;
        }
        if (entry.result.metrics.cls !== undefined) {
          sums.cls += entry.result.metrics.cls;
          counts.cls++;
        }
        if (entry.result.metrics.ttfb) {
          sums.ttfb += entry.result.metrics.ttfb;
          counts.ttfb++;
        }
        if (entry.result.performanceScore.overall) {
          sums.overall += entry.result.performanceScore.overall;
          counts.overall++;
        }
      }

      return {
        fcp: counts.fcp > 0 ? sums.fcp / counts.fcp : undefined,
        lcp: counts.lcp > 0 ? sums.lcp / counts.lcp : undefined,
        tbt: counts.tbt > 0 ? sums.tbt / counts.tbt : undefined,
        cls: counts.cls > 0 ? sums.cls / counts.cls : undefined,
        ttfb: counts.ttfb > 0 ? sums.ttfb / counts.ttfb : undefined,
        overall: counts.overall > 0 ? sums.overall / counts.overall : undefined
      };
    }
  };
}

onMounted(() => {
  // Auto-select if only one URL in history
  const urls = uniqueUrls.value;
  if (urls.length === 1) {
    selectedUrl.value = urls[0];
    loadHistoryForUrl();
  }
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>

<style scoped>
.selected-row {
  background-color: #e3f2fd;
}

table tr:hover {
  background-color: #f9fafb;
}
</style>
