<template>
  <div style="display: flex; gap: 20px;">
    <!-- 좌측 영역 -->
    <div style="flex: 1;">
      <div class="card">
        <h3>프레임별 렌더링 과정</h3>

        <!-- 프레임 박스 -->
        <div class="frame-box">
          <img
            v-if="currentFrame"
            :src="`data:image/png;base64,${currentFrame.screenshot}`"
            alt="Frame screenshot"
            style="width: 100%; height: 100%; object-fit: contain;"
          />
          <div v-else style="color: #999;">
            분석 결과가 없습니다. 상단에서 URL을 입력하고 분석을 시작하세요.
          </div>
        </div>

        <!-- 슬라이더 -->
        <input
          v-if="frames.length > 0"
          type="range"
          min="0"
          :max="frames.length - 1"
          v-model="currentFrameIndex"
          class="slider"
          style="width: 100%; margin-top: 26px;"
        />

        <!-- 프레임 컨트롤 -->
        <div v-if="frames.length > 0" style="text-align: center; margin-top: 10px;">
          <button class="btn" @click="prevFrame" style="margin: 0 5px; padding: 6px 12px;">◀</button>
          <button class="btn" @click="nextFrame" style="margin: 0 5px; padding: 6px 12px;">▶</button>
          <button class="btn" @click="playFrames" style="margin: 0 5px; padding: 6px 12px;">
            {{ isPlaying ? '■' : '▶▶' }}
          </button>
        </div>

        <!-- 프레임 정보 -->
        <div v-if="currentFrame" style="text-align: center; margin-top: 12px;">
          프레임 {{ currentFrameIndex + 1 }} / {{ frames.length }} - {{ (currentFrame.timestamp * 1000).toFixed(0) }}ms
        </div>
      </div>
    </div>

    <!-- 우측 영역 -->
    <div style="width: 340px;">
      <div class="card" style="padding: 0;">
        <!-- 현재 프레임 정보 -->
        <div class="section-card">
          <h3>현재 프레임 정보</h3>
          <div v-if="currentFrame">
            <div>시간: {{ (currentFrame.timestamp * 1000).toFixed(0) }}ms</div>
            <div style="margin-top: 8px;">상태: 렌더링 진행 중</div>
            <div style="margin-top: 8px;">설명: 페이지 로딩 프레임</div>
          </div>
          <div v-else style="color: #999;">분석 결과 없음</div>
        </div>

        <!-- 로드된 리소스 -->
        <div class="section-card" v-if="result">
          <h3>로드된 리소스</h3>
          <div>총 요청: {{ result.networkRequests.length }}</div>
          <div style="margin-top: 8px;">
            총 크기: {{ formatBytes(totalSize) }}
          </div>
          <div style="margin-top: 8px;">
            이미지: {{ imageCount }}
          </div>
        </div>

        <!-- 핵심 메트릭 -->
        <div class="section-card" v-if="result && result.metrics">
          <h3>핵심 메트릭</h3>

          <div v-if="result.metrics.fcp">
            <div>FCP: {{ result.metrics.fcp.toFixed(0) }}ms</div>
            <div class="metric-bar">
              <div
                class="metric-fill"
                :class="getMetricColor(result.metrics.fcp)"
                :style="{ width: getMetricWidth(result.metrics.fcp) + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="result.metrics.lcp" style="margin-top: 12px;">
            <div>LCP: {{ result.metrics.lcp.toFixed(0) }}ms</div>
            <div class="metric-bar">
              <div
                class="metric-fill"
                :class="getMetricColor(result.metrics.lcp)"
                :style="{ width: getMetricWidth(result.metrics.lcp) + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="result.metrics.tbt" style="margin-top: 12px;">
            <div>TBT: {{ result.metrics.tbt.toFixed(0) }}ms</div>
            <div class="metric-bar">
              <div
                class="metric-fill"
                :class="getMetricColor(result.metrics.tbt)"
                :style="{ width: getMetricWidth(result.metrics.tbt) + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="result.metrics.cls !== undefined" style="margin-top: 12px;">
            <div>CLS: {{ result.metrics.cls.toFixed(3) }}</div>
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
        <div class="section-card" v-if="result && result.longTasks && result.longTasks.length > 0">
          <h3>Long Tasks</h3>
          <div>총 작업: {{ result.longTasks.length }}</div>
          <div style="margin-top: 8px;">
            평균: {{ averageLongTaskDuration.toFixed(0) }}ms
          </div>
          <div style="margin-top: 8px;">
            최대: {{ maxLongTaskDuration.toFixed(0) }}ms
          </div>
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
  return props.result.networkRequests.filter(req =>
    req.type.toLowerCase() === 'image'
  ).length;
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

watch(() => props.result, () => {
  currentFrameIndex.value = 0;
  stopPlaying();
});
</script>
