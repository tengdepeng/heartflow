<template>
  <section class="ca-panel" aria-label="高级定制">
    <div class="ca-panel-head">
      <span class="ca-panel-title">🎨 高级定制</span>
      <span class="ca-panel-sub">主题 · 材质 · 动画 · 快照</span>
    </div>

    <!-- 当前生效 -->
    <div class="ca-block">
      <span class="ca-block-label">当前生效</span>
      <div class="ca-active-row">
        <span class="ca-active-chip" :style="{ borderColor: (activeTheme?.primaryColor ?? '#3b82f6') + '66' }">🎨 {{ activeTheme?.name ?? '未创建主题' }}</span>
        <span class="ca-active-chip">🧱 {{ activeMaterial?.name }}</span>
        <span class="ca-active-chip">✨ {{ activeAnimation?.name }}</span>
      </div>
    </div>

    <!-- 主题管理 -->
    <div class="ca-block">
      <span class="ca-block-label">主题管理 · {{ themes.length }}</span>
      <div class="ca-row">
        <input v-model="themeName" class="ca-input" placeholder="主题名称" />
        <label class="ca-toggle"><input type="checkbox" v-model="themeDark" /> 暗色</label>
        <button class="ca-btn ca-btn-primary" @click="addTheme" :disabled="!themeName.trim()">创建</button>
      </div>
      <ul v-if="themes.length" class="ca-list">
        <li v-for="t in themes" :key="t.id" class="ca-item" :class="{ active: t.id === activeThemeId }">
          <span class="ca-swatch" :style="{ background: t.primaryColor }" />
          <span class="ca-item-name">{{ t.name }}</span>
          <span class="ca-item-meta">{{ t.isDark ? '暗' : '亮' }}</span>
          <button class="ca-mini" @click="activateTheme(t.id)">启用</button>
          <button class="ca-mini" @click="removeTheme(t.id)">×</button>
        </li>
      </ul>
      <p v-else class="ca-empty">还没有主题，创建一个开始定制。</p>
    </div>

    <!-- 材质 / 动画 -->
    <div class="ca-block">
      <span class="ca-block-label">材质预设</span>
      <div class="ca-chips">
        <button
          v-for="m in MATERIAL_PRESETS"
          :key="m.id"
          class="ca-chip"
          :class="{ active: m.id === activeMaterialId }"
          @click="applyMaterial(m.id)"
        >{{ MATERIAL_TYPE_META[m.type].icon }} {{ m.name }}</button>
      </div>
      <span class="ca-block-label ca-sub-label">动画预设</span>
      <div class="ca-chips">
        <button
          v-for="a in ANIMATION_PRESETS"
          :key="a.id"
          class="ca-chip"
          :class="{ active: a.id === activeAnimationId }"
          @click="applyAnimation(a.id)"
        >✨ {{ a.name }}</button>
      </div>
    </div>

    <!-- 空间快照 -->
    <div class="ca-block">
      <span class="ca-block-label">空间快照 · {{ snapshots.length }}</span>
      <div class="ca-row">
        <input v-model="snapName" class="ca-input" placeholder="快照名称" />
        <button class="ca-btn ca-btn-primary" @click="addSnapshot" :disabled="!snapName.trim()">存档</button>
      </div>
      <ul v-if="snapshots.length" class="ca-list">
        <li v-for="s in snapshots" :key="s.id" class="ca-item">
          <span class="ca-item-name">{{ s.name }}</span>
          <span class="ca-item-meta">{{ dayOf(s.createdAt) }}</span>
          <button class="ca-mini" @click="restoreSnapshot(s.id)">恢复</button>
          <button class="ca-mini" @click="removeSnapshot(s.id)">×</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../utils/time'
import { ref, computed } from 'vue'
import {
  useCustomizationAdvanced,
  MATERIAL_PRESETS,
  ANIMATION_PRESETS,
  MATERIAL_TYPE_META,
} from '../modules/customization/customization-advanced'

/** 本地日历日（dayOf）：UTC 串切日会把凌晨记录归到前一天 */
function dayOf(iso: string): string {
  return getLocalDateKey(new Date(iso))
}

const c = useCustomizationAdvanced()

const themes = computed(() => c.themes.value)
const snapshots = computed(() => c.snapshots.value)
const activeTheme = computed(() => c.activeTheme.value)
const activeMaterial = computed(() => c.activeMaterial.value)
const activeAnimation = computed(() => c.activeAnimation.value)
const activeThemeId = computed(() => c.activeThemeId.value)
const activeMaterialId = computed(() => c.activeMaterialId.value)
const activeAnimationId = computed(() => c.activeAnimationId.value)

const themeName = ref('')
const themeDark = ref(false)
const snapName = ref('')

function addTheme() {
  if (!themeName.value.trim()) return
  c.createTheme(themeName.value.trim(), themeDark.value)
  themeName.value = ''
}
function removeTheme(id: string) {
  c.deleteTheme(id)
}
function activateTheme(id: string) {
  c.activateTheme(id)
}
function applyMaterial(id: string) {
  c.applyMaterial(id)
}
function applyAnimation(id: string) {
  c.applyAnimation(id)
}
function addSnapshot() {
  if (!snapName.value.trim()) return
  c.createSnapshot(snapName.value.trim(), '')
  snapName.value = ''
}
function removeSnapshot(id: string) {
  c.deleteSnapshot(id)
}
function restoreSnapshot(id: string) {
  c.restoreSnapshot(id)
}
</script>

<style scoped>
.ca-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.ca-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ca-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.ca-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.ca-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ca-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.ca-sub-label {
  margin-top: 8px;
}
.ca-active-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ca-active-chip {
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  font-size: 11px;
  color: rgba(240, 242, 255, 0.85);
}
.ca-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ca-input {
  flex: 1;
  min-width: 120px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.ca-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-low);
}
.ca-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.ca-btn-primary {
  background: rgba(107, 159, 196, 0.12);
  border-color: rgba(107, 159, 196, 0.3);
  color: #6b9fc4;
}
.ca-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.ca-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ca-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ca-item.active {
  border-color: rgba(107, 159, 196, 0.4);
  background: rgba(107, 159, 196, 0.06);
}
.ca-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}
.ca-item-name {
  flex: 1;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ca-item-meta {
  font-size: 10px;
  color: var(--text-low);
}
.ca-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--text-medium);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.ca-mini:hover {
  color: #c46a5a;
}
.ca-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ca-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-medium);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  min-height: 26px;
}
.ca-chip.active {
  background: rgba(107, 159, 196, 0.12);
  border-color: rgba(107, 159, 196, 0.35);
  color: #6b9fc4;
}
.ca-empty {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
  text-align: center;
}
</style>
