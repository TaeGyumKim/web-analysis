<template>
  <div class="card">
    <h3>여러 URL 일괄 분석</h3>
    <p style="font-size: 14px; color: #666; margin-top: 8px;">
      여러 웹 페이지를 동시에 분석하고 성능을 비교합니다
    </p>

    <!-- URL 입력 영역 -->
    <div style="margin-top: 20px;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input
          v-model="newUrl"
          type="text"
          placeholder="URL 입력 (예: https://www.example.com)"
          style="flex: 1; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 8px;"
          @keyup.enter="addUrl"
        />
        <button class="btn btn-primary" @click="addUrl">추가</button>
      </div>

      <!-- URL 목록 -->
      <div v-if="urls.length > 0" style="margin-bottom: 20px;">
        <div
          v-for="(url, index) in urls"
          :key="index"
          style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f6f7f9; border-radius: 8px; margin-bottom: 8px;"
        >
          <div style="flex: 1; font-size: 14px;">{{ url }}</div>
          <button class="btn" style="padding: 4px 12px;" @click="removeUrl(index)">삭제</button>
        </div>
      </div>

      <!-- 분석 버튼 -->
      <div style="display: flex; gap: 12px;">
        <button
          class="btn btn-primary"
          @click="startBatchAnalysis"
          :disabled="urls.length === 0 || isAnalyzing"
          style="padding: 10px 24px;"
        >
          {{ isAnalyzing ? `분석 중... (${completedCount}/${urls.length})` : `${urls.length}개 URL 분석 시작` }}
        </button>
        <button
          class="btn"
          @click="clearUrls"
          :disabled="urls.length === 0 || isAnalyzing"
        >
          전체 삭제
        </button>
      </div>

      <!-- 진행률 표시 -->
      <div v-if="isAnalyzing" style="margin-top: 16px;">
        <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
          <div
            :style="{
              width: `${(completedCount / urls.length) * 100}%`,
              height: '100%',
              background: '#3b82f6',
              transition: 'width 0.3s'
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 결과 비교 테이블 -->
    <div v-if="results.length > 0" style="margin-top: 32px;">
      <h3>분석 결과 비교</h3>

      <div style="overflow-x: auto; margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; min-width: 800px;">
          <thead>
            <tr style="border-bottom: 2px solid #e0e0e0;">
              <th style="padding: 12px 8px; text-align: left; font-weight: 600;">URL</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">종합 점수</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">FCP</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">LCP</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">TBT</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">CLS</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">요청 수</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">전송 크기</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">Long Tasks</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(result, index) in results"
              :key="index"
              style="border-bottom: 1px solid #e0e0e0;"
            >
              <td style="padding: 8px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="result.url">
                {{ getDomainFromUrl(result.url) }}
              </td>
              <td style="padding: 8px; text-align: center;">
                <span
                  :style="{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    background: getScoreColor(result.performanceScore.overall),
                    color: '#fff',
                    fontWeight: '600'
                  }"
                >
                  {{ result.performanceScore.overall }}
                </span>
              </td>
              <td style="padding: 8px; text-align: center;">{{ result.metrics.fcp?.toFixed(0) || '-' }}ms</td>
              <td style="padding: 8px; text-align: center;">{{ result.metrics.lcp?.toFixed(0) || '-' }}ms</td>
              <td style="padding: 8px; text-align: center;">{{ result.metrics.tbt?.toFixed(0) || '-' }}ms</td>
              <td style="padding: 8px; text-align: center;">{{ result.metrics.cls?.toFixed(3) || '-' }}</td>
              <td style="padding: 8px; text-align: center;">{{ result.networkRequests.length }}</td>
              <td style="padding: 8px; text-align: center;">{{ formatBytes(getTotalSize(result)) }}</td>
              <td style="padding: 8px; text-align: center;">{{ result.longTasks?.length || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 통계 요약 -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px;">
        <div style="padding: 16px; background: #f6f7f9; border-radius: 8px;">
          <div style="font-size: 12px; color: #666;">평균 종합 점수</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px;">{{ averageScore.toFixed(0) }}/100</div>
        </div>
        <div style="padding: 16px; background: #f6f7f9; border-radius: 8px;">
          <div style="font-size: 12px; color: #666;">평균 LCP</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px;">{{ averageLCP.toFixed(0) }}ms</div>
        </div>
        <div style="padding: 16px; background: #f6f7f9; border-radius: 8px;">
          <div style="font-size: 12px; color: #666;">평균 요청 수</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px;">{{ averageRequests.toFixed(0) }}</div>
        </div>
        <div style="padding: 16px; background: #f6f7f9; border-radius: 8px;">
          <div style="font-size: 12px; color: #666;">최고 성능 사이트</div>
          <div style="font-size: 14px; font-weight: 600; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ getDomainFromUrl(bestSite?.url || '') }}
          </div>
        </div>
      </div>

      <!-- 내보내기 버튼 -->
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn" @click="exportBatchResults">
          📄 비교 결과 내보내기 (JSON)
        </button>
        <button class="btn" @click="exportBatchReport">
          📝 비교 리포트 내보내기 (TXT)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '~/types/performance';

const newUrl = ref('');
const urls = ref<string[]>([]);
const isAnalyzing = ref(false);
const completedCount = ref(0);
const results = ref<AnalysisResult[]>([]);

function addUrl() {
  const trimmed = newUrl.value.trim();
  if (trimmed && !urls.value.includes(trimmed)) {
    // Validate URL
    try {
      new URL(trimmed);
      urls.value.push(trimmed);
      newUrl.value = '';
    } catch {
      alert('유효한 URL을 입력해주세요');
    }
  }
}

function removeUrl(index: number) {
  urls.value.splice(index, 1);
}

function clearUrls() {
  urls.value = [];
  results.value = [];
}

async function startBatchAnalysis() {
  if (urls.value.length === 0) return;

  isAnalyzing.value = true;
  completedCount.value = 0;
  results.value = [];

  for (const url of urls.value) {
    try {
      const response = await $fetch('/api/analyze', {
        method: 'POST',
        body: {
          url,
          options: {
            captureScreenshots: false, // Skip screenshots for batch to save time
            networkThrottling: 'none',
            cpuThrottling: 1,
            waitUntil: 'networkidle0'
          }
        }
      });

      if (response.success) {
        results.value.push(response.data);
      }
    } catch (error) {
      console.error(`Failed to analyze ${url}:`, error);
    } finally {
      completedCount.value++;
    }
  }

  isAnalyzing.value = false;
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#48d178'; // Green
  if (score >= 50) return '#e6b421'; // Yellow
  return '#e67e22'; // Orange
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getTotalSize(result: AnalysisResult): number {
  return result.networkRequests.reduce((sum, req) => sum + req.size, 0);
}

const averageScore = computed(() => {
  if (results.value.length === 0) return 0;
  const sum = results.value.reduce((acc, r) => acc + r.performanceScore.overall, 0);
  return sum / results.value.length;
});

const averageLCP = computed(() => {
  const validResults = results.value.filter(r => r.metrics.lcp);
  if (validResults.length === 0) return 0;
  const sum = validResults.reduce((acc, r) => acc + (r.metrics.lcp || 0), 0);
  return sum / validResults.length;
});

const averageRequests = computed(() => {
  if (results.value.length === 0) return 0;
  const sum = results.value.reduce((acc, r) => acc + r.networkRequests.length, 0);
  return sum / results.value.length;
});

const bestSite = computed(() => {
  if (results.value.length === 0) return null;
  return results.value.reduce((best, current) =>
    current.performanceScore.overall > best.performanceScore.overall ? current : best
  );
});

function exportBatchResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch-analysis-${timestamp}.json`;

  const dataStr = JSON.stringify(results.value, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function exportBatchReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch-report-${timestamp}.txt`;

  let report = '';
  report += '='.repeat(80) + '\n';
  report += 'BATCH PERFORMANCE ANALYSIS REPORT\n';
  report += '='.repeat(80) + '\n\n';

  report += `Total URLs Analyzed: ${results.value.length}\n`;
  report += `Analysis Date: ${new Date().toLocaleString()}\n`;
  report += `Average Performance Score: ${averageScore.value.toFixed(0)}/100\n\n`;

  report += '-'.repeat(80) + '\n';
  report += 'INDIVIDUAL RESULTS\n';
  report += '-'.repeat(80) + '\n\n';

  for (const [index, result] of results.value.entries()) {
    report += `${index + 1}. ${result.url}\n`;
    report += `   Overall Score: ${result.performanceScore.overall}/100\n`;
    if (result.metrics.fcp) report += `   FCP: ${result.metrics.fcp.toFixed(0)}ms\n`;
    if (result.metrics.lcp) report += `   LCP: ${result.metrics.lcp.toFixed(0)}ms\n`;
    if (result.metrics.tbt) report += `   TBT: ${result.metrics.tbt.toFixed(0)}ms\n`;
    if (result.metrics.cls !== undefined) report += `   CLS: ${result.metrics.cls.toFixed(3)}\n`;
    report += `   Network Requests: ${result.networkRequests.length}\n`;
    report += `   Total Size: ${formatBytes(getTotalSize(result))}\n`;
    if (result.longTasks) report += `   Long Tasks: ${result.longTasks.length}\n`;
    report += '\n';
  }

  report += '-'.repeat(80) + '\n';
  report += 'SUMMARY STATISTICS\n';
  report += '-'.repeat(80) + '\n';
  report += `Average Score: ${averageScore.value.toFixed(0)}/100\n`;
  report += `Average LCP: ${averageLCP.value.toFixed(0)}ms\n`;
  report += `Average Requests: ${averageRequests.value.toFixed(0)}\n`;
  if (bestSite.value) {
    report += `Best Performing Site: ${bestSite.value.url} (${bestSite.value.performanceScore.overall}/100)\n`;
  }
  report += '\n';

  report += '='.repeat(80) + '\n';
  report += 'END OF REPORT\n';
  report += '='.repeat(80) + '\n';

  const dataBlob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
</script>

<style scoped>
table tr:hover {
  background-color: #f9fafb;
}
</style>
