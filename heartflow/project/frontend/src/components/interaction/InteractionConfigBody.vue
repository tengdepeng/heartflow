<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import {
  detectConflicts,
  sortRulesByPriority,
  removeRuleFromConfig,
  INTERACTION_LABELS,
  ACTION_LABELS,
} from '../../modules/customization/interaction-engine'
import type {
  InteractionConfig,
  InteractionRule,
  RuleConflict,
} from '../../modules/customization/interaction-engine'
import { useInteractionConfigs } from '../../modules/interaction'
import { BaseCard, BaseButton } from '../ui'

// 从 InteractionConfig 抽取的自包含「配置展开体」：全局设置 + 规则列表 + 冲突检测。
// 多数操作直接改 props 上的嵌套属性（config 与 store 同一对象引用）后由 save() 落盘；
// removeRule 例外——它走引擎的不可变 removeRuleFromConfig，故需显式写回 store 数组下标。
const { config } = defineProps<{ config: InteractionConfig }>()
const emit = defineEmits<{
  addRule: []
  editRule: [rule: InteractionRule]
}>()

const { configs, save } = useInteractionConfigs()

const conflicts = computed<RuleConflict[]>(() => detectConflicts(config.rules))
// 展示顺序按 priority 降序；sortRulesByPriority 内部为 [...rules].sort()，
// 不改原数组，故存储顺序仍是用户的添加序。
const sortedRules = computed<InteractionRule[]>(() => sortRulesByPriority(config.rules))

function toggleSetting(key: string) {
  const settings = config.settings as any
  settings[key] = !settings[key]
  config.updatedAt = new Date().toISOString()
  save()
}

function toggleRule(ruleId: string) {
  const rule = config.rules.find(r => r.id === ruleId)
  if (!rule) return
  rule.enabled = !rule.enabled
  rule.updatedAt = new Date().toISOString()
  save()
}

function removeRule(ruleId: string) {
  // removeRuleFromConfig 返回新 config 对象，需写回 store 数组对应下标才能落盘
  const idx = configs.value.findIndex(c => c.id === config.id)
  if (idx < 0) return
  configs.value[idx] = removeRuleFromConfig(configs.value[idx], ruleId)
  save()
}
</script>

<template>
  <div class="config-body">
    <!-- 全局设置 -->
    <BaseCard class="settings-panel">
      <h4 class="panel-title">全局设置</h4>
      <div class="settings-grid">
        <label class="setting-item">
          <input type="checkbox" :checked="config.settings.gestureEnabled" @change="toggleSetting('gestureEnabled')" />
          <span>启用手势</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" :checked="config.settings.soundEnabled" @change="toggleSetting('soundEnabled')" />
          <span>启用音效</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" :checked="config.settings.animationEnabled" @change="toggleSetting('animationEnabled')" />
          <span>启用动画</span>
        </label>
        <label class="setting-item">
          <input type="checkbox" :checked="config.settings.hapticEnabled" @change="toggleSetting('hapticEnabled')" />
          <span>触觉反馈</span>
        </label>
        <div class="setting-item">
          <span class="setting-label">动画速度</span>
          <input type="range" min="0.5" max="2.0" step="0.1" :value="config.settings.animationSpeed" class="setting-range" />
          <span class="setting-val">{{ config.settings.animationSpeed }}x</span>
        </div>
        <div class="setting-item">
          <span class="setting-label">双击延迟</span>
          <span class="setting-val">{{ config.settings.doubleTapDelay }}ms</span>
        </div>
        <div class="setting-item">
          <span class="setting-label">长按时间</span>
          <span class="setting-val">{{ config.settings.longPressDuration }}ms</span>
        </div>
      </div>
    </BaseCard>

    <!-- 规则列表 -->
    <BaseCard class="rules-panel">
      <div class="rules-header">
        <h4 class="panel-title">交互规则</h4>
        <BaseButton variant="ghost" @click="emit('addRule')">+ 添加规则</BaseButton>
      </div>

      <div v-if="config.rules.length === 0" class="rules-empty">
        暂无规则，点击"添加规则"开始配置
      </div>

      <div
        v-for="rule in sortedRules"
        :key="rule.id"
        :class="['rule-item', { disabled: !rule.enabled }]"
      >
        <div class="rule-header">
          <span class="rule-name">{{ rule.name }}</span>
          <div class="rule-actions">
            <button
              :class="['rule-toggle', { on: rule.enabled }]"
              @click="toggleRule(rule.id)"
              :title="rule.enabled ? '禁用' : '启用'"
            >{{ rule.enabled ? '●' : '○' }}</button>
            <button class="rule-btn" @click="emit('editRule', rule)" title="编辑">✏</button>
            <button class="rule-btn rule-btn-del" @click="removeRule(rule.id)" title="删除">×</button>
          </div>
        </div>
        <div class="rule-detail">
          <span :class="['rule-chip', 'chip-type']">{{ INTERACTION_LABELS[rule.type] }}</span>
          <span class="rule-arrow">→</span>
          <span :class="['rule-chip', 'chip-action']">{{ ACTION_LABELS[rule.action] }}</span>
          <span class="rule-target">目标: {{ rule.target }}</span>
          <span class="rule-priority">优先级 {{ rule.priority }}</span>
        </div>
        <div class="rule-scenes" v-if="rule.scenes.length > 0 && rule.scenes[0] !== '*'">
          <span class="scene-tag" v-for="s in rule.scenes" :key="s">{{ s }}</span>
        </div>
      </div>
    </BaseCard>

    <!-- 冲突检测 -->
    <BaseCard v-if="conflicts.length > 0" class="conflicts-panel">
      <h4 class="panel-title panel-warn">⚠ 规则冲突 ({{ conflicts.length }})</h4>
      <div class="conflict-item" v-for="(c, idx) in conflicts" :key="idx">
        <span class="conflict-text">{{ c.reason }}</span>
        <div class="conflict-rules">
          <span class="conflict-rule-name">{{ c.ruleA.name }}</span>
          <span class="conflict-vs">vs</span>
          <span class="conflict-rule-name">{{ c.ruleB.name }}</span>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
