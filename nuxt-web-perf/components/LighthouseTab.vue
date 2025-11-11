<template>
  <div>
    <div v-if="!result || !result.lighthouse" class="card" style="text-align: center; padding: 60px; color: #999;">
      <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
      <h3>Lighthouse 분석 없음</h3>
      <p style="margin-top: 12px;">
        분석 시 "Lighthouse 사용" 옵션을 활성화하면 Google Lighthouse 기반의 상세한 성능, 접근성, SEO 분석 결과를 확인할 수 있습니다.
      </p>
    </div>

    <div v-else>
      <!-- Lighthouse Scores -->
      <div class="card">
        <h3>Lighthouse 점수</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 20px;">
          <div v-for="(score, category) in result.lighthouse.scores" :key="category" style="text-align: center;">
            <div
              :style="{
                width: '120px',
                height: '120px',
                margin: '0 auto',
                borderRadius: '50%',
                background: `conic-gradient(${getScoreColor(score)} ${score}%, #e0e0e0 ${score}%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }"
            >
              <div style="width: 100px; height: 100px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; font-weight: 700;">{{ score }}</span>
              </div>
            </div>
            <div style="margin-top: 12px; font-weight: 600; text-transform: capitalize;">
              {{ getCategoryName(category) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Lighthouse Metrics -->
      <div class="card" style="margin-top: 20px;">
        <h3>핵심 메트릭 (Lighthouse)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-top: 16px;">
          <div v-for="(value, metric) in result.lighthouse.metrics" :key="metric" style="padding: 16px; background: #f6f7f9; border-radius: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">{{ getMetricName(metric) }}</div>
            <div style="font-size: 24px; font-weight: 600;">{{ formatMetricValue(metric, value) }}</div>
            <div style="margin-top: 8px; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
              <div
                :style="{
                  width: getMetricProgress(metric, value) + '%',
                  height: '100%',
                  background: getMetricColor(metric, value),
                  transition: 'width 0.3s'
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Opportunities (Performance Improvements) -->
      <div v-if="result.lighthouse.opportunities.length > 0" class="card" style="margin-top: 20px;">
        <h3>성능 개선 기회</h3>
        <p style="font-size: 14px; color: #666; margin-top: 8px;">
          다음 항목들을 개선하면 페이지 로딩 속도를 향상시킬 수 있습니다
        </p>

        <div style="margin-top: 20px;">
          <div
            v-for="(opp, index) in result.lighthouse.opportunities"
            :key="opp.id"
            style="padding: 16px; border-left: 4px solid #e6b421; background: #fffbf0; border-radius: 8px; margin-bottom: 12px;"
          >
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">{{ index + 1 }}. {{ opp.title }}</div>
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">{{ opp.description }}</div>
                <div v-if="opp.displayValue" style="font-size: 13px; color: #e67e22; font-weight: 600;">
                  💾 예상 절감: {{ opp.displayValue }}
                </div>
              </div>
              <div
                :style="{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  background: getScoreColor(opp.score),
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  marginLeft: '16px'
                }"
              >
                {{ opp.score }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnostics -->
      <div v-if="result.lighthouse.diagnostics.length > 0" class="card" style="margin-top: 20px;">
        <h3>진단 결과</h3>
        <p style="font-size: 14px; color: #666; margin-top: 8px;">
          추가로 개선이 필요한 항목들
        </p>

        <div style="margin-top: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e0e0e0;">
                <th style="padding: 12px 8px; text-align: left; font-weight: 600;">항목</th>
                <th style="padding: 12px 8px; text-align: left; font-weight: 600;">설명</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600;">점수</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600;">값</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="diag in result.lighthouse.diagnostics"
                :key="diag.id"
                style="border-bottom: 1px solid #e0e0e0;"
              >
                <td style="padding: 8px; font-weight: 600; font-size: 14px;">{{ diag.title }}</td>
                <td style="padding: 8px; font-size: 13px; color: #666;">{{ diag.description }}</td>
                <td style="padding: 8px; text-align: center;">
                  <span
                    :style="{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      background: getScoreColor(diag.score),
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '12px'
                    }"
                  >
                    {{ diag.score }}
                  </span>
                </td>
                <td style="padding: 8px; text-align: center; font-size: 13px;">{{ diag.displayValue || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary -->
      <div class="card" style="margin-top: 20px; background: #f6f7f9;">
        <h4>Lighthouse 분석 정보</h4>
        <div style="margin-top: 12px; font-size: 14px;">
          <div>분석 URL: {{ result.url }}</div>
          <div style="margin-top: 8px;">분석 시간: {{ new Date(result.lighthouse.fetchTime).toLocaleString('ko-KR') }}</div>
          <div style="margin-top: 8px;">개선 기회: {{ result.lighthouse.opportunities.length }}개</div>
          <div style="margin-top: 8px;">진단 항목: {{ result.lighthouse.diagnostics.length }}개</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '~/types/performance';

const props = defineProps<{
  result: AnalysisResult | null;
}>();

function getScoreColor(score: number): string {
  if (score >= 90) return '#48d178'; // Green
  if (score >= 50) return '#e6b421'; // Yellow
  return '#e67e22'; // Orange/Red
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    performance: '성능',
    accessibility: '접근성',
    bestPractices: '권장사항',
    seo: 'SEO',
    pwa: 'PWA'
  };
  return names[category] || category;
}

function getMetricName(metric: string): string {
  const names: Record<string, string> = {
    firstContentfulPaint: 'First Contentful Paint',
    largestContentfulPaint: 'Largest Contentful Paint',
    totalBlockingTime: 'Total Blocking Time',
    cumulativeLayoutShift: 'Cumulative Layout Shift',
    speedIndex: 'Speed Index',
    timeToInteractive: 'Time to Interactive',
    firstMeaningfulPaint: 'First Meaningful Paint'
  };
  return names[metric] || metric;
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'cumulativeLayoutShift') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

function getMetricProgress(metric: string, value: number): number {
  if (metric === 'cumulativeLayoutShift') {
    return Math.min((1 - value / 0.25) * 100, 100);
  }

  const thresholds: Record<string, number> = {
    firstContentfulPaint: 1800,
    largestContentfulPaint: 2500,
    totalBlockingTime: 300,
    speedIndex: 3400,
    timeToInteractive: 3800,
    firstMeaningfulPaint: 1800
  };

  const threshold = thresholds[metric] || 3000;
  return Math.min((1 - value / threshold) * 100, 100);
}

function getMetricColor(metric: string, value: number): string {
  const progress = getMetricProgress(metric, value);
  if (progress >= 75) return '#48d178'; // Green
  if (progress >= 50) return '#e6b421'; // Yellow
  return '#e67e22'; // Orange
}
</script>

<style scoped>
table tr:hover {
  background-color: #f9fafb;
}
</style>
