<template>
  <section class="rtp" aria-label="房间模板">
    <div class="rtp-head">
      <span class="rtp-title">📐 房间模板</span>
      <span class="rtp-sub">模板 · 布局 · 场景</span>
    </div>

    <div class="rtp-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="rtp-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 模板 -->
    <template v-if="tab === 'template'">
      <div class="rtp-stats">
        <div class="rtp-stat">
          <span class="rtp-stat-value">{{ stats.total }}</span>
          <span class="rtp-stat-label">总模板</span>
        </div>
        <div class="rtp-stat">
          <span class="rtp-stat-value">{{ stats.builtIn }}</span>
          <span class="rtp-stat-label">内置</span>
        </div>
        <div class="rtp-stat">
          <span class="rtp-stat-value">{{ stats.custom }}</span>
          <span class="rtp-stat-label">自定义</span>
        </div>
        <div class="rtp-stat">
          <span class="rtp-stat-value">{{ stats.totalUses }}</span>
          <span class="rtp-stat-label">总使用</span>
        </div>
      </div>

      <div class="rtp-actions">
        <input v-model="query" class="rtp-input rtp-input--grow" placeholder="搜索模板…" />
        <button class="rtp-btn" @click="openCreate">新建模板</button>
      </div>

      <div v-if="filteredTemplates.length" class="rtp-list">
        <div v-for="t in filteredTemplates" :key="t.id" class="rtp-tpl" :class="{ active: t.id === activeTemplateId }">
          <div class="rtp-tpl-head">
            <span class="rtp-tpl-icon">{{ t.icon }}</span>
            <span class="rtp-tpl-name">{{ t.name }}</span>
            <span v-if="t.builtIn" class="rtp-badge rtp-badge--builtin">内置</span>
            <span v-if="t.id === activeTemplateId" class="rtp-badge rtp-badge--active">活跃</span>
          </div>
          <div class="rtp-tpl-meta">
            <span>{{ categoryLabel(t.category) }}</span>
            <span>{{ t.roomIds.length }} 房间</span>
            <span>使用 {{ t.useCount }} 次</span>
          </div>
          <div class="rtp-tpl-actions">
            <button class="rtp-btn--small" @click="applyTemplate(t.id)">应用</button>
            <button class="rtp-btn--small" @click="cloneTemplate(t)">克隆</button>
            <button class="rtp-btn--small" @click="exportOne(t)">导出</button>
            <button class="rtp-btn--small rtp-btn--danger" :disabled="t.builtIn" @click="removeTemplate(t.id)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="rtp-empty">暂无模板。新建一份试试。</p>
    </template>

    <!-- 布局 -->
    <template v-else-if="tab === 'layout'">
      <div class="rtp-actions">
        <button class="rtp-btn" @click="openCreateLayout">新建布局</button>
      </div>

      <div v-if="layouts.length" class="rtp-list">
        <div v-for="l in layouts" :key="l.layoutId" class="rtp-layout">
          <div class="rtp-layout-head">
            <span class="rtp-layout-name">{{ l.name }}</span>
            <span class="rtp-badge">{{ layoutTypeLabel(l.type) }}</span>
          </div>
          <div class="rtp-layout-meta">
            <span>{{ l.columns }} 列</span>
            <span>间距 {{ l.gap }}px</span>
            <span>{{ l.cardSize }}</span>
          </div>
          <div class="rtp-layout-actions">
            <button class="rtp-btn--small rtp-btn--danger" @click="removeLayout(l.layoutId)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="rtp-empty">暂无布局。</p>
    </template>

    <!-- 场景 -->
    <template v-else>
      <div class="rtp-actions">
        <button class="rtp-btn" @click="openCreateScene">新建场景</button>
      </div>

      <div v-if="scenes.length" class="rtp-list">
        <div v-for="s in scenes" :key="s.id" class="rtp-scene">
          <div class="rtp-scene-head">
            <span class="rtp-scene-name">{{ s.name }}</span>
            <span v-if="s.templateId" class="rtp-badge">模板</span>
          </div>
          <p v-if="s.description" class="rtp-scene-desc">{{ s.description }}</p>
          <div class="rtp-scene-actions">
            <button class="rtp-btn--small rtp-btn--danger" @click="removeScene(s.id)">删除</button>
          </div>
        </div>
      </div>
      <p v-else class="rtp-empty">暂无场景。</p>
    </template>

    <!-- 新建模板弹窗 -->
    <div v-if="showCreate" class="rtp-mask" @click.self="showCreate = false">
      <div class="rtp-modal">
        <div class="rtp-modal-head">
          <span>新建模板</span>
          <button class="rtp-x" @click="showCreate = false">✕</button>
        </div>
        <div class="rtp-form">
          <label class="rtp-field">
            <span>名称 *</span>
            <input v-model="tplForm.name" class="rtp-input" placeholder="如：晚间专注" />
          </label>
          <label class="rtp-field">
            <span>分类</span>
            <select v-model="tplForm.category" class="rtp-input">
              <option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </label>
          <label class="rtp-field">
            <span>图标</span>
            <input v-model="tplForm.icon" class="rtp-input" maxlength="4" placeholder="📦" />
          </label>
        </div>
        <div class="rtp-modal-foot">
          <button class="rtp-btn rtp-btn--ghost" @click="showCreate = false">取消</button>
          <button class="rtp-btn" :disabled="!tplForm.name.trim()" @click="createTemplateNow">保存</button>
        </div>
      </div>
    </div>

    <!-- 新建布局弹窗 -->
    <div v-if="showCreateLayout" class="rtp-mask" @click.self="showCreateLayout = false">
      <div class="rtp-modal">
        <div class="rtp-modal-head">
          <span>新建布局</span>
          <button class="rtp-x" @click="showCreateLayout = false">✕</button>
        </div>
        <div class="rtp-form">
          <label class="rtp-field">
            <span>名称 *</span>
            <input v-model="layoutForm.name" class="rtp-input" placeholder="如：三列网格" />
          </label>
          <label class="rtp-field">
            <span>类型</span>
            <select v-model="layoutForm.type" class="rtp-input">
              <option v-for="t in LAYOUT_TYPES" :key="t" :value="t">{{ layoutTypeLabel(t) }}</option>
            </select>
          </label>
          <label class="rtp-field">
            <span>列数</span>
            <input v-model.number="layoutForm.columns" class="rtp-input" type="number" min="1" max="6" />
          </label>
        </div>
        <div class="rtp-modal-foot">
          <button class="rtp-btn rtp-btn--ghost" @click="showCreateLayout = false">取消</button>
          <button class="rtp-btn" :disabled="!layoutForm.name.trim()" @click="createLayoutNow">保存</button>
        </div>
      </div>
    </div>

    <!-- 新建场景弹窗 -->
    <div v-if="showCreateScene" class="rtp-mask" @click.self="showCreateScene = false">
      <div class="rtp-modal">
        <div class="rtp-modal-head">
          <span>新建场景</span>
          <button class="rtp-x" @click="showCreateScene = false">✕</button>
        </div>
        <div class="rtp-form">
          <label class="rtp-field">
            <span>名称 *</span>
            <input v-model="sceneForm.name" class="rtp-input" placeholder="如：深夜书房" />
          </label>
          <label class="rtp-field">
            <span>描述</span>
            <input v-model="sceneForm.description" class="rtp-input" placeholder="可选" />
          </label>
        </div>
        <div class="rtp-modal-foot">
          <button class="rtp-btn rtp-btn--ghost" @click="showCreateScene = false">取消</button>
          <button class="rtp-btn" :disabled="!sceneForm.name.trim()" @click="createSceneNow">保存</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoomTemplates, CATEGORY_LABELS } from '../modules/space/room-templates'
