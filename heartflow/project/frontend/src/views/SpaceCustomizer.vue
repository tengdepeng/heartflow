<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance sc">
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">&#10026;</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">自定义你的空间，让它成为你的样子</p>
    <h1 class="sc-title">空间自定义</h1>

    <!-- 当前活跃配置 -->
    <div data-enter class="sc-active" v-if="activeConfig">
      <span class="sc-active-label">当前配置</span>
      <span class="sc-active-name">{{ activeConfig.name }}</span>
      <span class="sc-active-badge">{{ activeConfig.presetId ? getPresetById(activeConfig.presetId)?.name || '自定义' : '自定义' }}</span>
    </div>

    <!-- 预置模板选择 -->
    <section data-enter class="sc-section">
      <h3 class="sc-section-title">预置模板</h3>
      <p class="sc-section-desc">选择一个模板快速开始，之后可以自定义调整</p>
      <div class="sc-preset-grid">
        <div
          v-for="preset in SPACE_PRESETS"
          :key="preset.id"
          class="sc-preset-card"
          :class="{ active: activeConfig?.presetId === preset.id }"
          role="button"
          tabindex="0"
          :aria-pressed="activeConfig?.presetId === preset.id"
          :aria-label="'应用模板 ' + preset.name"
          @click="applyPresetTemplate(preset.id)"
          @keydown.enter.prevent="applyPresetTemplate(preset.id)"
          @keydown.space.prevent="applyPresetTemplate(preset.id)"
        >
          <span class="sc-preset-icon">{{ presetIcon(preset.icon) }}</span>
          <span class="sc-preset-name">{{ preset.name }}</span>
          <span class="sc-preset-desc">{{ preset.description }}</span>
        </div>
      </div>
    </section>

    <!-- ================================================================ -->
    <!-- 维度编辑器（NEW） -->
    <!-- ================================================================ -->
    <section v-if="editingConfig" data-enter class="sc-section sc-dim-editor">
      <div class="sc-section-header">
        <h3 class="sc-section-title">编辑维度 &#8250; {{ editingConfig.name }}</h3>
        <div class="sc-dim-actions">
          <button class="sc-btn" @click="saveDimensionChanges">保存修改</button>
          <button class="sc-config-btn" @click="stopEditing">取消</button>
        </div>
      </div>
      <p class="sc-section-desc">调整当前配置的七个维度，打造属于你的空间</p>

      <div class="dim-grid">
        <!-- 1. 空间结构 -->
        <div class="dim-card" data-dim="structure">
          <div class="dim-card-header">
            <span class="dim-icon">&#9638;</span>
            <span class="dim-label">空间结构</span>
            <span class="dim-badge">{{ getDimOption('structure', 'rooms', []).length }} 房间</span>
          </div>
          <div class="dim-body">
            <div class="dim-row">
              <span class="dim-opt-label">布局</span>
              <select class="dim-select" :value="getDimOption('structure', 'layout', 'grid')" @change="setDimOption('structure', 'layout', ($event.target as HTMLSelectElement).value)">
                <option value="grid">网格</option>
                <option value="list">列表</option>
                <option value="flow">流式</option>
              </select>
            </div>
            <div class="dim-row">
              <span class="dim-opt-label">房间</span>
              <div class="dim-chips">
                <span
                  v-for="room in ALL_ROOMS"
                  :key="room.key"
                  class="dim-chip"
                  :class="{ active: getDimOption('structure', 'rooms', []).includes(room.key) }"
                  role="checkbox"
                  tabindex="0"
                  :aria-checked="getDimOption('structure', 'rooms', []).includes(room.key)"
                  :aria-label="'切换房间 ' + room.label"
                  @click="toggleRoom(room.key)"
                  @keydown.enter.prevent="toggleRoom(room.key)"
                  @keydown.space.prevent="toggleRoom(room.key)"
                >{{ room.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 功能特性 -->
        <div class="dim-card" data-dim="features">
          <div class="dim-card-header">
            <span class="dim-icon">&#9889;</span>
            <span class="dim-label">功能特性</span>
            <span class="dim-badge">{{ getDimOption('features', 'enabled', []).length }} / {{ ALL_FEATURES.length }}</span>
          </div>
          <div class="dim-body">
            <div class="dim-chips">
              <span
                v-for="feat in ALL_FEATURES"
                :key="feat.key"
                class="dim-chip"
                :class="{ active: getDimOption('features', 'enabled', []).includes(feat.key) }"
                role="checkbox"
                tabindex="0"
                :aria-checked="getDimOption('features', 'enabled', []).includes(feat.key)"
                :aria-label="'切换功能 ' + feat.label"
                @click="toggleFeature(feat.key)"
                @keydown.enter.prevent="toggleFeature(feat.key)"
                @keydown.space.prevent="toggleFeature(feat.key)"
              >{{ feat.label }}</span>
            </div>
          </div>
        </div>

        <!-- 3. 交互方式 -->
        <div class="dim-card" data-dim="interaction">
          <div class="dim-card-header">
            <span class="dim-icon">&#9997;</span>
            <span class="dim-label">交互方式</span>
            <span class="dim-badge">{{ gestureLabel(getDimOption('interaction', 'gestures', 'essential')) }}</span>
          </div>
          <div class="dim-body">
            <div class="dim-row">
              <span class="dim-opt-label">手势集</span>
              <select class="dim-select" :value="getDimOption('interaction', 'gestures', 'essential')" @change="setDimOption('interaction', 'gestures', ($event.target as HTMLSelectElement).value)">
                <option value="minimal">最少</option>
                <option value="essential">核心</option>
                <option value="full">完整</option>
              </select>
            </div>
            <div class="dim-toggles">
              <label class="dim-toggle">
                <input type="checkbox" :checked="getDimOption('interaction', 'keyboardShortcuts', true)" @change="setDimOption('interaction', 'keyboardShortcuts', ($event.target as HTMLInputElement).checked)" />
                <span>键盘快捷键</span>
              </label>
              <label class="dim-toggle">
                <input type="checkbox" :checked="getDimOption('interaction', 'hapticFeedback', false)" @change="setDimOption('interaction', 'hapticFeedback', ($event.target as HTMLInputElement).checked)" />
                <span>触觉反馈</span>
              </label>
              <label class="dim-toggle">
                <input type="checkbox" :checked="getDimOption('interaction', 'soundEnabled', true)" @change="setDimOption('interaction', 'soundEnabled', ($event.target as HTMLInputElement).checked)" />
                <span>音效</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 4. 视觉风格 -->
        <div class="dim-card" data-dim="style">
          <div class="dim-card-header">
            <span class="dim-icon">&#127912;</span>
            <span class="dim-label">视觉风格</span>
            <span class="dim-badge">{{ themeLabel(getDimOption('style', 'theme', 'dark')) }}</span>
          </div>
          <div class="dim-body">
            <div class="dim-row">
              <span class="dim-opt-label">主题</span>
              <div class="dim-theme-toggle">
                <button
                  class="dim-theme-btn"
                  :class="{ active: getDimOption('style', 'theme', 'dark') === 'dark' }"
                  @click="setDimOption('style', 'theme', 'dark')"
                >&#9790; 暗色</button>
                <button
                  class="dim-theme-btn"
                  :class="{ active: getDimOption('style', 'theme', 'dark') === 'light' }"
                  @click="setDimOption('style', 'theme', 'light')"
                >&#9788; 亮色</button>
              </div>
            </div>
            <div class="dim-row">
              <span class="dim-opt-label">风格包</span>
              <select class="dim-select" :value="getDimOption('style', 'activeStylePack', 'default-gravity')" @change="setDimOption('style', 'activeStylePack', ($event.target as HTMLSelectElement).value)">
                <option value="default-gravity">默认引力</option>
                <option value="zen">禅意</option>
              </select>
            </div>
            <div class="dim-row">
              <span class="dim-opt-label">过渡速度</span>
              <input type="range" min="150" max="800" step="50" :value="getDimOption('style', 'transitionDuration', 350)" @input="setDimOption('style', 'transitionDuration', Number(($event.target as HTMLInputElement).value))" class="dim-slider" />
              <span class="dim-slider-val">{{ getDimOption('style', 'transitionDuration', 350) }}ms</span>
            </div>
          </div>
        </div>

        <!-- 5. 数据管理 -->
        <div class="dim-card" data-dim="data">
          <div class="dim-card-header">
            <span class="dim-icon">&#128451;</span>
            <span class="dim-label">数据管理</span>
            <span class="dim-badge">{{ syncLabel(getDimOption('data', 'sync', 'local')) }}</span>
          </div>
          <div class="dim-body">
            <div class="dim-row">
              <span class="dim-opt-label">同步模式</span>
              <select class="dim-select" :value="getDimOption('data', 'sync', 'local')" @change="setDimOption('data', 'sync', ($event.target as HTMLSelectElement).value)">
                <option value="local">本地</option>
                <option value="full">全量</option>
              </select>
            </div>
            <label class="dim-toggle">
              <input type="checkbox" :checked="getDimOption('data', 'autoBackup', false)" @change="setDimOption('data', 'autoBackup', ($event.target as HTMLInputElement).checked)" />
              <span>自动备份</span>
            </label>
            <div class="dim-row">
              <span class="dim-opt-label">保留天数</span>
              <select class="dim-select" :value="getDimOption('data', 'retentionDays', 90)" @change="setDimOption('data', 'retentionDays', Number(($event.target as HTMLSelectElement).value))">
                <option :value="30">30 天</option>
                <option :value="60">60 天</option>
                <option :value="90">90 天</option>
                <option :value="180">180 天</option>
                <option :value="365">365 天</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 6. 权限配置 -->
        <div class="dim-card" data-dim="permission">
          <div class="dim-card-header">
            <span class="dim-icon">&#128737;</span>
            <span class="dim-label">权限配置</span>
            <span class="dim-badge">{{ getDimOption('permission', 'role', 'owner') }}</span>
          </div>
          <div class="dim-body">
            <div class="dim-row">
              <span class="dim-opt-label">角色</span>
              <select class="dim-select" :value="getDimOption('permission', 'role', 'owner')" @change="setDimOption('permission', 'role', ($event.target as HTMLSelectElement).value)">
                <option value="owner">拥有者</option>
              </select>
            </div>
            <label class="dim-toggle">
              <input type="checkbox" :checked="getDimOption('permission', 'multiUser', false)" @change="setDimOption('permission', 'multiUser', ($event.target as HTMLInputElement).checked)" />
              <span>多用户</span>
            </label>
            <div class="dim-row">
              <span class="dim-opt-label">访问控制</span>
              <select class="dim-select" :value="getDimOption('permission', 'accessControl', 'basic')" @change="setDimOption('permission', 'accessControl', ($event.target as HTMLSelectElement).value)">
                <option value="basic">基础</option>
                <option value="full">完整</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 7. 场景预设 -->
        <div class="dim-card" data-dim="scene">
          <div class="dim-card-header">
            <span class="dim-icon">&#127750;</span>
            <span class="dim-label">场景预设</span>
            <span class="dim-badge">{{ getDimOption('scene', 'presets', []).length }} 场景</span>
          </div>
          <div class="dim-body">
            <div class="dim-row">
              <span class="dim-opt-label">活跃场景</span>
              <select class="dim-select" :value="getDimOption('scene', 'activeScene', 'default')" @change="setDimOption('scene', 'activeScene', ($event.target as HTMLSelectElement).value)">
                <option v-for="sc in getDimOption('scene', 'presets', ['default'])" :key="sc" :value="sc">{{ sceneLabel(sc) }}</option>
              </select>
            </div>
            <div class="dim-chips">
              <span
                v-for="sc in ALL_SCENES"
                :key="sc.key"
                class="dim-chip"
                :class="{ active: getDimOption('scene', 'presets', []).includes(sc.key) }"
                role="checkbox"
                tabindex="0"
                :aria-checked="getDimOption('scene', 'presets', []).includes(sc.key)"
                :aria-label="'切换场景 ' + sc.label"
                @click="toggleScene(sc.key)"
                @keydown.enter.prevent="toggleScene(sc.key)"
                @keydown.space.prevent="toggleScene(sc.key)"
              >{{ sc.icon }} {{ sc.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 保存的配置列表 -->
    <section class="sc-section">
      <div class="sc-section-header">
        <h3 class="sc-section-title">我的配置 ({{ spaceConfigs.length }})</h3>
        <button class="sc-btn" @click="createNewConfig">+ 新建配置</button>
      </div>
      <div v-if="spaceConfigs.length === 0" class="sc-empty">
        <p>还没有保存的配置，可以从预置模板创建或新建空白配置</p>
      </div>
      <div v-else class="sc-config-list">
        <div v-for="cfg in spaceConfigs" :key="cfg.id" class="sc-config-card" :class="{ active: activeConfig?.id === cfg.id }">
          <div class="sc-config-header">
            <span class="sc-config-name">{{ cfg.name }}</span>
            <span class="sc-config-date">{{ cfg.updatedAt ? getLocalDateKey(new Date(cfg.updatedAt)) : '' }}</span>
          </div>
          <p class="sc-config-desc" v-if="cfg.description">{{ cfg.description }}</p>
          <div class="sc-config-actions">
            <button class="sc-config-btn" @click="activateConfig(cfg.id)" :disabled="activeConfig?.id === cfg.id">激活</button>
            <button class="sc-config-btn" @click="startEditing(cfg.id)" :disabled="editingConfigId === cfg.id">编辑维度</button>
            <button class="sc-config-btn" @click="duplicateConfig(cfg.id)">复制</button>
            <button class="sc-config-btn danger" @click="deleteConfig(cfg.id)">删除</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 装修档案 · 健康度/维度/最近活动（customization/customization-bridge 引擎，INCR-272 补挂载孤儿组件，薄委托化：组件自包含） -->
    <section data-enter class="sc-section">
      <RenovationArchivePanel />
    </section>

    <!-- 高级定制 -->
    <section data-enter class="sc-section">
      <h3 class="sc-section-title">高级定制</h3>
      <p class="sc-section-desc">主题、材质、动画与空间快照</p>
      <CustomizationAdvancedPanel />
    </section>

    <!-- 布局与快照 -->
    <section data-enter class="sc-section">
      <h3 class="sc-section-title">布局与快照</h3>
      <p class="sc-section-desc">布局模板、深度主题与快照对比</p>
      <WorkspaceAdvancedPanel />
    </section>

    <!-- 预览引擎 -->
    <section data-enter class="sc-section">
      <h3 class="sc-section-title">预览引擎</h3>
      <p class="sc-section-desc">撤销重做、装修历史与批量操作</p>
      <PreviewEnginePanel />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import type { DimensionConfig } from '../modules/customization/types'
import { getLocalDateKey } from '../utils/time'
import {
  SPACE_PRESETS, getPresetById,
  getSpaceConfigs, getActiveConfig, setActiveConfigId,
  createSpaceConfig, deleteSpaceConfig, duplicateSpaceConfig, updateSpaceConfig,
} from '../modules/customization/index'
import { useAppSpaceManager } from '../modules/space/app-space-manager'
import CustomizationAdvancedPanel from '../components/CustomizationAdvancedPanel.vue'
import WorkspaceAdvancedPanel from '../components/WorkspaceAdvancedPanel.vue'
import PreviewEnginePanel from '../components/PreviewEnginePanel.vue'
import RenovationArchivePanel from '../components/RenovationArchivePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const { recordActivity } = useAppSpaceManager()

// ============================================================
// 常量
// ============================================================
const ALL_ROOMS = [
  { key: 'home', label: '家' },
  { key: 'garden', label: '花园' },
  { key: 'study', label: '书房' },
  { key: 'craft', label: '工坊' },
  { key: 'relation', label: '关系' },
  { key: 'archive', label: '档案' },
  { key: 'emotion', label: '情绪' },
  { key: 'touchpoints', label: '触点' },
  { key: 'career', label: '职业' },
  { key: 'knowledge', label: '知识' },
]

const ALL_FEATURES = [
  { key: 'timer', label: '计时器' },
  { key: 'anchor', label: '锚点' },
  { key: 'carrier', label: '载体' },
  { key: 'astrolabe', label: '星盘' },
  { key: 'gesture', label: '手势' },
  { key: 'goal', label: '目标' },
  { key: 'output', label: '输出' },
  { key: 'seasonal', label: '季节' },
  { key: 'bag', label: '行囊' },
  { key: 'plugin', label: '插件' },
  { key: 'advisor', label: '顾问' },
  { key: 'automation', label: '自动化' },
  { key: 'visualization', label: '可视化' },
  { key: 'sync', label: '同步' },
]

const ALL_SCENES = [
  { key: 'default', label: '默认', icon: '&#127757;' },
  { key: 'focus', label: '专注', icon: '&#127919;' },
  { key: 'relax', label: '放松', icon: '&#127796;' },
  { key: 'night', label: '夜间', icon: '&#127769;' },
  { key: 'creative', label: '创意', icon: '&#127912;' },
  { key: 'study', label: '学习', icon: '&#128218;' },
  { key: 'social', label: '社交', icon: '&#128101;' },
  { key: 'heal', label: '疗愈', icon: '&#10084;' },
]

// ============================================================
// 响应式状态
// ============================================================
const spaceConfigs = ref(getSpaceConfigs())
const activeConfig = ref(getActiveConfig())
const editingConfigId = ref<string | null>(null)

// ============================================================
// 计算属性
// ============================================================
const editingConfig = computed(() => {
  if (!editingConfigId.value) return null
  return spaceConfigs.value.find(c => c.id === editingConfigId.value) ?? null
})

// ============================================================
// 数据刷新
// ============================================================
function refresh() {
  spaceConfigs.value = getSpaceConfigs()
  activeConfig.value = getActiveConfig()
}

// ============================================================
// 预设图标映射
// ============================================================
function presetIcon(icon: string): string {
  const map: Record<string, string> = {
    Building2: '&#127963;',
    Minimize2: '&#9883;',
    Leaf: '&#127807;',
    Palette: '&#127912;',
    BookOpen: '&#128218;',
    Users: '&#128101;',
    Compass: '&#129517;',
    Heart: '&#10084;',
  }
  return map[icon] ?? '&#9672;'
}

// ============================================================
// 配置操作
// ============================================================
function applyPresetTemplate(presetId: string) {
  const preset = getPresetById(presetId)
  if (!preset) return
  const config = createSpaceConfig({
    name: preset.name,
    description: preset.description,
    presetId: preset.id,
    dimensions: JSON.parse(JSON.stringify(preset.dimensions)),
  })
  setActiveConfigId(config.id)
  refresh()
}

function createNewConfig() {
  const name = prompt('输入配置名称：')
  if (!name) return
  const config = createSpaceConfig({ name, description: '', presetId: '', dimensions: [] })
  setActiveConfigId(config.id)
  refresh()
}

function activateConfig(id: string) {
  setActiveConfigId(id)
  refresh()
}

function duplicateConfig(id: string) {
  duplicateSpaceConfig(id)
  refresh()
}

function deleteConfig(id: string) {
  deleteSpaceConfig(id)
  if (editingConfigId.value === id) editingConfigId.value = null
  refresh()
}

// ============================================================
// 维度编辑
// ============================================================
function startEditing(id: string) {
  editingConfigId.value = id
}

function stopEditing() {
  editingConfigId.value = null
}

/** 获取指定维度的配置对象 */
function getDimension(dim: string): DimensionConfig | undefined {
  if (!editingConfig.value) return undefined
  return editingConfig.value.dimensions.find(d => d.dimension === dim)
}

/** 获取维度选项值 */
function getDimOption(dim: string, key: string, def: any): any {
  const d = getDimension(dim)
  if (!d || !d.options) return def
  return d.options[key] ?? def
}

/** 设置维度选项值 */
function setDimOption(dim: string, key: string, value: any) {
  if (!editingConfig.value) return
  const cfg = editingConfig.value
  let d = cfg.dimensions.find(dd => dd.dimension === dim)
  if (!d) {
    d = {
      dimension: dim as any,
      label: dimLabel(dim),
      icon: '',
      options: {},
    }
    cfg.dimensions.push(d)
  }
  if (!d.options) d.options = {}
  d.options[key] = value
}

/** 切换房间 */
function toggleRoom(roomKey: string) {
  const rooms: string[] = getDimOption('structure', 'rooms', [])
  const idx = rooms.indexOf(roomKey)
  if (idx >= 0) rooms.splice(idx, 1)
  else rooms.push(roomKey)
  setDimOption('structure', 'rooms', [...rooms])
}

/** 切换功能 */
function toggleFeature(featKey: string) {
  const enabled: string[] = getDimOption('features', 'enabled', [])
  const idx = enabled.indexOf(featKey)
  if (idx >= 0) enabled.splice(idx, 1)
  else enabled.push(featKey)
  setDimOption('features', 'enabled', [...enabled])
}

/** 切换场景 */
function toggleScene(sceneKey: string) {
  const presets: string[] = getDimOption('scene', 'presets', [])
  const idx = presets.indexOf(sceneKey)
  if (idx >= 0) presets.splice(idx, 1)
  else presets.push(sceneKey)
  setDimOption('scene', 'presets', [...presets])
}

/** 保存维度修改 */
function saveDimensionChanges() {
  if (!editingConfig.value) return
  const cfg = editingConfig.value
  updateSpaceConfig(cfg.id, {
    dimensions: JSON.parse(JSON.stringify(cfg.dimensions)),
  })
  recordActivity('dimension_edited', `编辑了「${cfg.name}」的维度配置`, cfg.id)
  stopEditing()
  refresh()
}

// ============================================================
// 标签映射
// ============================================================
function dimLabel(dim: string): string {
  const map: Record<string, string> = {
    structure: '空间结构', features: '功能特性', interaction: '交互方式',
    style: '视觉风格', data: '数据管理', permission: '权限配置', scene: '场景预设',
  }
  return map[dim] ?? dim
}

function gestureLabel(v: string): string {
  const map: Record<string, string> = { minimal: '最少', essential: '核心', full: '完整' }
  return map[v] ?? v
}

function themeLabel(v: string): string {
  return v === 'dark' ? '暗色' : '亮色'
}

function syncLabel(v: string): string {
  return v === 'full' ? '全量同步' : '本地存储'
}

function sceneLabel(v: string): string {
  const map: Record<string, string> = {
    default: '默认', focus: '专注', relax: '放松', night: '夜间',
    creative: '创意', study: '学习', social: '社交', heal: '疗愈',
  }
  return map[v] ?? v
}
</script>

<style scoped>
.sc {
  position: relative;
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: transparent;
}
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
.orn-line { display: block; width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent); }
.orn-diamond { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }
.header-kicker { text-align: center; font-size: 12px; color: rgba(var(--accent-rgb), 0.3); letter-spacing: 4px; margin: 0 0 6px; }
.sc-title { text-align: center; font-family: var(--font-heading-en); font-size: 28px; font-weight: 400; color: rgba(var(--accent-rgb), 0.75); letter-spacing: 6px; margin: 0 0 20px; }
.sc-active { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.08); border: 1px solid rgba(var(--accent-rgb), 0.15); margin-bottom: 20px; }
.sc-active-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); }
.sc-active-name { font-size: 14px; font-weight: 500; color: var(--accent); flex: 1; }
.sc-active-badge { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.1); color: rgba(var(--accent-rgb), 0.5); }
.sc-section { margin-bottom: 24px; }
.sc-section-title { font-size: 15px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.8); margin: 0 0 4px; }
.sc-section-desc { font-size: 12px; color: var(--text-low); margin: 0 0 12px; }
.sc-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
.sc-section-header .sc-section-title { margin: 0; }
.sc-dim-actions { display: flex; gap: 6px; align-items: center; }
.sc-preset-grid { display: flex; gap: 10px; flex-wrap: wrap; }
.sc-preset-card { flex: 1; min-width: 140px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px; border-radius: 12px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); cursor: pointer; transition: all 0.2s; }
.sc-preset-card:hover { background: rgba(55,48,40,0.6); }
.sc-preset-card.active { background: rgba(var(--accent-rgb), 0.1); border-color: rgba(var(--accent-rgb), 0.25); }
.sc-preset-icon { font-size: 28px; }
.sc-preset-name { font-size: 14px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.8); }
.sc-preset-desc { font-size: 11px; color: var(--text-low); text-align: center; line-height: 1.4; }
.sc-empty { text-align: center; padding: 40px 0; color: var(--text-faint); font-size: 14px; }
.sc-config-list { display: flex; flex-direction: column; gap: 8px; }
.sc-config-card { padding: 14px; border-radius: 10px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); transition: all 0.2s; }
.sc-config-card.active { border-color: rgba(var(--accent-rgb), 0.25); }
.sc-config-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.sc-config-name { font-size: 14px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.8); }
.sc-config-date { font-size: 11px; color: rgba(var(--text-primary-rgb), 0.25); }
.sc-config-desc { font-size: 12px; color: var(--text-low); margin: 0 0 8px; }
.sc-config-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.sc-config-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.12); background: transparent; color: var(--text-medium); font-family: inherit; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.sc-config-btn:hover { background: var(--card-bg); color: var(--text-bright); }
.sc-config-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.sc-config-btn.danger:hover { color: rgba(224,112,80,0.7); }
.sc-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.2); background: rgba(var(--accent-rgb), 0.08); color: var(--accent); font-family: inherit; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.sc-btn:hover { background: rgba(var(--accent-rgb), 0.15); }

