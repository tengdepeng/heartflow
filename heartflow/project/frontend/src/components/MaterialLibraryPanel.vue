<template>
  <section class="mlp">
    <header class="mlp-header">
      <h3 class="mlp-title">
        <svg class="mlp-title-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        材质库
      </h3>
      <p class="mlp-sub">起点库共 {{ presetTotal }} 种预置材质 · 当前 {{ library.length }} 种 · 全部可拆解、可修改、可删除</p>
    </header>

    <!-- 分类筛选 -->
    <div class="mlp-filter">
      <button
        class="mlp-chip"
        :class="{ 'mlp-chip--active': activeGroup === null }"
        type="button"
        @click="selectGroup(null)"
      >
        全部
        <span class="mlp-chip-count">{{ library.length }}</span>
      </button>
      <button
        v-for="g in groupMeta"
        :key="g.key"
        class="mlp-chip"
        :class="{ 'mlp-chip--active': activeGroup === g.key }"
        type="button"
        @click="selectGroup(g.key)"
      >
        {{ g.label }}
        <span class="mlp-chip-count">{{ groupCount(g.key) }}</span>
      </button>
    </div>

    <!-- 创建材质 -->
    <div class="mlp-create">
      <div class="mlp-create-row">
        <div class="form-group">
          <label class="form-label">名称</label>
          <input
            v-model.trim="createForm.name"
            class="form-input"
            type="text"
            placeholder="材质名称"
            maxlength="20"
            @keydown.enter.prevent="handleCreate"
          />
        </div>
        <div class="form-group form-group--compact">
          <label class="form-label">分类</label>
          <select v-model="createForm.group" class="form-input">
            <option v-for="g in groupMeta" :key="g.key" :value="g.key">{{ g.label }}</option>
          </select>
        </div>
        <div class="form-group form-group--compact">
          <label class="form-label">隐喻</label>
          <select v-model="createForm.metaphor" class="form-input">
            <option v-for="m in METAPHOR_OPTIONS" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="form-group form-group--compact">
          <label class="form-label">主色</label>
          <div class="color-input-wrap">
            <input
              v-model="createForm.primary"
              class="form-input form-input--color-text"
              type="text"
              maxlength="7"
              placeholder="#b8a080"
            />
            <input
              v-model="createForm.primary"
              class="form-input form-input--color-picker"
              type="color"
            />
          </div>
        </div>
      </div>
      <div class="mlp-create-actions">
        <button
          class="mlp-btn mlp-btn--primary"
          type="button"
          :disabled="!createForm.name"
          @click="handleCreate"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 3v18M3 12h18" />
          </svg>
          创建材质
        </button>
      </div>
    </div>

    <!-- 材质网格 -->
    <div v-if="filtered.length" class="mlp-grid">
      <div
        v-for="m in filtered"
        :key="m.id"
        class="mlp-card"
        :class="{ 'mlp-card--editing': editingId === m.id }"
      >
        <span
          class="mlp-card-dot"
          :style="{ background: m.palette.primary || '#b8a080' }"
        ></span>

        <div v-if="editingId !== m.id" class="mlp-card-main">
          <span class="mlp-card-name">{{ m.name }}</span>
          <span class="mlp-card-meta">{{ metaphorLabel(m.metaphor) }} · {{ groupLabel(m.group) }}</span>
        </div>

        <div v-else class="mlp-card-edit">
          <input
            v-model="editForm.name"
            class="form-input form-input--sm"
            type="text"
            maxlength="20"
            @keydown.enter.prevent="handleSaveEdit(m.id)"
          />
          <div class="color-input-wrap">
            <input
              v-model="editForm.primary"
              class="form-input form-input--color-text form-input--sm"
              type="text"
              maxlength="7"
            />
            <input
              v-model="editForm.primary"
              class="form-input form-input--color-picker form-input--sm"
              type="color"
            />
          </div>
        </div>

        <div class="mlp-card-actions">
          <button
            v-if="editingId !== m.id"
            class="mlp-icon-btn"
            type="button"
            :aria-label="'编辑材质 ' + m.name"
            data-testid="mlp-edit"
            @click="handleStartEdit(m)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <template v-if="editingId === m.id">
            <button
              class="mlp-icon-btn mlp-icon-btn--confirm"
              type="button"
              aria-label="保存修改"
              @click="handleSaveEdit(m.id)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            <button
              class="mlp-icon-btn"
              type="button"
              aria-label="取消编辑"
              @click="handleCancelEdit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </template>
          <button
            class="mlp-icon-btn mlp-icon-btn--danger"
            type="button"
            :aria-label="'删除材质 ' + m.name"
            data-testid="mlp-delete"
            @click="handleDelete(m.id)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="mlp-empty">
      <p class="mlp-empty-text">材质库为空 · 点击上方创建新材质，或恢复出厂预置</p>
    </div>

    <!-- 恢复默认 -->
    <div class="mlp-foot">
      <button class="mlp-btn" type="button" @click="handleReset">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M1 4v6h6M23 20v-6h-6" />
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
        </svg>
        恢复出厂预置
      </button>
      <p v-if="message" class="mlp-message">{{ message }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getMaterialLibrary,
  createMaterial,
  editMaterial,
  deleteMaterial,
  type VisualMaterial,
} from '../modules/visualization/workshop'
import {
  initMaterialPresets,
  resetMaterialPresets,
  getPresetMaterialTotal,
  MATERIAL_GROUPS,
  type MaterialGroup,
} from '../modules/visualization/workshop/presets'
import type { MetaphorType } from '../modules/visualization/types'

