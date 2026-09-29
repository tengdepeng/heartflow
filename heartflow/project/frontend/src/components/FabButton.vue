<script setup lang="ts">
interface Props {
  /** 按钮文案，默认「新建」（统一 FAB 文案，消除「新建/创建/新增」混用） */
  label?: string
  /** 图标字符，默认「＋」 */
  icon?: string
  /** 停靠角，默认右下（br） */
  position?: 'br' | 'bl'
}
withDefaults(defineProps<Props>(), {
  label: '新建',
  icon: '＋',
  position: 'br',
})
const emit = defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <button
    type="button"
    class="hf-fab"
    :class="`hf-fab--${position}`"
    :aria-label="label"
    data-enter
    @click="emit('click')"
  >
    <span class="hf-fab__icon" aria-hidden="true">{{ icon }}</span>
    <span class="hf-fab__label">{{ label }}</span>
  </button>
</template>

<style scoped>
.hf-fab {
  position: fixed;
  /* P1 修复：FAB 默认贴底会与全局底部浮动导航（FloatingNavBar 双浮岛）争角、压住导航钮。
     整体抬高一个底栏高度（+64px），使其悬浮在导航之上、完全可点，不再重叠。 */
  bottom: calc(var(--spacing-xl, 24px) + 64px);
  z-index: var(--z-floating);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent), var(--amber-600));
  color: #1a1208;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-glow), 0 6px 20px rgba(0, 0, 0, 0.35);
  transition:
    transform calc(0.3s / var(--hf-animate-speed, 1)) ease,
    box-shadow calc(0.3s / var(--hf-animate-speed, 1)) ease;
}
.hf-fab--br { right: var(--spacing-xl); }
.hf-fab--bl { left: var(--spacing-xl); }
.hf-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 40px var(--accent-glow), 0 10px 28px rgba(0, 0, 0, 0.4);
}
.hf-fab__icon {
  font-size: 18px;
  line-height: 1;
}
</style>
