<template>
  <div style="margin: 40px; position: relative">
    <!-- 로딩 오버레이 -->
    <div v-if="isAnalyzing" class="loading-overlay">
      <div class="loading-content-wide">
        <div class="loading-header">
          <div class="spinner"></div>
          <div class="loading-header-text">
            <h2 class="loading-title">분석 중...</h2>
            <p class="loading-url">{{ url }}</p>
          </div>
        </div>

        <!-- 진행 상태 표시 -->
        <div class="progress-section-wide">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" :style="{ width: `${analysisProgress}%` }"></div>
          </div>
          <div class="progress-info">
            <span class="progress-percentage">{{ analysisProgress }}%</span>
            <span class="loading-time">{{ elapsedTimeDisplay }}</span>
          </div>
        </div>

        <!-- 단계별 가로 레이아웃 -->
        <div class="steps-horizontal">
          <div
            v-for="(step, index) in analysisSteps"
            :key="index"
            class="step-card"
            :class="{
              completed: index < currentStepIndex,
              active: index === currentStepIndex,
              pending: index > currentStepIndex
            }"
          >
            <div class="step-card-header">
              <span class="step-number">{{ index + 1 }}</span>
              <span class="step-title">{{ step.label }}</span>
              <span class="step-status-icon">
                <template v-if="index < currentStepIndex">✓</template>
                <template v-else-if="index === currentStepIndex">
                  <span class="spinner-small"></span>
                </template>
              </span>
            </div>
            <div class="step-card-content">
              <div
                v-for="(subStep, subIndex) in step.subSteps"
                :key="subIndex"
                class="sub-step"
                :class="{
                  'sub-completed':
                    index < currentStepIndex ||
                    (index === currentStepIndex && subIndex < currentSubStepIndex),
                  'sub-active': index === currentStepIndex && subIndex === currentSubStepIndex,
                  'sub-pending':
                    index > currentStepIndex ||
                    (index === currentStepIndex && subIndex > currentSubStepIndex)
                }"
              >
                <span class="sub-step-dot"></span>
                <span class="sub-step-text">{{ subStep }}</span>
              </div>
            </div>
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
          <option selected>제한 없음</option>
          <option>모바일 네트워크</option>
          <option>5Mbps LTE QoS</option>
          <option>3Mbps LTE QoS</option>
          <option>1Mbps LTE QoS</option>
          <option>400Kbps LTE QoS</option>
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
      <div class="tab" :class="{ active: activeTab === 'bundle' }" @click="activeTab = 'bundle'">
        JS 번들 분석
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

    <!-- JS 번들 분석 탭 -->
    <div v-show="activeTab === 'bundle'" style="margin-top: 20px">
      <ClientOnly>
        <BundleAnalysisTab :result="analysisResult" />
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
const networkSpeed = ref('제한 없음');
const deviceSpec = ref('Desktop');
const useLighthouse = ref(false);
const activeTab = ref('frame');
const isAnalyzing = ref(false);
const isGeneratingPDF = ref(false);
const analysisResult = ref<AnalysisResult | null>(null);

// 분석 진행 상태 관련
const analysisSteps = [
  {
    label: '페이지 로딩',
    duration: 8000,
    subSteps: ['브라우저 초기화', 'URL 접속', '리소스 다운로드']
  },
  {
    label: '렌더링 대기',
    duration: 12000,
    subSteps: ['DOM 구성', '이미지 로딩', '스타일 적용']
  },
  {
    label: '성능 분석',
    duration: 8000,
    subSteps: ['메트릭 수집', '네트워크 분석', '결과 생성']
  }
];

const currentStepIndex = ref(0);
const currentSubStepIndex = ref(0);
const analysisProgress = ref(0);
const analysisStartTime = ref(0);
const elapsedTime = ref(0);
let elapsedInterval: NodeJS.Timeout | null = null;
let subStepInterval: NodeJS.Timeout | null = null;

