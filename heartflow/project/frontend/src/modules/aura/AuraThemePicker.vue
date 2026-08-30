<template>
  <div class="aura-theme-picker">
    <!-- 总开关：启用 / 关闭氛围层 -->
    <div
      class="atp-enable"
      role="switch"
      :aria-checked="enabled"
      tabindex="0"
      @click="toggleEnabled"
      @keydown.enter="toggleEnabled"
      @keydown.space.prevent="toggleEnabled"
    >
      <div class="atp-enable__info">
        <span class="atp-enable__label">启用氛围层</span>
        <span class="atp-enable__desc">{{ enabled ? '当前主题 · ' + currentName : '关闭后回到纯净界面' }}</span>
      </div>
      <button type="button" class="switch" :class="{ on: enabled }" aria-hidden="true">
        <span class="switch-knob"></span>
      </button>
    </div>

    <!-- 六类主题色卡 -->
    <div class="atp-grid">
      <button
        v-for="t in themeList"
        :key="t.id"
        type="button"
        class="atp-card"
        :class="{ 'is-active': enabled && t.id === themeId }"
        @click="pick(t.id)"
      >
        <span class="atp-card__swatch" :style="{ background: t.accent }"></span>
        <span class="atp-card__body">
          <span class="atp-card__name">{{ t.name }}</span>
          <span class="atp-card__desc">{{ t.desc }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAura } from './auraLayer'
import { THEME_META, THEME_ORDER } from './themes'
import type { AuraThemeId } from './types'

const { enabled, themeId, setEnabled, setTheme } = useAura()

const themeList = computed(() =>
  THEME_ORDER.map((id) => ({
    id,
    name: THEME_META[id].name,
    desc: THEME_META[id].description,
    accent: THEME_META[id].defaults.accent,
  })),
)

const currentName = computed(() => THEME_META[themeId.value]?.name ?? '')

function pick(id: AuraThemeId): void {
  setTheme(id)
  if (!enabled.value) setEnabled(true)
}
function toggleEnabled(): void {
  setEnabled(!enabled.value)
}
</script>

<style scoped>
/* =========================================================
   AuraThemePicker · 共享氛围主题选择器
   复用项目琥珀金设计令牌，可嵌入设置页 / 幕僚阁等任意面板。
   ========================================================= */
.aura-theme-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---- 启用总开关行 ---- */
.atp-enable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
}
.atp-enable:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.14);
}
.atp-enable__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.atp-enable__label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 240, 224, 0.9);
}
.atp-enable__desc {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}

/* ---- 主题色卡网格 ---- */
.atp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.atp-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: all 0.2s ease;
}
.atp-card:hover {
  background: rgba(var(--accent-rgb), 0.07);
  border-color: rgba(var(--accent-rgb), 0.16);
}
.atp-card.is-active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.32);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.18) inset;
}
.atp-card__swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: none;
  box-shadow: 0 0 10px currentColor;
}
.atp-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.atp-card__name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 240, 224, 0.9);
  letter-spacing: 0.5px;
}
.atp-card__desc {
  font-size: 10px;
  line-height: 1.4;
  color: rgba(var(--accent-rgb), 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- 开关（本地 scoped，不依赖外部 .switch） ---- */
.switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  flex: none;
  transition: background 0.25s ease;
}
.switch.on {
  background: var(--accent);
}
.switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.switch.on .switch-knob {
  transform: translateX(18px);
}

@media (max-width: 520px) {
  .atp-grid {
    grid-template-columns: 1fr;
  }
}
</style>
