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
          <span class="toast-icon" aria-hidden="true">{{ iconMap[t.type] }}</span>
          <span class="toast-text">{{ t.text }}</span>
          <button class="toast-close" aria-label="关闭提示" @click.stop="dismiss(t.id)">×</button>
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
  /* 合规修复：原为裸 9999，数值恰等于 --z-modal，改用令牌后视觉零变化，
     同时满足宪法「禁止裸 z-index」 */
  z-index: var(--z-modal);
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
  /* 12px = --spacing-sm + --spacing-xs，用 token 表达离网值但仍在 8px 基准上 */
  padding: calc(var(--spacing-sm) + var(--spacing-xs)) var(--spacing-md);
  border-radius: var(--glass-radius-sm, 10px);
  font-size: 13px;
  line-height: 1.4;
  background-color: rgba(26, 24, 30, var(--glass-clear-a-chip));
  background-image: var(--glass-clear-sheen);
  border: 1px solid var(--glass-clear-rim);
  backdrop-filter: blur(var(--glass-blur)) saturate(1.5) brightness(1.06);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.5) brightness(1.06);
  cursor: pointer;
  pointer-events: auto;
  min-width: 200px;
  max-width: 360px;
  box-shadow: var(--glass-shadow-soft);
  color: var(--text-primary);
  /* 具名属性过渡，替代 all（all 会把 backdrop-filter 也拖进动画，代价高） */
  transition:
    transform calc(0.18s / var(--hf-animate-speed, 1)) ease,
    border-color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    background-color calc(0.18s / var(--hf-animate-speed, 1)) ease;
}
@media (hover: hover) {
  .toast-item:hover {
    transform: translateX(-2px);
  }
}

/* ---- 状态色：改由语义令牌 + color-mix 派生 ----
   原实现 success 借 --accent-cyan、error 硬编码 #c87864，脱离了
   --success/--danger 语义体系。此处统一接到语义令牌，透明档位压低以延续暖色主题的克制观感。
   不支持 color-mix 时 background 声明失效，自动回退到 .toast-item 的中性玻璃底，无硬编码兜底。 */
.toast--success {
  background-color: color-mix(in srgb, var(--success) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 26%, transparent);
  color: var(--success);
}
.toast--error {
  background-color: color-mix(in srgb, var(--danger) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger) 26%, transparent);
  color: var(--danger);
}
.toast--info {
  background-color: color-mix(in srgb, var(--accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
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

/* 关闭键：视觉 20×20，但用 ::after 把命中区扩到 28×28，
   满足 WCAG 2.2 SC 2.5.8（≥24×24）而不改变观感 */
.toast-close {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background-color calc(0.18s / var(--hf-animate-speed, 1)) ease,
    color calc(0.18s / var(--hf-animate-speed, 1)) ease;

  min-height: 24px;
  min-width: 24px;
}
.toast-close::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
}
@media (hover: hover) {
  .toast-close:hover {
    background: rgba(255, 255, 255, 0.14);
    color: var(--text-primary);
  }
}
.toast-close:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-primary),
    0 0 0 4px rgba(var(--accent-rgb), 0.6);
}

.toast-enter-active {
  animation: toast-in calc(0.3s / var(--hf-animate-speed, 1)) ease-out;
}
/* 图标回弹弹入（过冲缓动），与整条滑入错峰，更有「到达」感 */
.toast-enter-active .toast-icon {
  animation: toast-icon-pop calc(0.42s / var(--hf-animate-speed, 1)) cubic-bezier(0.34, 1.56, 0.64, 1) 0.04s;
}
@keyframes toast-icon-pop {
  from { transform: scale(0.3) rotate(-14deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}

.toast-leave-active {
  animation: toast-out calc(0.25s / var(--hf-animate-speed, 1)) ease-in forwards;
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

/* 减少动态效果：改为淡入淡出，取消横向滑动 */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    animation: none;
  }
  .toast-enter-active .toast-icon { animation: none; }
  .toast-item {
    transition: none;
  }
}
</style>
