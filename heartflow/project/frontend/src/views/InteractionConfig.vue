<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance interaction-config">
    <!-- 氛围背景 -->
    <div data-enter class="ic-ambient" aria-hidden="true">
      <div class="ic-glow ic-glow--top"></div>
      <div class="ic-glow ic-glow--bottom"></div>
    </div>

    <!-- 装饰性顶部 -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div data-enter class="header-kicker">定义空间中每一处交互的韵律</div>
    <h1 class="ic-title">交互配置</h1>

    <!-- 概览 -->
    <div class="overview-cards">
      <div class="overview-card">
        <span class="overview-num">{{ configs.length }}</span>
        <span class="overview-label">配置集</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ totalRules }}</span>
        <span class="overview-label">规则</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ activeConfigCount }}</span>
        <span class="overview-label">活跃</span>
      </div>
      <div class="overview-card">
        <span class="overview-num">{{ conflictCount }}</span>
        <span class="overview-label">冲突</span>
      </div>
    </div>

    <!-- 顶栏操作 -->
    <header data-enter class="ic-header">
      <div class="header-actions">
        <button class="ic-btn-primary" @click="openCreateConfig">+ 新建配置</button>
        <div class="header-right">
          <button class="ic-btn-ghost" @click="triggerImport">📥 导入</button>
          <button class="ic-btn-ghost" @click="exportAll">📤 导出全部</button>
        </div>
      </div>
    </header>

    <!-- 配置列表 -->
    <div class="config-list">
      <EmptyState
        v-if="configs.length === 0"
        icon="🔗"
        title="暂无交互配置"
        hint="创建你的第一个交互配置，定义空间中的手势与行为"
        :glow="false"
        cta-label=""
      />

      <!-- 配置卡片 -->
      <div
        v-for="config in configs"
        :key="config.id"
        :class="['config-card', { active: config.active }]"
      >
        <!-- 配置头部 -->
        <div class="config-header" role="button" tabindex="0" :aria-expanded="expandedConfigs.has(config.id)" :aria-label="'展开或收起配置 ' + config.name" @click="toggleExpand(config.id)" @keydown.enter.prevent="toggleExpand(config.id)" @keydown.space.prevent="toggleExpand(config.id)">
          <div class="config-info">
            <h3 class="config-name">{{ config.name }}</h3>
            <p class="config-desc" v-if="config.description">{{ config.description }}</p>
            <div class="config-meta">
              <span class="meta-badge">{{ config.rules.length }} 条规则</span>
              <span :class="['meta-badge', config.active ? 'badge-active' : 'badge-inactive']">
                {{ config.active ? '活跃' : '未激活' }}
              </span>
            </div>
          </div>
          <div class="config-actions">
            <button
              class="config-btn"
              :title="config.active ? '停用' : '激活'"
              @click.stop="toggleActive(config.id)"
            >{{ config.active ? '⏸' : '▶' }}</button>
            <button class="config-btn" title="编辑" @click.stop="openEditConfig(config)">✏</button>
            <button class="config-btn" title="导出" @click.stop="exportOne(config)">📤</button>
            <button class="config-btn config-btn-del" title="删除" @click.stop="confirmDelete(config)">🗑</button>
            <span class="expand-icon">{{ expandedConfigs.has(config.id) ? '▾' : '▸' }}</span>
          </div>
        </div>

        <!-- 展开的规则列表（抽取为 InteractionConfigBody，内部消费 BaseCard/BaseButton） -->
        <InteractionConfigBody
          v-if="expandedConfigs.has(config.id)"
          :config="config"
          @add-rule="openAddRule(config.id)"
          @edit-rule="openEditRule(config.id, $event)"
        />
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editorVisible" class="modal-overlay" @click.self="closeEditor">
          <div class="modal-card">
            <h3 class="modal-title">{{ editingConfig ? '编辑配置' : '新建配置' }}</h3>
            <div class="modal-body">
              <label class="form-group">
                <span class="form-label">配置名称</span>
                <input v-model="editForm.name" class="form-input" placeholder="输入配置名称…" />
              </label>
              <label class="form-group">
                <span class="form-label">描述</span>
                <textarea v-model="editForm.description" class="form-textarea" rows="2" placeholder="输入配置描述…"></textarea>
              </label>
            </div>
            <div class="modal-actions">
              <button class="ic-btn-cancel" @click="closeEditor">取消</button>
              <button class="ic-btn-primary" @click="saveConfig" :disabled="!editForm.name.trim()">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 规则编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="ruleEditorVisible" class="modal-overlay" @click.self="closeRuleEditor">
          <div class="modal-card modal-wide">
            <h3 class="modal-title">{{ editingRule ? '编辑规则' : '添加规则' }}</h3>
            <div class="modal-body">
              <div class="form-row">
                <label class="form-group">
                  <span class="form-label">规则名称</span>
                  <input v-model="ruleForm.name" class="form-input" placeholder="规则名称…" />
                </label>
                <label class="form-group">
                  <span class="form-label">目标元素</span>
                  <input v-model="ruleForm.target" class="form-input" placeholder="CSS选择器或元素ID…" />
                </label>
              </div>
              <div class="form-row">
                <label class="form-group">
                  <span class="form-label">交互类型</span>
                  <select v-model="ruleForm.type" class="form-select">
                    <option v-for="(label, key) in INTERACTION_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </label>
                <label class="form-group">
                  <span class="form-label">触发动作</span>
                  <select v-model="ruleForm.action" class="form-select">
                    <option v-for="(label, key) in ACTION_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </label>
                <label class="form-group">
                  <span class="form-label">优先级</span>
                  <input v-model.number="ruleForm.priority" type="range" min="0" max="100" class="setting-range" />
                  <span class="setting-val">{{ ruleForm.priority }}</span>
                </label>
              </div>
              <label class="form-group">
                <span class="form-label">适用场景（逗号分隔，* 表示全部）</span>
                <input v-model="ruleForm.scenesStr" class="form-input" placeholder="*, home, timeline…" />
              </label>
            </div>
            <div class="modal-actions">
              <button class="ic-btn-cancel" @click="closeRuleEditor">取消</button>
              <button class="ic-btn-primary" @click="saveRule" :disabled="!ruleForm.name.trim() || !ruleForm.target.trim()">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
          <div class="modal-card modal-sm">
            <p class="confirm-text">删除配置「{{ deleteTarget.name }}」？此操作不可撤销。</p>
            <div class="modal-actions">
              <button class="ic-btn-cancel" @click="deleteTarget = null">取消</button>
              <button class="ic-btn-danger" @click="doDelete">删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getLocalDateKey } from '../utils/time'
