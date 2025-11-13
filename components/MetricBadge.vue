<template>
  <div class="p-4 bg-white border-2 rounded-lg hover:shadow-md transition-shadow" :class="borderColorClass">
    <div class="text-xs font-medium text-gray-500 uppercase mb-1" :title="tooltip">
      {{ label }}
    </div>
    <div class="text-2xl font-bold mb-1" :class="getScoreColor(score)">
      {{ formatValue(value) }}
    </div>
    <div class="flex items-center justify-between">
      <span class="text-xs badge" :class="getScoreBadgeClass(score)">
        Score: {{ Math.round(score) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getScoreColor, getScoreBadgeClass } from '~/utils/scoreCalculator';

const props = defineProps<{
  label: string;
  tooltip: string;
  value: number;
  score: number;
}>();

const borderColorClass = computed(() => {
  if (props.score >= 90) return 'border-green-200';
  if (props.score >= 50) return 'border-yellow-200';
  return 'border-red-200';
});

function formatValue(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}
</script>
