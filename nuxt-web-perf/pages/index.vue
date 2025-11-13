<template>
  <div style="margin: 40px; position: relative;">
    <!-- 로딩 오버레이 -->
    <div v-if="isAnalyzing" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <h2 style="margin: 20px 0 10px 0; color: #1f2937;">분석 중...</h2>
        <p style="color: #6b7280; margin: 0;">페이지 성능을 분석하고 있습니다. 잠시만 기다려주세요.</p>
        <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 14px;">{{ url }}</p>
      </div>
    </div>

    <!-- 상단 제어바 -->
    <div class="topbar">
      <label>네트워크 속도:</label>
      <select v-model="networkSpeed">
        <option>3G</option>
        <option selected>4G</option>
        <option>Wi-Fi</option>
        <option>Slow 3G</option>
      </select>

      <label>장비 사양:</label>
      <select v-model="deviceSpec">
        <option selected>Desktop</option>
        <option>Mobile (High-end)</option>
        <option>Mobile (Mid-range)</option>
        <option>Mobile (Low-end)</option>
      </select>

      <label>URL:</label>
      <input type="text" v-model="url" style="width:280px;" placeholder="https://www.naver.com/" />

      <label style="display: flex; align-items: center; gap: 4px;">
        <input type="checkbox" v-model="useLighthouse" />
        Lighthouse 사용
      </label>

      <button class="btn" @click="reAnalyze">재분석</button>
      <button class="btn btn-primary" @click="startAnalysis" :disabled="isAnalyzing">
        {{ isAnalyzing ? '분석 중...' : '시작' }}
      </button>

      <!-- 내보내기 버튼들 -->
      <div v-if="analysisResult" style="margin-left: auto; display: flex; gap: 8px;">
        <button class="btn" @click="exportJSON" title="JSON 형식으로 내보내기">
          📄 JSON
        </button>
        <button class="btn" @click="exportReport" title="텍스트 리포트로 내보내기">
          📝 Report
        </button>
        <button class="btn" @click="exportCSV" title="네트워크 요청을 CSV로 내보내기">
          📊 CSV
        </button>
        <button class="btn btn-primary" @click="exportPDF" :disabled="isGeneratingPDF" title="PDF 리포트로 내보내기">
          {{ isGeneratingPDF ? '⏳ 생성 중...' : '📑 PDF' }}
        </button>
      </div>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="tabs-wrapper">
      <div
        class="tab"
        :class="{ active: activeTab === 'frame' }"
        @click="activeTab = 'frame'"
      >
        프레임 분석
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'network' }"
        @click="activeTab = 'network'"
      >
        네트워크 타임라인
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'loading' }"
        @click="activeTab = 'loading'"
      >
        로딩 분포
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'batch' }"
        @click="activeTab = 'batch'"
      >
        일괄 분석
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        분석 이력
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'budget' }"
        @click="activeTab = 'budget'"
      >
        성능 예산
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'lighthouse' }"
        @click="activeTab = 'lighthouse'"
      >
        Lighthouse
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'custom' }"
        @click="activeTab = 'custom'"
      >
        커스텀 메트릭
      </div>
    </div>

    <!-- 프레임 분석 탭 -->
    <div v-show="activeTab === 'frame'" style="margin-top: 20px;">
      <FrameAnalysisTab :result="analysisResult" />
    </div>

    <!-- 네트워크 타임라인 탭 -->
    <div v-show="activeTab === 'network'" style="margin-top: 20px;">
      <NetworkTimelineTab :result="analysisResult" />
    </div>

    <!-- 로딩 분포 탭 -->
    <div v-show="activeTab === 'loading'" style="margin-top: 20px;">
      <LoadingDistributionTab :result="analysisResult" />
    </div>

    <!-- 일괄 분석 탭 -->
    <div v-show="activeTab === 'batch'" style="margin-top: 20px;">
      <BatchAnalysis />
    </div>

    <!-- 분석 이력 탭 -->
    <div v-show="activeTab === 'history'" style="margin-top: 20px;">
      <HistoryViewer />
    </div>

    <!-- 성능 예산 탭 -->
    <div v-show="activeTab === 'budget'" style="margin-top: 20px;">
      <PerformanceBudget :result="analysisResult" />
    </div>

    <!-- Lighthouse 탭 -->
    <div v-show="activeTab === 'lighthouse'" style="margin-top: 20px;">
      <LighthouseTab :result="analysisResult" />
    </div>

    <!-- 커스텀 메트릭 탭 -->
    <div v-show="activeTab === 'custom'" style="margin-top: 20px;">
      <CustomMetricsTab :result="analysisResult" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult, CustomMetricDefinition } from '~/types/performance';

const url = ref('https://www.naver.com/');
const networkSpeed = ref('4G');
const deviceSpec = ref('Desktop');
const useLighthouse = ref(false);
const activeTab = ref('frame');
const isAnalyzing = ref(false);
const isGeneratingPDF = ref(false);
const analysisResult = ref<AnalysisResult | null>(null);