/* ---- 维度编辑器 ---- */
.sc-dim-editor {
  padding: 20px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.dim-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dim-card {
  padding: 16px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: border-color 0.2s;
}
.dim-card:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
}
.dim-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.dim-icon {
  font-size: 16px;
  color: var(--accent);
  opacity: 0.6;
}
.dim-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
  flex: 1;
}
.dim-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.5);
}
.dim-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dim-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.dim-opt-label {
  font-size: 12px;
  color: var(--text-dim);
  min-width: 56px;
}
.dim-select {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-bright);
  font-family: inherit;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
.dim-select:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.dim-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dim-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--card-bg);
  color: var(--text-low);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;

  min-height: 26px;
}
.dim-chip:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--text-medium);
}
.dim-chip.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}
.dim-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.dim-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-medium);
}
.dim-toggle input[type="checkbox"] {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.dim-theme-toggle {
  display: flex;
  gap: 4px;
}
.dim-theme-btn {
  padding: 4px 14px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-dim);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.dim-theme-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.6);
}
.dim-theme-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}
.dim-slider {
  flex: 1;
  max-width: 160px;
  accent-color: var(--accent);
  height: 4px;
}
.dim-slider-val {
  font-size: 11px;
  color: var(--text-dim);
  min-width: 40px;
  text-align: right;
}
</style>