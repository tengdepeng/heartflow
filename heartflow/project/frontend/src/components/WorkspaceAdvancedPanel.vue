<template>
  <section class="wa-panel" aria-label="布局与快照">
    <div class="wa-panel-head">
      <span class="wa-panel-title">📐 布局与快照</span>
      <span class="wa-panel-sub">布局模板 · 深度主题 · 快照对比</span>
    </div>

    <!-- 布局模板 -->
    <div class="wa-block">
      <span class="wa-block-label">布局模板 · {{ templates.length }}</span>
      <div class="wa-chips">
        <button
          v-for="t in templates"
          :key="t.id"
          class="wa-chip"
          :class="{ active: t.id === activeTemplate?.id }"
          @click="activateTemplate(t.id)"
        >{{ t.icon }} {{ t.name }}</button>
      </div>
    </div>

    <!-- 深度主题 -->
    <div class="wa-block">
      <span class="wa-block-label">深度主题 · {{ themes.length }}</span>
      <div class="wa-row">
        <input v-model="themeName" class="wa-input" placeholder="主题名称" />
        <select v-model="paletteKey" class="wa-select">
          <option v-for="key in Object.keys(PRESET_PALETTES)" :key="key" :value="key">{{ paletteLabel(key) }}</option>
        </select>
        <button class="wa-btn wa-btn-primary" @click="addTheme" :disabled="!themeName.trim()">创建</button>
      </div>
      <ul v-if="themes.length" class="wa-list">
        <li v-for="t in themes" :key="t.id" class="wa-item" :class="{ active: t.active }">
          <span class="wa-swatch" :style="{ background: t.palette.primary }" />
          <span class="wa-item-name">{{ t.name }}</span>
          <span class="wa-item-meta">{{ t.palette.primary }}</span>
          <button class="wa-mini" @click="activateTheme(t.id)">启用</button>
          <button class="wa-mini" @click="removeTheme(t.id)">×</button>
        </li>
      </ul>
    </div>

    <!-- 快照对比 -->
    <div class="wa-block">
      <span class="wa-block-label">快照对比</span>
      <div class="wa-row">
        <select v-model="snapA" class="wa-select">
          <option value="">快照 A</option>
          <option v-for="s in snapshots" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="snapB" class="wa-select">
          <option value="">快照 B</option>
          <option v-for="s in snapshots" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button class="wa-btn wa-btn-primary" @click="compare" :disabled="!snapA || !snapB || snapA === snapB">对比</button>
      </div>
      <div v-if="lastDiff" class="wa-diffs">
        <span class="wa-diff-count">{{ lastDiff.differences.length }} 处差异</span>
        <p v-for="(d, i) in lastDiff.differences" :key="i" class="wa-diff">{{ d.description }}</p>
      </div>
    </div>

    <!-- 快照管理 -->
    <div class="wa-block">
      <span class="wa-block-label">快照管理 · {{ snapshots.length }}</span>
      <div class="wa-row">
        <input v-model="snapName" class="wa-input" placeholder="快照名称" />
        <button class="wa-btn wa-btn-primary" @click="addSnapshot" :disabled="!snapName.trim()">存档</button>
      </div>
      <ul v-if="snapshots.length" class="wa-list">
        <li v-for="s in snapshots" :key="s.id" class="wa-item">
          <span class="wa-item-name">{{ s.name }}<template v-if="s.isMilestone"> 🏁</template></span>
          <span class="wa-item-meta">{{ dayOf(s.createdAt) }}</span>
          <button class="wa-mini" @click="restoreSnapshot(s.id)">恢复</button>
          <button class="wa-mini" @click="removeSnapshot(s.id)">×</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getLocalDateKey } from '../utils/time'
import { ref, computed } from 'vue'
import {
  useWorkspaceAdvanced,
  PRESET_PALETTES,
} from '../modules/customization/workspace-advanced'
import type { SnapshotComparison } from '../modules/customization/workspace-advanced'

/** 本地日历日（dayOf）：UTC 串切日会把凌晨记录归到前一天 */
function dayOf(iso: string): string {
  return getLocalDateKey(new Date(iso))
}

const w = useWorkspaceAdvanced()

const templates = computed(() => w.templates.value)
const themes = computed(() => w.themes.value)
const snapshots = computed(() => w.snapshots.value)
const activeTemplate = computed(() => w.activeTemplate.value)

const themeName = ref('')
const paletteKey = ref('ocean-depths')
const snapName = ref('')
const snapA = ref('')
const snapB = ref('')
const lastDiff = ref<SnapshotComparison | null>(null)

const PALETTE_LABELS: Record<string, string> = {
  'ocean-depths': '深海',
  'forest-canopy': '林冠',
  'sunset-warm': '暖阳',
  'minimal-mono': '极简',
}

function paletteLabel(key: string): string {
  return PALETTE_LABELS[key] ?? key
}

function addTheme() {
  if (!themeName.value.trim()) return
  w.createThemeFromPalette(themeName.value.trim(), paletteKey.value)
  themeName.value = ''
}
function removeTheme(id: string) {
  w.deleteTheme(id)
}
function activateTheme(id: string) {
  w.activateTheme(id)
}
function activateTemplate(id: string) {
  w.activateTemplate(id)
}
function addSnapshot() {
  if (!snapName.value.trim()) return
  w.createSnapshot(snapName.value.trim(), '', {}, [])
  snapName.value = ''
}
function removeSnapshot(id: string) {
  w.deleteSnapshot(id)
}
function restoreSnapshot(id: string) {
  w.restoreSnapshot(id)
}
function compare() {
  if (!snapA.value || !snapB.value || snapA.value === snapB.value) return
  lastDiff.value = w.compareSnapshots(snapA.value, snapB.value)
}
</script>

<style scoped>
.wa-panel {
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
.wa-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.wa-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.wa-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.wa-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.wa-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.wa-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wa-chip {
  padding: 5px 11px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-medium);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.wa-chip.active {
  background: rgba(107, 159, 196, 0.12);
  border-color: rgba(107, 159, 196, 0.35);
  color: #6b9fc4;
}
.wa-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.wa-input {
  flex: 1;
  min-width: 110px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.wa-select {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 11px;
  font-family: inherit;
  outline: none;
}
.wa-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.wa-btn-primary {
  background: rgba(107, 159, 196, 0.12);
  border-color: rgba(107, 159, 196, 0.3);
  color: #6b9fc4;
}
.wa-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.wa-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wa-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.wa-item.active {
  border-color: rgba(107, 159, 196, 0.4);
  background: rgba(107, 159, 196, 0.06);
}
.wa-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}
.wa-item-name {
  flex: 1;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wa-item-meta {
  font-size: 10px;
  color: var(--text-low);
  font-variant-numeric: tabular-nums;
}
.wa-mini {
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
.wa-mini:hover {
  color: #c46a5a;
}
.wa-diffs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wa-diff-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-medium);
}
.wa-diff {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.7);
  padding-left: 8px;
  border-left: 2px solid rgba(224, 122, 95, 0.4);
}
</style>
