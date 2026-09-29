<template>
  <section class="rlp">
    <div class="rlp-head">
      <div class="rlp-title-wrap">
        <span class="rlp-title">🧁 犒赏账本</span>
        <span class="rlp-sub">把兑现留下分量：成本、寄语、节奏与里程碑</span>
      </div>
    </div>

    <!-- 犒赏建议：由今日专注心流兑换而来 -->
    <div v-if="suggestion" class="rlp-suggest">
      <p class="rlp-suggest-kicker">今日已专注 {{ Math.round(todayFocusMinutes) }} 分钟，犒赏自己吧</p>
      <div class="rlp-suggest-main">
        <span class="rlp-suggest-icon">{{ suggestion.icon || '🎁' }}</span>
        <div class="rlp-suggest-body">
          <span class="rlp-suggest-title">{{ suggestion.title }}</span>
          <span v-if="suggestion.cost" class="rlp-suggest-cost">成本 {{ suggestion.cost }}</span>
        </div>
        <button class="rlp-suggest-redeem" @click="redeemSuggestion">兑现</button>
      </div>
      <input
        v-model="noteDraft"
        class="rlp-note-input"
        placeholder="此刻留一句兑现寄语（可选）"
        maxlength="60"
      />
      <span v-if="redeemedMsg" class="rlp-redeemed-msg">{{ redeemedMsg }}</span>
    </div>

    <!-- 账本统计 -->
    <div class="rlp-stats">
      <div class="rlp-stat"><b>{{ ledger.totalRedeemed }}</b><span>兑现次数</span></div>
      <div class="rlp-stat"><b>{{ ledger.totalCost }}</b><span>总成本</span></div>
      <div class="rlp-stat"><b>{{ ledger.cadenceDays ?? '—' }}</b><span>平均节奏(天)</span></div>
      <div class="rlp-stat"><b>{{ ledger.noteRate }}%</b><span>留过寄语</span></div>
    </div>

    <!-- 里程碑 -->
    <div class="rlp-milestones">
      <span class="rlp-milestone-label">犒赏里程碑</span>
      <span
        v-for="m in REWARD_MILESTONES"
        :key="m"
        class="rlp-milestone"
        :class="{ reached: milestones.reached.includes(m), next: milestones.next === m }"
      >{{ m }}次</span>
    </div>

    <!-- 按月分布 -->
    <div v-if="ledger.byMonth.length" class="rlp-months">
      <div v-for="m in ledger.byMonth.slice(0, 6)" :key="m.key" class="rlp-month" :title="`${m.label}：${m.count} 次`">
        <span class="rlp-month-label">{{ m.label }}</span>
        <div class="rlp-month-track">
          <div class="rlp-month-fill" :style="{ width: monthPct(m.count) }"></div>
        </div>
        <span class="rlp-month-count">{{ m.count }}</span>
      </div>
    </div>

    <!-- 最近兑现 -->
    <div v-if="ledger.recent.length" class="rlp-recent">
      <h4 class="rlp-section-title">最近兑现</h4>
      <ul class="rlp-recent-list">
        <li v-for="r in ledger.recent" :key="r.id" class="rlp-recent-item">
          <span class="rlp-recent-icon">{{ r.icon || '🎁' }}</span>
          <div class="rlp-recent-main">
            <span class="rlp-recent-title">{{ r.title }}</span>
            <span v-if="r.note" class="rlp-recent-note">「{{ r.note }}」</span>
          </div>
          <span class="rlp-recent-meta">{{ fmtDate(r.redeemedAt) }}</span>
        </li>
      </ul>
    </div>
    <p v-if="ledger.totalRedeemed === 0" class="rlp-empty">还没兑现过任何犒赏。先设一条奖励，好好对待自己。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSelfReward } from '../modules/self-reward'
import { getTodayFocusTime } from '../modules/timer'
import { rewardLedger, redemptionMilestones, suggestReward, REWARD_MILESTONES } from '../modules/self-reward/reward-machine'

const { rewards, redeem } = useSelfReward()
const noteDraft = ref('')
const redeemedMsg = ref('')
const tick = ref(0)

