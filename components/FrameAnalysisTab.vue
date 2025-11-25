<template>
  <div>
    <!-- Performance Metrics Chart (New) -->
    <div v-if="result" style="margin-bottom: 20px">
      <PerformanceMetricsChart :result="result" />
    </div>

    <div style="display: flex; gap: 20px">
      <!-- 좌측 영역 -->
      <div style="flex: 1">
        <div class="card">
          <h3>프레임별 렌더링 과정</h3>

          <!-- 프레임 박스 -->
          <div class="frame-box">
            <img
              v-if="currentFrame"
              :src="`data:image/png;base64,${currentFrame.screenshot}`"
              alt="Frame screenshot"
              style="width: 100%; height: 100%; object-fit: contain"
            />
            <div v-else style="color: #999">
              분석 결과가 없습니다. 상단에서 URL을 입력하고 분석을 시작하세요.
            </div>
          </div>

          <!-- 슬라이더 -->
          <input
            v-if="frames.length > 0"
            v-model="currentFrameIndex"
            type="range"
            min="0"
            :max="frames.length - 1"
            class="slider"
            style="width: 100%; margin-top: 26px"
          />

          <!-- 프레임 컨트롤 -->
          <div v-if="frames.length > 0" style="text-align: center; margin-top: 10px">
            <button class="btn" style="margin: 0 5px; padding: 6px 12px" @click="prevFrame">
              ◀
            </button>
            <button class="btn" style="margin: 0 5px; padding: 6px 12px" @click="nextFrame">
              ▶
            </button>
            <button class="btn" style="margin: 0 5px; padding: 6px 12px" @click="playFrames">
              {{ isPlaying ? '■' : '▶▶' }}
            </button>
          </div>

          <!-- 프레임 정보 -->
          <div v-if="currentFrame" style="text-align: center; margin-top: 12px">
            프레임 {{ currentFrameIndex + 1 }} / {{ frames.length }} -
            {{ (currentFrame.timestamp * 1000).toFixed(0) }}ms
          </div>
        </div>
      </div>

      <!-- 우측 영역 -->
      <div style="width: 340px">
        <div class="card" style="padding: 0">
          <!-- 현재 프레임 정보 -->
          <div class="section-card">
            <h3>현재 프레임 정보</h3>
            <div v-if="currentFrame">
              <div>시간: {{ (currentFrame.timestamp * 1000).toFixed(0) }}ms</div>
              <div style="margin-top: 8px">
                상태:
                <span :class="['status-badge', frameStatus.class]">{{ frameStatus.text }}</span>
              </div>
              <div style="margin-top: 8px; color: #666; font-size: 13px">
                {{ frameDescription }}
              </div>
            </div>
            <div v-else style="color: #999">분석 결과 없음</div>
          </div>

          <!-- 로드된 리소스 (현재 프레임 시점 기준) -->
          <div v-if="result" class="section-card">
            <h3>로드된 리소스 <span style="font-size: 11px; color: #999; font-weight: normal">({{ (currentFrame?.timestamp * 1000 || 0).toFixed(0) }}ms)</span></h3>
            <div>로드 완료: {{ loadedResourcesAtFrame.count }} / {{ result.networkRequests.length }}</div>
            <div style="margin-top: 8px">로드된 크기: {{ formatBytes(loadedResourcesAtFrame.size) }}</div>
            <div style="margin-top: 8px">이미지: {{ loadedResourcesAtFrame.images }} / {{ imageCount }}</div>
            <div style="margin-top: 8px">스크립트: {{ loadedResourcesAtFrame.scripts }}</div>
            <div class="resource-progress">
              <div
                class="resource-progress-fill"
                :style="{ width: `${(loadedResourcesAtFrame.count / Math.max(result.networkRequests.length, 1)) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- 핵심 메트릭 -->
          <div v-if="result && result.metrics" class="section-card">
            <h3>핵심 메트릭</h3>

            <div v-if="result.metrics.fcp">
              <div style="display: flex; align-items: center">
                FCP: {{ result.metrics.fcp.toFixed(0) }}ms
                <HelpTooltip
                  :text="glossary.fcp.description"
                  :title="glossary.fcp.title"
                  position="right"
                />
              </div>
              <div class="metric-bar">
                <div
                  class="metric-fill"
                  :class="getMetricColor(result.metrics.fcp)"
                  :style="{ width: getMetricWidth(result.metrics.fcp) + '%' }"
                ></div>
              </div>
            </div>

            <div v-if="result.metrics.lcp" style="margin-top: 12px">
              <div style="display: flex; align-items: center">
                LCP: {{ result.metrics.lcp.toFixed(0) }}ms
                <HelpTooltip
                  :text="glossary.lcp.description"
                  :title="glossary.lcp.title"
                  position="right"
                />
              </div>
              <div class="metric-bar">
                <div
                  class="metric-fill"
                  :class="getMetricColor(result.metrics.lcp)"
                  :style="{ width: getMetricWidth(result.metrics.lcp) + '%' }"
                ></div>
              </div>
            </div>

            <div v-if="result.metrics.tbt" style="margin-top: 12px">
              <div style="display: flex; align-items: center">
                TBT: {{ result.metrics.tbt.toFixed(0) }}ms
                <HelpTooltip
                  :text="glossary.tbt.description"
                  :title="glossary.tbt.title"
                  position="right"
                />
              </div>
              <div class="metric-bar">
                <div
                  class="metric-fill"
                  :class="getMetricColor(result.metrics.tbt)"
                  :style="{ width: getMetricWidth(result.metrics.tbt) + '%' }"
                ></div>
              </div>
            </div>

            <div v-if="result.metrics.cls !== undefined" style="margin-top: 12px">
              <div style="display: flex; align-items: center">
                CLS: {{ result.metrics.cls.toFixed(3) }}
                <HelpTooltip
                  :text="glossary.cls.description"
                  :title="glossary.cls.title"
                  position="right"
                />
              </div>
              <div class="metric-bar">
                <div
                  class="metric-fill"
                  :class="getCLSColor(result.metrics.cls)"
                  :style="{ width: getCLSWidth(result.metrics.cls) + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Long Tasks 요약 -->
          <div
            v-if="result && result.longTasks && result.longTasks.length > 0"
            class="section-card"
          >
            <h3 style="display: flex; align-items: center">
              Long Tasks
              <HelpTooltip
                :text="glossary.longTask.description"
                :title="glossary.longTask.title"
                position="right"
              />
            </h3>
            <div>총 작업: {{ result.longTasks.length }}</div>
            <div style="margin-top: 8px">평균: {{ averageLongTaskDuration.toFixed(0) }}ms</div>
            <div style="margin-top: 8px">최대: {{ maxLongTaskDuration.toFixed(0) }}ms</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '~/types/performance';
