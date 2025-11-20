<template>
  <div>
    <!-- 분석 전 초기 화면 -->
    <div
      v-if="!result || !result.domElements || result.domElements.length === 0"
      class="empty-state"
    >
      <div style="text-align: center; padding: 60px 20px">
        <div style="font-size: 48px; margin-bottom: 16px">🔍</div>
        <h3 style="color: #6b7280; margin: 0 0 8px 0">인터랙티브 DOM 검사</h3>
        <p style="color: #9ca3af; margin: 0">
          페이지 분석을 시작하면 DOM 요소별 로딩 정보를 확인할 수 있습니다.
        </p>
      </div>
    </div>

    <!-- 분석 결과 화면 -->
    <div v-else>
      <!-- 안내 배너 -->
      <div
        style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        "
      >
        <div style="font-size: 24px">🎯</div>
        <div>
          <strong>인터랙티브 DOM 검사</strong> – 페이지의 DOM 요소 위에 마우스를 올리면 해당 요소의
          로딩 정보를 확인할 수 있습니다.
        </div>
      </div>

      <!-- DOM 검사 뷰어 -->
      <div class="card">
        <div
          ref="inspectorContainer"
          class="inspector-container"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
        >
          <!-- 페이지 스크린샷 -->
          <img
            v-if="lastFrameImage"
            ref="screenshotRef"
            :src="lastFrameImage"
            alt="Page Screenshot"
            class="screenshot"
            style="display: block; width: 100%; height: auto"
            @load="handleImageLoad"
          />

          <!-- 하이라이트 오버레이 -->
          <div
            v-if="hoveredElement"
            class="highlight-overlay"
            :style="{
              left: hoveredElement.boundingBox.x / scale.x + 'px',
              top: hoveredElement.boundingBox.y / scale.y + 'px',
              width: hoveredElement.boundingBox.width / scale.x + 'px',
              height: hoveredElement.boundingBox.height / scale.y + 'px'
            }"
          ></div>

          <!-- 툴팁 -->
          <div
            v-if="hoveredElement && tooltipPosition"
            class="tooltip"
            :style="{
              left: tooltipPosition.x + 'px',
              top: tooltipPosition.y + 'px'
            }"
          >
            <div class="tooltip-header">
              <strong>{{ hoveredElement.tagName }}</strong>
              <span v-if="hoveredElement.id" style="color: #3b82f6"> #{{ hoveredElement.id }}</span>
              <span v-if="hoveredElement.className" style="color: #8b5cf6">
                .{{ hoveredElement.className.split(' ')[0] }}
              </span>
            </div>

            <div class="tooltip-content">
              <div v-if="hoveredElement.innerText" class="tooltip-row">
                <span class="label">텍스트:</span>
                <span class="value">{{ hoveredElement.innerText }}</span>
              </div>

              <div v-if="hoveredElement.loadTime" class="tooltip-row">
                <span class="label">로드 시간:</span>
                <span class="value highlight">{{ hoveredElement.loadTime.toFixed(0) }} ms</span>
              </div>

              <div class="tooltip-row">
                <span class="label">크기:</span>
                <span class="value"
                  >{{ hoveredElement.boundingBox.width }} ×
                  {{ hoveredElement.boundingBox.height }} px</span
                >
              </div>

              <div class="tooltip-row">
                <span class="label">위치:</span>
                <span class="value"
                  >({{ hoveredElement.boundingBox.x }}, {{ hoveredElement.boundingBox.y }})</span
                >
              </div>

              <div
                v-if="hoveredElement.resourceTimings && hoveredElement.resourceTimings.length > 0"
              >
                <div class="tooltip-section-title">연관 리소스:</div>
                <div
                  v-for="(resource, index) in hoveredElement.resourceTimings"
                  :key="index"
                  class="resource-item"
                >
                  <div class="resource-type">{{ resource.type }}</div>
                  <div class="resource-details">
                    <span>{{ formatBytes(resource.size) }}</span>
                    <span style="margin-left: 8px">{{ resource.duration.toFixed(0) }}ms</span>
                  </div>
                </div>
              </div>

              <div
                v-if="!hoveredElement.loadTime && !hoveredElement.resourceTimings"
                class="no-data"
              >
                로딩 정보 없음 (정적 요소)
              </div>
            </div>
          </div>
        </div>

        <!-- 통계 정보 -->
        <div class="stats-bar">
          <div class="stat-item"><strong>총 DOM 요소:</strong> {{ result.domElements.length }}</div>
          <div class="stat-item">
            <strong>리소스 포함 요소:</strong>
            {{ result.domElements.filter(el => el.resourceTimings?.length).length }}
          </div>
          <div class="stat-item">
            <strong>평균 로드 시간:</strong>
            {{ calculateAverageLoadTime() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult, DOMElementTiming } from '~/types/performance';

const props = defineProps<{
  result: AnalysisResult | null;
}>();

const inspectorContainer = ref<HTMLElement | null>(null);
const screenshotRef = ref<HTMLImageElement | null>(null);
const hoveredElement = ref<DOMElementTiming | null>(null);
const tooltipPosition = ref<{ x: number; y: number } | null>(null);
const scale = ref({ x: 1, y: 1 });

const lastFrameImage = computed(() => {
  if (!props.result || !props.result.frames || props.result.frames.length === 0) {
    return null;
  }
  const lastFrame = props.result.frames[props.result.frames.length - 1];
  // Add data URI prefix if not already present
  if (lastFrame.screenshot.startsWith('data:')) {
    return lastFrame.screenshot;
  }
  return `data:image/png;base64,${lastFrame.screenshot}`;
});

function updateScale() {
  nextTick(() => {
    if (!screenshotRef.value || !props.result) return;

    const img = screenshotRef.value;

    // Use viewport size from analysis options (default: 1920x1080)
    const viewportWidth = props.result.options?.viewportWidth || 1920;
    const viewportHeight = props.result.options?.viewportHeight || 1080;

    if (img.clientWidth && img.clientHeight) {
      scale.value = {
        x: viewportWidth / img.clientWidth,
        y: viewportHeight / img.clientHeight
      };

      console.log('[DOM Inspector] Scale calculation:', {
        viewportWidth,
        viewportHeight,
        clientWidth: img.clientWidth,
        clientHeight: img.clientHeight,
        scaleX: scale.value.x,
        scaleY: scale.value.y
      });
    }
  });
}

function handleImageLoad() {
  // Call updateScale immediately
  updateScale();
  // Also call after a short delay to ensure DOM is fully rendered
  setTimeout(() => {
    updateScale();
  }, 100);
}

// Watch for result changes to recalculate scale
watch(
  () => props.result,
  () => {
    if (props.result) {
      updateScale();
    }
  }
);

// Update scale on window resize
onMounted(() => {
  window.addEventListener('resize', updateScale);
  // Also update scale on mount
  updateScale();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScale);
});

