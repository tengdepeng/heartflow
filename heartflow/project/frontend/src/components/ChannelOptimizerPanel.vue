<template>
  <section class="cop" aria-label="渠道优化">
    <div class="cop-head">
      <span class="cop-title">📈 渠道优化</span>
      <span class="cop-sub">概览 · 建议 · 组合 · 时段 · 历史</span>
    </div>

    <div class="cop-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="cop-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 概览 -->
    <template v-if="tab === 'overview'">
      <div class="cop-stats">
        <div class="cop-stat">
          <span class="cop-stat-value">{{ state.totalOptimizations }}</span>
          <span class="cop-stat-label">累计优化</span>
        </div>
        <div class="cop-stat">
          <span class="cop-stat-value">{{ state.cumulativeImprovement }}%</span>
          <span class="cop-stat-label">累计提升</span>
        </div>
        <div class="cop-stat">
          <span class="cop-stat-value">{{ activeSuggestions.length }}</span>
          <span class="cop-stat-label">待处理建议</span>
        </div>
      </div>
      <div class="cop-state-row">
        <span class="cop-state-label">自动优化</span>
        <button class="cop-toggle" :class="{ on: state.autoOptimizeEnabled }" @click="handleToggleAuto">
          {{ state.autoOptimizeEnabled ? '已启用' : '已停用' }}
        </button>
        <span v-if="needsOptimization" class="cop-badge">需要优化</span>
      </div>
      <p v-if="state.lastOptimizedAt" class="cop-last">上次优化：{{ formatTime(state.lastOptimizedAt) }}</p>
      <div v-if="recentHistory.length" class="cop-mini-history">
        <div v-for="rec in recentHistory" :key="rec.id" class="cop-mini-item">
          <span class="cop-mini-action">{{ actionLabel(rec.action) }}</span>
          <span class="cop-mini-channel">{{ channelLabel(rec.channel) }}</span>
          <span class="cop-mini-effect" :class="`eff-${rec.effect}`">{{ effectLabel(rec.effect) }}</span>
        </div>
      </div>
      <p v-else class="cop-empty">暂无优化历史。</p>
    </template>

    <!-- 建议 -->
    <template v-else-if="tab === 'suggestions'">
      <div v-if="activeSuggestions.length" class="cop-list">
        <div v-for="s in activeSuggestions" :key="s.id" class="cop-sug" :class="`sev-${s.severity}`">
          <div class="cop-sug-head">
            <span class="cop-sug-sev">{{ severityLabel(s.severity) }}</span>
            <span class="cop-sug-title">{{ s.title }}</span>
          </div>
          <p class="cop-sug-desc">{{ s.description }}</p>
          <div class="cop-sug-metric">
            <span>{{ s.currentValue }}</span>
            <span class="cop-sug-arrow">→</span>
            <span>{{ s.suggestedValue }}</span>
            <span class="cop-sug-improve">+{{ s.expectedImprovement }}</span>
          </div>
          <div class="cop-sug-actions">
            <span class="cop-sug-conf">置信度 {{ Math.round(s.confidence * 100) }}%</span>
            <button class="cop-btn--small" @click="handleApply(s.id)">应用建议</button>
          </div>
        </div>
      </div>
      <p v-else class="cop-empty">暂无待处理建议。</p>
    </template>

    <!-- 组合 -->
    <template v-else-if="tab === 'combos'">
      <div v-if="recommendations.length" class="cop-list">
        <div v-for="c in recommendations" :key="c.id" class="cop-combo">
          <div class="cop-combo-head">
            <span class="cop-combo-name">{{ c.name }}</span>
            <span class="cop-combo-score">{{ c.expectedScore }} 分</span>
          </div>
          <p class="cop-combo-desc">{{ c.description }}</p>
          <div class="cop-combo-channels">
            <span v-for="ch in c.channels" :key="ch" class="cop-combo-channel">{{ channelLabel(ch) }}</span>
          </div>
          <div class="cop-combo-meta">
            <span>场景：{{ c.scenarios.join('、') }}</span>
            <span>置信度 {{ Math.round(c.confidence * 100) }}%</span>
          </div>
        </div>
      </div>
      <p v-else class="cop-empty">暂无组合推荐。</p>
    </template>

    <!-- 时段 -->
    <template v-else-if="tab === 'time'">
      <template v-if="timeSlots">
        <div class="cop-block">
          <span class="cop-block-label">最佳时段</span>
          <div class="cop-hours">
            <span v-for="h in timeSlots.bestHours" :key="h.hour" class="cop-hour cop-hour--best">{{ h.label }}</span>
          </div>
        </div>
        <div class="cop-block">
          <span class="cop-block-label">最差时段</span>
          <div class="cop-hours">
            <span v-for="h in timeSlots.worstHours" :key="h.hour" class="cop-hour cop-hour--worst">{{ h.label }}</span>
          </div>
        </div>
        <div class="cop-block">
          <span class="cop-block-label">建议推送窗口</span>
          <div v-for="w in timeSlots.recommendedWindows" :key="w.label" class="cop-window cop-window--rec">
            {{ w.label }}
          </div>
        </div>
        <div class="cop-block">
          <span class="cop-block-label">避开窗口</span>
          <div v-for="w in timeSlots.avoidWindows" :key="w.label" class="cop-window cop-window--avoid">
            {{ w.label }}
          </div>
        </div>
      </template>
      <p v-else class="cop-empty">暂无时段分析。</p>
    </template>

    <!-- 历史 -->
    <template v-else>
      <div v-if="state.history.length" class="cop-list">
        <div v-for="rec in state.history" :key="rec.id" class="cop-hist">
          <div class="cop-hist-head">
            <span class="cop-hist-action">{{ actionLabel(rec.action) }}</span>
            <span class="cop-hist-channel">{{ channelLabel(rec.channel) }}</span>
            <span class="cop-hist-effect" :class="`eff-${rec.effect}`">{{ effectLabel(rec.effect) }}</span>
          </div>
          <div class="cop-hist-meta">
            <span>{{ rec.beforeValue }} → {{ rec.afterValue }}</span>
            <span>{{ formatTime(rec.appliedAt) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="cop-empty">暂无优化历史。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useChannelOptimizer } from '../modules/touchpoints/channel-optimizer'
import type { ChannelPerformance, HourlyPerformance } from '../modules/touchpoints/touch-analytics'
import type { ChannelConfig, PushRecord } from '../modules/touchpoints/push-channel'

const props = defineProps<{
  performances: ChannelPerformance[]
  hourlyPerformance: HourlyPerformance[]
  channels: ChannelConfig[]
  records: PushRecord[]
}>()

const {
  optimizerState,
  recommendations,
  timeSlots,
  activeSuggestions,
  recentHistory,
  needsOptimization,
  refreshSuggestions,
  refreshRecommendations,
  analyzeTimeSlots,
  applySuggestion,
  enableAutoOptimize,
  disableAutoOptimize,
} = useChannelOptimizer()

const state = computed(() => optimizerState.value)

const tab = ref<'overview' | 'suggestions' | 'combos' | 'time' | 'history'>('overview')
const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'suggestions', label: '建议' },
  { key: 'combos', label: '组合' },
  { key: 'time', label: '时段' },
  { key: 'history', label: '历史' },
] as const