import { glossary } from '~/utils/glossary';

const props = defineProps<{
  result: AnalysisResult | null;
}>();

const currentFrameIndex = ref(0);
const isPlaying = ref(false);
let playInterval: NodeJS.Timeout | null = null;

const frames = computed(() => props.result?.frames || []);
const currentFrame = computed(() => frames.value[currentFrameIndex.value]);

const totalSize = computed(() => {
  if (!props.result) return 0;
  return props.result.networkRequests.reduce((sum, req) => sum + req.size, 0);
});

const imageCount = computed(() => {
  if (!props.result) return 0;
  return props.result.networkRequests.filter(req => req.type.toLowerCase() === 'image').length;
});

// 현재 프레임 시점까지 로드된 리소스 계산
const loadedResourcesAtFrame = computed(() => {
  if (!props.result || !currentFrame.value) {
    return { count: 0, size: 0, images: 0, scripts: 0 };
  }

  const frameTimeMs = currentFrame.value.timestamp * 1000;
  let count = 0;
  let size = 0;
  let images = 0;
  let scripts = 0;

  for (const req of props.result.networkRequests) {
    // endTime이 현재 프레임 시간보다 작거나 같으면 로드 완료
    const endTimeMs = req.endTime * 1000;
    if (endTimeMs <= frameTimeMs) {
      count++;
      size += req.size;
      if (req.type.toLowerCase() === 'image') {
        images++;
      }
      if (req.type.toLowerCase() === 'script') {
        scripts++;
      }
    }
  }

  return { count, size, images, scripts };
});

