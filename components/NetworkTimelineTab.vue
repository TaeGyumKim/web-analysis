<template>
  <div>
    <!-- Network Heatmap (New) -->
    <div v-if="result && result.networkRequests.length > 0" style="margin-bottom: 20px">
      <NetworkHeatmap :requests="result.networkRequests" />
    </div>

    <!-- Network Waterfall (New) -->
    <div v-if="result && result.networkRequests.length > 0" style="margin-bottom: 20px">
      <NetworkWaterfall :requests="result.networkRequests" />
    </div>

    <div class="card">
      <h3>네트워크 요청 타임라인</h3>

      <div
        style="
          margin-top: 12px;
          padding: 12px;
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
          font-size: 14px;
          color: #1e40af;
          line-height: 1.6;
        "
      >
        <strong>📊 테이블 해설:</strong>
        <ul style="margin: 8px 0 0 20px; padding: 0">
          <li><strong>리소스 이름</strong>: 로딩된 파일의 이름과 타입 (이미지, CSS, JS 등)</li>
          <li>
            <strong>요청 구간</strong>: 페이지 로딩 중 해당 리소스가 요청된 시점과 완료 시점을
            시각화한 타임라인 바
          </li>
          <li><strong>크기</strong>: 전송된 리소스의 파일 크기</li>
          <li style="margin-top: 4px; color: #666">
            💡 Tip: 타임라인 바에 마우스를 올리면 상세 정보를 확인할 수 있습니다
          </li>
        </ul>
      </div>

      <table
        v-if="result && result.networkRequests.length > 0"
        style="width: 100%; border-collapse: collapse; margin-top: 20px"
      >
        <thead>
          <tr style="border-bottom: 2px solid #e0e0e0">
            <th style="padding: 12px 8px; text-align: left; font-weight: 600">리소스 이름</th>
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; width: 50%">
              요청 구간
            </th>
            <th style="padding: 12px 8px; text-align: right; font-weight: 600">크기</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="request in sortedRequests"
            :key="request.id"
            style="border-bottom: 1px solid #e0e0e0"
          >
            <td style="padding: 8px; max-width: 250px">
              <div
                style="
                  font-weight: 500;
                  color: #333;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                "
                :title="request.url"
              >
                {{ getFileName(request.url) }}
              </div>
              <div style="font-size: 12px; color: #999; margin-top: 2px">{{ request.type }}</div>
            </td>
            <td style="padding: 8px">
              <div
                class="bar"
                :class="getBarClass(request.type)"
                :style="getBarStyle(request)"
                :title="`${request.duration.toFixed(0)}ms (${request.startTime.toFixed(2)}s ~ ${request.endTime.toFixed(2)}s)`"
              >
                <span style="font-size: 11px; color: #fff; padding: 0 6px">
                  {{ request.duration.toFixed(0) }}ms
                </span>
              </div>
            </td>
            <td style="padding: 8px; text-align: right; font-weight: 500">
              {{ formatBytes(request.size) }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else style="text-align: center; padding: 40px; color: #999">
        분석 결과가 없습니다. 상단에서 URL을 입력하고 분석을 시작하세요.
      </div>

      <!-- 요약 정보 -->
      <div
        v-if="result"
        style="
          display: flex;
          gap: 24px;
          margin-top: 24px;
          font-size: 14px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        "
      >
        <div>
          총 요청 수: <strong>{{ result.networkRequests.length }}</strong>
        </div>
        <div>
          총 전송 크기: <strong>{{ formatBytes(totalSize) }}</strong>
        </div>
        <div v-if="result.metrics.domContentLoaded" style="display: flex; align-items: center">
          DOMContentLoaded:
          <HelpTooltip
            :text="glossary.domContentLoaded.description"
            :title="glossary.domContentLoaded.title"
            position="top"
          />
          <strong style="margin-left: 4px"
            >{{ result.metrics.domContentLoaded.toFixed(0) }} ms</strong
          >
        </div>
        <div v-if="result.metrics.loadComplete" style="display: flex; align-items: center">
          Load:
          <HelpTooltip
            :text="glossary.loadComplete.description"
            :title="glossary.loadComplete.title"
            position="top"
          />
          <strong style="margin-left: 4px">{{ result.metrics.loadComplete.toFixed(0) }} ms</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult, NetworkRequest } from '~/types/performance';
import { glossary } from '~/utils/glossary';

const props = defineProps<{
  result: AnalysisResult | null;
}>();

const sortedRequests = computed(() => {
  if (!props.result) return [];
  return [...props.result.networkRequests].sort((a, b) => a.startTime - b.startTime);
});

const totalSize = computed(() => {
  if (!props.result) return 0;
  return props.result.networkRequests.reduce((sum, req) => sum + req.size, 0);
});

const maxEndTime = computed(() => {
  if (!props.result || props.result.networkRequests.length === 0) return 1;
  return Math.max(...props.result.networkRequests.map(r => r.endTime));
});

function getFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || pathname;
    return filename || urlObj.hostname;
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  }
}

function getBarClass(type: string): string {
  const typeMap: Record<string, string> = {
    document: 'bar-document',
    stylesheet: 'bar-css',
    script: 'bar-js',
    image: 'bar-image',
    font: 'bar-font',
    xhr: 'bar-js',
    fetch: 'bar-js'
  };
  return typeMap[type.toLowerCase()] || 'bar-document';
}

function getBarStyle(request: NetworkRequest) {
  const startPercent = (request.startTime / maxEndTime.value) * 100;
  const durationPercent = ((request.endTime - request.startTime) / maxEndTime.value) * 100;

  return {
    width: `${Math.max(durationPercent, 2)}%`,
    marginLeft: `${startPercent}%`,
    height: '10px',
    borderRadius: '5px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center'
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
</script>

<style scoped>
.bar {
  transition: all 0.2s;
}

.bar:hover {
  opacity: 0.8;
  transform: scaleY(1.2);
}
</style>