const library = ref<VisualMaterial[]>([])
const presetTotal = getPresetMaterialTotal()
const groupMeta = MATERIAL_GROUPS

const METAPHOR_LABELS: Record<MetaphorType, string> = {
  light: '光',
  ink: '墨',
  wood: '木',
  fire: '火',
  water: '水',
  earth: '土',
  metal: '金',
  mist: '雾',
  star: '星',
  crystal: '晶',
}

const METAPHOR_OPTIONS = (Object.keys(METAPHOR_LABELS) as MetaphorType[]).map((v) => ({
  value: v,
  label: METAPHOR_LABELS[v],
}))

const activeGroup = ref<MaterialGroup | null>(null)

const createForm = reactive({
  name: '',
  group: 'glow' as MaterialGroup,
  metaphor: 'light' as MetaphorType,
  primary: '#b8a080',
})

const editingId = ref<string | null>(null)
const editForm = reactive({ name: '', primary: '' })

const message = ref('')
let messageTimer: ReturnType<typeof setTimeout> | null = null

function refresh(): void {
  library.value = getMaterialLibrary()
}

function showMessage(text: string): void {
  message.value = text
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => {
    message.value = ''
  }, 2600)
}

function selectGroup(g: MaterialGroup | null): void {
  activeGroup.value = g
}

function groupCount(g: MaterialGroup): number {
  return library.value.filter((m) => (m.group ?? null) === g).length
}

function groupLabel(g: MaterialGroup | undefined): string {
  const meta = groupMeta.find((x) => x.key === g)
  return meta ? meta.label : '未分类'
}

function metaphorLabel(t: MetaphorType): string {
  return METAPHOR_LABELS[t] ?? t
}

const filtered = computed(() => {
  if (activeGroup.value === null) return library.value
  return library.value.filter((m) => (m.group ?? null) === activeGroup.value)
})

function handleCreate(): void {
  const name = createForm.name.trim()
  if (!name) return
  createMaterial(name, {
    name,
    metaphor: createForm.metaphor,
    palette: { primary: createForm.primary },
    group: createForm.group,
  })
  createForm.name = ''
  refresh()
  showMessage(`材质「${name}」已创建`)
}

function handleStartEdit(m: VisualMaterial): void {
  editingId.value = m.id
  editForm.name = m.name
  editForm.primary = m.palette.primary ?? '#b8a080'
}

function handleSaveEdit(id: string): void {
  const name = editForm.name.trim()
  if (!name) return
  editMaterial(id, {
    name,
    palette: { primary: editForm.primary },
  })
  editingId.value = null
  refresh()
  showMessage('材质已更新')
}

function handleCancelEdit(): void {
  editingId.value = null
}

function handleDelete(id: string): void {
  deleteMaterial(id)
  if (editingId.value === id) editingId.value = null
  refresh()
  showMessage('材质已删除')
}

function handleReset(): void {
  const count = resetMaterialPresets()
  refresh()
  showMessage(`已恢复 ${count} 种出厂预置材质`)
}

onMounted(() => {
  initMaterialPresets()
  refresh()
})
</script>

<style scoped>
/* =============================================================
   Material Library Panel — 材质库
   主题沿用材质工坊 #b8a080 暖琥珀木色，mlp- 前缀
   ============================================================= */
.mlp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: var(--mw-surface, rgba(42, 36, 30, 0.4));
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
}

