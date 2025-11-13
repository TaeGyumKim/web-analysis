<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Network Waterfall</h2>
      <div class="flex items-center space-x-4">
        <div class="text-sm text-gray-600">
          Total: {{ totalSize }} | {{ requests.length }} requests
        </div>
        <select v-model="filterType" class="px-3 py-1 border border-gray-300 rounded-lg text-sm">
          <option value="all">All Types</option>
          <option value="document">Document</option>
          <option value="stylesheet">Stylesheet</option>
          <option value="script">Script</option>
          <option value="image">Image</option>
          <option value="font">Font</option>
          <option value="xhr">XHR</option>
          <option value="fetch">Fetch</option>
        </select>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="p-4 bg-blue-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Total Size</div>
        <div class="text-xl font-bold text-blue-900">{{ totalSize }}</div>
      </div>
      <div class="p-4 bg-green-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Requests</div>
        <div class="text-xl font-bold text-green-900">{{ filteredRequests.length }}</div>
      </div>
      <div class="p-4 bg-purple-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Average Duration</div>
        <div class="text-xl font-bold text-purple-900">{{ averageDuration }}</div>
      </div>
      <div class="p-4 bg-orange-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-1">Longest Request</div>
        <div class="text-xl font-bold text-orange-900">{{ longestDuration }}</div>
      </div>
    </div>

    <!-- Waterfall Chart -->
    <div class="overflow-x-auto">
      <div class="min-w-[800px]">
        <!-- Timeline Header -->
        <div class="flex items-center mb-2 text-xs text-gray-500 px-4">
          <div class="w-1/3">URL</div>
          <div class="flex-1 flex justify-between px-4">
            <span v-for="tick in timelineTicks" :key="tick">{{ tick }}s</span>
          </div>
        </div>

        <!-- Request Rows -->
        <div class="space-y-1">
          <div
            v-for="request in filteredRequests"
            :key="request.id"
            class="flex items-center group hover:bg-gray-50 rounded-lg p-2 transition-colors"
            @click="selectedRequest = request"
          >
            <!-- URL -->
            <div class="w-1/3 pr-4">
              <div class="flex items-center space-x-2">
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="getTypeColor(request.type)"
                ></span>
                <span class="text-sm truncate" :title="request.url">
                  {{ getFileName(request.url) }}
                </span>
              </div>
            </div>

            <!-- Timeline Bar -->
            <div class="flex-1 relative h-6 px-4">
              <div
                class="absolute h-4 rounded transition-all cursor-pointer"
                :class="getTypeBarColor(request.type)"
                :style="getBarStyle(request)"
                :title="`${request.url}\nDuration: ${request.duration.toFixed(2)}ms\nSize: ${formatSize(request.size)}`"
              >
                <span
                  class="text-xs text-white px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {{ request.duration.toFixed(0) }}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Request Details Modal -->
    <div
      v-if="selectedRequest"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="selectedRequest = null"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-bold text-gray-900">Request Details</h3>
          <button class="text-gray-400 hover:text-gray-600" @click="selectedRequest = null">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-3 text-sm">
          <div>
            <div class="font-medium text-gray-700">URL:</div>
            <div class="text-gray-600 break-all">{{ selectedRequest.url }}</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="font-medium text-gray-700">Type:</div>
              <div class="text-gray-600">{{ selectedRequest.type }}</div>
            </div>
            <div>
              <div class="font-medium text-gray-700">Status:</div>
              <div class="text-gray-600">{{ selectedRequest.status || 'N/A' }}</div>
            </div>
            <div>
              <div class="font-medium text-gray-700">Size:</div>
              <div class="text-gray-600">{{ formatSize(selectedRequest.size) }}</div>
            </div>
            <div>
              <div class="font-medium text-gray-700">Duration:</div>
              <div class="text-gray-600">{{ selectedRequest.duration.toFixed(2) }}ms</div>
            </div>
            <div>
              <div class="font-medium text-gray-700">Start Time:</div>
              <div class="text-gray-600">{{ selectedRequest.startTime.toFixed(2) }}s</div>
            </div>
            <div>
              <div class="font-medium text-gray-700">End Time:</div>
              <div class="text-gray-600">{{ selectedRequest.endTime.toFixed(2) }}s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NetworkRequest } from '~/types/performance';

const props = defineProps<{
  requests: NetworkRequest[];
}>();

const filterType = ref('all');
const selectedRequest = ref<NetworkRequest | null>(null);

const filteredRequests = computed(() => {
  if (filterType.value === 'all') {
    return props.requests;
  }
  return props.requests.filter(r => r.type.toLowerCase() === filterType.value.toLowerCase());
});

const totalSize = computed(() => {
  const bytes = filteredRequests.value.reduce((sum, r) => sum + r.size, 0);
  return formatSize(bytes);
});

const averageDuration = computed(() => {
  if (filteredRequests.value.length === 0) return '0ms';
  const avg =
    filteredRequests.value.reduce((sum, r) => sum + r.duration, 0) / filteredRequests.value.length;
  return `${avg.toFixed(2)}ms`;
});

const longestDuration = computed(() => {
  if (filteredRequests.value.length === 0) return '0ms';
  const longest = Math.max(...filteredRequests.value.map(r => r.duration));
  return `${longest.toFixed(2)}ms`;
});

const maxEndTime = computed(() => {
  if (props.requests.length === 0) return 1;
  return Math.max(...props.requests.map(r => r.endTime));
});

const timelineTicks = computed(() => {
  const max = maxEndTime.value;
  const ticks = [];
  const step = Math.ceil(max / 5);
  for (let i = 0; i <= 5; i++) {
    ticks.push((step * i).toFixed(1));
  }
  return ticks;
});

function getBarStyle(request: NetworkRequest) {
  const startPercent = (request.startTime / maxEndTime.value) * 100;
  const widthPercent = ((request.endTime - request.startTime) / maxEndTime.value) * 100;

  return {
    left: `${startPercent}%`,
    width: `${Math.max(widthPercent, 0.5)}%`
  };
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    document: 'bg-blue-500',
    stylesheet: 'bg-green-500',
    script: 'bg-yellow-500',
    image: 'bg-purple-500',
    font: 'bg-pink-500',
    xhr: 'bg-orange-500',
    fetch: 'bg-red-500',
    other: 'bg-gray-500'
  };
  return colors[type.toLowerCase()] || colors.other;
}

function getTypeBarColor(type: string): string {
  const colors: Record<string, string> = {
    document: 'bg-blue-400 hover:bg-blue-500',
    stylesheet: 'bg-green-400 hover:bg-green-500',
    script: 'bg-yellow-400 hover:bg-yellow-500',
    image: 'bg-purple-400 hover:bg-purple-500',
    font: 'bg-pink-400 hover:bg-pink-500',
    xhr: 'bg-orange-400 hover:bg-orange-500',
    fetch: 'bg-red-400 hover:bg-red-500',
    other: 'bg-gray-400 hover:bg-gray-500'
  };
  return colors[type.toLowerCase()] || colors.other;
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
