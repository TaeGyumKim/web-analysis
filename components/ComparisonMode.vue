<template>
  <div class="comparison-container">
    <div class="comparison-header">
      <h2>성능 비교</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 8px">
        두 개의 분석 결과를 선택하여 성능 변화를 비교합니다.
      </p>
    </div>

    <div class="comparison-selectors">
      <div class="selector-box">
        <h3>기준 (Before)</h3>
        <button v-if="!baseline" class="btn btn-primary" @click="selectBaseline">
          현재 결과 선택
        </button>
        <div v-else class="selected-result">
          <div class="result-info">
            <div class="result-url">{{ baseline.url }}</div>
            <div class="result-time">{{ formatTimestamp(baseline.timestamp) }}</div>
          </div>
          <button class="btn-remove" @click="baseline = null">✕</button>
        </div>
      </div>

      <div class="selector-box">
        <h3>비교 (After)</h3>
        <button v-if="!comparison" class="btn btn-primary" @click="selectComparison">
          현재 결과 선택
        </button>
        <div v-else class="selected-result">
          <div class="result-info">
            <div class="result-url">{{ comparison.url }}</div>
            <div class="result-time">{{ formatTimestamp(comparison.timestamp) }}</div>
          </div>
          <button class="btn-remove" @click="comparison = null">✕</button>
        </div>
      </div>
    </div>

    <div v-if="baseline && comparison" class="comparison-results">
      <div class="metrics-comparison">
        <h3>Core Web Vitals 비교</h3>
        <div class="metrics-grid">
          <div
            v-for="metric in coreMetrics"
            :key="metric.key"
            class="metric-card"
          >
            <div class="metric-name">{{ metric.label }}</div>
            <div class="metric-values">
              <div class="metric-value">
                <span class="label">Before:</span>
                <span class="value">{{ formatMetricValue(baseline.metrics[metric.key], metric.unit) }}</span>
              </div>
              <div class="metric-value">
                <span class="label">After:</span>
                <span class="value">{{ formatMetricValue(comparison.metrics[metric.key], metric.unit) }}</span>
              </div>
              <div class="metric-diff" :class="getDiffClass(metric.key)">
                {{ getDiffText(metric.key) }}
                <span class="diff-icon">{{ getDiffIcon(metric.key) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="score-comparison">
        <h3>전체 성능 점수</h3>
        <div class="score-grid">
          <div class="score-box">
            <div class="score-label">Before</div>
            <div class="score-value" :class="getScoreClass(baseline.performanceScore.overall)">
              {{ baseline.performanceScore.overall.toFixed(0) }}
            </div>
          </div>
          <div class="score-arrow">→</div>
          <div class="score-box">
            <div class="score-label">After</div>
            <div class="score-value" :class="getScoreClass(comparison.performanceScore.overall)">
              {{ comparison.performanceScore.overall.toFixed(0) }}
            </div>
          </div>
          <div class="score-diff" :class="getScoreDiffClass()">
            {{ getScoreDiff() }}
          </div>
        </div>
      </div>

      <div class="network-comparison">
        <h3>네트워크 비교</h3>
        <div class="network-grid">
          <div class="network-stat">
            <div class="stat-label">총 요청 수</div>
            <div class="stat-values">
              <span>{{ baseline.networkRequests.length }}</span>
              <span class="arrow">→</span>
              <span>{{ comparison.networkRequests.length }}</span>
              <span class="diff" :class="getNumberDiffClass(baseline.networkRequests.length, comparison.networkRequests.length)">
                ({{ getNumberDiff(baseline.networkRequests.length, comparison.networkRequests.length) }})
              </span>
            </div>
          </div>
          <div class="network-stat">
            <div class="stat-label">총 데이터 크기</div>
            <div class="stat-values">
              <span>{{ formatBytes(getTotalSize(baseline)) }}</span>
              <span class="arrow">→</span>
              <span>{{ formatBytes(getTotalSize(comparison)) }}</span>
              <span class="diff" :class="getNumberDiffClass(getTotalSize(baseline), getTotalSize(comparison))">
                ({{ getNumberDiff(getTotalSize(baseline), getTotalSize(comparison), true) }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>📊 두 개의 분석 결과를 선택하여 비교를 시작하세요.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AnalysisResult } from '~/types/performance';

const props = defineProps<{
  currentResult: AnalysisResult | null;
}>();

const baseline = ref<AnalysisResult | null>(null);
const comparison = ref<AnalysisResult | null>(null);

const coreMetrics = [
  { key: 'fcp', label: 'FCP', unit: 'ms', lowerIsBetter: true },
  { key: 'lcp', label: 'LCP', unit: 'ms', lowerIsBetter: true },
  { key: 'tbt', label: 'TBT', unit: 'ms', lowerIsBetter: true },
  { key: 'cls', label: 'CLS', unit: '', lowerIsBetter: true },
  { key: 'ttfb', label: 'TTFB', unit: 'ms', lowerIsBetter: true }
] as const;

function selectBaseline() {
  if (props.currentResult) {
    baseline.value = JSON.parse(JSON.stringify(props.currentResult));
  } else {
    alert('먼저 분석을 실행해주세요.');
  }
}

function selectComparison() {
  if (props.currentResult) {
    comparison.value = JSON.parse(JSON.stringify(props.currentResult));
  } else {
    alert('먼저 분석을 실행해주세요.');
  }
}

function formatMetricValue(value: number | undefined, unit: string): string {
  if (value === undefined) return 'N/A';
  if (unit === 'ms') {
    return `${value.toFixed(0)}ms`;
  }
  return value.toFixed(3);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR');
}

function getDiffText(metricKey: string): string {
  if (!baseline.value || !comparison.value) return '';

  const metric = coreMetrics.find(m => m.key === metricKey);
  if (!metric) return '';

  const baseValue = baseline.value.metrics[metric.key] || 0;
  const compValue = comparison.value.metrics[metric.key] || 0;
  const diff = compValue - baseValue;
  const percentChange = baseValue !== 0 ? (diff / baseValue) * 100 : 0;

  if (Math.abs(diff) < 0.001) return '변화 없음';

  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(metric.unit === '' ? 3 : 0)}${metric.unit} (${sign}${percentChange.toFixed(1)}%)`;
}

function getDiffIcon(metricKey: string): string {
  if (!baseline.value || !comparison.value) return '';

  const metric = coreMetrics.find(m => m.key === metricKey);
  if (!metric) return '';

  const baseValue = baseline.value.metrics[metric.key] || 0;
  const compValue = comparison.value.metrics[metric.key] || 0;
  const diff = compValue - baseValue;

  if (Math.abs(diff) < 0.001) return '➡️';

  const improved = metric.lowerIsBetter ? diff < 0 : diff > 0;
  return improved ? '✅' : '⚠️';
}

function getDiffClass(metricKey: string): string {
  if (!baseline.value || !comparison.value) return '';

  const metric = coreMetrics.find(m => m.key === metricKey);
  if (!metric) return '';

  const baseValue = baseline.value.metrics[metric.key] || 0;
  const compValue = comparison.value.metrics[metric.key] || 0;
  const diff = compValue - baseValue;

  if (Math.abs(diff) < 0.001) return 'neutral';

  const improved = metric.lowerIsBetter ? diff < 0 : diff > 0;
  return improved ? 'improved' : 'regressed';
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

function getScoreDiff(): string {
  if (!baseline.value || !comparison.value) return '';

  const diff = comparison.value.performanceScore.overall - baseline.value.performanceScore.overall;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(0)} 점`;
}

function getScoreDiffClass(): string {
  if (!baseline.value || !comparison.value) return '';

  const diff = comparison.value.performanceScore.overall - baseline.value.performanceScore.overall;
  if (Math.abs(diff) < 1) return 'neutral';
  return diff > 0 ? 'improved' : 'regressed';
}

function getTotalSize(result: AnalysisResult): number {
  return result.networkRequests.reduce((sum, req) => sum + (req.size || 0), 0);
}

function getNumberDiff(before: number, after: number, isBytes: boolean = false): string {
  const diff = after - before;
  const sign = diff > 0 ? '+' : '';
  if (isBytes) {
    return `${sign}${formatBytes(Math.abs(diff))}`;
  }
  return `${sign}${diff}`;
}

function getNumberDiffClass(before: number, after: number): string {
  const diff = after - before;
  if (diff === 0) return 'neutral';
  // For network stats, lower is better
  return diff < 0 ? 'improved' : 'regressed';
}
</script>

<style scoped>
.comparison-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.comparison-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #1f2937;
}

.comparison-selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 24px 0;
}