// 프레임 상태 계산 (메트릭 기준)
const frameStatus = computed(() => {
  if (!props.result || !currentFrame.value) {
    return { text: '-', class: '' };
  }

  const frameTimeMs = currentFrame.value.timestamp * 1000;
  const metrics = props.result.metrics;
  const totalFrames = frames.value.length;
  const isLastFrame = currentFrameIndex.value === totalFrames - 1;

  // 완료 상태
  if (isLastFrame) {
    return { text: '로딩 완료', class: 'status-complete' };
  }

  // LCP 이후
  if (metrics.lcp && frameTimeMs >= metrics.lcp) {
    return { text: 'LCP 완료', class: 'status-lcp' };
  }

  // FCP 이후
  if (metrics.fcp && frameTimeMs >= metrics.fcp) {
    return { text: '콘텐츠 표시됨', class: 'status-fcp' };
  }

  // FCP 이전
  if (metrics.fcp && frameTimeMs < metrics.fcp) {
    return { text: '초기 로딩', class: 'status-loading' };
  }

  return { text: '렌더링 중', class: 'status-rendering' };
});

// 프레임 설명 생성
const frameDescription = computed(() => {
  if (!props.result || !currentFrame.value) {
    return '';
  }

  const frameTimeMs = currentFrame.value.timestamp * 1000;
  const metrics = props.result.metrics;
  const loaded = loadedResourcesAtFrame.value;
  const totalRequests = props.result.networkRequests.length;
  const loadPercent = totalRequests > 0 ? Math.round((loaded.count / totalRequests) * 100) : 0;

  const descriptions: string[] = [];

  // 메트릭 기준 설명
  if (metrics.fcp && frameTimeMs < metrics.fcp) {
    const remaining = Math.round(metrics.fcp - frameTimeMs);
    descriptions.push(`FCP까지 ${remaining}ms 남음`);
  } else if (metrics.fcp && metrics.lcp && frameTimeMs >= metrics.fcp && frameTimeMs < metrics.lcp) {
    const remaining = Math.round(metrics.lcp - frameTimeMs);
    descriptions.push(`LCP까지 ${remaining}ms 남음`);
  } else if (metrics.lcp && frameTimeMs >= metrics.lcp) {
    descriptions.push('주요 콘텐츠 로딩 완료');
  }

  // 리소스 로딩 상태
  descriptions.push(`리소스 ${loadPercent}% 로드됨`);

  return descriptions.join(' · ');
});

const averageLongTaskDuration = computed(() => {
  if (!props.result || !props.result.longTasks || props.result.longTasks.length === 0) return 0;
  const sum = props.result.longTasks.reduce((acc, task) => acc + task.duration, 0);
  return sum / props.result.longTasks.length;
});

const maxLongTaskDuration = computed(() => {
  if (!props.result || !props.result.longTasks || props.result.longTasks.length === 0) return 0;
  return Math.max(...props.result.longTasks.map(t => t.duration));
});

function prevFrame() {
  if (currentFrameIndex.value > 0) {
    currentFrameIndex.value--;
  }
}

function nextFrame() {
  if (currentFrameIndex.value < frames.value.length - 1) {
    currentFrameIndex.value++;
  }
}

function playFrames() {
  if (isPlaying.value) {
    stopPlaying();
  } else {
    isPlaying.value = true;
    playInterval = setInterval(() => {
      if (currentFrameIndex.value < frames.value.length - 1) {
        currentFrameIndex.value++;
      } else {
        stopPlaying();
        currentFrameIndex.value = 0;
      }
    }, 100);
  }
}

function stopPlaying() {
  isPlaying.value = false;
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

function getMetricColor(value: number): string {
  if (value <= 1000) return 'green';
  if (value <= 3000) return 'yellow';
  return 'orange';
}

function getMetricWidth(value: number): number {
  if (value <= 1000) return 100;
  if (value <= 3000) return 70;
  if (value <= 5000) return 50;
  return 30;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getCLSColor(cls: number): string {
  if (cls <= 0.1) return 'green';
  if (cls <= 0.25) return 'yellow';
  return 'orange';
}

function getCLSWidth(cls: number): number {
  if (cls <= 0.1) return 100;
  if (cls <= 0.25) return 70;
  if (cls <= 0.5) return 50;
  return 30;
}

onUnmounted(() => {
  stopPlaying();
});

watch(
  () => props.result,
  newResult => {
    if (newResult) {
      currentFrameIndex.value = 0;
      stopPlaying();
    }
  }
);
</script>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-loading {
  background: #fef3c7;
  color: #92400e;
}

.status-rendering {
  background: #dbeafe;
  color: #1e40af;
}

.status-fcp {
  background: #d1fae5;
  color: #065f46;
}

.status-lcp {
  background: #c7d2fe;
  color: #3730a3;
}

.status-complete {
  background: #10b981;
  color: white;
}

.resource-progress {
  margin-top: 12px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.resource-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.3s ease;
}
</style>
