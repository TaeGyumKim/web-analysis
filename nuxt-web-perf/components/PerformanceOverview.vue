<template>
  <div class="card">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Performance Overview</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Overall Score -->
      <div class="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
        <div class="text-6xl font-bold mb-2" :class="getScoreColor(result.performanceScore.overall)">
          {{ result.performanceScore.overall }}
        </div>
        <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Overall Score</div>
        <div class="mt-2">
          <span class="badge" :class="getScoreBadgeClass(result.performanceScore.overall)">
            {{ getScoreLabel(result.performanceScore.overall) }}
          </span>
        </div>
      </div>

      <!-- Metrics Score -->
      <div class="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
        <div class="text-4xl font-bold mb-2" :class="getScoreColor(result.performanceScore.metrics)">
          {{ result.performanceScore.metrics }}
        </div>
        <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Metrics Score</div>
        <div class="text-xs text-gray-500 mt-1">FCP, LCP, TBT</div>
      </div>

      <!-- Network Score -->
      <div class="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
        <div class="text-4xl font-bold mb-2" :class="getScoreColor(result.performanceScore.network)">
          {{ result.performanceScore.network }}
        </div>
        <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Network Score</div>
        <div class="text-xs text-gray-500 mt-1">{{ result.networkRequests.length }} requests</div>
      </div>

      <!-- Frames Score -->
      <div class="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
        <div class="text-4xl font-bold mb-2" :class="getScoreColor(result.performanceScore.frames)">
          {{ result.performanceScore.frames }}
        </div>
        <div class="text-sm font-medium text-gray-600 uppercase tracking-wide">Frames Score</div>
        <div class="text-xs text-gray-500 mt-1">{{ result.frames.length }} frames captured</div>
      </div>
    </div>

    <!-- Analysis Info -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="font-medium text-gray-700">URL:</span>
          <span class="ml-2 text-gray-600 break-all">{{ result.url }}</span>
        </div>
        <div>
          <span class="font-medium text-gray-700">Analysis Time:</span>
          <span class="ml-2 text-gray-600">{{ formatDuration(result.runningTime) }}</span>
        </div>
        <div>
          <span class="font-medium text-gray-700">Timestamp:</span>
          <span class="ml-2 text-gray-600">{{ formatTimestamp(result.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '~/types/performance';
import { getScoreColor, getScoreBadgeClass } from '~/utils/scoreCalculator';

const props = defineProps<{
  result: AnalysisResult;
}>();

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 50) return 'Good';
  return 'Needs Improvement';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
</script>
