<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance constitution-page">
    <!-- 氛围背景 -->
    <div data-enter class="constitution-atmosphere">
      <div class="atmos-glow"></div>
      <div class="atmos-parchment"></div>
    </div>

    <!-- 顶部标题 · 圣约卷轴（统一页头组件，竖排居中保仪式感） -->
    <RoomHeader
      class="constitution-room-header"
      data-enter
      :ornament="false"
      subtitle="世界的根基 · 不可动摇的契约"
    >
      <template #ornament>
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-diamond">✦</span>
          <span class="orn-line"></span>
        </div>
        <div class="header-seal">⚜</div>
      </template>
      <template #title>
        <span class="scroll-title">{{ store.name }}</span>
        <span class="scroll-version">v{{ store.version }}</span>
      </template>
      <template #meta>
        <div class="scroll-meta">
          <span>建立于 {{ formatDate(store.createdAt) }}</span>
          <span class="meta-dot">·</span>
          <span>最近修改 {{ formatDate(store.updatedAt) }}</span>
        </div>
        <div class="header-ornament">
          <span class="orn-line"></span>
          <span class="orn-diamond">✦</span>
          <span class="orn-line"></span>
        </div>
      </template>
    </RoomHeader>

    <!-- 序言 · 羊皮卷 -->
    <section data-enter class="parchment-section">
      <div class="parchment-inner">
        <div class="parchment-corner tl"></div>
        <div class="parchment-corner tr"></div>
        <div class="parchment-corner bl"></div>
        <div class="parchment-corner br"></div>
        <div class="parchment-glow"></div>
        <p class="parchment-text">{{ store.preamble }}</p>
        <div class="parchment-sigil">
          <span class="sigil-line"></span>
          <span class="sigil-mark">✧</span>
          <span class="sigil-line"></span>
        </div>
      </div>
    </section>

    <!-- 核心条款 · 基石四柱 -->
    <section data-enter class="core-section">
      <div class="section-header">
        <div class="section-header-icon">▣</div>
        <div>
          <h2 class="section-title">核心条款</h2>
          <span class="section-subtitle">不可动摇 · 硬编码于世界根基</span>
        </div>
      </div>
      <div class="pillars-grid">
        <div
          v-for="(rule, idx) in store.immutableRules"
          :key="rule.id"
          class="pillar-card"
          :style="{ '--pillar-delay': `${idx * 0.15}s` }"
        >
          <div class="pillar-number">{{ '第' + romanNumerals[idx] + '条' }}</div>
          <div class="pillar-icon">{{ rule.icon }}</div>
          <div class="pillar-content">
            <h3 class="pillar-title">{{ rule.title }}</h3>
            <p class="pillar-desc">{{ rule.description }}</p>
          </div>
          <div class="pillar-seal">
            <span class="seal-icon">⚜</span>
            <span>不可变</span>
          </div>
          <div class="pillar-base"></div>
        </div>
      </div>
    </section>

    <!-- 弹性宪法 · 戒律之书 -->
    <section class="mutable-section">
      <div class="section-header">
        <div class="section-header-icon">☰</div>
        <div>
          <h2 class="section-title">弹性宪法</h2>
          <span class="section-subtitle">
            {{ store.enabledMutableCount }} / {{ store.totalMutableCount }} 条生效
          </span>
        </div>
        <div class="section-header-actions">
          <button class="stylus-btn" @click="handleExport" title="导出宪法">
            <span class="stylus-icon">↓</span>
            <span class="stylus-label">导出</span>
          </button>
          <button class="stylus-btn" @click="triggerImport" title="导入宪法">
            <span class="stylus-icon">↑</span>
            <span class="stylus-label">导入</span>
          </button>
          <input
            ref="importInputRef"
            type="file"
            accept=".json"
            class="hidden-input"
            @change="handleImport"
          />
          <button class="stylus-btn stylus-btn-primary" @click="openAddModal">
            <span class="stylus-icon">+</span>
            <span class="stylus-label">添加戒律</span>
          </button>
        </div>
      </div>

      <!-- 搜索与过滤 -->
      <div class="filter-bar">
        <div class="filter-search-wrap">
          <span class="filter-search-icon">🔍</span>
          <input
            v-model="searchQuery"
            class="filter-search"
            type="text"
            placeholder="搜索条款名称或描述…"
          />
        </div>
        <div class="filter-type-group">
          <button
            v-for="opt in filterTypeOptions"
            :key="opt.value"
            class="filter-chip"
            :class="{ active: filterType === opt.value }"
            @click="filterType = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- 宪法效果概览 -->
      <div class="constitution-effect-summary">
        <div class="effect-summary-header">
          <span class="effect-summary-icon">⚡</span>
          <span class="effect-summary-text">{{ effectEngine.effectSummary.value }}</span>
        </div>
        <div class="effect-summary-detail" v-if="effectEngine.activeEffectCount.value > 0">
          <div
            v-for="item in effectEngine.activeEffectsByTarget.value"
            :key="item.target"
            class="effect-summary-item"
          >
            <span class="effect-target-label">{{ item.label }}</span>
            <span class="effect-target-sources">{{ item.sources.join('、') }}</span>
          </div>
        </div>
      </div>

      <!-- 规则列表 -->
      <div class="scroll-list">
        <div
          v-for="rule in filteredRules"
          :key="rule.id"
          class="scroll-item"
          :class="{ 'scroll-item--disabled': !rule.enabled }"
          draggable="true"
          @dragstart="onDragStart($event, rule.id)"
          @dragover.prevent="onDragOver($event, rule.id)"
          @dragend="onDragEnd"
        >
          <div class="scroll-item-left">
            <span class="scroll-item-number">第{{ rule.articleNumber ?? '-' }}条</span>
            <span class="scroll-item-type" :class="`type-${rule.type}`">
              {{ typeLabel(rule.type) }}
            </span>
            <div class="scroll-item-info">
              <div class="scroll-item-title">
                {{ rule.title }}
                <span v-if="rule.isDefault" class="badge-official">官方</span>
                <span
                  v-if="ruleRuntimeActive(rule.id)"
                  class="badge-runtime-active"
                  title="该条款的效果目标已被组件 / 合规覆盖 / CSS 变量消费，开关会改变产品行为"
                >生效中</span>
                <span
                  v-else
                  class="badge-runtime-declarative"
                  title="该条款的效果目标目前尚未被任何组件消费（多为待建设的特性），开关当前不改变运行时行为"
                >声明式·不影响运行时</span>
              </div>
              <div class="scroll-item-desc">{{ rule.description }}</div>
              <!-- 效果预览 -->
              <div
                v-if="effectPreviewMap[rule.id]?.hasEffects"
                class="scroll-item-effects"
              >
                <button
                  class="effect-toggle"
                  @click.stop="toggleEffectPreview(rule.id)"
                  :title="expandedEffects[rule.id] ? '收起效果预览' : '展开效果预览'"
                >
                  <span class="effect-toggle-icon">{{ expandedEffects[rule.id] ? '▾' : '▸' }}</span>
                  <span class="effect-toggle-label">{{ effectPreviewMap[rule.id]?.effectCount }} 项效果</span>
                </button>
                <Transition name="effect-slide">
                  <div v-if="expandedEffects[rule.id]" class="effect-preview-list">
                    <div
                      v-for="(effect, ei) in effectPreviewMap[rule.id]?.effects ?? []"
                      :key="ei"
                      class="effect-preview-item"
                    >
                      <span class="effect-preview-badge" :class="`badge-${effect.typeLabel.startsWith('禁用') ? 'disable' : effect.typeLabel.startsWith('启用') ? 'enable' : 'adjust'}`">
                        {{ effect.typeLabel }}
                      </span>
                      <span class="effect-preview-target">{{ effect.targetLabel }}</span>
                      <span class="effect-preview-desc">{{ effect.scope }}</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
          <div class="scroll-item-right">
            <!-- 追踪指示器 -->
            <div
              v-if="rule.tracking"
              class="tracking-indicator"
              :title="`${trackingLabel(rule.tracking.period)}`"
            >
              <span class="tracking-count">{{ rule.tracking.count }}</span>
              <span class="tracking-sep">/</span>
              <span class="tracking-target">{{ rule.tracking.target }}</span>
              <span class="tracking-period">{{ trackingLabel(rule.tracking.period) }}</span>
              <button
                class="track-btn"
                title="记录一次"
                @click="store.trackOnce(rule.id)"
              >+</button>
            </div>
            <!-- 操作按钮 -->
            <button
              class="scroll-item-btn"
              :class="{ active: rule.enabled }"
              :title="rule.enabled ? '禁用' : '启用'"
              @click="store.toggleRule(rule.id)"
            >
              <span v-if="rule.enabled" class="btn-glow"></span>
              {{ rule.enabled ? '✓' : '○' }}
            </button>
            <button
              class="scroll-item-btn scroll-item-btn--edit"
              title="编辑"
              @click="openEditModal(rule)"
            >✎</button>
            <button
              v-if="!rule.isDefault"
              class="scroll-item-btn scroll-item-btn--delete"
              title="删除"
              @click="confirmDelete(rule)"
            >✕</button>
            <span class="drag-handle" title="拖拽排序">⠿</span>
          </div>
        </div>

        <div v-if="filteredRules.length === 0" class="empty-state">
          <div class="empty-icon">📜</div>
          <p class="empty-text">没有找到匹配的戒律</p>
          <p class="empty-hint">试试调整搜索词或筛选条件</p>
        </div>
      </div>
    </section>

    <!-- 合规守卫 · 宪法体检（INCR-282 补挂载孤儿组件 ConstitutionGuardianPanel：合规自查/审计日志/冲突检测，引擎 useComplianceBaseline 唯一，经 useConstitution 桥只读消费商店） -->
    <ConstitutionGuardianPanel />

    <!-- 宪法生效 · 实时变量（INCR-296 补挂载孤儿组件 ConstitutionLiveVars：读 isTargetActive + CSS 变量实时证据，引擎应用级唯一，零 props 自持读桥） -->
    <ConstitutionLiveVars />

    <!-- 宪法透明度账本 · 名实对照 -->
    <ConstitutionStatusPanel />

    <!-- A3-EXT · 系统通知审计 · 零推送合规证明 -->
    <OsNotificationAuditPanel />

    <!-- 超级自定义 · 合规覆盖 -->
    <section class="override-section">
      <div class="section-header">
        <div class="section-header-icon">⚙</div>
        <div>
          <h2 class="section-title">超级自定义</h2>
          <span class="section-subtitle">宪法第 II 条 · 合规覆盖层 — 开启后跳过对应合规检测</span>
        </div>
      </div>

      <div class="override-grid">
        <div class="override-card">
          <div class="override-info">
            <span class="override-label">文案中立性检测</span>
            <span class="override-desc">允许评价性指令性文案通过检测</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.forbiddenPatterns"
              @change="configStore.updateComplianceOverride('forbiddenPatterns', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card">
          <div class="override-info">
            <span class="override-label">幕僚主动问候</span>
            <span class="override-desc">允许幕僚默认主动问候/推送</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.advisorEnabled"
              @change="configStore.updateComplianceOverride('advisorEnabled', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card">
          <div class="override-info">
            <span class="override-label">比较性文案检测</span>
            <span class="override-desc">允许跨时段对比等比较性表达</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.comparativePhrases"
              @change="configStore.updateComplianceOverride('comparativePhrases', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card">
          <div class="override-info">
            <span class="override-label">拟人化检测</span>
            <span class="override-desc">允许幕僚使用拟人化人称表达</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.personification"
              @change="configStore.updateComplianceOverride('personification', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card">
          <div class="override-info">
            <span class="override-label">第4条·只给原材料</span>
            <span class="override-desc">关闭"只给原材料不给结论"检测，允许幕僚给出结论性表达</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.dataDriven"
              @change="configStore.updateComplianceOverride('dataDriven', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card">
          <div class="override-info">
            <span class="override-label">计时器默认自动开始</span>
            <span class="override-desc">允许计时器默认自动开始（默认关闭）</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.autoStartOverwrite"
              @change="configStore.updateComplianceOverride('autoStartOverwrite', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card">
          <div class="override-info">
            <span class="override-label">触觉反馈默认开启</span>
            <span class="override-desc">允许触觉反馈默认开启（默认关闭）</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.hapticFeedbackOverwrite"
              @change="configStore.updateComplianceOverride('hapticFeedbackOverwrite', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>

        <div class="override-card override-card--gate">
          <div class="override-info">
            <span class="override-label">允许远程 AI 端点</span>
            <span class="override-desc">宪法第 I 条·本地私有（fail-closed）。开启后才可向非 localhost 的远程 AI 端点发请求；本地推理（Ollama 等环回地址）始终放行，无需开启。</span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="configStore.config.complianceOverride.allowExternalAI"
              @change="configStore.updateComplianceOverride('allowExternalAI', ($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </div>
    </section>

    <!-- 中性检测词表·本地扩展（C2-EXT · 第2条超级自定义 + 零外网） -->
    <section class="parchment-section neutral-ext-section" data-enter>
      <div class="section-header">
        <div class="section-header-icon">✶</div>
        <div>
          <h2 class="section-title">中性检测词表 · 本地扩展</h2>
          <span class="section-subtitle">第8条·中性呈现 — 在系统内置基线之上追加你的本地词，绝不触网</span>
        </div>
      </div>

      <div class="neutral-ext-coverage">
        <span class="coverage-pill">评价性 内置 {{ coverage.forbidden.builtin }} + 本地 {{ coverage.forbidden.extended }} = {{ coverage.forbidden.total }}</span>
        <span class="coverage-pill">比较性 内置 {{ coverage.comparative.builtin }} + 本地 {{ coverage.comparative.extended }} = {{ coverage.comparative.total }}</span>
        <span class="coverage-pill">拟人化 内置 {{ coverage.personification.builtin }} + 本地 {{ coverage.personification.extended }} = {{ coverage.personification.total }}</span>
        <span class="coverage-pill coverage-pill--threshold">
          触发阈值：命中 ≥
          <input
            class="threshold-input"
            type="number"
            min="1"
            step="1"
            :value="coverage.threshold"
            @change="onThresholdChange($event)"
          />
          条才标记
        </span>
      </div>

      <div class="neutral-ext-grid">
        <div
          v-for="cat in neutralCategories"
          :key="cat.key"
          class="neutral-ext-card"
        >
          <div class="neutral-ext-card-head">
            <span class="neutral-ext-card-label">{{ cat.label }}</span>
            <span class="neutral-ext-card-count">{{ extList[cat.key].length }} 条</span>
          </div>
          <p class="neutral-ext-card-hint">{{ cat.hint }}</p>
          <div class="neutral-ext-tags">
            <span
              v-for="w in extList[cat.key]"
              :key="w"
              class="neutral-tag"
            >
              {{ w }}
              <button
                class="neutral-tag-del"
                type="button"
                :aria-label="`移除 ${w}`"
                @click="removeExt(cat.key, w)"
              >×</button>
            </span>
            <span v-if="extList[cat.key].length === 0" class="neutral-ext-empty">暂无本地词</span>
          </div>
          <form class="neutral-ext-add" @submit.prevent="addExt(cat.key)">
            <input
              class="neutral-ext-input"
              type="text"
              :placeholder="cat.placeholder"
              v-model="extInput[cat.key]"
            />
            <button class="neutral-ext-add-btn" type="submit">添加</button>
          </form>
        </div>
      </div>
    </section>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-panel-ornament">
            <span class="orn-line"></span>
            <span class="orn-diamond">✦</span>
            <span class="orn-line"></span>
          </div>
          <h3 class="modal-title">{{ isEditing ? '编辑戒律' : '添加戒律' }}</h3>
          <form @submit.prevent="saveRule" class="modal-form">
            <div class="form-group">
              <label class="form-label">标题</label>
              <input
                v-model="form.title"
                class="form-input"
                placeholder="例如：每日冥想"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                placeholder="描述这条戒律的意义和具体要求"
                rows="3"
              />
            </div>
            <div class="form-group">
              <label class="form-label">类型</label>
              <div class="type-selector">
                <button
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  type="button"
                  class="type-option"
                  :class="{ selected: form.type === opt.value }"
                  @click="form.type = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div v-if="canShowTracking" class="tracking-config">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">目标次数</label>
                  <input
                    v-model.number="form.trackingTarget"
                    type="number"
                    min="1"
                    max="999"
                    class="form-input"
                    placeholder="1"
                  />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">周期</label>
                  <select v-model="form.trackingPeriod" class="form-select">
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="stylus-btn" @click="closeModal">取消</button>
              <button type="submit" class="stylus-btn stylus-btn-primary">
                {{ isEditing ? '保存修改' : '添加戒律' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-panel modal-confirm">
          <div class="modal-panel-ornament">
            <span class="orn-line"></span>
            <span class="orn-diamond">⚠</span>
            <span class="orn-line"></span>
          </div>
          <h3 class="modal-title">确认删除</h3>
          <p class="confirm-text">
            确定要删除「<strong>{{ deletingRule?.title }}</strong>」吗？此操作不可撤销。
          </p>
          <div class="modal-actions">
            <button class="stylus-btn" @click="showDeleteConfirm = false">取消</button>
            <button class="stylus-btn stylus-btn-danger" @click="doDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConstitutionStore } from '@/stores/constitution'
import { useConfigStore } from '@/stores/config'
import { showToast } from '@/modules/toast'
import type { MutableRule } from '@/types'
import { useConstitutionEffect, useRuleEffectPreview } from '@/composables/useConstitutionEffect'
import { ruleHasRuntimeEffect } from '@/engine/constitution-effects'
import { useViewEntrance } from '../composables/useViewEntrance'
import ConstitutionStatusPanel from '@/components/ConstitutionStatusPanel.vue'
import OsNotificationAuditPanel from '@/components/OsNotificationAuditPanel.vue'
import ConstitutionGuardianPanel from '@/components/ConstitutionGuardianPanel.vue'
import ConstitutionLiveVars from '@/components/ConstitutionLiveVars.vue'
import RoomHeader from '../components/RoomHeader.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const store = useConstitutionStore()
const configStore = useConfigStore()
const effectEngine = useConstitutionEffect()

const romanNumerals = ['I', 'II', 'III', 'IV']

const typeLabels: Record<string, string> = {
  value: '价值观',
  behavior: '行为',
  limit: '限制',
  ritual: '仪式',
}
function typeLabel(t: string): string {
  return typeLabels[t] ?? t
}

// 该条款是否在运行时真正生效（其效果目标中至少有一个已被组件 / override / CSS 消费）
function ruleRuntimeActive(id: string): boolean {
  return ruleHasRuntimeEffect(id)
}

const typeOptions = [
  { value: 'behavior' as MutableRule['type'], label: '行为' },
  { value: 'ritual' as MutableRule['type'], label: '仪式' },
  { value: 'limit' as MutableRule['type'], label: '限制' },
  { value: 'value' as MutableRule['type'], label: '价值观' },
]

const sortedMutableRules = computed(() =>
  store.mutableRules.slice().sort((a, b) => a.order - b.order)
)

const searchQuery = ref('')
const filterType = ref('all')

const filterTypeOptions = [
  { value: 'all', label: '全部' },
  ...typeOptions,
]

const filteredRules = computed(() => {
  let list = sortedMutableRules.value
  if (filterType.value !== 'all') {
    list = list.filter(r => r.type === filterType.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    )
  }
  return list
})

// ---- 效果预览 ----

const expandedEffects = ref<Record<string, boolean>>({})

function toggleEffectPreview(ruleId: string) {
  expandedEffects.value[ruleId] = !expandedEffects.value[ruleId]
}

const effectPreviewMap = computed(() => {
  const map: Record<string, { hasEffects: boolean; effectCount: number; effects: ReturnType<typeof useRuleEffectPreview>['effects']['value'] }> = {}
  for (const rule of sortedMutableRules.value) {
    const preview = useRuleEffectPreview(rule.id)
    map[rule.id] = {
      hasEffects: preview.hasEffects,
      effectCount: preview.effectCount,
      effects: preview.effects.value,
    }
  }
  return map
})

let dragId: string | null = null

function onDragStart(e: DragEvent, id: string) {
  dragId = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(_e: DragEvent, id: string) {
  if (!dragId || dragId === id) return
  const rules = sortedMutableRules.value
  const fromIdx = rules.findIndex(r => r.id === dragId)
  const toIdx = rules.findIndex(r => r.id === id)
  if (fromIdx === -1 || toIdx === -1) return
  const newOrder = rules.map(r => ({ id: r.id, order: r.order }))
  const [moved] = newOrder.splice(fromIdx, 1)
  newOrder.splice(toIdx, 0, moved)
  store.reorderRules(newOrder.map(r => r.id))
  dragId = id
}

function onDragEnd() {
  dragId = null
}

const importInputRef = ref<HTMLInputElement | null>(null)

function handleExport() {
  const json = store.exportConstitution()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `constitution-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast('宪法已导出', 'success')
}

function triggerImport() {
  importInputRef.value?.click()
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      if (store.importConstitution(data)) {
        showToast('宪法已导入', 'success')
      } else {
        showToast('导入失败：格式不正确', 'error')
      }
    } catch {
      showToast('导入失败：无法解析文件', 'error')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

const periodLabels: Record<string, string> = {
  day: '天',
  week: '周',
  month: '月',
}
function trackingLabel(p: string): string {
  return periodLabels[p] ?? p
}

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  title: '',
  description: '',
  type: 'behavior' as MutableRule['type'],
  trackingTarget: 1,
  trackingPeriod: 'daily' as 'daily' | 'weekly' | 'monthly',
})

const canShowTracking = computed(() =>
  form.value.type === 'behavior' || form.value.type === 'ritual'
)

function resetForm(): void {
  form.value = {
    title: '',
    description: '',
    type: 'behavior',
    trackingTarget: 1,
    trackingPeriod: 'daily',
  }
  editingId.value = null
  isEditing.value = false
}

function openAddModal(): void {
  resetForm()
  showModal.value = true
}

function openEditModal(rule: MutableRule): void {
  isEditing.value = true
  editingId.value = rule.id
  form.value = {
    title: rule.title,
    description: rule.description,
    type: rule.type,
    trackingTarget: rule.tracking?.target ?? 1,
    trackingPeriod: rule.tracking?.period ?? 'daily',
  }
  showModal.value = true
}

function closeModal(): void {
  showModal.value = false
  resetForm()
}

function saveRule(): void {
  if (!form.value.title.trim()) return

  if (isEditing.value && editingId.value) {
    const updates: Partial<MutableRule> = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      type: form.value.type,
    }
    store.updateRule(editingId.value, updates)

    if (canShowTracking.value) {
      store.initTracking(
        editingId.value,
        form.value.trackingTarget,
        form.value.trackingPeriod
      )
    }
  } else {
    store.addRule({
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      type: form.value.type,
      enabled: true,
      tracking: canShowTracking.value
        ? {
            count: 0,
            target: form.value.trackingTarget,
            period: form.value.trackingPeriod,
            lastReset: null,
          }
        : undefined,
    })
  }

  closeModal()
}

const showDeleteConfirm = ref(false)
const deletingRule = ref<MutableRule | null>(null)

function confirmDelete(rule: MutableRule): void {
  deletingRule.value = rule
  showDeleteConfirm.value = true
}

function doDelete(): void {
  if (deletingRule.value) {
    store.removeRule(deletingRule.value.id)
  }
  showDeleteConfirm.value = false
  deletingRule.value = null
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- C2-EXT · 中性检测词表本地扩展（零外网 / 本地 KV）----
import {
  getNeutralityCoverageReport,
  getUserNeutralityExtensions,
  addNeutralityExtension,
  removeNeutralityExtension,
  setNeutralityFlagThreshold,
} from '@/modules/constitution/neutrality-checker'

type NeutralCatKey = 'forbidden' | 'comparative' | 'personification'

const neutralCategories: { key: NeutralCatKey; label: string; hint: string; placeholder: string }[] = [
  { key: 'forbidden', label: '评价性 / 指令性', hint: '添加短语，命中即提示（如「务必」「赶紧」）', placeholder: '输入本地评价性短语…' },
  { key: 'comparative', label: '比较性（正则）', hint: '添加正则表达式 source，匹配比较性表达', placeholder: '输入正则，如 比.*强' },
  { key: 'personification', label: '拟人化（正则）', hint: '添加正则表达式 source，匹配拟人化人称', placeholder: '输入正则，如 它希望' },
]

const extInput = ref<Record<NeutralCatKey, string>>({ forbidden: '', comparative: '', personification: '' })

function buildExtList(): Record<NeutralCatKey, string[]> {
  const ext = getUserNeutralityExtensions()
  return { forbidden: ext.forbidden, comparative: ext.comparative, personification: ext.personification }
}

const extList = ref<Record<NeutralCatKey, string[]>>(buildExtList())
const coverage = ref(getNeutralityCoverageReport())

function refreshNeutralExt(): void {
  extList.value = buildExtList()
  coverage.value = getNeutralityCoverageReport()
}

function addExt(key: NeutralCatKey): void {
  const v = extInput.value[key].trim()
  if (!v) return
  addNeutralityExtension(key, v)
  extInput.value[key] = ''
  refreshNeutralExt()
  showToast('已添加本地词', 'success')
}

function removeExt(key: NeutralCatKey, value: string): void {
  removeNeutralityExtension(key, value)
  refreshNeutralExt()
}

function onThresholdChange(e: Event): void {
  const n = Number((e.target as HTMLInputElement).value)
  setNeutralityFlagThreshold(n)
  refreshNeutralExt()
}
</script>

<style scoped>
/* ============================================================
   宪法页面 — 暖色圣约卷轴风格
   ============================================================ */

.constitution-page {
  max-width: 840px;
  margin: 0 auto;
  padding: 48px 32px 80px;
  position: relative;
  min-height: 100vh;
}

/* ---- 氛围背景 ---- */
.constitution-atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.atmos-glow {
  position: absolute;
  top: -20%;
  left: 15%;
  width: 70%;
  height: 60%;
  background: radial-gradient(
    ellipse at center,
    rgba(var(--accent-rgb), 0.06) 0%,
    transparent 65%
  );
  animation: breathe 6s ease-in-out infinite;
}

.atmos-parchment {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse at 30% 20%, rgba(var(--accent-rgb), 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(var(--accent-rgb), 0.02) 0%, transparent 50%);
}

/* ---- 卷轴头部（统一页头组件接管） ---- */
.constitution-room-header {
  text-align: center;
  margin-bottom: 48px;
  position: relative;
  z-index: 1;
}
.constitution-room-header :deep(.rh-main) {
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.constitution-room-header :deep(.rh-titles) {
  align-items: center;
  gap: 0;
}
.constitution-room-header :deep(.rh-title) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.constitution-room-header :deep(.rh-subtitle) {
  font-size: 14px;
  letter-spacing: 1px;
  margin: 12px 0 8px;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.header-ornament:last-child {
  margin-bottom: 0;
  margin-top: 16px;
}

.orn-line {
  display: block;
  width: 80px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.3),
    transparent
  );
}

.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.5;
}

.header-seal {
  font-size: 36px;
  color: var(--accent);
  opacity: 0.3;
  margin-bottom: 12px;
  animation: float 5s ease-in-out infinite;
}

.scroll-title {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  margin-bottom: 8px;
}

.scroll-version {
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  letter-spacing: 1px;
}

.scroll-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 12px 0 8px;
  letter-spacing: 1px;
}

.scroll-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-dot {
  margin: 0 10px;
  opacity: 0.3;
}

/* ---- 羊皮卷序言 ---- */
.parchment-section {
  position: relative;
  z-index: 1;
  margin-bottom: 56px;
}

.parchment-inner {
  position: relative;
  padding: 40px 36px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    rgba(35, 30, 24, 0.6) 0%,
    rgba(26, 22, 18, 0.8) 100%
  );
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  overflow: hidden;
}

.parchment-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: radial-gradient(
    ellipse at center,
    rgba(var(--accent-rgb), 0.03) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.parchment-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: rgba(var(--accent-rgb), 0.2);
  border-style: solid;
}
.parchment-corner.tl { top: 8px; left: 8px; border-width: 1px 0 0 1px; border-radius: 4px 0 0 0; }
.parchment-corner.tr { top: 8px; right: 8px; border-width: 1px 1px 0 0; border-radius: 0 4px 0 0; }
.parchment-corner.bl { bottom: 8px; left: 8px; border-width: 0 0 1px 1px; border-radius: 0 0 0 4px; }
.parchment-corner.br { bottom: 8px; right: 8px; border-width: 0 1px 1px 0; border-radius: 0 0 4px 0; }

.parchment-text {
  font-size: 15px;
  line-height: 2;
  color: var(--text-secondary);
  text-align: center;
  font-style: italic;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

.parchment-sigil {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
  position: relative;
  z-index: 1;
}

.sigil-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.2),
    transparent
  );
}

.sigil-mark {
  font-size: 12px;
  color: var(--accent);
  opacity: 0.4;
}

/* ---- 通用 section ---- */
.section-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.section-header-icon {
  font-size: 20px;
  color: var(--accent);
  opacity: 0.5;
  margin-top: 2px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
  letter-spacing: 1px;
}

.section-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-top: 4px;
}

.section-header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

/* ---- 核心条款 · 基石四柱 ---- */
.core-section {
  margin-bottom: 56px;
  position: relative;
  z-index: 1;
}

.pillars-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.pillar-card {
  position: relative;
  padding: 28px 24px 24px;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    160deg,
    rgba(var(--bg-card-rgb), 0.5) 0%,
    rgba(26, 22, 18, 0.7) 100%
  );
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
  animation: pillar-rise 0.6s ease-out both;
  animation-delay: var(--pillar-delay, 0s);
}

@keyframes pillar-rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pillar-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--accent),
    transparent
  );
  opacity: 0.3;
}

.pillar-card::after {
  content: '';
  position: absolute;
  inset: auto -30% -40% auto;
  width: 200px;
  height: 200px;
  background: radial-gradient(
    circle,
    rgba(var(--accent-rgb), 0.04) 0%,
    transparent 65%
  );
  pointer-events: none;
}

.pillar-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: linear-gradient(
    160deg,
    rgba(55, 48, 40, 0.5) 0%,
    rgba(35, 30, 24, 0.7) 100%
  );
}

.pillar-number {
  font-size: 11px;
  color: var(--accent);
  opacity: 0.5;
  letter-spacing: 2px;
  margin-bottom: 12px;
  font-family: var(--font-heading-zh);
}

.pillar-icon {
  font-size: 32px;
  margin-bottom: 14px;
  opacity: 0.7;
}

.pillar-content {
  position: relative;
  z-index: 1;
}

.pillar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
  font-family: var(--font-heading-zh);
}

.pillar-desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.pillar-seal {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  letter-spacing: 1px;
  opacity: 0.5;
}

.seal-icon {
  font-size: 9px;
}

.pillar-base {
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.1),
    transparent
  );
}

/* ---- 可变规则区 ---- */
.mutable-section {
  margin-bottom: 48px;
  position: relative;
  z-index: 1;
}

.hidden-input {
  display: none;
}

/* ---- 搜索与过滤 ---- */
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.filter-search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.filter-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  opacity: 0.3;
  pointer-events: none;
}

.filter-search {
  width: 100%;
  padding: 10px 12px 10px 34px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition);
}

.filter-search:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.06);
}

.filter-search::placeholder {
  color: var(--text-secondary);
}

.filter-type-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 7px 16px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
}

.filter-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-chip.active {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

/* ---- 规则列表 ---- */
.scroll-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scroll-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
  cursor: default;
  position: relative;
}

.scroll-item:hover {
  background: rgba(55, 48, 40, 0.4);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.scroll-item--disabled {
  opacity: 0.45;
}

.scroll-item-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.scroll-item-number {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
  min-width: 65px;
  font-family: var(--font-heading-zh);
}

.scroll-item-type {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.type-value {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.type-behavior {
  background: rgba(90, 184, 160, 0.12);
  color: var(--accent-cyan);
}
.type-limit {
  background: rgba(200, 120, 100, 0.12);
  color: #c87864;
}
.type-ritual {
  background: rgba(212, 180, 100, 0.12);
  color: #d4b464;
}

.scroll-item-info {
  flex: 1;
  min-width: 0;
}

.scroll-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.scroll-item-desc {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-official {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-weight: 500;
  margin-left: 6px;
  vertical-align: middle;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}

.badge-runtime-active {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(64, 192, 128, 0.14);
  color: #5fd99a;
  font-weight: 500;
  margin-left: 6px;
  vertical-align: middle;
  border: 1px solid rgba(64, 192, 128, 0.28);
}

.badge-runtime-declarative {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(180, 180, 190, 0.12);
  color: #9a9aa6;
  font-weight: 500;
  margin-left: 6px;
  vertical-align: middle;
  border: 1px solid rgba(180, 180, 190, 0.22);
}

.scroll-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ---- 追踪指示器 ---- */
.tracking-indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(90, 184, 160, 0.06);
  border: 1px solid rgba(90, 184, 160, 0.1);
  color: var(--text-secondary);
  white-space: nowrap;
}

.tracking-count {
  font-weight: 600;
  color: var(--accent-cyan);
}

.tracking-sep {
  opacity: 0.4;
}

.tracking-target {
  opacity: 0.7;
}

.tracking-period {
  margin-left: 2px;
  opacity: 0.5;
  font-size: 11px;
}

.track-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(90, 184, 160, 0.2);
  background: transparent;
  color: var(--accent-cyan);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  transition: all var(--transition);
  font-family: inherit;
}

.track-btn:hover {
  background: rgba(90, 184, 160, 0.15);
  border-color: rgba(90, 184, 160, 0.4);
}

/* ---- 按钮样式 ---- */
.stylus-btn {
  font-size: 13px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--text-secondary);
}

.stylus-btn:hover {
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-primary);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.stylus-btn-primary {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.stylus-btn-primary:hover {
  background: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.35);
}

.stylus-btn-danger {
  background: rgba(200, 120, 100, 0.12);
  color: #c87864;
  border-color: rgba(200, 120, 100, 0.2);
}

.stylus-btn-danger:hover {
  background: rgba(200, 120, 100, 0.2);
}

.stylus-icon {
  font-size: 16px;
  font-weight: 300;
}

.scroll-item-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  position: relative;
}

.scroll-item-btn:hover {
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-primary);
}

.scroll-item-btn.active {
  color: var(--accent);
}

.btn-glow {
  position: absolute;
  inset: -2px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  animation: pulse-glow 2s ease-in-out infinite;
}

.scroll-item-btn--edit:hover {
  color: var(--accent);
}

.scroll-item-btn--delete:hover {
  color: #c87864;
  background: rgba(200, 120, 100, 0.1);
}

.drag-handle {
  cursor: grab;
  font-size: 14px;
  color: var(--text-secondary);
  opacity: 0.25;
  user-select: none;
  transition: opacity var(--transition);
  padding: 2px;
  line-height: 1;
}

.drag-handle:hover {
  opacity: 0.6;
}

/* ---- 空状态 ---- */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---- 弹窗 ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 7, 6, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
}

.modal-panel {
  background: linear-gradient(160deg, rgba(26, 22, 18, 0.98), rgba(20, 17, 14, 0.98));
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 18px;
  padding: 32px;
  width: 460px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  position: relative;
}

.modal-panel-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.modal-confirm {
  width: 380px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
  text-align: center;
  font-family: var(--font-heading-zh);
}

.confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.7;
  text-align: center;
}

.confirm-text strong {
  color: var(--accent);
}

/* ---- 表单 ---- */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.form-input,
.form-textarea,
.form-select {
  font-family: inherit;
  font-size: 14px;
  padding: 11px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition);
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.06);
}

.form-textarea {
  resize: vertical;
  min-height: 72px;
}

.form-select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23d4a574' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 { flex: 1; }

.type-selector {
  display: flex;
  gap: 8px;
}

.type-option {
  flex: 1;
  font-size: 12px;
  padding: 9px 4px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  text-align: center;
}

.type-option:hover {
  background: var(--card-bg);
  color: var(--text-primary);
}

.type-option.selected {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.tracking-config {
  padding: 18px;
  border-radius: 12px;
  background: rgba(90, 184, 160, 0.04);
  border: 1px solid rgba(90, 184, 160, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* ---- 超级自定义 · 合规覆盖 ---- */
.override-section {
  margin-bottom: 48px;
  position: relative;
  z-index: 1;
}

.override-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.override-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.override-card:hover {
  background: rgba(55, 48, 40, 0.4);
  border-color: rgba(var(--accent-rgb), 0.15);
}

/* 外部 AI 同意闸：宪法第 I 条硬约束的显式例外，给予克制的警示强调 */
.override-card--gate {
  border-color: rgba(214, 158, 46, 0.35);
}

.override-card--gate:hover {
  border-color: rgba(214, 158, 46, 0.55);
  background: rgba(214, 158, 46, 0.06);
}

.override-info {
  flex: 1;
  min-width: 0;
}

.override-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.override-desc {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* ---- Toggle Switch ---- */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: all var(--transition);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-switch input:checked + .toggle-track {
  background: rgba(var(--accent-rgb), 0.25);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.toggle-switch input:checked + .toggle-track .toggle-thumb {
  left: 20px;
  background: var(--accent);
}

.toggle-switch:hover .toggle-track {
  border-color: rgba(var(--accent-rgb), 0.2);
}

@media (max-width: 640px) {
  .override-grid {
    grid-template-columns: 1fr;
  }
}

/* ---- 动画 ---- */
@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---- 响应式 ---- */

/* 860px: 平板过渡 — 紧凑重排 */
@media (max-width: 860px) {
  .constitution-page {
    padding: 40px 28px 72px;
  }

  .scroll-title {
    font-size: 28px;
  }

  .scroll-item {
    padding: 14px 16px;
  }

  .parchment-inner {
    padding: 28px 24px;
  }
}

@media (max-width: 640px) {
  .constitution-page {
    padding: 32px 16px 60px;
  }

  .pillars-grid {
    grid-template-columns: 1fr;
  }

  .scroll-title {
    font-size: 26px;
  }

  .scroll-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .scroll-item-right {
    width: 100%;
    justify-content: flex-end;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
  }

  .section-header-actions {
    margin-left: 0;
  }

  .type-selector {
    flex-wrap: wrap;
  }

  .parchment-inner {
    padding: 28px 20px;
  }
}

/* 480px: 极紧凑 — 窄屏 */
@media (max-width: 480px) {
  .scroll-title {
    font-size: 22px;
  }

  .pillars-grid {
    grid-template-columns: 1fr;
  }

  .scroll-item {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
  }

  .scroll-item-left {
    flex: 1;
    min-width: 0;
  }

  .scroll-item-right {
    width: auto;
    justify-content: flex-end;
  }

  .parchment-inner {
    padding: 16px;
  }

  .section-header {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .section-header-actions {
    margin-left: auto;
  }
}

/* ---- 宪法效果概览 ---- */
.constitution-effect-summary {
  margin-bottom: 20px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(160, 200, 180, 0.06);
  border: 1px solid rgba(160, 200, 180, 0.12);
  transition: all var(--transition);
}

.effect-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--accent-cyan, #8bc4b0);
}

.effect-summary-icon {
  font-size: 14px;
  opacity: 0.7;
}

.effect-summary-text {
  font-weight: 500;
}

.effect-summary-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(160, 200, 180, 0.08);
}

.effect-summary-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(160, 200, 180, 0.08);
  border: 1px solid rgba(160, 200, 180, 0.1);
}

.effect-target-label {
  color: var(--accent-cyan, #8bc4b0);
  font-weight: 500;
}

.effect-target-sources {
  color: var(--text-secondary);
  font-size: 10px;
}

/* ---- 效果预览 ---- */
.scroll-item-effects {
  margin-top: 6px;
}

.effect-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition);
}

.effect-toggle:hover {
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.effect-toggle-icon {
  font-size: 8px;
  transition: transform var(--transition);
}

.effect-toggle-label {
  font-size: 10px;
  letter-spacing: 0.3px;
}

.effect-preview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.effect-preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  line-height: 1.5;
  padding: 3px 0;
}

.effect-preview-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.badge-enable {
  background: rgba(90, 184, 160, 0.12);
  color: var(--accent-cyan, #8bc4b0);
}

.badge-disable {
  background: rgba(200, 120, 100, 0.12);
  color: #c87864;
}

.badge-adjust {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.effect-preview-target {
  color: var(--text-secondary);
  font-weight: 500;
  flex-shrink: 0;
}

.effect-preview-desc {
  color: var(--text-secondary);
  font-size: 10px;
}

/* 效果预览展开/收起动画 */
.effect-slide-enter-active {
  transition: all 0.2s ease-out;
}
.effect-slide-leave-active {
  transition: all 0.15s ease-in;
}
.effect-slide-enter-from,
.effect-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 响应式：效果概览 */
@media (max-width: 640px) {
  .effect-summary-detail {
    flex-direction: column;
  }
}

/* ---- C2-EXT · 中性检测词表本地扩展 ---- */
.neutral-ext-section {
  margin-top: 40px;
}

.neutral-ext-coverage {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 22px;
}

.coverage-pill {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 999px;
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.coverage-pill--threshold {
  font-variant-numeric: tabular-nums;
}

.threshold-input {
  width: 46px;
  font-family: inherit;
  font-size: 12px;
  text-align: center;
  padding: 3px 4px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-primary);
  outline: none;
}
.threshold-input:focus {
  border-color: var(--accent);
}

.neutral-ext-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.neutral-ext-card {
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 14px;
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.neutral-ext-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.neutral-ext-card-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.neutral-ext-card-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  border-radius: 999px;
  padding: 2px 9px;
}

.neutral-ext-card-hint {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
}

.neutral-ext-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
  align-items: center;
}

.neutral-ext-empty {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
  font-style: italic;
}

.neutral-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-primary);
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 8px;
  padding: 3px 6px 3px 9px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.neutral-tag-del {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  border-radius: 4px;
  transition: color var(--transition);
}
.neutral-tag-del:hover {
  color: var(--accent);
}

.neutral-ext-add {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.neutral-ext-input {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 9px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition);
}
.neutral-ext-input:focus {
  border-color: var(--accent);
}

.neutral-ext-add-btn {
  flex: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 9px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  cursor: pointer;
  transition: background var(--transition);
}
.neutral-ext-add-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
}

@media (max-width: 640px) {
  .neutral-ext-coverage {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>