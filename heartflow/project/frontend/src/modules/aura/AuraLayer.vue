<template>
  <div class="aura-layer" :class="{ 'aura-layer--active': enabled }">
    <!-- 氛围视觉：仅启用时渲染（pointer-events 由 .aura-layer 透传为 none） -->
    <Transition name="aura-fade">
      <component
        :is="themeComponent"
        v-if="enabled"
        :accent="resolved.accent"
        :density="resolved.density"
        :speed="resolved.speed"
        :show-clock="resolved.showClock"
        :show-quote="resolved.showQuote"
      />
    </Transition>

    <!-- 常驻控制簇（pointer-events:auto，用户唯一入口；沉浸模式随 chrome 淡出） -->
    <div class="aura-control" :class="{ 'aura-control--open': paletteOpen }">
      <button
        class="aura-control__toggle"
        title="氛围主题"
        aria-label="氛围主题"
        @click="onToggle"
      >
        <span class="aura-control__dot" :style="{ background: resolved.accent }"></span>
      </button>

      <Transition name="aura-palette">
        <div v-if="paletteOpen" class="aura-palette" role="menu">
          <div class="aura-palette__title">氛围主题</div>
          <button
            v-for="t in themeList"
            :key="t.id"
            class="aura-palette__item"
            :class="{ 'is-active': t.id === themeId }"
            role="menuitem"
            @click="onPick(t.id)"
          >
            <span class="aura-palette__swatch" :style="{ background: THEME_META[t.id].defaults.accent }"></span>
            <span class="aura-palette__name">{{ t.name }}</span>
          </button>
          <button v-if="enabled" class="aura-palette__disable" role="menuitem" @click="onDisable">关闭氛围层</button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAura } from './auraLayer'
import { THEME_META, THEME_ORDER, THEME_COMPONENTS } from './themes'
import type { AuraThemeId } from './types'

const { enabled, themeId, resolvedTheme, setEnabled, setTheme, detectAuraWindow } = useAura()

const resolved = resolvedTheme
const themeComponent = computed(() => THEME_COMPONENTS[themeId.value])
const themeList = THEME_ORDER.map((id) => ({ id, name: THEME_META[id].name }))

const paletteOpen = ref(false)

function onToggle(): void {
  paletteOpen.value = !paletteOpen.value
}
function onPick(id: AuraThemeId): void {
  setTheme(id)
  setEnabled(true)
  paletteOpen.value = false
}
function onDisable(): void {
  setEnabled(false)
  paletteOpen.value = false
}

onMounted(() => {
  detectAuraWindow()
})
</script>

<style scoped>
.aura-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-aura, 1500);
  pointer-events: none;       /* 视觉层穿透：不挡任何操作 */
  overflow: hidden;
}

.aura-fade-enter-active,
.aura-fade-leave-active {
  transition: opacity 0.6s ease;
}
.aura-fade-enter-from,
.aura-fade-leave-to {
  opacity: 0;
}

/* ---- 常驻控制簇（唯一可交互入口） ---- */
.aura-control {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: calc(var(--z-aura, 1500) + 1);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.aura-control__toggle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(20, 16, 11, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.38;
  transition: opacity 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
}
.aura-control:hover .aura-control__toggle,
.aura-control--open .aura-control__toggle {
  opacity: 1;
}
.aura-control__toggle:hover {
  transform: scale(1.06);
  border-color: rgba(var(--accent-rgb), 0.4);
}
.aura-control__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

/* ---- 主题选择面板 ---- */
.aura-palette {
  pointer-events: auto;
  width: 172px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(20, 16, 11, 0.74);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.42);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.aura-palette__title {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 2px;
  margin-bottom: 4px;
  padding-left: 4px;
}
.aura-palette__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 9px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all 0.18s ease;
}
.aura-palette__item:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--text-primary);
}
.aura-palette__item.is-active {
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--text-primary);
}
.aura-palette__swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}
.aura-palette__name {
  letter-spacing: 1px;
}
.aura-palette__disable {
  margin-top: 4px;
  padding: 7px 8px;
  border-radius: 9px;
  background: transparent;
  border: none;
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
  cursor: pointer;
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 1px;
  transition: all 0.18s ease;
}
.aura-palette__disable:hover {
  color: var(--text-primary);
  background: rgba(var(--accent-rgb), 0.06);
}

.aura-palette-enter-active,
.aura-palette-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.aura-palette-enter-from,
.aura-palette-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
