<template>
  <div class="card">
    <h3 style="display: flex; align-items: center">
      성능 예산 설정
      <HelpTooltip
        :text="glossary.performanceBudget.description"
        :title="glossary.performanceBudget.title"
        position="right"
      />
    </h3>
    <p style="font-size: 14px; color: #666; margin-top: 8px">
      각 메트릭의 목표 값을 설정하고 실제 성능과 비교합니다
    </p>

    <!-- Budget Settings -->
    <div style="margin-top: 24px">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        "
      >
        <h4>예산 설정</h4>
        <div style="display: flex; gap: 8px">
          <button class="btn" @click="loadPreset('strict')">엄격한 기준</button>
          <button class="btn" @click="loadPreset('moderate')">보통 기준</button>
          <button class="btn" @click="loadPreset('relaxed')">여유 기준</button>
          <button class="btn btn-primary" @click="saveBudget">저장</button>
        </div>
      </div>

      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        "
      >
        <!-- FCP Budget -->
        <div class="budget-item">
          <label>FCP (First Contentful Paint)</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px">
            <input
              v-model.number="budget.fcp"
              type="number"
              min="0"
              step="100"
              style="flex: 1; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px"
            />
            <span style="font-size: 14px; color: #666">ms</span>
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">권장: ≤ 1000ms</div>
        </div>

        <!-- LCP Budget -->
        <div class="budget-item">
          <label>LCP (Largest Contentful Paint)</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px">
            <input
              v-model.number="budget.lcp"
              type="number"
              min="0"
              step="100"
              style="flex: 1; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px"
            />
            <span style="font-size: 14px; color: #666">ms</span>
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">권장: ≤ 2500ms</div>
        </div>

        <!-- TBT Budget -->
        <div class="budget-item">
          <label>TBT (Total Blocking Time)</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px">
            <input
              v-model.number="budget.tbt"
              type="number"
              min="0"
              step="50"
              style="flex: 1; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px"
            />
            <span style="font-size: 14px; color: #666">ms</span>
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">권장: ≤ 200ms</div>
        </div>

        <!-- CLS Budget -->
        <div class="budget-item">
          <label>CLS (Cumulative Layout Shift)</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px">
            <input
              v-model.number="budget.cls"
              type="number"
              min="0"
              step="0.01"
              style="flex: 1; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px"
            />
            <span style="font-size: 14px; color: #666">점수</span>
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">권장: ≤ 0.1</div>
        </div>

        <!-- Request Count Budget -->
        <div class="budget-item">
          <label>최대 요청 수</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px">
            <input
              v-model.number="budget.requestCount"
              type="number"
              min="0"
              step="10"
              style="flex: 1; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px"
            />
            <span style="font-size: 14px; color: #666">개</span>
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">권장: ≤ 50개</div>
        </div>

        <!-- Total Size Budget -->
        <div class="budget-item">
          <label>최대 전송 크기</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px">
            <input
              v-model.number="budget.totalSize"
              type="number"
              min="0"
              step="100"
              style="flex: 1; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px"
            />
            <span style="font-size: 14px; color: #666">KB</span>
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">권장: ≤ 2000KB</div>
        </div>
      </div>
    </div>

    <!-- Budget Comparison (if result is provided) -->
    <div v-if="result" style="margin-top: 32px">
      <h4>예산 대비 실제 성능</h4>

      <div style="margin-top: 16px">
        <table style="width: 100%; border-collapse: collapse">
          <thead>
            <tr style="border-bottom: 2px solid #e0e0e0">
              <th style="padding: 12px 8px; text-align: left; font-weight: 600">메트릭</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">예산</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">실제</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">상태</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600">차이</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in budgetComparison"
              :key="item.name"
              style="border-bottom: 1px solid #e0e0e0"
            >
              <td style="padding: 8px; font-weight: 600">{{ item.name }}</td>
              <td style="padding: 8px; text-align: center">{{ item.budgetValue }}</td>
              <td style="padding: 8px; text-align: center">{{ item.actualValue }}</td>
              <td style="padding: 8px; text-align: center">
                <span
                  :style="{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    background: item.isWithinBudget ? '#48d178' : '#e67e22',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '12px'
                  }"
                >
                  {{ item.isWithinBudget ? '✓ 통과' : '✗ 초과' }}
                </span>
              </td>
              <td style="padding: 8px; text-align: center">
                <span
                  :style="{ color: item.isWithinBudget ? '#48d178' : '#e67e22', fontWeight: '600' }"
                >
                  {{ item.isWithinBudget ? '' : '+' }}{{ item.difference }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div
        style="
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        "
      >
        <div style="padding: 16px; background: #f6f7f9; border-radius: 8px">
          <div style="font-size: 12px; color: #666">총 메트릭 수</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px">
            {{ budgetComparison.length }}
          </div>
        </div>
        <div style="padding: 16px; background: #e8f5e9; border-radius: 8px">
          <div style="font-size: 12px; color: #666">통과한 메트릭</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px; color: #48d178">
            {{ passedCount }}
          </div>
        </div>
        <div style="padding: 16px; background: #fff3e0; border-radius: 8px">
          <div style="font-size: 12px; color: #666">초과한 메트릭</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px; color: #e67e22">
            {{ failedCount }}
          </div>
        </div>
        <div style="padding: 16px; background: #f3e5f5; border-radius: 8px">
          <div style="font-size: 12px; color: #666">통과율</div>
          <div style="font-size: 24px; font-weight: 600; margin-top: 4px; color: #9c27b0">
            {{ ((passedCount / budgetComparison.length) * 100).toFixed(0) }}%
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div
        v-if="failedCount > 0"
        style="
          margin-top: 24px;
          padding: 16px;
          background: #fff3e0;
          border-left: 4px solid #e67e22;
          border-radius: 8px;
        "
      >
        <h4 style="margin-bottom: 12px">⚠️ 개선 권장 사항</h4>
        <ul style="margin: 0; padding-left: 20px">
          <li v-for="rec in recommendations" :key="rec" style="margin-bottom: 8px">{{ rec }}</li>
        </ul>
      </div>
    </div>

    <div
      v-else
      style="
        margin-top: 24px;
        text-align: center;
        padding: 40px;
        background: #f6f7f9;
        border-radius: 8px;
        color: #999;
      "
    >
      분석 결과가 있을 때 예산 대비 실제 성능을 비교할 수 있습니다
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '~/types/performance';
import { glossary } from '~/utils/glossary';

const props = defineProps<{
  result?: AnalysisResult | null;
}>();

interface PerformanceBudget {
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  requestCount: number;
  totalSize: number; // in KB
}

const budget = ref<PerformanceBudget>({
  fcp: 1000,
  lcp: 2500,
  tbt: 200,
  cls: 0.1,
  requestCount: 50,
  totalSize: 2000
});

const STORAGE_KEY = 'performance-budget';

// Load budget from localStorage on mount
onMounted(() => {
  loadBudget();
});

function loadBudget() {
  if (typeof window === 'undefined') return;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      budget.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load budget:', error);
  }
}