import type { SpaceTemplate, TemplateCategory } from '../modules/space/room-templates'

const {
  layouts,
  scenes,
  activeTemplateId,
  templateStats,
  searchTemplates,
  createTemplate,
  cloneBuiltInTemplate,
  deleteTemplate,
  applyTemplate,
  createLayout,
  deleteLayout,
  createScene,
  deleteScene,
  exportTemplate,
} = useRoomTemplates()

const tab = ref<'template' | 'layout' | 'scene'>('template')
const tabs = [
  { key: 'template', label: '模板' },
  { key: 'layout', label: '布局' },
  { key: 'scene', label: '场景' },
] as const

const query = ref('')
const LAYOUT_TYPES = ['grid', 'list', 'masonry', 'timeline', 'canvas', 'custom'] as const

const stats = computed(() => templateStats.value)
const filteredTemplates = computed(() => searchTemplates(query.value))

function categoryLabel(cat: TemplateCategory): string {
  return CATEGORY_LABELS[cat] ?? cat
}

function layoutTypeLabel(t: string): string {
  const map: Record<string, string> = {
    grid: '网格', list: '列表', masonry: '瀑布流', timeline: '时间线', canvas: '画布', custom: '自定义',
  }
  return map[t] ?? t
}

// ---- 模板 ----
const showCreate = ref(false)
const tplForm = ref<{ name: string; category: TemplateCategory; icon: string }>({
  name: '', category: 'custom', icon: '📦',
})

function openCreate(): void {
  tplForm.value = { name: '', category: 'custom', icon: '📦' }
  showCreate.value = true
}

