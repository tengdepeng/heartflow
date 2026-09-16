<template>
  <section class="wrp" aria-label="劳酬联动">
    <div class="wrp-head">
      <div class="wrp-title-wrap">
        <span class="wrp-title">劳酬联动</span>
        <span class="wrp-sub">工作日志 · 自动变现，让每一次记录都有回响</span>
      </div>
      <span class="wrp-tag" :class="{ off: !bridge.config.value.enabled }">
        {{ bridge.config.value.enabled ? '已开启' : '已停用' }}
      </span>
    </div>

    <!-- 桥接统计 -->
    <div class="wrp-stats">
      <div class="wrp-stat"><b>{{ stats.totalMappings }}</b><span>累计映射</span></div>
      <div class="wrp-stat"><b>{{ fmtMoney(stats.totalIncome) }}</b><span>累计收入</span></div>
      <div class="wrp-stat"><b>{{ stats.todayMappings }}</b><span>今日</span></div>
      <div class="wrp-stat"><b>{{ fmtMoney(stats.todayIncome) }}</b><span>今日收入</span></div>
    </div>

    <!-- 批量桥接 -->
    <div class="wrp-bridge">
      <div class="wrp-bridge-info">
        <span class="wrp-block-label">待桥接日志</span>
        <span class="wrp-bridge-estimate" v-if="estimate.count > 0">
          预估 {{ estimate.count }} 条 · 约 {{ fmtMoney(estimate.total) }}
        </span>
        <span class="wrp-bridge-estimate" v-else>没有可桥接的日志</span>
      </div>
      <button
        type="button"
        class="wrp-btn"
        :disabled="!bridge.config.value.enabled || estimate.count === 0 || bridging"
        @click="bridgeAll"
      >
        {{ bridging ? '桥接中…' : '一键桥接' }}
      </button>
    </div>

    <!-- 配置 -->
    <div class="wrp-config">
      <span class="wrp-block-label">桥接规则</span>
      <div class="wrp-config-row">
        <span class="wrp-config-label">最低内容长度</span>
        <b>{{ bridge.config.value.minContentLength }} 字</b>
      </div>
      <div class="wrp-config-row">
        <span class="wrp-config-label">每日收入上限</span>
        <b>{{ fmtMoney(bridge.config.value.dailyIncomeCap) }}</b>
      </div>
      <div class="wrp-config-row">
        <span class="wrp-config-label">长度加成</span>
        <b>每 100 字 +{{ bridge.config.value.lengthBonusRate }}</b>
      </div>
      <div class="wrp-config-row">
        <span class="wrp-config-label">标签加成</span>
        <b>每个 +{{ bridge.config.value.tagBonusRate }}</b>
      </div>
      <div class="wrp-config-actions">
        <button type="button" class="wrp-btn wrp-btn--sm wrp-btn--ghost" @click="toggleEnabled">
          {{ bridge.config.value.enabled ? '停用' : '启用' }}
        </button>
      </div>
    </div>

    <!-- 映射记录 -->
    <div v-if="mappings.length" class="wrp-mappings">
      <span class="wrp-block-label">映射记录</span>
      <div v-for="m in mappings.slice(0, 8)" :key="m.worklogId" class="wrp-mapping">
        <span class="wrp-mapping-icon">{{ LOG_TYPE_TO_INCOME[logTypeOf(m.worklogId)]?.label ? '📥' : '📤' }}</span>
        <div class="wrp-mapping-info">
          <span class="wrp-mapping-title">{{ m.worklogTitle }}</span>
          <span class="wrp-mapping-meta">{{ categoryLabel(m.category) }} · {{ fmtDate(m.mappedAt) }}</span>
        </div>
        <span class="wrp-mapping-amount pos">+{{ fmtMoney(m.amount) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWorklog } from '../modules/worklog/entries'
import { useReward } from '../modules/reward/reward-list'
import { useWorklogRewardBridge, LOG_TYPE_TO_INCOME } from '../modules/reward/worklog-bridge'
import type { IncomeCategory, ExpenseCategory, RewardRecord as TypeRewardRecord } from '../modules/reward/types'
import type { LogEntryType } from '../modules/worklog/types'
import { INCOME_CATEGORY_META, EXPENSE_CATEGORY_META } from '../modules/reward/types'

const worklog = useWorklog()
const reward = useReward()
const bridging = ref(false)

const bridge = useWorklogRewardBridge(
  () => worklog.entries.value,
  async (type, category, amount, description, projectId, worklogId) => {
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      category,
      amount,
      description,
      at: new Date().toISOString(),
    }
    reward.save([...reward.records.value, record])
    return { ...record, recordedAt: record.at, projectId, worklogId }
  },
  () => reward.records.value as unknown as TypeRewardRecord[],
)