function saveBudget() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget.value));
    alert('성능 예산이 저장되었습니다');
  } catch (error) {
    console.error('Failed to save budget:', error);
    alert('저장 중 오류가 발생했습니다');
  }
}

function loadPreset(type: 'strict' | 'moderate' | 'relaxed') {
  const presets: Record<string, PerformanceBudget> = {
    strict: {
      fcp: 800,
      lcp: 1500,
      tbt: 150,
      cls: 0.05,
      requestCount: 30,
      totalSize: 1000
    },
    moderate: {
      fcp: 1000,
      lcp: 2500,
      tbt: 200,
      cls: 0.1,
      requestCount: 50,
      totalSize: 2000
    },
    relaxed: {
      fcp: 2000,
      lcp: 4000,
      tbt: 500,
      cls: 0.25,
      requestCount: 100,
      totalSize: 5000
    }
  };

  budget.value = { ...presets[type] };
}

const budgetComparison = computed(() => {
  if (!props.result) return [];

  const totalSize = props.result.networkRequests.reduce((sum, req) => sum + req.size, 0) / 1024; // Convert to KB

  const comparisons = [];

  // FCP
  if (props.result.metrics.fcp !== undefined) {
    comparisons.push({
      name: 'FCP',
      budgetValue: `${budget.value.fcp}ms`,
      actualValue: `${props.result.metrics.fcp.toFixed(0)}ms`,
      isWithinBudget: props.result.metrics.fcp <= budget.value.fcp,
      difference: `${(props.result.metrics.fcp - budget.value.fcp).toFixed(0)}ms`
    });
  }

  // LCP
  if (props.result.metrics.lcp !== undefined) {
    comparisons.push({
      name: 'LCP',
      budgetValue: `${budget.value.lcp}ms`,
      actualValue: `${props.result.metrics.lcp.toFixed(0)}ms`,
      isWithinBudget: props.result.metrics.lcp <= budget.value.lcp,
      difference: `${(props.result.metrics.lcp - budget.value.lcp).toFixed(0)}ms`
    });
  }

  // TBT
  if (props.result.metrics.tbt !== undefined) {
    comparisons.push({
      name: 'TBT',
      budgetValue: `${budget.value.tbt}ms`,
      actualValue: `${props.result.metrics.tbt.toFixed(0)}ms`,
      isWithinBudget: props.result.metrics.tbt <= budget.value.tbt,
      difference: `${(props.result.metrics.tbt - budget.value.tbt).toFixed(0)}ms`
    });
  }

  // CLS
  if (props.result.metrics.cls !== undefined) {
    comparisons.push({
      name: 'CLS',
      budgetValue: budget.value.cls.toFixed(3),
      actualValue: props.result.metrics.cls.toFixed(3),
      isWithinBudget: props.result.metrics.cls <= budget.value.cls,
      difference: (props.result.metrics.cls - budget.value.cls).toFixed(3)
    });
  }

  // Request Count
  comparisons.push({
    name: '요청 수',
    budgetValue: `${budget.value.requestCount}개`,
    actualValue: `${props.result.networkRequests.length}개`,
    isWithinBudget: props.result.networkRequests.length <= budget.value.requestCount,
    difference: `${props.result.networkRequests.length - budget.value.requestCount}개`
  });

  // Total Size
  comparisons.push({
    name: '전송 크기',
    budgetValue: `${budget.value.totalSize}KB`,
    actualValue: `${totalSize.toFixed(0)}KB`,
    isWithinBudget: totalSize <= budget.value.totalSize,
    difference: `${(totalSize - budget.value.totalSize).toFixed(0)}KB`
  });

  return comparisons;
});