function createTemplateNow(): void {
  if (!tplForm.value.name.trim()) return
  createTemplate(tplForm.value.name.trim(), {
    category: tplForm.value.category,
    icon: tplForm.value.icon.trim() || '📦',
  })
  showCreate.value = false
}

function cloneTemplate(t: SpaceTemplate): void {
  cloneBuiltInTemplate(t.id)
}

function removeTemplate(id: string): void {
  deleteTemplate(id)
}

function exportOne(t: SpaceTemplate): void {
  exportTemplate(t.id)
}

// ---- 布局 ----
const showCreateLayout = ref(false)
const layoutForm = ref<{ name: string; type: string; columns: number }>({
  name: '', type: 'grid', columns: 3,
})

function openCreateLayout(): void {
  layoutForm.value = { name: '', type: 'grid', columns: 3 }
  showCreateLayout.value = true
}

function createLayoutNow(): void {
  if (!layoutForm.value.name.trim()) return
  createLayout(layoutForm.value.name.trim(), {
    type: layoutForm.value.type as 'grid' | 'list' | 'masonry' | 'timeline' | 'canvas' | 'custom',
    columns: layoutForm.value.columns,
  })
  showCreateLayout.value = false
}

function removeLayout(id: string): void {
  deleteLayout(id)
}

// ---- 场景 ----
const showCreateScene = ref(false)
const sceneForm = ref<{ name: string; description: string }>({ name: '', description: '' })

function openCreateScene(): void {
  sceneForm.value = { name: '', description: '' }
  showCreateScene.value = true
}

function createSceneNow(): void {
  if (!sceneForm.value.name.trim()) return
  createScene(sceneForm.value.name.trim(), {
    description: sceneForm.value.description.trim(),
  })
  showCreateScene.value = false
}

function removeScene(id: string): void {
  deleteScene(id)
}
</script>

<style scoped>
/* =============================================
   房间模板 · 心流工坊（INCR-100）
   ============================================= */

.rtp {
  position: relative;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.rtp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.rtp-title {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.7);
  letter-spacing: 2px;
}

.rtp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  letter-spacing: 1px;
}

.rtp-tabs {
  display: flex;
  gap: 4px;
  margin: 12px 0;
}

.rtp-tab {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.4);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.rtp-tab:hover {
  color: rgba(var(--accent-rgb), 0.7);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.rtp-tab.on {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

/* ---- 统计 ---- */
.rtp-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.rtp-stat {
  flex: 1;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.rtp-stat-value {
  font-size: 18px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.rtp-stat-label {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- 操作区 ---- */
.rtp-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.rtp-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text, #e8e4dc);
}

.rtp-input--grow {
  flex: 1;
  min-width: 120px;
}

.rtp-btn {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 6px;
  padding: 5px 14px;
  cursor: pointer;
}

.rtp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rtp-btn--ghost {
  background: transparent;
  color: rgba(var(--accent-rgb), 0.6);
}

.rtp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;

  min-height: 26px;
}

.rtp-btn--small:hover {
  color: rgba(var(--accent-rgb), 0.9);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.rtp-btn--small:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.rtp-btn--danger {
  color: rgba(196, 106, 90, 0.7);
  border-color: rgba(196, 106, 90, 0.2);
}

/* ---- 列表 ---- */
.rtp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rtp-tpl,
.rtp-layout,
.rtp-scene {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
}

.rtp-tpl.active {
  border-color: rgba(var(--accent-rgb), 0.35);
}

.rtp-tpl-head,
.rtp-layout-head,
.rtp-scene-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rtp-tpl-icon {
  font-size: 16px;
}

.rtp-tpl-name,
.rtp-layout-name,
.rtp-scene-name {
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.8);
}

.rtp-badge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 7px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.5);
}

.rtp-badge--builtin {
  background: rgba(138, 154, 122, 0.15);
  color: rgba(138, 154, 122, 0.8);
}

.rtp-badge--active {
  background: rgba(240, 192, 64, 0.15);
  color: rgba(240, 192, 64, 0.85);
}

.rtp-tpl-meta,
.rtp-layout-meta {
  display: flex;
  gap: 10px;
  margin: 4px 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}

.rtp-scene-desc {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}

.rtp-tpl-actions,
.rtp-layout-actions,
.rtp-scene-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.rtp-empty {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- 弹窗 ---- */
.rtp-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}

.rtp-modal {
  width: min(380px, 92vw);
  border-radius: 12px;
  padding: 16px 18px;
  background: var(--bg-deep, #1a1a1a);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
}

.rtp-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.8);
  margin-bottom: 12px;
}

.rtp-x {
  background: none;
  border: none;
  color: rgba(var(--accent-rgb), 0.5);
  cursor: pointer;
  font-size: 14px;
}

.rtp-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rtp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.55);
}

.rtp-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
</style>
