<template>
  <div class="card">
    <h3>Long Task 히스토그램</h3>
    <p style="font-size: 14px; color: #666; margin-top: 8px">
      메인 스레드를 50ms 이상 차단한 작업들
    </p>

    <div v-if="longTasks && longTasks.length > 0">
      <!-- Summary stats -->
      <div
        style="
          display: flex;
          gap: 24px;
          margin: 20px 0;
          padding: 16px;
          background: #f6f7f9;
          border-radius: 8px;
        "
      >
        <div>
          <div style="font-size: 12px; color: #666">총 Long Task 수</div>
          <div style="font-size: 20px; font-weight: 600; margin-top: 4px">
            {{ longTasks.length }}
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666">평균 지속시간</div>
          <div style="font-size: 20px; font-weight: 600; margin-top: 4px">
            {{ averageDuration.toFixed(0) }}ms
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666">최대 지속시간</div>
          <div style="font-size: 20px; font-weight: 600; margin-top: 4px">
            {{ maxDuration.toFixed(0) }}ms
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666">총 차단 시간</div>
          <div style="font-size: 20px; font-weight: 600; margin-top: 4px">
            {{ totalBlockingTime.toFixed(0) }}ms
          </div>
        </div>
      </div>

      <!-- Histogram -->
      <div style="margin-top: 24px">
        <div style="font-weight: 600; margin-bottom: 12px">지속시간 분포</div>
        <div
          style="
            display: flex;
            align-items: flex-end;
            gap: 4px;
            height: 200px;
            padding: 12px;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          "
        >
          <div
            v-for="(bucket, index) in histogram"
            :key="index"
            style="
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
              align-items: center;
            "
          >
            <div
              :style="{
                width: '100%',
                height: bucket.count > 0 ? `${(bucket.count / maxBucketCount) * 100}%` : '2px',
                background: getBucketColor(bucket.range),
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s'
              }"
              :title="`${bucket.range}: ${bucket.count}개 작업`"
            ></div>
            <div style="font-size: 11px; color: #999; margin-top: 6px; writing-mode: horizontal-tb">
              {{ bucket.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- Task list -->
      <div style="margin-top: 24px">
        <div style="font-weight: 600; margin-bottom: 12px">상위 Long Tasks</div>
        <table style="width: 100%; border-collapse: collapse">
          <thead>
            <tr style="border-bottom: 2px solid #e0e0e0">
              <th style="padding: 8px; text-align: left; font-weight: 600; font-size: 13px">
                시작 시간
              </th>
              <th style="padding: 8px; text-align: left; font-weight: 600; font-size: 13px">
                지속시간
              </th>
              <th style="padding: 8px; text-align: left; font-weight: 600; font-size: 13px">
                차단 시간
              </th>
              <th style="padding: 8px; text-align: left; font-weight: 600; font-size: 13px">
                이름
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(task, index) in topLongTasks"
              :key="index"
              style="border-bottom: 1px solid #e0e0e0"
            >
              <td style="padding: 8px; font-size: 13px">{{ task.startTime.toFixed(0) }}ms</td>
              <td style="padding: 8px; font-size: 13px">
                <span
                  :style="{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: getDurationColor(task.duration),
                    color: '#fff',
                    fontWeight: '500'
                  }"
                >
                  {{ task.duration.toFixed(0) }}ms
                </span>
              </td>
              <td style="padding: 8px; font-size: 13px">
                {{ Math.max(0, task.duration - 50).toFixed(0) }}ms
              </td>
              <td style="padding: 8px; font-size: 13px; color: #666">{{ task.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else style="text-align: center; padding: 40px; color: #999">
      Long Task가 감지되지 않았습니다. (50ms 이상 차단한 작업 없음)
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LongTask } from '~/types/performance';

const props = defineProps<{
  longTasks: LongTask[];
}>();

// Calculate statistics
const averageDuration = computed(() => {
  if (!props.longTasks || props.longTasks.length === 0) return 0;
  const sum = props.longTasks.reduce((acc, task) => acc + task.duration, 0);
  return sum / props.longTasks.length;
});

const maxDuration = computed(() => {
  if (!props.longTasks || props.longTasks.length === 0) return 0;
  return Math.max(...props.longTasks.map(t => t.duration));
});

const totalBlockingTime = computed(() => {
  if (!props.longTasks || props.longTasks.length === 0) return 0;
  return props.longTasks.reduce((acc, task) => acc + Math.max(0, task.duration - 50), 0);
});

// Top 10 longest tasks
const topLongTasks = computed(() => {
  if (!props.longTasks) return [];
  return [...props.longTasks].sort((a, b) => b.duration - a.duration).slice(0, 10);
});

// Create histogram buckets
const histogram = computed(() => {
  const buckets = [
    { range: '50-100ms', label: '50-100', min: 50, max: 100, count: 0 },
    { range: '100-150ms', label: '100-150', min: 100, max: 150, count: 0 },
    { range: '150-200ms', label: '150-200', min: 150, max: 200, count: 0 },
    { range: '200-300ms', label: '200-300', min: 200, max: 300, count: 0 },
    { range: '300-500ms', label: '300-500', min: 300, max: 500, count: 0 },
    { range: '500+ms', label: '500+', min: 500, max: Infinity, count: 0 }
  ];

  if (props.longTasks) {
    for (const task of props.longTasks) {
      for (const bucket of buckets) {
        if (task.duration >= bucket.min && task.duration < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }
  }

  return buckets;
});

const maxBucketCount = computed(() => {
  return Math.max(...histogram.value.map(b => b.count), 1);
});

function getBucketColor(range: string): string {
  if (range.startsWith('50-100')) return '#48d178'; // Green
  if (range.startsWith('100-150')) return '#60c989'; // Light green
  if (range.startsWith('150-200')) return '#e6b421'; // Yellow
  if (range.startsWith('200-300')) return '#e67e22'; // Orange
  if (range.startsWith('300-500')) return '#e67e22'; // Orange
  return '#e74c3c'; // Red
}

function getDurationColor(duration: number): string {
  if (duration < 100) return '#48d178'; // Green
  if (duration < 200) return '#e6b421'; // Yellow
  if (duration < 300) return '#e67e22'; // Orange
  return '#e74c3c'; // Red
}
</script>

<style scoped>
table tr:hover {
  background-color: #f6f7f9;
}
</style>