const passedCount = computed(() => {
  return budgetComparison.value.filter(item => item.isWithinBudget).length;
});

const failedCount = computed(() => {
  return budgetComparison.value.filter(item => !item.isWithinBudget).length;
});

const recommendations = computed(() => {
  if (!props.result) return [];

  const recs: string[] = [];

  if (props.result.metrics.fcp && props.result.metrics.fcp > budget.value.fcp) {
    recs.push('FCP 개선: 중요 리소스 사전 로딩 및 CSS 최적화를 고려하세요');
  }

  if (props.result.metrics.lcp && props.result.metrics.lcp > budget.value.lcp) {
    recs.push('LCP 개선: 이미지 최적화 및 지연 로딩을 적용하세요');
  }

  if (props.result.metrics.tbt && props.result.metrics.tbt > budget.value.tbt) {
    recs.push('TBT 개선: JavaScript 실행 시간을 줄이고 코드 분할을 적용하세요');
  }

  if (props.result.metrics.cls !== undefined && props.result.metrics.cls > budget.value.cls) {
    recs.push('CLS 개선: 이미지와 요소에 명시적 크기를 지정하세요');
  }

  const totalSize = props.result.networkRequests.reduce((sum, req) => sum + req.size, 0) / 1024;
  if (props.result.networkRequests.length > budget.value.requestCount) {
    recs.push('요청 수 감소: 리소스 번들링 및 HTTP/2 활용을 고려하세요');
  }

  if (totalSize > budget.value.totalSize) {
    recs.push('전송 크기 감소: 압축 및 최적화를 통해 리소스 크기를 줄이세요');
  }

  return recs;
});
</script>

<style scoped>
.budget-item label {
  font-weight: 600;
  font-size: 14px;
  display: block;
}

table tr:hover {
  background-color: #f9fafb;
}
</style>
