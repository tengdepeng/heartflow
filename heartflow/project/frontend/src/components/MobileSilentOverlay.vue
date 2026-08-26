<template>
  <!--
    移动端应用内静默覆盖（B2-EXT-3）：桌面端无原生多窗口时用 Vue 浮层替代。
    仅本地氛围光，绝不外发、不拦截交互（pointer-events:none）。
    视觉与桌面原生覆盖层（public/overlay.html）一致：形态/报点/落款/辉光强度均由
    同一套组合式偏好驱动（宪法 fail-closed 门控仍只认 sanctuaryEnabled）。
  -->
  <div
    v-if="mobileOverlayVisible"
    class="mobile-silent-overlay"
    :class="{ 'no-beacon': !showBeacon, 'no-hint': !showHint }"
    :data-form="overlayForm"
    :style="overlayStyle"
    aria-hidden="true"
  >
    <div class="glow-stage">
      <div class="ambient"></div>
      <div class="glow-ring"></div>
    </div>
    <div class="hint">{{ hintChar }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDesktopSilentOverlay, OVERLAY_FORMS } from '../modules/sanctuary'

const {
  mobileOverlayVisible,
  overlayForm,
  showBeacon,
  showHint,
  glowIntensity,
} = useDesktopSilentOverlay()

const currentDef = computed(
  () => OVERLAY_FORMS.find((f) => f.id === overlayForm.value) ?? OVERLAY_FORMS[0],
)

const hintChar = computed(() => currentDef.value.hint)

function hexToRgb(hex: string): string {
  const m = (hex || '').replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const int = parseInt(full, 16)
  if (Number.isNaN(int)) return '216,168,102'
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255].join(',')
}

// 辉光强度：0~1 用 opacity 调暗（0 即完全隐去），>1 用 brightness 提亮（上限 2）
const overlayStyle = computed(() => {
  const intensity = Math.min(2, Math.max(0, glowIntensity.value))
  return {
    '--glow-color': currentDef.value.glow,
    '--glow-rgb': hexToRgb(currentDef.value.glow),
    '--glow-intensity': String(intensity),
    '--glow-opacity': String(Math.min(1, intensity)),
  } as Record<string, string>
})
</script>

<style scoped>
.mobile-silent-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500; /* 低于 Sanctuary 视图(2000)，高于常规内容；设置卡片可盖在其上以随时关闭 */
  pointer-events: none; /* 不拦截任何交互 */
  overflow: hidden;
  /* 半透明深色底（与桌面原生覆盖层 OVERLAY_COLOR 一致） */
  background: rgba(15, 11, 8, 0.55);
  /* 尊重移动端安全区，避免被刘海/圆角/底栏裁切 */
  padding:
    env(safe-area-inset-top, 0) env(safe-area-inset-right, 0)
    env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}

.glow-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: var(--glow-opacity, 1);
  filter: brightness(var(--glow-intensity, 1));
  transition: opacity 0.6s ease, filter 0.6s ease;
}

/* 环境柔光层：居中径向光晕，与安全岛氛围呼应 */
.ambient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(var(--glow-rgb), 0.12) 0%,
    rgba(var(--glow-rgb), 0.05) 35%,
    transparent 70%
  );
  animation: mso-ambient-pulse 8s ease-in-out infinite;
}

/* 呼吸光环：缓慢明灭的余烬（silent 默认） */
.glow-ring {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
  opacity: 0.18;
  filter: blur(2px);
  animation: mso-breathe 3.2s ease-in-out infinite;
  transition: width 0.6s ease, height 0.6s ease, border-radius 0.6s ease;
}

.glow-ring::after {
  content: '';
  position: absolute;
  inset: -40%;
  border-radius: 50%;
  border: 1px solid rgba(var(--glow-rgb), 0.12);
  animation: mso-ring-rotate 24s linear infinite;
}

/* 息壤呼吸（breath）：更柔、更大的吐纳光团 */
.mobile-silent-overlay[data-form="breath"] .glow-ring {
  width: 150px;
  height: 150px;
  transform: scaleY(1.12);
  opacity: 0.15;
  animation: mso-breathe-slow 4.6s ease-in-out infinite;
}

.mobile-silent-overlay[data-form="breath"] .glow-ring::after {
  animation: mso-ring-rotate 36s linear infinite;
  border-style: dashed;
  opacity: 0.7;
}

/* 时间长廊（timeline）：横向流光长廊 */
.mobile-silent-overlay[data-form="timeline"] .glow-ring {
  width: 230px;
  height: 64px;
  border-radius: 50%;
  opacity: 0.14;
  animation: mso-corridor 5.2s ease-in-out infinite;
}

.mobile-silent-overlay[data-form="timeline"] .ambient {
  background: radial-gradient(
    ellipse 70% 45% at 50% 50%,
    rgba(var(--glow-rgb), 0.14) 0%,
    rgba(var(--glow-rgb), 0.05) 40%,
    transparent 72%
  );
  animation: mso-ambient-pulse 10s ease-in-out infinite;
}

.mobile-silent-overlay[data-form="timeline"] .glow-ring::after {
  inset: -18%;
  border-radius: 50%;
  animation: mso-ring-rotate 60s linear infinite;
}

/* 静 · 落款，极淡 */
.hint {
  position: absolute;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  left: 0;
  right: 0;
  text-align: center;
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(var(--glow-rgb), 0.35);
  pointer-events: none;
  user-select: none;
}

/* 报点显隐（B2-EXT-2）：隐藏中心呼吸光点 */
.mobile-silent-overlay.no-beacon .glow-ring {
  display: none;
}

/* 落款显隐（B2-EXT-2）：隐藏底部静/息/廊字样 */
.mobile-silent-overlay.no-hint .hint {
  display: none;
}

@keyframes mso-breathe {
  0%, 100% { transform: scale(0.82); opacity: 0.10; }
  50%      { transform: scale(1.18); opacity: 0.24; }
}

@keyframes mso-breathe-slow {
  0%, 100% { transform: scaleY(1.12) scale(0.86); opacity: 0.08; }
  50%      { transform: scaleY(1.12) scale(1.12); opacity: 0.20; }
}

@keyframes mso-corridor {
  0%, 100% { transform: scaleX(0.92) scaleY(0.9); opacity: 0.08; }
  50%      { transform: scaleX(1.08) scaleY(1.05); opacity: 0.20; }
}

@keyframes mso-ambient-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1; }
}

@keyframes mso-ring-rotate {
  to { transform: rotate(360deg); }
}
</style>
