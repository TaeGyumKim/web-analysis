<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Performance Metrics</h2>
      <button
        @click="showDetails = !showDetails"
        class="btn btn-secondary text-sm"
      >
        {{ showDetails ? 'Hide Details' : 'Show Details' }}
      </button>
    </div>

    <!-- Key Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <MetricBadge
        v-if="metrics.fcp"
        label="FCP"
        tooltip="First Contentful Paint"
        :value="metrics.fcp"
        :score="scoreTimingMs(metrics.fcp)"
      />
      <MetricBadge
        v-if="metrics.lcp"
        label="LCP"
        tooltip="Largest Contentful Paint"
        :value="metrics.lcp"
        :score="scoreTimingMs(metrics.lcp)"
      />
      <MetricBadge
        v-if="metrics.tbt"
        label="TBT"
        tooltip="Total Blocking Time"
        :value="metrics.tbt"
        :score="scoreTimingMs(metrics.tbt)"
      />
      <MetricBadge
        v-if="metrics.ttfb"
        label="TTFB"
        tooltip="Time to First Byte"
        :value="metrics.ttfb"
        :score="scoreTimingMs(metrics.ttfb)"
      />
      <MetricBadge
        v-if="metrics.domContentLoaded"
        label="DCL"
        tooltip="DOM Content Loaded"
        :value="metrics.domContentLoaded"
        :score="scoreTimingMs(metrics.domContentLoaded)"
      />
      <MetricBadge
        v-if="metrics.loadComplete"
        label="Load"
        tooltip="Load Complete"
        :value="metrics.loadComplete"
        :score="scoreTimingMs(metrics.loadComplete)"
      />
    </div>

    <!-- Score Details -->
    <div v-if="showDetails" class="border-t border-gray-200 pt-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
      <div class="space-y-3">
        <div
          v-for="detail in score.details"
          :key="detail.name"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div class="flex-1">
            <div class="font-medium text-gray-900">{{ detail.name }}</div>
            <div class="text-sm text-gray-600">
              Value: {{ formatMetricValue(detail.value) }}
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-600">
              Weight: {{ (detail.weight * 100).toFixed(0) }}%
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold" :class="getScoreColor(detail.score)">
                {{ Math.round(detail.score) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Metrics Explanation -->
    <div class="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <h4 class="font-semibold text-blue-900 mb-2">Understanding the Metrics</h4>
      <ul class="text-sm text-blue-800 space-y-1">
        <li><strong>FCP:</strong> When the first content appears on screen</li>
        <li><strong>LCP:</strong> When the largest content element becomes visible</li>
        <li><strong>TBT:</strong> Total time the main thread was blocked</li>
        <li><strong>TTFB:</strong> Time to receive the first byte from the server</li>
        <li><strong>DCL:</strong> When the HTML document is fully loaded and parsed</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PerformanceMetrics, PerformanceScore } from '~/types/performance';
import { scoreTimingMs, getScoreColor } from '~/utils/scoreCalculator';

const props = defineProps<{
  metrics: PerformanceMetrics;
  score: PerformanceScore;
}>();

const showDetails = ref(false);

function formatMetricValue(value: number): string {
  if (value > 1000000) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  } else if (value > 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  } else {
    return `${Math.round(value)} ms`;
  }
}
</script>