function regenerate() {
  if (props.performances.length && props.hourlyPerformance.length) {
    refreshSuggestions(props.performances, props.channels, props.records, props.hourlyPerformance)
    refreshRecommendations(props.performances)
    analyzeTimeSlots(props.hourlyPerformance)
  }
}

onMounted(regenerate)
watch(
  () => [props.performances, props.hourlyPerformance, props.records],
  regenerate,
)

const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
  positive: '正向',
}

function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity
}

const ACTION_LABELS: Record<string, string> = {
  increase_priority: '提升优先级',
  decrease_priority: '降低优先级',
  enable_channel: '启用渠道',
  disable_channel: '停用渠道',
  adjust_max_daily: '调整日上限',
  adjust_preferred_hours: '调整时段',
  swap_channel_order: '调整顺序',
  add_fallback: '添加降级',
  remove_fallback: '移除降级',
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

const EFFECT_LABELS: Record<string, string> = {
  improved: '改善',
  no_change: '无变化',
  degraded: '退化',
}

function effectLabel(effect: string): string {
  return EFFECT_LABELS[effect] ?? effect
}

const CHANNEL_LABELS: Record<string, string> = {
  browser: '浏览器',
  desktop: '桌面',
  email: '邮件',
  'in-app': '应用内',
  widget: '小组件',
}

function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel
}