import { useViewEntrance } from '../composables/useViewEntrance'
import {
  createConfig,
  createRule,
  addRuleToConfig,
  updateRule,
  detectConflicts,
  exportConfig,
  importConfig,
  INTERACTION_LABELS,
  ACTION_LABELS,
} from '../modules/customization/interaction-engine'
import type {
  InteractionConfig,
  InteractionRule,
  InteractionType,
  InteractionAction,
} from '../modules/customization/interaction-engine'
import { useInteractionConfigs } from '../modules/interaction'
import InteractionConfigBody from '../components/interaction/InteractionConfigBody.vue'
import EmptyState from '../components/EmptyState.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const { configs, load, save } = useInteractionConfigs()
const expandedConfigs = reactive(new Set<string>())
const editorVisible = ref(false)
const editingConfig = ref<InteractionConfig | null>(null)
const deleteTarget = ref<InteractionConfig | null>(null)
const ruleEditorVisible = ref(false)
const editingRule = ref<{ configId: string; rule: InteractionRule } | null>(null)
const activeConfigId = ref<string | null>(null)

// ---- 表单 ----
const editForm = reactive({ name: '', description: '' })
const ruleForm = reactive({
  name: '',
  target: '',
  type: 'tap' as InteractionType,
  action: 'toggle' as InteractionAction,
  priority: 50,
  scenesStr: '*',
})

