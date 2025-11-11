<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Frame Timeline</h2>
      <div class="flex items-center space-x-4">
        <button
          @click="playAnimation"
          class="btn btn-primary"
          :disabled="isPlaying"
        >
          <svg v-if="!isPlaying" class="w-5 h-5 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          <svg v-else class="w-5 h-5 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          {{ isPlaying ? 'Playing...' : 'Play Animation' }}
        </button>
        <div class="text-sm text-gray-600">
          {{ frames.length }} frames captured
        </div>
      </div>
    </div>

    <!-- Current Frame Display -->
    <div class="mb-6 bg-gray-900 rounded-lg overflow-hidden">
      <div class="relative aspect-video">
        <img
          v-if="currentFrame"
          :src="`data:image/png;base64,${currentFrame.screenshot}`"
          alt="Frame screenshot"
          class="w-full h-full object-contain"
        />
        <div class="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
          <div class="text-xs text-gray-300">Frame {{ currentFrameIndex + 1 }} of {{ frames.length }}</div>
          <div class="text-lg font-bold">{{ (currentFrame?.timestamp || 0).toFixed(2) }}s</div>
        </div>
      </div>
    </div>

    <!-- Timeline Scrubber -->
    <div class="mb-6">
      <input
        type="range"
        min="0"
        :max="frames.length - 1"
        v-model="currentFrameIndex"
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        @input="stopAnimation"
      />
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>0.00s</span>
        <span>{{ maxTimestamp.toFixed(2) }}s</span>
      </div>
    </div>

    <!-- Frame Thumbnails -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">Frame Thumbnails</h3>
      <div class="overflow-x-auto">
        <div class="flex space-x-2 pb-2">
          <div
            v-for="(frame, index) in frames"
            :key="index"
            class="flex-shrink-0 cursor-pointer transition-all"
            :class="[
              currentFrameIndex === index ? 'ring-4 ring-blue-500 scale-105' : 'hover:scale-105',
              'rounded-lg overflow-hidden'
            ]"
            @click="selectFrame(index)"
          >
            <div class="w-32 bg-gray-100 rounded-lg overflow-hidden">
              <div class="aspect-video relative">
                <img
                  :src="`data:image/png;base64,${frame.screenshot}`"
                  alt="Frame thumbnail"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="px-2 py-1 bg-gray-800 text-white text-xs text-center">
                {{ frame.timestamp.toFixed(2) }}s
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-blue-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Total Frames</div>
        <div class="text-xl font-bold text-blue-900">{{ frames.length }}</div>
      </div>
      <div class="p-4 bg-green-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Average Interval</div>
        <div class="text-xl font-bold text-green-900">{{ averageInterval }}ms</div>
      </div>
      <div class="p-4 bg-purple-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Total Duration</div>
        <div class="text-xl font-bold text-purple-900">{{ maxTimestamp.toFixed(2) }}s</div>
      </div>
      <div class="p-4 bg-orange-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Frame Rate</div>
        <div class="text-xl font-bold text-orange-900">{{ frameRate }} fps</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FrameCapture } from '~/types/performance';

const props = defineProps<{
  frames: FrameCapture[];
}>();

const currentFrameIndex = ref(0);
const isPlaying = ref(false);
let animationTimer: NodeJS.Timeout | null = null;

const currentFrame = computed(() => props.frames[currentFrameIndex.value]);

const maxTimestamp = computed(() => {
  if (props.frames.length === 0) return 0;
  return Math.max(...props.frames.map(f => f.timestamp));
});

const averageInterval = computed(() => {
  if (props.frames.length < 2) return 0;
  const intervals = [];
  for (let i = 1; i < props.frames.length; i++) {
    intervals.push((props.frames[i].timestamp - props.frames[i - 1].timestamp) * 1000);
  }
  const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  return Math.round(avg);
});

const frameRate = computed(() => {
  if (averageInterval.value === 0) return 0;
  return Math.round(1000 / averageInterval.value);
});

function selectFrame(index: number) {
  stopAnimation();
  currentFrameIndex.value = index;
}

function playAnimation() {
  if (isPlaying.value) {
    stopAnimation();
    return;
  }

  isPlaying.value = true;
  currentFrameIndex.value = 0;

  animationTimer = setInterval(() => {
    if (currentFrameIndex.value < props.frames.length - 1) {
      currentFrameIndex.value++;
    } else {
      stopAnimation();
    }
  }, averageInterval.value || 100);
}

function stopAnimation() {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
  isPlaying.value = false;
}

onUnmounted(() => {
  stopAnimation();
});
</script>

<style scoped>
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}
</style>
