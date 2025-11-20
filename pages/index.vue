<template>
  <div style="margin: 40px; position: relative">
    <!-- 로딩 오버레이 -->
    <div v-if="isAnalyzing" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <h2 style="margin: 20px 0 10px 0; color: #1f2937">분석 중...</h2>
        <p style="color: #6b7280; margin: 0">
          페이지 성능을 분석하고 있습니다. 잠시만 기다려주세요.
        </p>
        <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 14px">{{ url }}</p>
        <div v-if="testAllCombinations && totalTests > 0" style="margin-top: 20px">
          <div
            style="
              background: #f3f4f6;
              border-radius: 8px;
              padding: 12px 20px;
              display: inline-block;
              min-width: 200px;
            "
          >
            <div style="font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 8px">
              {{ completedTests }} / {{ totalTests }}
            </div>
            <div style="font-size: 14px; color: #6b7280">
              {{ currentTestDescription }}
            </div>
          </div>
          <div
            style="
              width: 300px;
              height: 6px;
              background: #e5e7eb;
              border-radius: 3px;
              margin: 16px auto 0;
              overflow: hidden;
            "
          >
            <div
              style="
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                transition: width 0.3s ease;
              "
              :style="{ width: `${(completedTests / totalTests) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 상단 제어바 -->
    <div class="topbar">
      <!-- 첫 번째 줄 -->
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <label style="display: flex; align-items: center">
          네트워크 속도
          <HelpTooltip
            :text="glossary.networkThrottling.description"
            :title="glossary.networkThrottling.title"
            position="bottom"
          />
          :
        </label>
        <select v-model="networkSpeed">
          <option>3G</option>
          <option selected>4G</option>
          <option>Wi-Fi</option>
          <option>Slow 3G</option>
        </select>

        <label style="display: flex; align-items: center">
          장비 사양
          <HelpTooltip
            :text="glossary.cpuThrottling.description"
            :title="glossary.cpuThrottling.title"
            position="bottom"
          />
          :
        </label>
        <select v-model="deviceSpec">
          <option selected>Desktop</option>
          <option>Mobile (High-end)</option>
          <option>Mobile (Mid-range)</option>
          <option>Mobile (Low-end)</option>
        </select>

        <label style="display: flex; align-items: center">
          Viewport
          <HelpTooltip
            :text="glossary.viewport.description"
            :title="glossary.viewport.title"
            position="bottom"
          />
          :
        </label>
        <select v-model="viewportPreset" @change="onViewportPresetChange">
          <option value="desktop-1920">Desktop 1920x1080</option>
          <option value="desktop-1366">Desktop 1366x768</option>
          <option value="desktop-1280">Desktop 1280x720</option>
          <option value="ipad-pro">iPad Pro 1024x1366</option>
          <option value="ipad">iPad 768x1024</option>
          <option value="iphone13">iPhone 13 390x844</option>
          <option value="galaxy-s21">Galaxy S21 360x800</option>
          <option value="custom">Custom</option>
        </select>

        <template v-if="viewportPreset === 'custom'">
          <input
            v-model.number="customViewportWidth"
            type="number"
            placeholder="Width"
            style="width: 80px"
            min="320"
            max="3840"
          />
          <span>×</span>
          <input
            v-model.number="customViewportHeight"
            type="number"
            placeholder="Height"
            style="width: 80px"
            min="240"
            max="2160"
          />
        </template>

        <label style="display: flex; align-items: center; gap: 4px">
          <input v-model="useLighthouse" type="checkbox" />
          Lighthouse
          <HelpTooltip
            :text="glossary.lighthouse.description"
            :title="glossary.lighthouse.title"
            position="bottom"
          />
        </label>

        <label
          style="
            display: flex;
            align-items: center;
            gap: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 500;
          "
        >
          <input v-model="testAllCombinations" type="checkbox" />
          모든 조합 테스트 (16개)
          <HelpTooltip
            text="체크하면 모든 네트워크 속도(4가지) × 장비 사양(4가지) 조합을 자동으로 테스트합니다. 로딩 분포 차트에 전체 데이터가 표시됩니다."
            title="모든 조합 테스트"
            position="bottom"
          />
        </label>
      </div>

      <!-- 두 번째 줄 -->
      <div style="display: flex; align-items: center; gap: 12px; margin-top: 12px">
        <label>URL:</label>
        <input
          v-model="url"
          type="text"
          style="flex: 1; min-width: 300px"
          placeholder="https://www.naver.com/"
        />

        <button class="btn" @click="reAnalyze">재분석</button>
        <button class="btn btn-primary" :disabled="isAnalyzing" @click="startAnalysis">
          {{ isAnalyzing ? '분석 중...' : '시작' }}
        </button>

        <!-- 내보내기 버튼들 -->
        <div v-if="analysisResult" style="margin-left: auto; display: flex; gap: 8px">
          <button class="btn" title="JSON 형식으로 내보내기" @click="exportJSON">📄 JSON</button>
          <button class="btn" title="텍스트 리포트로 내보내기" @click="exportReport">
            📝 Report
          </button>
          <button class="btn" title="네트워크 요청을 CSV로 내보내기" @click="exportCSV">
            📊 CSV
          </button>
          <button
            class="btn btn-primary"
            :disabled="isGeneratingPDF"
            title="PDF 리포트로 내보내기"
            @click="exportPDF"
          >
            {{ isGeneratingPDF ? '⏳ 생성 중...' : '📑 PDF' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="tabs-wrapper">
      <div class="tab" :class="{ active: activeTab === 'frame' }" @click="activeTab = 'frame'">
        프레임 분석
      </div>
      <span class="divider">|</span>
      <div class="tab" :class="{ active: activeTab === 'network' }" @click="activeTab = 'network'">
        네트워크 타임라인
      </div>
      <span class="divider">|</span>
      <div class="tab" :class="{ active: activeTab === 'loading' }" @click="activeTab = 'loading'">
        로딩 분포
      </div>
      <span class="divider">|</span>
      <div class="tab" :class="{ active: activeTab === 'budget' }" @click="activeTab = 'budget'">
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
      <div class="tab" :class="{ active: activeTab === 'custom' }" @click="activeTab = 'custom'">
        커스텀 메트릭
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'inspector' }"
        @click="activeTab = 'inspector'"
      >
        DOM 검사
      </div>
    </div>

    <!-- 프레임 분석 탭 -->
    <div v-show="activeTab === 'frame'" style="margin-top: 20px">
      <FrameAnalysisTab :result="analysisResult" />
    </div>

    <!-- 네트워크 타임라인 탭 -->
    <div v-show="activeTab === 'network'" style="margin-top: 20px">
      <NetworkTimelineTab :result="analysisResult" />
    </div>

    <!-- 로딩 분포 탭 -->
    <div v-show="activeTab === 'loading'" style="margin-top: 20px">
      <ClientOnly>
        <LoadingDistributionTab :result="analysisResult" />
      </ClientOnly>
    </div>

    <!-- 성능 예산 탭 -->
    <div v-show="activeTab === 'budget'" style="margin-top: 20px">
      <PerformanceBudget :result="analysisResult" />
    </div>

    <!-- Lighthouse 탭 -->
    <div v-show="activeTab === 'lighthouse'" style="margin-top: 20px">
      <LighthouseTab :result="analysisResult" />
    </div>

    <!-- 커스텀 메트릭 탭 -->
    <div v-show="activeTab === 'custom'" style="margin-top: 20px">
      <CustomMetricsTab :result="analysisResult" />
    </div>

    <!-- DOM 검사 탭 -->
    <div v-show="activeTab === 'inspector'" style="margin-top: 20px">
      <ClientOnly>
        <InteractiveDOMInspector :result="analysisResult" :is-active="activeTab === 'inspector'" />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult, CustomMetricDefinition } from '~/types/performance';
