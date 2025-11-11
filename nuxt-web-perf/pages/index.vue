<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
    <div class="max-w-7xl mx-auto">
      <header class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-3">
          Web Performance Analyzer
        </h1>
        <p class="text-lg text-gray-600">
          Analyze and understand web page loading performance
        </p>
      </header>

      <!-- URL Input Section -->
      <div class="card max-w-3xl mx-auto mb-8">
        <form @submit.prevent="startAnalysis" class="space-y-6">
          <div>
            <label for="url" class="block text-sm font-medium text-gray-700 mb-2">
              Enter URL to analyze
            </label>
            <input
              id="url"
              v-model="url"
              type="url"
              placeholder="https://example.com"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :disabled="isAnalyzing"
              required
            />
          </div>

          <!-- Options -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Network Throttling
              </label>
              <select
                v-model="options.networkThrottling"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                :disabled="isAnalyzing"
              >
                <option value="none">None</option>
                <option value="slow-3g">Slow 3G</option>
                <option value="fast-3g">Fast 3G</option>
                <option value="4g">4G</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                CPU Throttling
              </label>
              <select
                v-model="options.cpuThrottling"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                :disabled="isAnalyzing"
              >
                <option :value="1">No throttling</option>
                <option :value="2">2x slowdown</option>
                <option :value="4">4x slowdown</option>
                <option :value="6">6x slowdown</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Wait Until
              </label>
              <select
                v-model="options.waitUntil"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                :disabled="isAnalyzing"
              >
                <option value="load">Load Event</option>
                <option value="domcontentloaded">DOM Content Loaded</option>
                <option value="networkidle0">Network Idle (0)</option>
                <option value="networkidle2">Network Idle (2)</option>
              </select>
            </div>
          </div>

          <div class="flex items-center">
            <input
              id="screenshots"
              v-model="options.captureScreenshots"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              :disabled="isAnalyzing"
            />
            <label for="screenshots" class="ml-2 block text-sm text-gray-700">
              Capture screenshots during loading
            </label>
          </div>

          <button
            type="submit"
            class="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isAnalyzing || !url"
          >
            <span v-if="!isAnalyzing">Start Analysis</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </span>
          </button>
        </form>

        <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-800 text-sm">{{ error }}</p>
        </div>

        <div v-if="isAnalyzing" class="mt-6">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" :style="{ width: `${progress}%` }"></div>
          </div>
          <p class="text-sm text-gray-600 mt-2 text-center">{{ statusMessage }}</p>
        </div>
      </div>

      <!-- Results Section -->
      <div v-if="analysisResult" class="space-y-6">
        <PerformanceOverview :result="analysisResult" />
        <MetricsCard :metrics="analysisResult.metrics" :score="analysisResult.performanceScore" />
        <NetworkWaterfall :requests="analysisResult.networkRequests" />
        <FrameTimeline v-if="analysisResult.frames.length > 0" :frames="analysisResult.frames" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult, AnalysisOptions } from '~/types/performance';

const url = ref('');
const isAnalyzing = ref(false);
const progress = ref(0);
const statusMessage = ref('');
const error = ref('');
const analysisResult = ref<AnalysisResult | null>(null);

const options = ref<AnalysisOptions>({
  captureScreenshots: true,
  networkThrottling: 'none',
  cpuThrottling: 1,
  waitUntil: 'networkidle0'
});

async function startAnalysis() {
  if (!url.value) return;

  isAnalyzing.value = true;
  progress.value = 0;
  error.value = '';
  analysisResult.value = null;

  // Simulate progress
  const progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 10;
    }
  }, 500);

  try {
    statusMessage.value = 'Initializing browser...';

    const response = await $fetch('/api/analyze', {
      method: 'POST',
      body: {
        url: url.value,
        options: options.value
      }
    });

    clearInterval(progressInterval);
    progress.value = 100;
    statusMessage.value = 'Analysis complete!';

    if (response.success) {
      analysisResult.value = response.data;

      // Scroll to results
      setTimeout(() => {
        window.scrollTo({
          top: document.querySelector('.space-y-6')?.getBoundingClientRect().top ?? 0,
          behavior: 'smooth'
        });
      }, 500);
    }

  } catch (err: any) {
    clearInterval(progressInterval);
    error.value = err.data?.message || 'Failed to analyze the page. Please try again.';
    console.error('Analysis error:', err);
  } finally {
    isAnalyzing.value = false;
    setTimeout(() => {
      progress.value = 0;
      statusMessage.value = '';
    }, 3000);
  }
}
</script>