const todayFocusMinutes = computed(() => getTodayFocusTime() / 60000)
const ledger = computed(() => rewardLedger(rewards.value))
const milestones = computed(() => redemptionMilestones(rewards.value))
const suggestion = computed(() => {
  void tick.value
  return suggestReward(rewards.value, todayFocusMinutes.value)
})

function monthPct(count: number): string {
  const max = Math.max(1, ...ledger.value.byMonth.map((m) => m.count))
  return `${Math.max(8, Math.round((count / max) * 100))}%`
}

function redeemSuggestion() {
  if (!suggestion.value) return
  redeem(suggestion.value.id, { note: noteDraft.value || undefined })
  noteDraft.value = ''
  redeemedMsg.value = `已兑现「${suggestion.value.title}」· 好好享受这一刻`
  tick.value++
  setTimeout(() => { redeemedMsg.value = '' }, 4000)
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

onMounted(() => { tick.value++ })
</script>

<style scoped>
.rlp { display: flex; flex-direction: column; gap: 14px; margin-top: 4px; }
.rlp-head { display: flex; flex-direction: column; gap: 2px; }
.rlp-title { font-size: 15px; font-weight: 500; }
.rlp-sub { font-size: 11px; color: var(--text-secondary); }

.rlp-suggest { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border-radius: 12px; background: rgba(232,192,96,0.07); border: 1px solid rgba(232,192,96,0.3); }
.rlp-suggest-kicker { margin: 0; font-size: 12px; color: var(--accent, #d4a574); }
.rlp-suggest-main { display: flex; align-items: center; gap: 12px; }
.rlp-suggest-icon { font-size: 1.6rem; }
.rlp-suggest-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.rlp-suggest-title { font-size: 14px; color: var(--text-high); }
.rlp-suggest-cost { font-size: 11px; color: var(--text-secondary); }
.rlp-suggest-redeem { flex-shrink: 0; padding: 6px 14px; border-radius: 8px; cursor: pointer; background: rgba(232,192,96,0.18); border: 1px solid rgba(232,192,96,0.45); color: var(--accent, #d4a574); font-size: 12px; }
.rlp-suggest-redeem:hover { background: rgba(232,192,96,0.3); }
.rlp-note-input { width: 100%; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: var(--bg-panel, #1a1612)); color: var(--text-high); font-size: 12px; }
.rlp-redeemed-msg { font-size: 12px; color: #e8c060; }

.rlp-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.rlp-stat { flex: 1; min-width: 90px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
.rlp-stat b { font-size: 18px; font-weight: 600; color: var(--text-high); font-variant-numeric: tabular-nums; }
.rlp-stat span { font-size: 11px; color: var(--text-secondary); }

.rlp-milestones { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rlp-milestone-label { font-size: 12px; color: var(--text-secondary); margin-right: 4px; }
.rlp-milestone { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); }
.rlp-milestone.reached { background: rgba(138,154,122,0.14); border-color: rgba(138,154,122,0.45); color: #8a9a7a; }
.rlp-milestone.next { background: rgba(232,192,96,0.16); border-color: rgba(232,192,96,0.5); color: var(--accent, #d4a574); }

.rlp-months { display: flex; flex-direction: column; gap: 6px; }
.rlp-month { display: flex; align-items: center; gap: 10px; }
.rlp-month-label { flex: 0 0 48px; font-size: 12px; color: var(--text-secondary); }
.rlp-month-track { flex: 1; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.rlp-month-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #e8c060, #d68a4a); }
.rlp-month-count { flex: 0 0 18px; font-size: 12px; color: var(--text-medium); text-align: right; font-variant-numeric: tabular-nums; }

.rlp-section-title { margin: 4px 0; font-size: 13px; color: var(--text-medium); }
.rlp-recent-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rlp-recent-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: var(--bg-surface, rgba(255, 255, 255, 0.03)); border: 1px solid rgba(255,255,255,0.07); }
.rlp-recent-icon { font-size: 15px; }
.rlp-recent-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rlp-recent-title { font-size: 13px; color: var(--text-high); }
.rlp-recent-note { font-size: 12px; color: var(--text-secondary); font-style: italic; }
.rlp-recent-meta { flex-shrink: 0; font-size: 11px; color: var(--text-secondary); }
.rlp-empty { margin: 0; font-size: 12px; color: var(--text-secondary); opacity: 0.8; }
</style>