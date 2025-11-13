<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3>커스텀 메트릭 관리</h3>
      <button class="btn btn-primary" @click="openAddDialog">
        + 새 메트릭 추가
      </button>
    </div>

    <!-- 커스텀 메트릭 목록 -->
    <div v-if="customMetrics.length === 0" style="text-align: center; padding: 40px; color: #999;">
      정의된 커스텀 메트릭이 없습니다. 새 메트릭을 추가하여 시작하세요.
    </div>

    <div v-else>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e0e0e0;">
            <th style="padding: 12px 8px; text-align: left; font-weight: 600;">이름</th>
            <th style="padding: 12px 8px; text-align: left; font-weight: 600;">타입</th>
            <th style="padding: 12px 8px; text-align: left; font-weight: 600;">설명</th>
            <th style="padding: 12px 8px; text-align: center; font-weight: 600;">상태</th>
            <th style="padding: 12px 8px; text-align: right; font-weight: 600;">작업</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="metric in customMetrics"
            :key="metric.id"
            style="border-bottom: 1px solid #e0e0e0;"
          >
            <td style="padding: 12px 8px;">
              <strong>{{ metric.name }}</strong>
            </td>
            <td style="padding: 12px 8px;">
              <span class="badge" :class="getTypeBadgeClass(metric.type)">
                {{ getTypeLabel(metric.type) }}
              </span>
            </td>
            <td style="padding: 12px 8px; color: #666;">
              {{ metric.description }}
            </td>
            <td style="padding: 12px 8px; text-align: center;">
              <button
                class="toggle-btn"
                :class="{ active: metric.enabled }"
                @click="toggleMetric(metric.id)"
              >
                {{ metric.enabled ? '활성' : '비활성' }}
              </button>
            </td>
            <td style="padding: 12px 8px; text-align: right;">
              <button class="btn-icon" @click="editMetric(metric)" title="수정">
                ✏️
              </button>
              <button class="btn-icon" @click="deleteMetric(metric.id)" title="삭제">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 메트릭 추가/편집 모달 -->
    <div v-if="showDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <h3>{{ editingMetric ? '메트릭 편집' : '새 메트릭 추가' }}</h3>

        <form @submit.prevent="saveMetric">
          <!-- 기본 정보 -->
          <div class="form-group">
            <label>메트릭 이름 *</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="예: 히어로 이미지 로딩 시간"
              required
            />
          </div>

          <div class="form-group">
            <label>설명</label>
            <textarea
              v-model="formData.description"
              class="form-input"
              placeholder="이 메트릭이 무엇을 측정하는지 설명하세요"
              rows="2"
            ></textarea>
          </div>

          <div class="form-group">
            <label>메트릭 타입 *</label>
            <select v-model="formData.type" class="form-input" required>
              <option value="user-timing">User Timing API</option>
              <option value="element-timing">Element Timing</option>
              <option value="calculated">계산된 메트릭</option>
            </select>
          </div>

          <!-- User Timing API 설정 -->
          <div v-if="formData.type === 'user-timing'" class="form-group">
            <label>Measure 이름 또는 Mark 이름 *</label>
            <input
              v-model="formData.measureName"
              type="text"
              class="form-input"
              placeholder="performance.measure() 또는 performance.mark()의 이름"
              required
            />
            <small style="color: #666; display: block; margin-top: 4px;">
              웹사이트 코드에서 performance.measure() 또는 performance.mark()로 측정한 이름을 입력하세요.
            </small>
          </div>

          <!-- Element Timing 설정 -->
          <div v-if="formData.type === 'element-timing'" class="form-group">
            <label>요소 선택자 *</label>
            <input
              v-model="formData.elementSelector"
              type="text"
              class="form-input"
              placeholder="예: .hero-image, #main-banner"
              required
            />
            <small style="color: #666; display: block; margin-top: 4px;">
              CSS 선택자를 입력하세요. 요소에 elementtiming 속성이 필요합니다.
            </small>
          </div>

          <!-- 계산된 메트릭 설정 -->
          <div v-if="formData.type === 'calculated'" class="form-group">
            <label>계산 수식 *</label>
            <input
              v-model="formData.formula"
              type="text"
              class="form-input"
              placeholder="예: lcp - fcp, networkRequests.length, totalSize"
              required
            />
            <small style="color: #666; display: block; margin-top: 4px;">
              사용 가능: lcp, fcp, tbt, cls, fid, ttfb, domContentLoaded, loadComplete, networkRequests.length, longTasks.length
            </small>
          </div>

          <div class="form-group">
            <label>단위 *</label>
            <select v-model="formData.unit" class="form-input" required>
              <option value="ms">밀리초 (ms)</option>
              <option value="s">초 (s)</option>
              <option value="score">점수</option>
              <option value="bytes">바이트</option>
              <option value="count">개수</option>
            </select>
          </div>

          <!-- 임계값 설정 -->
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px;">임계값 설정</h4>

            <div class="form-group">
              <label>양호 (Good) - 이 값 이하면 양호 *</label>
              <input
                v-model.number="formData.thresholds.good"
                type="number"
                class="form-input"
                step="any"
                required
              />
            </div>

            <div class="form-group">
              <label>개선 필요 (Needs Improvement) - 이 값 이하면 개선 필요 *</label>
              <input
                v-model.number="formData.thresholds.needsImprovement"
                type="number"
                class="form-input"
                step="any"
                required
              />
            </div>

            <div class="form-group">
              <label style="color: #666;">나쁨 (Poor) - 개선 필요 값 초과 시 자동으로 나쁨으로 분류됩니다</label>
            </div>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input
                v-model="formData.enabled"
                type="checkbox"
                style="margin-right: 8px;"
              />
              메트릭 활성화
            </label>
          </div>

          <!-- 액션 버튼 -->
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button type="button" class="btn" @click="closeDialog">취소</button>
            <button type="submit" class="btn btn-primary">저장</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CustomMetricDefinition } from '~/types/performance';