async function startAnalysis() {
  if (!url.value || isAnalyzing.value) return;

  // UI 초기화 - 이전 분석 결과 제거
  analysisResult.value = null;

  isAnalyzing.value = true;

  try {
    // Load custom metrics from localStorage
    const customMetrics = loadCustomMetrics();

    const response = await $fetch('/api/analyze', {
      method: 'POST',
      body: {
        url: url.value,
        options: {
          captureScreenshots: true,
          networkThrottling: getNetworkThrottling(networkSpeed.value),
          cpuThrottling: getCPUThrottling(deviceSpec.value),
          waitUntil: 'networkidle0',
          useLighthouse: useLighthouse.value,
          lighthouseFormFactor: deviceSpec.value.includes('Mobile') ? 'mobile' : 'desktop',
          customMetrics: customMetrics
        }
      }
    });

    if (response.success) {
      analysisResult.value = response.data;
      // Save to history
      saveResultToHistory(response.data);
    }
  } catch (err: any) {
    console.error('Analysis error:', err);
    alert('분석 중 오류가 발생했습니다: ' + (err.data?.message || err.message));
  } finally {
    isAnalyzing.value = false;
  }
}

function reAnalyze() {
  if (analysisResult.value) {
    startAnalysis();
  }
}

function getNetworkThrottling(speed: string): 'none' | 'slow-3g' | 'fast-3g' | '4g' {
  const mapping: Record<string, 'none' | 'slow-3g' | 'fast-3g' | '4g'> = {
    '3G': 'fast-3g',
    '4G': '4g',
    'Wi-Fi': 'none',
    'Slow 3G': 'slow-3g'
  };
  return mapping[speed] || 'none';
}

function getCPUThrottling(device: string): number {
  const mapping: Record<string, number> = {
    'Desktop': 1,
    'Mobile (High-end)': 2,
    'Mobile (Mid-range)': 4,
    'Mobile (Low-end)': 6
  };
  return mapping[device] || 1;
}

function loadCustomMetrics(): CustomMetricDefinition[] {
  try {
    const stored = localStorage.getItem('customMetrics');
    if (stored) {
      const metrics = JSON.parse(stored) as CustomMetricDefinition[];
      // Only return enabled metrics
      return metrics.filter(m => m.enabled);
    }
  } catch (e) {
    console.error('Failed to load custom metrics:', e);
  }
  return [];
}

function exportJSON() {
  if (!analysisResult.value) return;
  const { exportAsJSON } = useExportUtils();
  exportAsJSON(analysisResult.value);
}

function exportReport() {
  if (!analysisResult.value) return;
  const { exportAsTextReport } = useExportUtils();
  exportAsTextReport(analysisResult.value);
}

function exportCSV() {
  if (!analysisResult.value) return;
  const { exportNetworkAsCSV } = useExportUtils();
  exportNetworkAsCSV(analysisResult.value);
}