// ---- 加载 ----
onMounted(load)

// ---- 计算属性 ----
const totalRules = computed(() => configs.value.reduce((s, c) => s + c.rules.length, 0))
const activeConfigCount = computed(() => configs.value.filter(c => c.active).length)
const conflictCount = computed(() => {
  let count = 0
  for (const c of configs.value) {
    count += detectConflicts(c.rules).length
  }
  return count
})

// ---- 展开/折叠 ----
function toggleExpand(id: string) {
  if (expandedConfigs.has(id)) {
    expandedConfigs.delete(id)
  } else {
    expandedConfigs.add(id)
  }
}

// ---- 配置 CRUD ----
function openCreateConfig() {
  editingConfig.value = null
  editForm.name = ''
  editForm.description = ''
  editorVisible.value = true
}

function openEditConfig(config: InteractionConfig) {
  editingConfig.value = config
  editForm.name = config.name
  editForm.description = config.description
  editorVisible.value = true
}

function closeEditor() {
  editorVisible.value = false
  editingConfig.value = null
}

function saveConfig() {
  if (editingConfig.value) {
    const idx = configs.value.findIndex(c => c.id === editingConfig.value!.id)
    if (idx >= 0) {
      configs.value[idx] = {
        ...configs.value[idx],
        name: editForm.name,
        description: editForm.description,
        updatedAt: new Date().toISOString(),
      }
    }
  } else {
    const config = createConfig(editForm.name, editForm.description)
    configs.value.push(config)
  }
  save()
  closeEditor()
}

function toggleActive(id: string) {
  const config = configs.value.find(c => c.id === id)
  if (!config) return
  // 停用其他活跃配置
  if (!config.active) {
    configs.value.forEach(c => { c.active = false })
  }
  config.active = !config.active
  save()
}

function confirmDelete(config: InteractionConfig) {
  deleteTarget.value = config
}

function doDelete() {
  if (!deleteTarget.value) return
  configs.value = configs.value.filter(c => c.id !== deleteTarget.value!.id)
  save()
  deleteTarget.value = null
}

// ---- 导出/导入 ----
function exportOne(config: InteractionConfig) {
  const json = exportConfig(config)
  downloadFile(json, `${config.name}_interaction_config.json`, 'application/json')
}

function exportAll() {
  const json = JSON.stringify(configs.value.map(c => JSON.parse(exportConfig(c))), null, 2)
  downloadFile(json, `interaction_configs_all_${getLocalDateKey()}.json`, 'application/json')
}

function triggerImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importConfig(reader.result as string)
      if (result) {
        configs.value.push(result)
        save()
      } else {
        alert('导入失败：无效的配置文件格式')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---- 规则 CRUD ----
function openAddRule(configId: string) {
  editingRule.value = null
  activeConfigId.value = configId
  ruleForm.name = ''
  ruleForm.target = ''
  ruleForm.type = 'tap'
  ruleForm.action = 'toggle'
  ruleForm.priority = 50
  ruleForm.scenesStr = '*'
  ruleEditorVisible.value = true
}

function openEditRule(configId: string, rule: InteractionRule) {
  editingRule.value = { configId, rule }
  activeConfigId.value = configId
  ruleForm.name = rule.name
  ruleForm.target = rule.target
  ruleForm.type = rule.type
  ruleForm.action = rule.action
  ruleForm.priority = rule.priority
  ruleForm.scenesStr = rule.scenes.join(', ')
  ruleEditorVisible.value = true
}

function closeRuleEditor() {
  ruleEditorVisible.value = false
  editingRule.value = null
  activeConfigId.value = null
}

function saveRule() {
  const configId = editingRule.value?.configId || activeConfigId.value
  if (!configId) return

  const configIdx = configs.value.findIndex(c => c.id === configId)
  if (configIdx < 0) return
  const config = configs.value[configIdx]

  const scenes = ruleForm.scenesStr.split(',').map(s => s.trim()).filter(Boolean)

  if (editingRule.value) {
    // 编辑现有规则
    const idx = config.rules.findIndex(r => r.id === editingRule.value!.rule.id)
    if (idx >= 0) {
      config.rules[idx] = updateRule(config.rules[idx], {
        name: ruleForm.name,
        type: ruleForm.type,
        action: ruleForm.action,
        target: ruleForm.target,
        priority: ruleForm.priority,
        scenes: scenes.length > 0 ? scenes : ['*'],
      })
    }
  } else {
    // 添加新规则
    const rule = createRule(ruleForm.name, ruleForm.type, ruleForm.action, ruleForm.target, {}, ruleForm.priority, scenes.length > 0 ? scenes : ['*'])
    configs.value[configIdx] = addRuleToConfig(config, rule)
  }

  // 不可变 API 返回新对象，updatedAt 需打在数组当前元素上而非局部旧引用
  configs.value[configIdx].updatedAt = new Date().toISOString()
  save()
  closeRuleEditor()
}

</script>

<style scoped>
/* =============================================
   交互配置引擎 · 可视化配置界面
   定义空间中每一处交互的韵律
   ============================================= */

.interaction-config {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.interaction-config::before,
.interaction-config::after {
  content: '';
  position: absolute;
  top: 0;
  width: 40%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.interaction-config::before {
  left: 0;
  background: radial-gradient(ellipse 600px 80% at 0% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

.interaction-config::after {
  right: 0;
  background: radial-gradient(ellipse 600px 80% at 100% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%);
}

/* ---- 氛围背景 ---- */
.ic-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ic-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.06;
}

.ic-glow--top { top: -200px; left: -100px; background: var(--accent); }
.ic-glow--bottom { bottom: -200px; right: -100px; background: var(--accent); }

/* ---- 装饰性顶部 ---- */
.header-ornament {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  gap: 12px; padding: 40px 32px 0;
}

.orn-line {
  display: block; width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
}

.orn-diamond { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }

.header-kicker {
  position: relative; z-index: 1;
  text-align: center; font-size: 12px;
  color: rgba(var(--accent-rgb), 0.3); letter-spacing: 4px; margin-top: 10px;
}

.ic-title {
  position: relative; z-index: 1;
  text-align: center; font-family: var(--font-heading-en);
  font-size: 28px; font-weight: 400;
  color: rgba(var(--accent-rgb), 0.75); letter-spacing: 6px; margin-top: 6px;
}

/* ---- 概览卡片 ---- */
.overview-cards {
  position: relative; z-index: 1;
  display: flex; justify-content: center; gap: 16px; padding: 20px 32px 0;
}

.overview-card {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 20px; border-radius: 8px; background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08); min-width: 80px;
}

.overview-num { font-size: 18px; font-weight: 500; color: var(--accent); line-height: 1.2; }
.overview-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); letter-spacing: 1px; }

/* ---- 顶栏 ---- */
.ic-header {
  position: relative; z-index: 1;
  padding: 16px 32px; flex-shrink: 0;
}

.header-actions {
  display: flex; align-items: center; justify-content: space-between;
}

.header-right { display: flex; gap: 8px; }

/* ---- 按钮 ---- */
.ic-btn-primary {
  padding: 8px 18px; border: none; border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.15); color: var(--accent);
  font-size: 13px; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}

.ic-btn-primary:hover { background: rgba(var(--accent-rgb), 0.25); }
.ic-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.ic-btn-ghost {
  padding: 8px 14px; border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px; background: transparent;
  color: rgba(var(--accent-rgb), 0.4); font-size: 12px;
  font-family: inherit; cursor: pointer; transition: all 0.2s;
}

.ic-btn-ghost:hover { background: rgba(var(--accent-rgb), 0.08); color: rgba(var(--accent-rgb), 0.6); }

.ic-btn-sm {
  padding: 4px 12px; border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 6px; background: transparent;
  color: rgba(var(--accent-rgb), 0.4); font-size: 11px;
  font-family: inherit; cursor: pointer; transition: all 0.2s;
}