import { exportAsJSON, exportAsTextReport, exportNetworkAsCSV } from '~/utils/exportUtils';
import { glossary } from '~/utils/glossary';

const url = ref('https://www.naver.com/');
const networkSpeed = ref('4G');
const deviceSpec = ref('Desktop');
const useLighthouse = ref(false);
const testAllCombinations = ref(false);
const activeTab = ref('frame');
const isAnalyzing = ref(false);
const isGeneratingPDF = ref(false);
const analysisResult = ref<AnalysisResult | null>(null);

// Progress tracking for all combinations test
const completedTests = ref(0);
const totalTests = ref(0);
const currentTestDescription = ref('');

// Viewport settings
const viewportPreset = ref('desktop-1920');
const customViewportWidth = ref(1920);
const customViewportHeight = ref(1080);

const viewportPresets: Record<string, { width: number; height: number }> = {
  'desktop-1920': { width: 1920, height: 1080 },
  'desktop-1366': { width: 1366, height: 768 },
  'desktop-1280': { width: 1280, height: 720 },
  'ipad-pro': { width: 1024, height: 1366 },
  ipad: { width: 768, height: 1024 },
  iphone13: { width: 390, height: 844 },
  'galaxy-s21': { width: 360, height: 800 }
};

function onViewportPresetChange() {
  if (viewportPreset.value !== 'custom') {
    const preset = viewportPresets[viewportPreset.value];
    if (preset) {
      customViewportWidth.value = preset.width;
      customViewportHeight.value = preset.height;
    }
  }
}