const customMetrics = ref<CustomMetricDefinition[]>([]);
const showDialog = ref(false);
const editingMetric = ref<CustomMetricDefinition | null>(null);

const formData = ref<CustomMetricDefinition>({
  id: '',
  name: '',
  description: '',
  type: 'user-timing',
  measureName: '',
  elementSelector: '',
  formula: '',
  thresholds: {
    good: 1000,
    needsImprovement: 2500,
    poor: 4000
  },
  unit: 'ms',
  enabled: true
});

// 컴포넌트 마운트 시 localStorage에서 불러오기
onMounted(() => {
  loadMetrics();
});

function loadMetrics() {
  const stored = localStorage.getItem('customMetrics');
  if (stored) {
    try {
      customMetrics.value = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load custom metrics:', e);
    }
  }
}

function saveMetrics() {
  localStorage.setItem('customMetrics', JSON.stringify(customMetrics.value));
}

function openAddDialog() {
  editingMetric.value = null;
  formData.value = {
    id: '',
    name: '',
    description: '',
    type: 'user-timing',
    measureName: '',
    elementSelector: '',
    formula: '',
    thresholds: {
      good: 1000,
      needsImprovement: 2500,
      poor: 4000
    },
    unit: 'ms',
    enabled: true
  };
  showDialog.value = true;
}

function editMetric(metric: CustomMetricDefinition) {
  editingMetric.value = metric;
  formData.value = { ...metric };
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  editingMetric.value = null;
}

function saveMetric() {
  if (editingMetric.value) {
    // 편집 모드
    const index = customMetrics.value.findIndex(m => m.id === editingMetric.value!.id);
    if (index !== -1) {
      customMetrics.value[index] = { ...formData.value };
    }
  } else {
    // 추가 모드
    const newMetric: CustomMetricDefinition = {
      ...formData.value,
      id: `custom-${Date.now()}`
    };
    customMetrics.value.push(newMetric);
  }

  saveMetrics();
  closeDialog();
}

function deleteMetric(id: string) {
  if (confirm('이 메트릭을 삭제하시겠습니까?')) {
    customMetrics.value = customMetrics.value.filter(m => m.id !== id);
    saveMetrics();
  }
}

function toggleMetric(id: string) {
  const metric = customMetrics.value.find(m => m.id === id);
  if (metric) {
    metric.enabled = !metric.enabled;
    saveMetrics();
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'user-timing': 'User Timing',
    'element-timing': 'Element Timing',
    'calculated': '계산'
  };
  return labels[type] || type;
}

function getTypeBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    'user-timing': 'badge-blue',
    'element-timing': 'badge-green',
    'calculated': 'badge-purple'
  };
  return classes[type] || '';
}

// 외부에서 메트릭 목록을 가져올 수 있도록 expose
defineExpose({
  getMetrics: () => customMetrics.value,
  loadMetrics
});
</script>

<style scoped>
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-blue {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-green {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-purple {
  background-color: #e9d5ff;
  color: #6b21a8;
}

.toggle-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
}

.toggle-btn:hover {
  opacity: 0.8;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

textarea.form-input {
  resize: vertical;
  font-family: inherit;
}
</style>
