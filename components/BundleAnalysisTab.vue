<template>
  <div v-if="!result" class="empty-state">
    <p>분석 결과가 없습니다. 먼저 분석을 실행해주세요.</p>
  </div>

  <div v-else class="bundle-analysis">
    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-label">총 JS 크기</div>
        <div class="card-value">{{ formatBytes(analysis.totalSize) }}</div>
        <div class="card-subtitle">{{ analysis.totalCount }}개 파일</div>
      </div>

      <div class="summary-card">
        <div class="card-label">자사 스크립트</div>
        <div class="card-value">{{ formatBytes(analysis.firstPartySize) }}</div>
        <div class="card-subtitle">
          {{ ((analysis.firstPartySize / analysis.totalSize) * 100).toFixed(1) }}%
        </div>
      </div>

      <div class="summary-card">
        <div class="card-label">서드파티 스크립트</div>
        <div class="card-value">{{ formatBytes(analysis.thirdPartySize) }}</div>
        <div class="card-subtitle">
          {{ ((analysis.thirdPartySize / analysis.totalSize) * 100).toFixed(1) }}%
        </div>
      </div>
    </div>

    <!-- Optimization Suggestions -->
    <div v-if="suggestions.length > 0" class="suggestions-section">
      <h3>📋 최적화 제안</h3>
      <div class="suggestions-list">
        <div v-for="(suggestion, index) in suggestions" :key="index" class="suggestion-item">
          <span class="suggestion-icon">💡</span>
          <span class="suggestion-text">{{ suggestion }}</span>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <div class="chart-container">
        <h3 class="section-title-with-tooltip">
          도메인별 분포
          <HelpTooltip
            :text="glossary.domainDistribution.description"
            :title="glossary.domainDistribution.title"
            position="right"
          />
        </h3>
        <ClientOnly>
          <canvas ref="domainChartRef"></canvas>
        </ClientOnly>
      </div>

      <div class="chart-container">
        <h3 class="section-title-with-tooltip">
          라이브러리별 분포
          <HelpTooltip
            :text="glossary.libraryDistribution.description"
            :title="glossary.libraryDistribution.title"
            position="right"
          />
        </h3>
        <ClientOnly>
          <div v-if="analysis && analysis.byLibrary.size === 0" class="no-library-message">
            <span class="no-library-icon">📦</span>
            <p>감지된 라이브러리가 없습니다.</p>
            <p class="no-library-hint">자사 코드이거나 알려지지 않은 라이브러리일 수 있습니다.</p>
          </div>
          <canvas v-else ref="libraryChartRef"></canvas>
        </ClientOnly>
      </div>
    </div>

    <!-- Largest Bundles Table -->
    <div class="table-section">
      <h3 class="section-title-with-tooltip">
        가장 큰 번들 (Top 10)
        <HelpTooltip
          :text="glossary.largestBundles.description"
          :title="glossary.largestBundles.title"
          position="right"
        />
      </h3>
      <div class="table-wrapper">
        <table class="bundles-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>URL</th>
              <th>크기</th>
              <th>타입</th>
              <th>라이브러리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(bundle, index) in analysis.largestBundles" :key="index">
              <td>{{ index + 1 }}</td>
              <td class="url-cell">
                <a :href="bundle.url" target="_blank" rel="noopener" :title="bundle.url">
                  {{ truncateUrl(bundle.url) }}
                </a>
              </td>
              <td class="size-cell">{{ formatBytes(bundle.size) }}</td>
              <td>
                <span :class="['type-badge', bundle.type]">
                  {{ bundle.type === 'first-party' ? '자사' : '서드파티' }}
                </span>
              </td>
              <td>
                <span v-if="bundle.library" class="library-badge">{{ bundle.library }}</span>
                <span v-else class="no-library">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Domain Breakdown -->
    <div class="table-section">
      <h3 class="section-title-with-tooltip">
        도메인별 상세
        <HelpTooltip
          :text="glossary.domainBreakdown.description"
          :title="glossary.domainBreakdown.title"
          position="right"
        />
      </h3>
      <div class="table-wrapper">
        <table class="domain-table">
          <thead>
            <tr>
              <th>도메인</th>
              <th>파일 수</th>
              <th>총 크기</th>
              <th>비율</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[domain, stats] in sortedDomains" :key="domain">
              <td class="domain-cell">{{ domain }}</td>
              <td>{{ stats.count }}</td>
              <td>{{ formatBytes(stats.size) }}</td>
              <td>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: `${getPercentage(stats.size, analysis.totalSize)}%` }"
                  ></div>
                  <span class="progress-label">
                    {{ getPercentage(stats.size, analysis.totalSize) }}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { AnalysisResult } from '~/types/performance';