function getViewportSize(): { width: number; height: number } {
  if (viewportPreset.value === 'custom') {
    return {
      width: customViewportWidth.value || 1920,
      height: customViewportHeight.value || 1080
    };
  }
  return viewportPresets[viewportPreset.value] || { width: 1920, height: 1080 };
}

async function startAnalysis() {
  if (!url.value || isAnalyzing.value) return;

  // UI 초기화 - 이전 분석 결과 제거
  analysisResult.value = null;

  isAnalyzing.value = true;

  try {
    if (testAllCombinations.value) {
      await runAllCombinationsTest();
    } else {
      await runSingleTest(networkSpeed.value, deviceSpec.value);
    }
  } catch (err: any) {
    console.error('Analysis error:', err);
    alert('분석 중 오류가 발생했습니다: ' + (err.data?.message || err.message));
  } finally {
    isAnalyzing.value = false;
    completedTests.value = 0;
    totalTests.value = 0;
    currentTestDescription.value = '';
  }
}

async function runAllCombinationsTest() {
  const networkSpeeds = ['Slow 3G', '3G', '4G', 'Wi-Fi'];
  const deviceSpecs = ['Desktop', 'Mobile (High-end)', 'Mobile (Mid-range)', 'Mobile (Low-end)'];

  totalTests.value = networkSpeeds.length * deviceSpecs.length;
  completedTests.value = 0;

  let lastResult: AnalysisResult | null = null;

  for (const network of networkSpeeds) {
    for (const device of deviceSpecs) {
      currentTestDescription.value = `${network} + ${device}`;

      try {
        const result = await runSingleTest(network, device, false);
        if (result) {
          lastResult = result;
        }
      } catch (err) {
        console.error(`Failed test: ${network} + ${device}`, err);
        // Continue with other tests even if one fails
      }

      completedTests.value++;
    }
  }

  // Show the last result
  if (lastResult) {
    analysisResult.value = lastResult;
  }
}

async function runSingleTest(
  network: string,
  device: string,
  updateUI: boolean = true
): Promise<AnalysisResult | null> {
  // Load custom metrics from localStorage
  const customMetrics = loadCustomMetrics();

  // Get viewport size
  const viewport = getViewportSize();

  const response = await $fetch('/api/analyze', {
    method: 'POST',
    body: {
      url: url.value,
      options: {
        captureScreenshots: true,
        networkThrottling: getNetworkThrottling(network),
        cpuThrottling: getCPUThrottling(device),
        waitUntil: 'networkidle0',
        useLighthouse: useLighthouse.value,
        lighthouseFormFactor: device.includes('Mobile') ? 'mobile' : 'desktop',
        customMetrics: customMetrics,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height
      }
    }
  });

  if (response.success) {
    const result = response.data;
    // Save to history
    saveResultToHistory(result);

    if (updateUI) {
      analysisResult.value = result;
    }

    return result;
  }

  return null;
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
    Desktop: 1,
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
  exportAsJSON(analysisResult.value);
}

function exportReport() {
  if (!analysisResult.value) return;
  exportAsTextReport(analysisResult.value);
}

function exportCSV() {
  if (!analysisResult.value) return;
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
