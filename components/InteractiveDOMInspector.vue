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

      <!-- 컨트롤 버튼 -->
      <div style="margin-bottom: 16px; display: flex; gap: 12px">
        <button
          class="toggle-button"
          :class="{ active: showAllBorders }"
          @click="showAllBorders = !showAllBorders"
        >
          <span v-if="showAllBorders">🔳 전체 경계 숨기기</span>
          <span v-else>🔲 전체 경계 보기</span>
        </button>
        <div
          v-if="pinnedElements.length > 0"
          style="color: #3b82f6; font-size: 13px; display: flex; align-items: center; gap: 6px"
        >
          📌 {{ pinnedElements.length }}개 요소 고정됨
        </div>
      </div>

      <!-- DOM 검사 뷰어 -->
      <div class="card">
        <div
          ref="inspectorContainer"
          class="inspector-container"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
          @contextmenu="handleRightClick"
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

          <!-- 전체 DOM 경계 표시 (토글 버튼 활성화 시) -->
          <template v-if="showAllBorders && result.domElements">
            <div
              v-for="(element, index) in result.domElements"
              :key="'border-' + index"
              class="border-overlay"
              :style="{
                left: element.boundingBox.x / scale.x + 'px',
                top: element.boundingBox.y / scale.y + 'px',
                width: element.boundingBox.width / scale.x + 'px',
                height: element.boundingBox.height / scale.y + 'px'
              }"
            ></div>
          </template>

          <!-- 고정된 요소 하이라이트 (초록색) -->
          <div
            v-for="(element, index) in pinnedElements"
            :key="'pinned-' + index"
            class="highlight-overlay pinned-highlight"
            :style="{
              left: element.boundingBox.x / scale.x + 'px',
              top: element.boundingBox.y / scale.y + 'px',
              width: element.boundingBox.width / scale.x + 'px',
              height: element.boundingBox.height / scale.y + 'px',
              opacity: 0.4 - index * 0.05
            }"
          ></div>

          <!-- 하이라이트 오버레이 (호버된 요소 - 파란색) -->
          <div
            v-for="(element, index) in hoveredElements"
            :key="'hover-' + index"
            class="highlight-overlay"
            :style="{
              left: element.boundingBox.x / scale.x + 'px',
              top: element.boundingBox.y / scale.y + 'px',
              width: element.boundingBox.width / scale.x + 'px',
              height: element.boundingBox.height / scale.y + 'px',
              opacity: 0.3 - index * 0.05
            }"
          ></div>

          <!-- 툴팁 (겹친 요소 모두 표시) -->
          <div
            v-if="hoveredElements.length > 0 && tooltipPosition"
            class="tooltip"
            :style="{
              left: tooltipPosition.x + 'px',
              top: tooltipPosition.y + 'px',
              maxHeight: '600px',
              overflowY: 'auto'
            }"
          >
            <div
              v-if="hoveredElements.length > 1"
              class="tooltip-info"
              style="margin-bottom: 8px; font-size: 12px; color: #666"
            >
              겹친 요소 {{ hoveredElements.length }}개
            </div>

            <div
              v-for="(element, index) in hoveredElements"
              :key="index"
              :style="{
                marginBottom: index < hoveredElements.length - 1 ? '12px' : '0',
                paddingBottom: index < hoveredElements.length - 1 ? '12px' : '0',
                borderBottom: index < hoveredElements.length - 1 ? '1px solid #e5e7eb' : 'none'
              }"
            >
              <div class="tooltip-header">
                <strong>{{ element.tagName }}</strong>
                <span v-if="element.id" style="color: #3b82f6"> #{{ element.id }}</span>
                <span v-if="element.className" style="color: #8b5cf6">
                  .{{ element.className.split(' ')[0] }}
                </span>
              </div>

              <div class="tooltip-content">
                <div v-if="element.innerText" class="tooltip-row">
                  <span class="label">텍스트:</span>
                  <span class="value">{{ element.innerText }}</span>
                </div>

                <div v-if="element.loadTime" class="tooltip-row">
                  <span class="label">로드 시간:</span>
                  <span class="value highlight">{{ element.loadTime.toFixed(0) }} ms</span>
                </div>

                <div class="tooltip-row">
                  <span class="label">크기:</span>
                  <span class="value"
                    >{{ element.boundingBox.width }} × {{ element.boundingBox.height }} px</span
                  >
                </div>

                <div class="tooltip-row">
                  <span class="label">위치:</span>
                  <span class="value"
                    >({{ element.boundingBox.x }}, {{ element.boundingBox.y }})</span
                  >
                </div>

                <div v-if="element.resourceTimings && element.resourceTimings.length > 0">
                  <div class="tooltip-section-title">연관 리소스:</div>
                  <div
                    v-for="(resource, rIndex) in element.resourceTimings"
                    :key="rIndex"
                    class="resource-item"
                  >
                    <div class="resource-type">{{ resource.type }}</div>
                    <div class="resource-details">
                      <span>{{ formatBytes(resource.size) }}</span>
                      <span style="margin-left: 8px">{{ resource.duration.toFixed(0) }}ms</span>
                    </div>
                  </div>
                </div>

                <div v-if="!element.loadTime && !element.resourceTimings" class="no-data">
                  로딩 정보 없음 (정적 요소)
                </div>
              </div>
            </div>
          </div>

          <!-- 고정된 툴팁 (우클릭으로 고정) -->
          <div
            v-if="pinnedElements.length > 0 && pinnedPosition"
            class="tooltip pinned-tooltip"
            :style="{
              left: pinnedPosition.x + 'px',
              top: pinnedPosition.y + 'px',
              maxHeight: '600px',
              overflowY: 'auto'
            }"
          >
            <!-- 닫기 버튼 -->
            <button class="close-button" title="닫기 (ESC)" @click="closePinnedTooltip">✕</button>

            <div class="pinned-badge">고정됨 (우클릭)</div>
            <div
              v-if="pinnedElements.length > 1"
              class="tooltip-info"
              style="margin-bottom: 8px; font-size: 12px; color: #666"
            >
              겹친 요소 {{ pinnedElements.length }}개
            </div>

            <div
              v-for="(element, index) in pinnedElements"
              :key="index"
              :style="{
                marginBottom: index < pinnedElements.length - 1 ? '12px' : '0',
                paddingBottom: index < pinnedElements.length - 1 ? '12px' : '0',
                borderBottom: index < pinnedElements.length - 1 ? '1px solid #e5e7eb' : 'none'
              }"
            >
              <div class="tooltip-header">
                <strong>{{ element.tagName }}</strong>
                <span v-if="element.id" style="color: #3b82f6"> #{{ element.id }}</span>
                <span v-if="element.className" style="color: #8b5cf6">
                  .{{ element.className.split(' ')[0] }}
                </span>
              </div>

              <div class="tooltip-content">
                <div v-if="element.innerText" class="tooltip-row">
                  <span class="label">텍스트:</span>
                  <span class="value">{{ element.innerText }}</span>
                </div>

                <div v-if="element.loadTime" class="tooltip-row">
                  <span class="label">로드 시간:</span>
                  <span class="value highlight">{{ element.loadTime.toFixed(0) }} ms</span>
                </div>

                <div class="tooltip-row">
                  <span class="label">크기:</span>
                  <span class="value"
                    >{{ element.boundingBox.width }} × {{ element.boundingBox.height }} px</span
                  >
                </div>

                <div class="tooltip-row">
                  <span class="label">위치:</span>
                  <span class="value"
                    >({{ element.boundingBox.x }}, {{ element.boundingBox.y }})</span
                  >
                </div>

                <div v-if="element.resourceTimings && element.resourceTimings.length > 0">
                  <div class="tooltip-section-title">연관 리소스:</div>
                  <div
                    v-for="(resource, rIndex) in element.resourceTimings"
                    :key="rIndex"
                    class="resource-item"
                  >
                    <div class="resource-type">{{ resource.type }}</div>
                    <div class="resource-details">
                      <span>{{ formatBytes(resource.size) }}</span>
                      <span style="margin-left: 8px">{{ resource.duration.toFixed(0) }}ms</span>
                    </div>
                  </div>
                </div>

                <div v-if="!element.loadTime && !element.resourceTimings" class="no-data">
                  로딩 정보 없음 (정적 요소)
                </div>
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
  isActive: boolean;
}>();