function handleMouseMove(event: MouseEvent) {
  if (!props.result || !props.result.domElements) return;

  const container = inspectorContainer.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 마우스 좌표를 원본 이미지 좌표로 변환
  const originalX = x * scale.value.x;
  const originalY = y * scale.value.y;

  // Find DOM element at this position (using original coordinates)
  const element = findElementAtPosition(originalX, originalY);

  // Debug logging (only when element changes)
  if (element && element !== hoveredElement.value) {
    console.log('[DOM Inspector] Element hover:', {
      displayCoords: { x, y },
      originalCoords: { x: originalX, y: originalY },
      elementBox: element.boundingBox,
      scale: scale.value
    });
  }

  if (element) {
    hoveredElement.value = element;

    // Position tooltip near cursor but avoid edges (using display coordinates)
    const tooltipX = Math.min(x + 15, rect.width - 300);
    const tooltipY = Math.min(y + 15, rect.height - 200);

    tooltipPosition.value = { x: tooltipX, y: tooltipY };
  } else {
    hoveredElement.value = null;
    tooltipPosition.value = null;
  }
}

function handleMouseLeave() {
  hoveredElement.value = null;
  tooltipPosition.value = null;
}

function findElementAtPosition(x: number, y: number): DOMElementTiming | null {
  if (!props.result || !props.result.domElements) return null;

  // Find all elements that contain this point, then return the smallest one (most specific)
  const matchingElements = props.result.domElements.filter(el => {
    const box = el.boundingBox;
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  });

  if (matchingElements.length === 0) return null;

  // Sort by area (smallest first = most specific element)
  matchingElements.sort((a, b) => {
    const areaA = a.boundingBox.width * a.boundingBox.height;
    const areaB = b.boundingBox.width * b.boundingBox.height;
    return areaA - areaB;
  });

  return matchingElements[0];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

function calculateAverageLoadTime(): string {
  if (!props.result || !props.result.domElements) return '0 ms';

  const elementsWithLoadTime = props.result.domElements.filter(el => el.loadTime);
  if (elementsWithLoadTime.length === 0) return '0 ms';

  const total = elementsWithLoadTime.reduce((sum, el) => sum + (el.loadTime || 0), 0);
  const avg = total / elementsWithLoadTime.length;

  return `${avg.toFixed(0)} ms`;
}
</script>

<style scoped>
.inspector-container {
  position: relative;
  overflow: auto;
  max-height: 800px;
  background: #f9fafb;
  border-radius: 8px;
  cursor: crosshair;
}

.screenshot {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}

.highlight-overlay {
  position: absolute;
  border: 2px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  z-index: 10;
}

.tooltip {
  position: absolute;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  min-width: 280px;
  max-width: 400px;
  z-index: 20;
  pointer-events: none;
  font-size: 13px;
}

.tooltip-header {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #6b7280;
  font-size: 12px;
}

.value {
  color: #1f2937;
  font-weight: 500;
}

.value.highlight {
  color: #3b82f6;
  font-weight: 600;
}

.tooltip-section-title {
  margin-top: 8px;
  margin-bottom: 4px;
  font-weight: 600;
  color: #374151;
  font-size: 12px;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  margin-top: 4px;
}

.resource-type {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.resource-details {
  font-size: 11px;
  color: #374151;
}

.no-data {
  color: #9ca3af;
  font-style: italic;
  font-size: 12px;
  margin-top: 4px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 8px 8px;
  margin-top: 16px;
}

.stat-item {
  font-size: 13px;
  color: #6b7280;
}

.stat-item strong {
  color: #1f2937;
  margin-right: 4px;
}
</style>
