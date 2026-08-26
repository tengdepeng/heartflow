<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-item"
          :class="`toast--${t.type}`"
          @click="dismiss(t.id)"
        >
          <span class="toast-icon">{{ iconMap[t.type] }}</span>
          <span class="toast-text">{{ t.text }}</span>
          <button class="toast-close" @click.stop="dismiss(t.id)">×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../modules/toast'

const { toasts, dismiss } = useToast()

const iconMap: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}
</script>

<style scoped>
/* === 定位参数统一走 CSS 变量 ===
   固定定位 + padding 会叠加上偏移（fixed 相对视口，padding 是容器自身内边距），
   导致同一数值实际偏移翻倍；改为断点只改变量，避免错位。 */
.toast-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  --toast-offset-top: 20px;
  --toast-offset-right: 20px;
  top: var(--toast-offset-top);
  right: var(--toast-offset-right);
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  cursor: pointer;
  pointer-events: auto;
  min-width: 200px;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transition: all 0.25s ease;
}

.toast--success {
  background: rgba(90, 184, 160, 0.15);
  border: 1px solid rgba(90, 184, 160, 0.25);
  color: var(--accent-cyan);
}

.toast--error {
  background: rgba(200, 120, 100, 0.15);
  border: 1px solid rgba(200, 120, 100, 0.25);
  color: #c87864;
}

.toast--info {
  background: rgba(var(--accent-rgb), 0.15);
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.toast-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.toast-text {
  flex: 1;
  color: var(--text-primary);
}

.toast-close {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.25s ease-in forwards;
}

@keyframes toast-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 移动端：顶栏遮挡时统一抬高顶部偏移（20px 固定值 + 原 padding 折算量） */
@media (max-width: 860px) {
  .toast-container {
    --toast-offset-top: 52px;
    --toast-offset-right: 20px;
  }
}

@media (max-width: 640px) {
  .toast-container {
    --toast-offset-top: 44px;
    --toast-offset-right: 14px;
  }
}

/* ≤375px 小微屏：Toast 宽度绑定视口，避免固定 360px 在窄屏溢出/贴边 */
@media (max-width: 374px) {
  .toast-container {
    --toast-offset-right: 10px;
    --toast-offset-left: 10px;
    max-width: calc(100vw - 20px);
  }
}
</style>