const inspectorContainer = ref<HTMLElement | null>(null);
const screenshotRef = ref<HTMLImageElement | null>(null);
const hoveredElements = ref<DOMElementTiming[]>([]);
const tooltipPosition = ref<{ x: number; y: number } | null>(null);
const scale = ref({ x: 1, y: 1 });

// Pinned tooltip state
const pinnedElements = ref<DOMElementTiming[]>([]);
const pinnedPosition = ref<{ x: number; y: number } | null>(null);
const showAllBorders = ref(false);

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

    // For fullPage screenshots, use naturalWidth/Height (actual page dimensions)
    // instead of viewport size
    if (img.naturalWidth && img.naturalHeight && img.clientWidth && img.clientHeight) {
      scale.value = {
        x: img.naturalWidth / img.clientWidth,
        y: img.naturalHeight / img.clientHeight
      };

      console.log('[DOM Inspector] Scale calculation:', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
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

// Watch for tab activation to recalculate scale
watch(
  () => props.isActive,
  newValue => {
    if (newValue) {
      // Tab just became active, recalculate scale
      // Use setTimeout to ensure DOM is fully rendered after v-show changes
      setTimeout(() => {
        updateScale();
      }, 50);
      // Also try again after a bit more delay for safety
      setTimeout(() => {
        updateScale();
      }, 200);
    }
  }
);

// Update scale on window resize
onMounted(() => {
  window.addEventListener('resize', updateScale);
  window.addEventListener('keydown', handleKeyDown);
  // Also update scale on mount
  updateScale();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScale);
  window.removeEventListener('keydown', handleKeyDown);
});

function handleMouseMove(event: MouseEvent) {
  if (!props.result || !props.result.domElements) return;

  const container = inspectorContainer.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  // Include scroll offset for accurate positioning
  const x = event.clientX - rect.left + container.scrollLeft;
  const y = event.clientY - rect.top + container.scrollTop;

  // 마우스 좌표를 원본 이미지 좌표로 변환
  const originalX = x * scale.value.x;
  const originalY = y * scale.value.y;

  // Find all DOM elements at this position (using original coordinates)
  const elements = findElementsAtPosition(originalX, originalY);

  // Debug logging (only when elements change)
  if (elements.length > 0 && elements[0] !== hoveredElements.value[0]) {
    console.log('[DOM Inspector] Element hover:', {
      displayCoords: { x, y },
      scrollOffset: { left: container.scrollLeft, top: container.scrollTop },
      originalCoords: { x: originalX, y: originalY },
      elementCount: elements.length,
      elements: elements.map(el => ({ tagName: el.tagName, box: el.boundingBox })),
      scale: scale.value
    });
  }

  if (elements.length > 0) {
    hoveredElements.value = elements;

    // Position tooltip near cursor (add scroll offset for absolute positioning within scrollable container)
    const tooltipX = Math.min(
      event.clientX - rect.left + container.scrollLeft + 15,
      rect.width - 350 + container.scrollLeft
    );
    const tooltipY = Math.min(
      event.clientY - rect.top + container.scrollTop + 15,
      rect.height - 300 + container.scrollTop
    );

    tooltipPosition.value = { x: tooltipX, y: tooltipY };
  } else {
    hoveredElements.value = [];
    tooltipPosition.value = null;
  }
}

function handleMouseLeave() {
  hoveredElements.value = [];
  tooltipPosition.value = null;
}

function handleRightClick(event: MouseEvent) {
  // Prevent default context menu
  event.preventDefault();

  // Pin current hovered elements if any
  if (hoveredElements.value.length > 0 && tooltipPosition.value) {
    pinnedElements.value = [...hoveredElements.value];
    pinnedPosition.value = { ...tooltipPosition.value };

    console.log('[DOM Inspector] Tooltip pinned:', {
      elementCount: pinnedElements.value.length,
      position: pinnedPosition.value
    });
  }
}

function closePinnedTooltip() {
  pinnedElements.value = [];
  pinnedPosition.value = null;
}

function handleKeyDown(event: KeyboardEvent) {
  // Close pinned tooltip on ESC key
  if (event.key === 'Escape' && pinnedElements.value.length > 0) {
    closePinnedTooltip();
  }
}

function findElementsAtPosition(x: number, y: number): DOMElementTiming[] {
  if (!props.result || !props.result.domElements) return [];

  // Find all elements that contain this point
  const matchingElements = props.result.domElements.filter(el => {
    const box = el.boundingBox;
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  });

  if (matchingElements.length === 0) return [];

  // Sort by area (smallest first = most specific element on top)
  matchingElements.sort((a, b) => {
    const areaA = a.boundingBox.width * a.boundingBox.height;
    const areaB = b.boundingBox.width * b.boundingBox.height;
    return areaA - areaB;
  });

  // Get the selected element (smallest = most specific)
  const selectedElement = matchingElements[0];

  // Helper function to check if element A contains element B
  const isContainedIn = (parent: DOMElementTiming, child: DOMElementTiming): boolean => {
    const p = parent.boundingBox;
    const c = child.boundingBox;
    return (
      c.x >= p.x && c.y >= p.y && c.x + c.width <= p.x + p.width && c.y + c.height <= p.y + p.height
    );
  };

  // Return only the selected element and its children (elements contained within it)
  return matchingElements.filter(el => {
    // Include the selected element itself
    if (el === selectedElement) return true;
    // Include only elements that are contained within the selected element
    return isContainedIn(selectedElement, el);
  });
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

.pinned-highlight {
  border: 2px solid #10b981;
  background: rgba(16, 185, 129, 0.15);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
  z-index: 15;
}

.border-overlay {
  position: absolute;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: transparent;
  pointer-events: none;
  z-index: 5;
}

.toggle-button {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-button:hover {
  border-color: #8b5cf6;
  background: #f5f3ff;
}

.toggle-button.active {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border-color: #8b5cf6;
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

.pinned-tooltip {
  pointer-events: auto;
  border: 2px solid #3b82f6;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
  z-index: 30;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  transition: background 0.2s;
}

.close-button:hover {
  background: #dc2626;
}

.pinned-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
