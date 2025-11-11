<template>
  <div style="margin: 40px;">
    <!-- 상단 제어바 -->
    <div class="topbar">
      <label>네트워크 속도:</label>
      <select v-model="networkSpeed">
        <option>3G</option>
        <option selected>4G</option>
        <option>Wi-Fi</option>
        <option>Slow 3G</option>
      </select>

      <label>장비 사양:</label>
      <select v-model="deviceSpec">
        <option selected>Desktop</option>
        <option>Mobile (High-end)</option>
        <option>Mobile (Mid-range)</option>
        <option>Mobile (Low-end)</option>
      </select>

      <label>URL:</label>
      <input type="text" v-model="url" style="width:280px;" placeholder="https://www.naver.com/" />

      <button class="btn" @click="reAnalyze">재분석</button>
      <button class="btn btn-primary" @click="startAnalysis" :disabled="isAnalyzing">
        {{ isAnalyzing ? '분석 중...' : '시작' }}
      </button>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="tabs-wrapper">
      <div
        class="tab"
        :class="{ active: activeTab === 'frame' }"
        @click="activeTab = 'frame'"
      >
        프레임 분석
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'network' }"
        @click="activeTab = 'network'"
      >
        네트워크 타임라인
      </div>
      <span class="divider">|</span>
      <div
        class="tab"
        :class="{ active: activeTab === 'loading' }"
        @click="activeTab = 'loading'"
      >
        로딩 분포
      </div>
    </div>

    <!-- 프레임 분석 탭 -->
    <div v-show="activeTab === 'frame'" style="margin-top: 20px;">
      <FrameAnalysisTab :result="analysisResult" />
    </div>

    <!-- 네트워크 타임라인 탭 -->
    <div v-show="activeTab === 'network'" style="margin-top: 20px;">
      <NetworkTimelineTab :result="analysisResult" />
    </div>

    <!-- 로딩 분포 탭 -->
    <div v-show="activeTab === 'loading'" style="margin-top: 20px;">
      <LoadingDistributionTab :result="analysisResult" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '~/types/performance';

const url = ref('https://www.naver.com/');
const networkSpeed = ref('4G');
const deviceSpec = ref('Desktop');
const activeTab = ref('frame');
const isAnalyzing = ref(false);
const analysisResult = ref<AnalysisResult | null>(null);

async function startAnalysis() {
  if (!url.value || isAnalyzing.value) return;

  isAnalyzing.value = true;

  try {
    const response = await $fetch('/api/analyze', {
      method: 'POST',
      body: {
        url: url.value,
        options: {
          captureScreenshots: true,
          networkThrottling: getNetworkThrottling(networkSpeed.value),
          cpuThrottling: getCPUThrottling(deviceSpec.value),
          waitUntil: 'networkidle0'
        }
      }
    });

    if (response.success) {
      analysisResult.value = response.data;
    }
  } catch (err: any) {
    console.error('Analysis error:', err);
    alert('분석 중 오류가 발생했습니다: ' + (err.data?.message || err.message));
  } finally {
    isAnalyzing.value = false;
  }
}

function reAnalyze() {
  if (analysisResult.value) {
    startAnalysis();
  }
}

function getNetworkThrottling(speed: string): 'none' | 'slow-3g' | 'fast-3g' | '4g' {
  const mapping: Record<string, 'none' | 'slow-3g' | 'fast-3g' | '4g'> = {
    '3G': 'fast-3g',
    '4G': '4g',
    'Wi-Fi': 'none',
    'Slow 3G': 'slow-3g'
  };
  return mapping[speed] || 'none';
}

function getCPUThrottling(device: string): number {
  const mapping: Record<string, number> = {
    'Desktop': 1,
    'Mobile (High-end)': 2,
    'Mobile (Mid-range)': 4,
    'Mobile (Low-end)': 6
  };
  return mapping[device] || 1;
}
</script>