import { analyzeBundles, formatBytes, getBundleOptimizationSuggestions } from '~/utils/bundleAnalyzer';
import { glossary } from '~/utils/glossary';

const props = defineProps<{
  result: AnalysisResult | null;
}>();

const domainChartRef = ref<HTMLCanvasElement | null>(null);
const libraryChartRef = ref<HTMLCanvasElement | null>(null);
let domainChart: any = null;
let libraryChart: any = null;

const analysis = computed(() => {
  if (!props.result) return null;
  return analyzeBundles(props.result.networkRequests, props.result.url);
});

const suggestions = computed(() => {
  if (!analysis.value) return [];
  return getBundleOptimizationSuggestions(analysis.value);
});

const sortedDomains = computed(() => {
  if (!analysis.value) return [];
  return Array.from(analysis.value.byDomain.entries()).sort((a, b) => b[1].size - a[1].size);
});

function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  const start = url.substring(0, 30);
  const end = url.substring(url.length - 27);
  return `${start}...${end}`;
}

function getPercentage(part: number, total: number): string {
  if (!total || total === 0) return '0.0';
  return ((part / total) * 100).toFixed(1);
}

async function renderCharts() {
  if (!analysis.value || !process.client) return;

  await nextTick();

  // Import Chart.js only on client
  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);

  // Domain Chart
  if (domainChartRef.value) {
    const topDomains = Array.from(analysis.value.byDomain.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 8);

    const ctx = domainChartRef.value.getContext('2d');
    if (ctx) {
      if (domainChart) domainChart.destroy();

      domainChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: topDomains.map(([domain]) => domain),
          datasets: [
            {
              data: topDomains.map(([, stats]) => stats.size),
              backgroundColor: [
                '#3b82f6',
                '#8b5cf6',
                '#ec4899',
                '#f59e0b',
                '#10b981',
                '#06b6d4',
                '#6366f1',
                '#84cc16'
              ]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'right'
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const size = context.parsed;
                  return `${context.label}: ${formatBytes(size)}`;
                }
              }
            }
          }
        }
      });
    }
  }

  // Library Chart
  if (libraryChartRef.value && analysis.value.byLibrary.size > 0) {
    const libraries = Array.from(analysis.value.byLibrary.entries()).sort(
      (a, b) => b[1].size - a[1].size
    );

    const ctx = libraryChartRef.value.getContext('2d');
    if (ctx) {
      if (libraryChart) libraryChart.destroy();

      libraryChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: libraries.map(([lib]) => lib),
          datasets: [
            {
              label: '크기',
              data: libraries.map(([, stats]) => stats.size),
              backgroundColor: '#3b82f6'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          indexAxis: 'y',
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `크기: ${formatBytes(context.parsed.x)}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                callback: function (value) {
                  return formatBytes(value as number);
                }
              }
            }
          }
        }
      });
    }
  }
}

watch(
  () => props.result,
  () => {
    renderCharts();
  }
);

onMounted(() => {
  renderCharts();
});
</script>

<style scoped>
.bundle-analysis {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.card-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.section-title-with-tooltip {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.suggestions-section {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  padding: 20px;
}

.suggestions-section h3 {
  margin: 0 0 16px 0;
  color: #92400e;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #78350f;
}

.suggestion-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.suggestion-text {
  flex: 1;
  line-height: 1.6;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1f2937;
}

.table-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1f2937;
}

.table-wrapper {
  overflow-x: auto;
}

.bundles-table,
.domain-table {
  width: 100%;
  border-collapse: collapse;
}

.bundles-table th,
.bundles-table td,
.domain-table th,
.domain-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.bundles-table th,
.domain-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.url-cell a {
  color: #3b82f6;
  text-decoration: none;
}

.url-cell a:hover {
  text-decoration: underline;
}

.size-cell {
  font-family: monospace;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.first-party {
  background: #dbeafe;
  color: #1e40af;
}

.type-badge.third-party {
  background: #fce7f3;
  color: #9f1239;
}

.library-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
  color: #4b5563;
}

.no-library {
  color: #9ca3af;
}

.domain-cell {
  font-family: monospace;
  font-size: 13px;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 24px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.progress-label {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
  font-weight: 500;
  color: #1f2937;
  z-index: 1;
}
</style>