function handleToggleAuto(): void {
  if (state.value.autoOptimizeEnabled) {
    disableAutoOptimize()
  } else {
    enableAutoOptimize(24)
  }
}

function handleApply(id: string): void {
  applySuggestion(id, props.channels)
}

function formatTime(ts: string): string {
  return ts.slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.cop {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.cop-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.cop-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.cop-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.cop-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cop-tab {
  padding: 5px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  font-size: 12px;
  cursor: pointer;
}
.cop-tab.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.cop-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.cop-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.05);
  border: 1px solid rgba(240, 192, 64, 0.12);
  min-width: 72px;
}
.cop-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #f0c040;
}
.cop-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.55));
}
.cop-state-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cop-state-label {
  font-size: 13px;
  color: var(--text-primary, #e8e6e1);
}
.cop-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.55));
  font-size: 11px;
  cursor: pointer;

  min-height: 26px;
}
.cop-toggle.on {
  border-color: #8a9a7a;
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.1);
}
.cop-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  background: rgba(196, 106, 90, 0.14);
  color: #c46a5a;
}
.cop-last {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.cop-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cop-sug,
.cop-combo,
.cop-hist {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.cop-sug-head,
.cop-combo-head,
.cop-hist-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cop-sug-sev {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.sev-critical .cop-sug-sev {
  background: rgba(196, 106, 90, 0.14);
  color: #c46a5a;
}
.sev-warning .cop-sug-sev {
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.sev-info .cop-sug-sev {
  background: rgba(107, 159, 196, 0.14);
  color: #6b9fc4;
}
.sev-positive .cop-sug-sev {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.cop-sug-title,
.cop-combo-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e6e1);
}
.cop-sug-desc,
.cop-combo-desc {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.55));
  line-height: 1.5;
  margin: 8px 0;
}
.cop-sug-metric {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary, #e8e6e1);
  margin-bottom: 8px;
}
.cop-sug-arrow {
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.cop-sug-improve {
  color: #8a9a7a;
}
.cop-sug-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cop-sug-conf {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
  margin-right: auto;
}
.cop-btn--small {
  padding: 4px 12px;
  border: 1px solid #f0c040;
  border-radius: 8px;
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
  font-size: 11px;
  cursor: pointer;
}
.cop-combo-score {
  font-size: 12px;
  color: #f0c040;
  flex-shrink: 0;
}
.cop-combo-channels {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.cop-combo-channel {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(240, 192, 64, 0.08);
  color: rgba(240, 192, 64, 0.6);
}
.cop-combo-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.cop-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cop-block-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.55));
}
.cop-hours {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cop-hour {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
}
.cop-hour--best {
  background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a;
}
.cop-hour--worst {
  background: rgba(196, 106, 90, 0.14);
  color: #c46a5a;
}
.cop-window {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 4px;
}
.cop-window--rec {
  background: rgba(138, 154, 122, 0.1);
  color: #8a9a7a;
}
.cop-window--avoid {
  background: rgba(196, 106, 90, 0.1);
  color: #c46a5a;
}
.cop-mini-history {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cop-mini-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
}
.cop-mini-action,
.cop-hist-action {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(240, 192, 64, 0.12);
  color: #f0c040;
}
.cop-mini-channel,
.cop-hist-channel {
  flex: 1;
  color: var(--text-primary, #e8e6e1);
}
.cop-mini-effect,
.cop-hist-effect {
  font-size: 10px;
}
.eff-improved {
  color: #8a9a7a;
}
.eff-no_change {
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.eff-degraded {
  color: #c46a5a;
}
.cop-hist-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
  margin-top: 6px;
}
.cop-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
  padding: 16px 0;
  text-align: center;
}
</style>