.selector-box {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.selector-box h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #4b5563;
}

.selected-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f3f4f6;
  padding: 12px;
  border-radius: 6px;
}

.result-info {
  flex: 1;
  text-align: left;
}

.result-url {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  word-break: break-all;
}

.result-time {
  font-size: 12px;
  color: #6b7280;
}

.btn-remove {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: #dc2626;
}

.comparison-results {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.metrics-comparison h3,
.score-comparison h3,
.network-comparison h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #1f2937;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.metric-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.metric-values {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-value {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.metric-value .label {
  color: #6b7280;
}

.metric-value .value {
  font-weight: 500;
  color: #1f2937;
}

.metric-diff {
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-diff.improved {
  background: #d1fae5;
  color: #065f46;
}

.metric-diff.regressed {
  background: #fee2e2;
  color: #991b1b;
}

.metric-diff.neutral {
  background: #f3f4f6;
  color: #6b7280;
}

.score-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.score-box {
  text-align: center;
}

.score-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.score-value {
  font-size: 48px;
  font-weight: 700;
  border-radius: 8px;
  padding: 16px 32px;
}

.score-value.good {
  background: #d1fae5;
  color: #065f46;
}

.score-value.needs-improvement {
  background: #fef3c7;
  color: #92400e;
}

.score-value.poor {
  background: #fee2e2;
  color: #991b1b;
}

.score-arrow {
  font-size: 32px;
  color: #9ca3af;
}

.score-diff {
  font-size: 24px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 8px;
}

.network-grid {
  display: grid;
  gap: 16px;
}

.network-stat {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.stat-label {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.stat-values {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}

.stat-values .arrow {
  color: #9ca3af;
}

.stat-values .diff {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
}
</style>