.mlp-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mlp-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.5px;
}

.mlp-title-icon {
  opacity: 0.7;
  flex-shrink: 0;
}

.mlp-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  padding-left: 24px;
  border-left: 2px solid rgba(184, 160, 128, 0.15);
}

/* ---- 分类筛选 ---- */
.mlp-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mlp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: transparent;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.mlp-chip:hover {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border-color: var(--mw-border-hover, rgba(184, 160, 128, 0.2));
}

.mlp-chip--active {
  background: rgba(184, 160, 128, 0.15);
  border-color: rgba(184, 160, 128, 0.3);
  color: var(--mw-accent, #b8a080);
}

.mlp-chip-count {
  font-size: 10px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

/* ---- 创建表单 ---- */
.mlp-create {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(184, 160, 128, 0.08);
}

.mlp-create-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.mlp-create .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 120px;
}

.mlp-create .form-group--compact {
  flex: 0 0 auto;
}

.form-label {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  letter-spacing: 0.5px;
}

.form-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: var(--card-bg);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
}

.form-input::placeholder {
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}

.form-input:focus {
  border-color: var(--mw-accent, #b8a080);
}

.form-input--sm {
  padding: 5px 8px;
  font-size: 12px;
}

.form-input--color-text {
  flex: 1;
  min-width: 0;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.form-input--color-picker {
  width: 32px;
  height: 32px;
  padding: 2px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.form-input--color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.form-input--color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.color-input-wrap {
  display: flex;
  gap: 6px;
  align-items: center;
}

.mlp-create-actions {
  display: flex;
  justify-content: flex-end;
}

/* ---- 材质网格 ---- */
.mlp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mlp-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--mw-surface);
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
  transition: all 0.25s ease;
}

.mlp-card:hover {
  border-color: var(--mw-border-hover, rgba(184, 160, 128, 0.2));
}

.mlp-card--editing {
  border-color: rgba(184, 160, 128, 0.3);
  background: rgba(184, 160, 128, 0.06);
}

.mlp-card-dot {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.mlp-card-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.mlp-card-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mlp-card-meta {
  font-size: 10px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  letter-spacing: 0.3px;
}

.mlp-card-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.mlp-card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.mlp-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  cursor: pointer;
  transition: all 0.2s ease;
}

.mlp-icon-btn:hover {
  color: var(--text-primary, #e8e0d8);
  background: rgba(184, 160, 128, 0.1);
  border-color: var(--mw-border-hover, rgba(184, 160, 128, 0.2));
}

.mlp-icon-btn--confirm:hover {
  color: var(--success-light, #6aba7a);
}

.mlp-icon-btn--danger:hover {
  color: var(--danger, #ff6b6b);
  background: rgba(212, 106, 106, 0.08);
  border-color: rgba(212, 106, 106, 0.2);
}

/* ---- 空状态 ---- */
.mlp-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  border-radius: 12px;
  border: 1px dashed var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: rgba(var(--bg-card-rgb), 0.2);
}

.mlp-empty-text {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
}

/* ---- 底部 ---- */
.mlp-foot {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mlp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: var(--mw-surface, rgba(42, 36, 30, 0.4));
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
}

.mlp-btn:hover {
  background: var(--mw-surface-hover, rgba(55, 48, 40, 0.5));
  border-color: var(--mw-border-hover, rgba(184, 160, 128, 0.2));
  color: var(--text-primary, #e8e0d8);
}

.mlp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mlp-btn--primary {
  background: rgba(184, 160, 128, 0.15);
  border-color: rgba(184, 160, 128, 0.2);
  color: var(--mw-accent, #b8a080);
}

.mlp-btn--primary:hover:not(:disabled) {
  background: rgba(184, 160, 128, 0.25);
  border-color: rgba(184, 160, 128, 0.35);
}

.mlp-message {
  margin: 0;
  font-size: 12px;
  color: var(--success-light, #6aba7a);
  animation: mlp-fade-in 0.3s ease;
}

@keyframes mlp-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  .mlp-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .mlp {
    padding: 14px;
  }

  .mlp-grid {
    grid-template-columns: 1fr;
  }

  .mlp-create-row {
    flex-direction: column;
    align-items: stretch;
  }

  .mlp-create .form-group--compact {
    flex: 1;
  }

  .mlp-create-actions .mlp-btn {
    width: 100%;
    justify-content: center;
  }

  .mlp-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .mlp-foot .mlp-btn {
    justify-content: center;
  }
}
</style>
