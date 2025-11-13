<template>
  <div class="card">
    <h3 class="text-2xl font-bold text-gray-900 mb-6">네트워크 요청 히트맵</h3>

    <!-- Heatmap Grid -->
    <div class="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h4 class="text-lg font-semibold mb-4 text-gray-700">타입별 / 시간대별 요청 분포</h4>

      <div class="overflow-x-auto">
        <div class="inline-block min-w-full">
          <!-- Header -->
          <div class="flex items-end mb-2">
            <div class="w-32 flex-shrink-0"></div>
            <div class="flex-1 flex">
              <div
                v-for="(bucket, index) in timeBuckets"
                :key="index"
                class="flex-1 text-center text-xs text-gray-600 px-1"
              >
                {{ bucket.label }}
              </div>
            </div>
          </div>

          <!-- Heatmap Rows -->
          <div class="space-y-2">
            <div
              v-for="type in resourceTypes"
              :key="type"
              class="flex items-center"
            >
              <!-- Type Label -->
              <div class="w-32 flex-shrink-0 font-medium text-sm text-gray-700 pr-4">
                <div class="flex items-center space-x-2">
                  <div
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: getTypeColor(type) }"
                  ></div>
                  <span>{{ type }}</span>
                </div>
              </div>

              <!-- Heatmap Cells -->
              <div class="flex-1 flex gap-1">
                <div
                  v-for="(bucket, index) in timeBuckets"
                  :key="index"
                  class="flex-1 h-12 rounded cursor-pointer transition-all hover:scale-105"
                  :style="{
                    backgroundColor: getHeatmapColor(getRequestCount(type, bucket.min, bucket.max)),
                    border: '1px solid rgba(0,0,0,0.05)'
                  }"
                  :title="`${type}: ${getRequestCount(type, bucket.min, bucket.max)}개 요청 (${bucket.label})`"
                  @click="showBucketDetails(type, bucket)"
                >
                  <div class="flex items-center justify-center h-full text-xs font-medium text-gray-700">
                    {{ getRequestCount(type, bucket.min, bucket.max) || '' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div class="mt-6 flex items-center justify-center space-x-4">
            <span class="text-sm text-gray-600">요청 수:</span>
            <div class="flex items-center space-x-2">
              <div
                v-for="(color, index) in legendColors"
                :key="index"
                class="flex items-center space-x-1"
              >
                <div
                  class="w-6 h-6 rounded"
                  :style="{ backgroundColor: color.color }"
                ></div>
                <span class="text-xs text-gray-600">{{ color.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Size Distribution Chart -->
    <div class="bg-white p-6 rounded-lg border border-gray-200">
      <h4 class="text-lg font-semibold mb-4 text-gray-700">타입별 크기 분포</h4>
      <canvas ref="sizeChart"></canvas>
    </div>

    <!-- Details Modal -->
    <div
      v-if="selectedBucket"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="selectedBucket = null"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-bold text-gray-900">
            {{ selectedBucket.type }} ({{ selectedBucket.bucket.label }})
          </h3>
          <button
            @click="selectedBucket = null"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="(request, index) in getBucketRequests(selectedBucket.type, selectedBucket.bucket.min, selectedBucket.bucket.max)"
            :key="index"
            class="p-3 bg-gray-50 rounded text-sm"
          >
            <div class="font-medium text-gray-700 truncate">{{ getFileName(request.url) }}</div>
            <div class="text-gray-500 text-xs mt-1">
              {{ request.startTime.toFixed(2) }}s - {{ formatSize(request.size) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import type { NetworkRequest } from '~/types/performance';

Chart.register(...registerables);

const props = defineProps<{
  requests: NetworkRequest[];
}>();

const sizeChart = ref<HTMLCanvasElement | null>(null);
let sizeChartInstance: Chart | null = null;

const selectedBucket = ref<{ type: string; bucket: any } | null>(null);

const resourceTypes = ['document', 'stylesheet', 'script', 'image', 'font', 'xhr', 'fetch', 'other'];

const timeBuckets = computed(() => {
  if (props.requests.length === 0) {
    return [
      { label: '0-1s', min: 0, max: 1 },
      { label: '1-2s', min: 1, max: 2 },
      { label: '2-3s', min: 2, max: 3 },
      { label: '3-4s', min: 3, max: 4 },
      { label: '4-5s', min: 4, max: 5 }
    ];
  }

  const maxTime = Math.max(...props.requests.map(r => r.endTime));
  const bucketCount = 10;
  const bucketSize = maxTime / bucketCount;

  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const min = i * bucketSize;
    const max = (i + 1) * bucketSize;
    buckets.push({
      label: `${min.toFixed(1)}-${max.toFixed(1)}s`,
      min,
      max
    });
  }

  return buckets;
});

const legendColors = [
  { color: 'rgba(239, 246, 255, 1)', label: '0' },
  { color: 'rgba(219, 234, 254, 1)', label: '1-2' },
  { color: 'rgba(147, 197, 253, 1)', label: '3-5' },
  { color: 'rgba(59, 130, 246, 1)', label: '6-10' },
  { color: 'rgba(29, 78, 216, 1)', label: '10+' }
];

onMounted(() => {
  initSizeChart();
});

onUnmounted(() => {
  if (sizeChartInstance) {
    sizeChartInstance.destroy();
  }
});

watch(() => props.requests, () => {
  if (sizeChartInstance) {
    sizeChartInstance.destroy();
  }
  nextTick(() => {
    initSizeChart();
  });
}, { deep: true });

function getRequestCount(type: string, minTime: number, maxTime: number): number {
  return props.requests.filter(r =>
    r.type.toLowerCase() === type.toLowerCase() &&
    r.startTime >= minTime &&
    r.startTime < maxTime
  ).length;
}

function getBucketRequests(type: string, minTime: number, maxTime: number): NetworkRequest[] {
  return props.requests.filter(r =>
    r.type.toLowerCase() === type.toLowerCase() &&
    r.startTime >= minTime &&
    r.startTime < maxTime
  );
}

function getHeatmapColor(count: number): string {
  if (count === 0) return 'rgba(239, 246, 255, 1)';
  if (count <= 2) return 'rgba(219, 234, 254, 1)';
  if (count <= 5) return 'rgba(147, 197, 253, 1)';
  if (count <= 10) return 'rgba(59, 130, 246, 1)';
  return 'rgba(29, 78, 216, 1)';
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    document: '#3b82f6',
    stylesheet: '#10b981',
    script: '#f59e0b',
    image: '#8b5cf6',
    font: '#ec4899',
    xhr: '#f97316',
    fetch: '#ef4444',
    other: '#6b7280'
  };
  return colors[type.toLowerCase()] || colors.other;
}

function showBucketDetails(type: string, bucket: any) {
  const count = getRequestCount(type, bucket.min, bucket.max);
  if (count > 0) {
    selectedBucket.value = { type, bucket };
  }
}

function initSizeChart() {
  if (!sizeChart.value) return;

  const typeSizes: Record<string, number> = {};
  for (const type of resourceTypes) {
    typeSizes[type] = props.requests
      .filter(r => r.type.toLowerCase() === type.toLowerCase())
      .reduce((sum, r) => sum + r.size, 0);
  }

  sizeChartInstance = new Chart(sizeChart.value, {
    type: 'bar',
    data: {
      labels: resourceTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      datasets: [{
        label: '크기 (KB)',
        data: resourceTypes.map(t => typeSizes[t] / 1024),
        backgroundColor: resourceTypes.map(t => getTypeColor(t)),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.y.toFixed(2)} KB`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '크기 (KB)'
          }
        }
      }
    }
  });
}

function getFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || pathname;
    return filename || urlObj.hostname;
  } catch {
    return url;
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
</script>

<style scoped>
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
</style>