/* 卡片外壳由 <BaseCard> 提供；以下为 config-body 内部 BEM 样式 */
.config-body {
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 全局设置面板：外壳交 BaseCard，仅保留内部排版 */
.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.panel-warn { color: var(--yellow); }

.settings-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
}

.setting-item input[type="checkbox"] {
  accent-color: var(--accent);
}

.setting-label { min-width: 50px; }

.setting-range {
  width: 80px;
  accent-color: var(--accent);
}

.setting-val {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
  min-width: 40px;
}

/* 规则面板：内部 flex 布局（外壳交 BaseCard） */
.rules-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rules-empty {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.25);
}

.rule-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
  transition: border-color 0.2s;
}

.rule-item.disabled { opacity: 0.5; }

.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.rule-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.6);
}

.rule-actions { display: flex; align-items: center; gap: 2px; }

/* 图标按钮（启用/编辑/删除）保留自定义样式：BaseButton 不覆盖图标按钮，属诚实边界 */
.rule-toggle {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--accent-rgb), 0.25);
}

.rule-toggle.on { color: var(--green); }
.rule-toggle:hover { background: rgba(var(--accent-rgb), 0.08); }

.rule-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rule-btn:hover { background: rgba(var(--accent-rgb), 0.08); color: rgba(var(--accent-rgb), 0.5); }
.rule-btn-del:hover { color: #ef4444; }

.rule-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rule-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
}

.chip-type { background: rgba(108, 156, 245, 0.1); color: var(--accent); }
.chip-action { background: rgba(245, 158, 108, 0.1); color: var(--accent2); }

.rule-arrow {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.2);
}

.rule-target {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  font-family: monospace;
}

.rule-priority {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.25);
  margin-left: auto;
}

.rule-scenes {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.scene-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.05);
  color: rgba(var(--accent-rgb), 0.3);
}

/* 冲突面板：在 BaseCard 外壳上叠加警告色调 */
.conflicts-panel {
  padding: 12px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.1);
}

.conflict-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(240, 192, 64, 0.06);
}

.conflict-item:last-child { border-bottom: none; }

.conflict-text {
  font-size: 12px;
  color: var(--yellow);
  display: block;
  margin-bottom: 4px;
}

.conflict-rules {
  display: flex;
  align-items: center;
  gap: 6px;
}

.conflict-rule-name {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.04);
}

.conflict-vs {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.2);
}

/* 适配紧凑面板：微调 BaseButton 尺寸，消费共享基类同时保持克制 */
.config-body :deep(.hf-btn) {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
}
</style>