.ic-btn-sm:hover { background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }

.ic-btn-cancel {
  padding: 8px 20px; border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px; background: transparent;
  color: rgba(var(--accent-rgb), 0.4); font-size: 13px;
  font-family: inherit; cursor: pointer; transition: all 0.2s;
}

.ic-btn-cancel:hover { background: rgba(var(--accent-rgb), 0.06); }

.ic-btn-danger {
  padding: 8px 20px; border: none; border-radius: 8px;
  background: rgba(239, 68, 68, 0.15); color: #ef4444;
  font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.2s;
}

.ic-btn-danger:hover { background: rgba(239, 68, 68, 0.25); }

/* ---- 配置列表 ---- */
.config-list {
  position: relative; z-index: 1;
  flex: 1; overflow-y: auto; padding: 0 32px 40px;
  display: flex; flex-direction: column; gap: 12px;
}

.config-card {
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  overflow: hidden;
  transition: border-color 0.2s;
}

.config-card.active {
  border-color: rgba(var(--accent-rgb), 0.2);
}

.config-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; cursor: pointer;
  transition: background 0.2s;
}

.config-header:hover { background: rgba(var(--accent-rgb), 0.03); }
.config-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
}

.config-info { flex: 1; min-width: 0; }

.config-name {
  font-size: 15px; font-weight: 500; color: rgba(var(--accent-rgb), 0.8);
  margin-bottom: 2px;
}

.config-desc {
  font-size: 12px; color: rgba(var(--accent-rgb), 0.3);
  margin-bottom: 4px;
}

.config-meta { display: flex; gap: 6px; }

.meta-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06); color: rgba(var(--accent-rgb), 0.35);
}

.badge-active { background: rgba(52, 211, 153, 0.1); color: var(--green); }
.badge-inactive { background: rgba(var(--accent-rgb), 0.04); color: rgba(var(--accent-rgb), 0.25); }

.config-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.config-btn {
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: transparent; color: rgba(var(--accent-rgb), 0.3);
  font-size: 14px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}

.config-btn:hover { background: rgba(var(--accent-rgb), 0.1); color: rgba(var(--accent-rgb), 0.6); }
.config-btn-del:hover { color: #ef4444; }

.expand-icon { font-size: 12px; color: rgba(var(--accent-rgb), 0.3); margin-left: 4px; }

/* ---- 规则编辑弹窗中的范围/数值控件（保留：父级 modal 仍使用） ---- */
.setting-range {
  width: 80px; accent-color: var(--accent);
}

.setting-val {
  font-size: 11px; color: rgba(var(--accent-rgb), 0.3);
  min-width: 40px;
}


/* ---- 弹窗 ---- */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}

.modal-card {
  background: rgba(26, 22, 18, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 12px; padding: 24px;
  width: 440px; max-width: 90vw;
  max-height: 86vh;
  overflow-y: auto;
}

.modal-wide { width: min(560px, 92vw); }
.modal-sm { width: min(340px, 92vw); }

.modal-title {
  font-size: 16px; font-weight: 500;
  color: rgba(var(--accent-rgb), 0.7); margin-bottom: 16px;
}

.modal-body { display: flex; flex-direction: column; gap: 12px; }

.form-group { display: flex; flex-direction: column; gap: 4px; }

.form-label {
  font-size: 11px; color: rgba(var(--accent-rgb), 0.35); letter-spacing: 1px;
}

.form-input, .form-textarea, .form-select {
  padding: 8px 12px; border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 13px; font-family: inherit;
  outline: none; transition: border-color 0.2s;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.form-textarea { resize: vertical; }

.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; }

.modal-actions {
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;
}

.confirm-text {
  font-size: 14px; color: rgba(var(--accent-rgb), 0.5);
  text-align: center; margin-bottom: 8px;
}

/* ---- 过渡动画 ---- */
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .overview-cards { flex-wrap: wrap; }
  .form-row { flex-direction: column; }
}
</style>