const elapsedTimeDisplay = computed(() => {
  const seconds = Math.floor(elapsedTime.value / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}분 ${remainingSeconds}초`;
  }
  return `${remainingSeconds}초`;
});

function startProgressSimulation() {
  // Clear any existing intervals before starting new ones
  // This prevents orphaned intervals if called multiple times
  stopProgressSimulation(false);

  currentStepIndex.value = 0;
  currentSubStepIndex.value = 0;
  analysisProgress.value = 0;
  analysisStartTime.value = Date.now();
  elapsedTime.value = 0;

  // 전체 서브스텝 수 계산
  const totalSubSteps = analysisSteps.reduce((sum, step) => sum + step.subSteps.length, 0);
  let completedSubSteps = 0;

  // 경과 시간 업데이트
  elapsedInterval = setInterval(() => {
    elapsedTime.value = Date.now() - analysisStartTime.value;
  }, 100);

  // 서브스텝별 진행률 계산 함수
  const updateProgressForSubStep = () => {
    completedSubSteps++;
    // 90%까지만 진행 (실제 완료 시 100%로)
    const targetProgress = Math.min(Math.floor((completedSubSteps / totalSubSteps) * 90), 90);

    // 부드러운 진행률 증가
    const progressIncrement = () => {
      if (analysisProgress.value < targetProgress) {
        analysisProgress.value = Math.min(analysisProgress.value + 1, targetProgress);
        setTimeout(progressIncrement, 30);
      }
    };
    progressIncrement();
  };

  // 서브스텝 진행 시뮬레이션
  const advanceSubStep = () => {
    const currentStep = analysisSteps[currentStepIndex.value];
    if (!currentStep) return;

    const subStepCount = currentStep.subSteps.length;

    // 현재 서브스텝 완료 처리
    updateProgressForSubStep();

    if (currentSubStepIndex.value < subStepCount - 1) {
      currentSubStepIndex.value++;
    } else {
      // 현재 메인 스텝의 모든 서브스텝 완료, 다음 메인 스텝으로
      if (currentStepIndex.value < analysisSteps.length - 1) {
        currentStepIndex.value++;
        currentSubStepIndex.value = 0;
      }
    }
  };

  // 서브스텝 인터벌 (각 서브스텝 완료 시마다 진행률 증가)
  const subStepDuration = 2000; // 2초마다 서브스텝 진행
  subStepInterval = setInterval(() => {
    advanceSubStep();
  }, subStepDuration);
}

function stopProgressSimulation(success: boolean = true) {
  if (elapsedInterval) {
    clearInterval(elapsedInterval);
    elapsedInterval = null;
  }
  if (subStepInterval) {
    clearInterval(subStepInterval);
    subStepInterval = null;
  }

  if (success) {
    // 성공 시 100%로 완료
    currentStepIndex.value = analysisSteps.length;
    currentSubStepIndex.value = 0;
    analysisProgress.value = 100;
  }
}

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
  startProgressSimulation();

  try {
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
          networkThrottling: getNetworkThrottling(networkSpeed.value),
          cpuThrottling: getCPUThrottling(deviceSpec.value),
          waitUntil: 'networkidle2', // Changed from networkidle0 for better timeout handling
          useLighthouse: useLighthouse.value,
          lighthouseFormFactor: deviceSpec.value.includes('Mobile') ? 'mobile' : 'desktop',
          customMetrics: customMetrics,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height
        }
      }
    });

    const result = response as { success: boolean; data?: AnalysisResult };
    if (result.success && result.data) {
      stopProgressSimulation(true);
      analysisResult.value = result.data;
      // Save to history
      saveResultToHistory(result.data);
    }
  } catch (err: any) {
    console.error('Analysis error:', err);
    stopProgressSimulation(false);

    // Display enhanced error message if available
    if (err.data?.error) {
      const error = err.data.error;
      let errorMessage = `❌ ${error.title}\n\n${error.message}`;

      if (error.suggestions && error.suggestions.length > 0) {
        errorMessage += '\n\n💡 제안사항:';
        error.suggestions.forEach((suggestion: string) => {
          errorMessage += `\n• ${suggestion}`;
        });
      }

      alert(errorMessage);
    } else {
      // Fallback to generic error
      alert(
        '분석 중 오류가 발생했습니다:\n' + (err.data?.message || err.message || '알 수 없는 오류')
      );
    }
  } finally {
    isAnalyzing.value = false;
  }
}

function reAnalyze() {
  if (analysisResult.value) {
    startAnalysis();
  }
}

function getNetworkThrottling(speed: string): string {
  const mapping: Record<string, string> = {
    '제한 없음': 'none',
    '모바일 네트워크': 'lte-network',
    '5Mbps LTE QoS': '5mbps-lte',
    '3Mbps LTE QoS': '3mbps-lte',
    '1Mbps LTE QoS': '1mbps-lte',
    '400Kbps LTE QoS': '400kbps-lte'
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
    const blob = new Blob([response as unknown as BlobPart], { type: 'application/pdf' });
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

async function saveResultToHistory(result: AnalysisResult) {
  try {
    const response = await $fetch('/api/history', {
      method: 'POST',
      body: {
        result
      }
    });

    const historyResult = response as { success: boolean; error?: string };
    if (!historyResult.success) {
      console.error('Failed to save to history:', historyResult.error);
    }
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

.loading-content-wide {
  padding: 32px 40px;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 900px;
}

.loading-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.loading-header-text {
  text-align: left;
}

.loading-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 20px;
}

.loading-url {
  color: var(--text-tertiary);
  margin: 6px 0 0 0;
  font-size: 13px;
  word-break: break-all;
}

.progress-section-wide {
  margin-bottom: 24px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #60a5fa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.progress-percentage {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.loading-time {
  color: var(--text-tertiary);
  font-size: 13px;
}

.steps-horizontal {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.step-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.step-card.completed {
  border-color: #10b981;
  background: #ecfdf5;
}

.step-card.active {
  border-color: var(--primary);
  background: #eff6ff;
}

.step-card.pending {
  opacity: 0.6;
}

.step-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #9ca3af;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.step-card.completed .step-number {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.step-card.active .step-number {
  background: #3b82f6;
  color: #ffffff;
  box-shadow:
    0 0 0 4px rgba(59, 130, 246, 0.3),
    0 0 12px rgba(59, 130, 246, 0.4);
  animation: pulse-number 1.5s infinite;
  transform: scale(1.1);
}

@keyframes pulse-number {
  0%,
  100% {
    box-shadow:
      0 0 0 4px rgba(59, 130, 246, 0.3),
      0 0 12px rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(59, 130, 246, 0.2),
      0 0 20px rgba(59, 130, 246, 0.5);
  }
}

.step-card.pending .step-number {
  background: #d1d5db;
  color: #6b7280;
}

.step-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.step-status-icon {
  font-size: 16px;
  color: #10b981;
}

.step-card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.sub-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
}

.sub-step.sub-completed .sub-step-dot {
  background: #10b981;
}

.sub-step.sub-active .sub-step-dot {
  background: var(--primary);
  animation: pulse 1s infinite;
}

.sub-step.sub-completed {
  color: #10b981;
}

.sub-step.sub-active {
  color: var(--primary);
  font-weight: 500;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--bg-secondary);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.spinner {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border: 4px solid var(--border-secondary);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