const stats = computed(() => bridge.bridgeStats.value)
const mappings = computed(() => bridge.mappings.value)
const estimate = computed(() => bridge.estimateBatchIncome(worklog.entries.value))

function logTypeOf(worklogId: string): LogEntryType {
  const entry = worklog.entries.value.find(e => e.id === worklogId)
  return entry?.type ?? 'journal'
}

async function bridgeAll() {
  if (bridging.value) return
  bridging.value = true
  try {
    await bridge.bridgeAllUnmapped()
  } finally {
    bridging.value = false
  }
}

function toggleEnabled() {
  bridge.updateConfig({ enabled: !bridge.config.value.enabled })
}

function categoryLabel(cat: string): string {
  return INCOME_CATEGORY_META[cat as IncomeCategory]?.label
    || EXPENSE_CATEGORY_META[cat as ExpenseCategory]?.label
    || cat
}

function fmtMoney(v: number): string {
  return '¥' + Math.round(v).toLocaleString()
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

watch(() => reward.records.value, () => {
  // 记录变化时刷新（映射统计依赖记录列表）
}, { deep: true })
</script>

<style scoped>
.wrp {
  position: relative;
  z-index: 1;
  width: 100%;
  background: rgba(10, 9, 6, 0.55);
  border: 1px solid rgba(232, 192, 96, 0.12);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(14px);
}
.wrp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.wrp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.wrp-title { font-size: 15px; color: rgba(255, 246, 224, 0.92); letter-spacing: 2px; font-weight: 600; }
.wrp-sub { font-size: 11px; color: rgba(232, 192, 96, 0.5); letter-spacing: 0.5px; }
.wrp-tag { font-size: 10px; padding: 3px 10px; border-radius: 12px; background: rgba(138, 154, 122, 0.15); color: #8a9a7a; white-space: nowrap; }
.wrp-tag.off { background: rgba(196, 106, 90, 0.15); color: #c46a5a; }

.wrp-stats { display: flex; gap: 8px; margin-bottom: 12px; }
.wrp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(232, 192, 96, 0.05); }
.wrp-stat b { font-size: 15px; font-weight: 600; color: #e8c060; font-variant-numeric: tabular-nums; }
.wrp-stat span { font-size: 10px; color: rgba(255, 246, 224, 0.4); }

.wrp-block-label { font-size: 10px; color: rgba(255, 246, 224, 0.45); letter-spacing: 1px; }

.wrp-bridge { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: rgba(232, 192, 96, 0.04); border: 1px solid rgba(232, 192, 96, 0.08); margin-bottom: 12px; }
.wrp-bridge-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.wrp-bridge-estimate { font-size: 11px; color: rgba(232, 192, 96, 0.6); }

.wrp-btn {
  border: 1px solid rgba(232, 192, 96, 0.3);
  background: rgba(232, 192, 96, 0.1);
  color: #e8c060;
  font-size: 12px;
  font-family: inherit;
  padding: 8px 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.wrp-btn:hover:not(:disabled) { background: rgba(232, 192, 96, 0.18); border-color: rgba(232, 192, 96, 0.45); }
.wrp-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.wrp-btn--sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 4px 10px; font-size: 11px; 
  min-height: 26px;
}
.wrp-btn--ghost { background: transparent; border-color: rgba(232, 192, 96, 0.15); }

.wrp-config { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(232, 192, 96, 0.08); margin-bottom: 12px; }
.wrp-config-row { display: flex; align-items: center; justify-content: space-between; }
.wrp-config-label { font-size: 11px; color: rgba(255, 246, 224, 0.55); }
.wrp-config-row b { font-size: 12px; color: rgba(255, 246, 224, 0.85); font-weight: 500; }
.wrp-config-actions { display: flex; justify-content: flex-end; margin-top: 4px; }

.wrp-mappings { display: flex; flex-direction: column; gap: 6px; }
.wrp-mapping { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(232, 192, 96, 0.06); }
.wrp-mapping-icon { font-size: 14px; }
.wrp-mapping-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.wrp-mapping-title { font-size: 12px; color: rgba(255, 246, 224, 0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wrp-mapping-meta { font-size: 10px; color: rgba(255, 246, 224, 0.4); }
.wrp-mapping-amount { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.wrp-mapping-amount.pos { color: #8a9a7a; }
</style>