async function exportPDF() {
  if (!analysisResult.value || isGeneratingPDF.value) return;

  isGeneratingPDF.value = true;

  try {
    const response = await $fetch('/api/generate-pdf', {
      method: 'POST',
      body: {
        result: analysisResult.value
      },
      responseType: 'blob'
    });

    // Create download link
    const blob = new Blob([response as Blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `performance-report-${timestamp}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    alert('PDF 생성 중 오류가 발생했습니다: ' + (err.data?.message || err.message));
  } finally {
    isGeneratingPDF.value = false;
  }
}

function useExportUtils() {
  return {
    exportAsJSON: (result: AnalysisResult, filename?: string) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `performance-analysis-${timestamp}.json`;
      const finalFilename = filename || defaultFilename;

      const dataStr = JSON.stringify(result, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.click();

      URL.revokeObjectURL(url);
    },
    exportAsTextReport: (result: AnalysisResult, filename?: string) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `performance-report-${timestamp}.txt`;
      const finalFilename = filename || defaultFilename;

      let report = '';
      report += '='.repeat(80) + '\n';
      report += 'WEB PERFORMANCE ANALYSIS REPORT\n';
      report += '='.repeat(80) + '\n\n';

      report += `URL: ${result.url}\n`;
      report += `Analysis Date: ${new Date(result.timestamp).toLocaleString()}\n`;
      report += `Total Running Time: ${result.runningTime.toFixed(0)}ms\n\n`;

      report += '-'.repeat(80) + '\n';
      report += 'PERFORMANCE SCORE\n';
      report += '-'.repeat(80) + '\n';
      report += `Overall Score: ${result.performanceScore.overall}/100\n`;
      report += `  - Metrics Score: ${result.performanceScore.metrics}/100\n`;
      report += `  - Network Score: ${result.performanceScore.network}/100\n`;
      report += `  - Frames Score: ${result.performanceScore.frames}/100\n\n`;

      report += '-'.repeat(80) + '\n';
      report += 'CORE WEB VITALS\n';
      report += '-'.repeat(80) + '\n';
      if (result.metrics.fcp) report += `FCP (First Contentful Paint): ${result.metrics.fcp.toFixed(0)}ms\n`;
      if (result.metrics.lcp) report += `LCP (Largest Contentful Paint): ${result.metrics.lcp.toFixed(0)}ms\n`;
      if (result.metrics.tbt) report += `TBT (Total Blocking Time): ${result.metrics.tbt.toFixed(0)}ms\n`;
      if (result.metrics.cls !== undefined) report += `CLS (Cumulative Layout Shift): ${result.metrics.cls.toFixed(3)}\n`;
      if (result.metrics.ttfb) report += `TTFB (Time to First Byte): ${result.metrics.ttfb.toFixed(0)}ms\n`;
      if (result.metrics.domContentLoaded) report += `DOM Content Loaded: ${result.metrics.domContentLoaded.toFixed(0)}ms\n`;
      if (result.metrics.loadComplete) report += `Load Complete: ${result.metrics.loadComplete.toFixed(0)}ms\n\n`;

      report += '-'.repeat(80) + '\n';
      report += 'NETWORK SUMMARY\n';
      report += '-'.repeat(80) + '\n';
      const totalSize = result.networkRequests.reduce((sum, req) => sum + req.size, 0);
      const imageCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'image').length;
      const cssCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'stylesheet').length;
      const jsCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'script').length;

      report += `Total Requests: ${result.networkRequests.length}\n`;
      report += `Total Size: ${formatBytes(totalSize)}\n`;
      report += `  - Images: ${imageCount} requests\n`;
      report += `  - Stylesheets: ${cssCount} requests\n`;
      report += `  - Scripts: ${jsCount} requests\n\n`;

      if (result.longTasks && result.longTasks.length > 0) {
        report += '-'.repeat(80) + '\n';
        report += 'LONG TASKS\n';
        report += '-'.repeat(80) + '\n';
        const avgDuration = result.longTasks.reduce((sum, t) => sum + t.duration, 0) / result.longTasks.length;
        const maxDuration = Math.max(...result.longTasks.map(t => t.duration));
        const totalBlocking = result.longTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);

        report += `Total Long Tasks: ${result.longTasks.length}\n`;
        report += `Average Duration: ${avgDuration.toFixed(0)}ms\n`;
        report += `Max Duration: ${maxDuration.toFixed(0)}ms\n`;
        report += `Total Blocking Time: ${totalBlocking.toFixed(0)}ms\n\n`;

        report += 'Top 5 Longest Tasks:\n';
        const topTasks = [...result.longTasks].sort((a, b) => b.duration - a.duration).slice(0, 5);
        topTasks.forEach((task, index) => {
          report += `  ${index + 1}. ${task.name} - ${task.duration.toFixed(0)}ms (starts at ${task.startTime.toFixed(0)}ms)\n`;
        });
        report += '\n';
      }

      report += '-'.repeat(80) + '\n';
      report += 'FRAMES\n';
      report += '-'.repeat(80) + '\n';
      report += `Total Frames Captured: ${result.frames.length}\n`;
      if (result.frames.length > 1) {
        const intervals = [];
        for (let i = 1; i < result.frames.length; i++) {
          intervals.push((result.frames[i].timestamp - result.frames[i - 1].timestamp) * 1000);
        }
        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        report += `Average Frame Interval: ${avgInterval.toFixed(0)}ms\n`;
      }
      report += '\n';

      report += '='.repeat(80) + '\n';
      report += 'END OF REPORT\n';
      report += '='.repeat(80) + '\n';

      const dataBlob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.click();

      URL.revokeObjectURL(url);
    },
    exportNetworkAsCSV: (result: AnalysisResult, filename?: string) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `network-requests-${timestamp}.csv`;
      const finalFilename = filename || defaultFilename;

      let csv = 'ID,URL,Type,Start Time (s),End Time (s),Duration (ms),Size (bytes),Status\n';

      for (const req of result.networkRequests) {
        const row = [
          req.id,
          `"${req.url}"`,
          req.type,
          req.startTime.toFixed(3),
          req.endTime.toFixed(3),
          req.duration.toFixed(2),
          req.size,
          req.status || ''
        ];
        csv += row.join(',') + '\n';
      }

      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.click();

      URL.revokeObjectURL(url);
    }
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function saveResultToHistory(result: AnalysisResult) {
  if (typeof window === 'undefined') return;

  const STORAGE_KEY = 'performance-analysis-history';
  const MAX_HISTORY_ITEMS = 50;

  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const entry = {
      id: `${result.url}-${result.timestamp}`,
      url: result.url,
      timestamp: result.timestamp,
      result
    };

    history.unshift(entry);

    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
}

.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
