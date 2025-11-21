<template>
  <div class="history-container">
    <div class="history-header">
      <h2>분석 기록</h2>
      <button class="btn btn-sm" @click="refreshHistory">🔄 새로고침</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner-small"></div>
      <p>기록을 불러오는 중...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn" @click="refreshHistory">다시 시도</button>
    </div>

    <div v-else-if="history.length === 0" class="empty-state">
      <p>📭 아직 분석 기록이 없습니다.</p>
      <p style="font-size: 14px; color: #6b7280">URL을 입력하고 분석을 시작해보세요!</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="entry in history"
        :key="entry.id"
        class="history-item"
        @click="$emit('select', entry)"
      >
        <div class="history-item-header">
          <div class="history-url">{{ entry.url }}</div>
          <div class="history-timestamp">{{ formatTimestamp(entry.timestamp) }}</div>
        </div>
        <div class="history-item-details">
          <span class="detail-badge">
            ⏱️ {{ formatDuration(entry.result.runningTime) }}
          </span>
          <span v-if="entry.result.options?.networkThrottling" class="detail-badge">
            🌐 {{ entry.result.options.networkThrottling }}
          </span>
          <span v-if="entry.result.options?.cpuThrottling" class="detail-badge">
            💻 {{ entry.result.options.cpuThrottling }}x
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string | number;
  result: {
    url: string;
    timestamp: string | number;
    runningTime: number;
    options?: {
      networkThrottling?: string;
      cpuThrottling?: number;
    };
  };
}

const emit = defineEmits<{
  select: [entry: HistoryEntry];
}>();

const history = ref<HistoryEntry[]>([]);
const loading = ref(false);
const error = ref('');

async function loadHistory() {
  loading.value = true;
  error.value = '';

  try {
    const response = await $fetch<HistoryEntry[]>('/api/history');
    history.value = response;
  } catch (err) {
    error.value = '기록을 불러오는 중 오류가 발생했습니다.';
    console.error('Failed to load history:', err);
  } finally {
    loading.value = false;
  }
}

function refreshHistory() {
  loadHistory();
}

function formatTimestamp(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return '방금 전';
  }
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}분 전`;
  }
  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}시간 전`;
  }

  // Format as date
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.history-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 14px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.spinner-small {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #3b82f6;
  background: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.history-url {
  font-weight: 500;
  color: #1f2937;
  word-break: break-all;
  flex: 1;
}

.history-timestamp {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}

.history-item-details {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
  color: #6b7280;
}

.error-state {
  color: #ef4444;
}

.error-state button {
  margin-top: 16px;
}
</style>
