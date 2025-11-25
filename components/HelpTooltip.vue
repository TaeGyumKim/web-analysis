<template>
  <span class="help-tooltip-wrapper">
    <span class="help-icon" @mouseenter="showTooltip = true" @mouseleave="showTooltip = false">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </span>
    <transition name="fade">
      <div v-if="showTooltip" class="tooltip-content" :class="position">
        <div class="tooltip-text">
          <strong v-if="title">{{ title }}</strong>
          <p>{{ text }}</p>
        </div>
      </div>
    </transition>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  text: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}>();

const showTooltip = ref(false);
</script>

<style scoped>
.help-tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}

.help-icon {
  display: inline-flex;
  align-items: center;
  cursor: help;
  color: #6b7280;
  transition: color 0.2s;
}

.help-icon:hover {
  color: #3b82f6;
}

.help-icon svg {
  width: 16px;
  height: 16px;
}

.tooltip-content {
  position: absolute;
  z-index: 1000;
  padding: 12px;
  background: #1f2937;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  line-height: 1.5;
  min-width: 200px;
  max-width: 300px;
  pointer-events: none;
}

.tooltip-content.top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-content.bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-content.left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-content.right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-text strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #60a5fa;
}

.tooltip-text p {
  margin: 0;
  color: #e5e7eb;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
