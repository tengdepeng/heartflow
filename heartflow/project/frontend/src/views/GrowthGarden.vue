<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance gw">
    <RoomLayout title="成长庭院" kicker="播下种子，培育习惯，收获成长" data-enter>
      <template #meta>
        <p class="gw-tended">🌰 {{ seedCount }} 颗种子 · 🔄 {{ habitCount }} 个习惯 · 🌀 {{ cocoonCount }} 枚蜕变光茧</p>

        <!-- 统计概览卡片 -->
        <div class="gw-stats-section">
          <div class="gw-stat-item">
            <span class="gw-stat-value">{{ targetStats.total }}</span>
            <span class="gw-stat-label">目标</span>
          </div>
          <div class="gw-stat-item">
            <span class="gw-stat-value gw-stat-bloom">{{ targetStats.blooming }}</span>
            <span class="gw-stat-label">已开花</span>
          </div>
          <div class="gw-stat-item">
            <span class="gw-stat-value gw-stat-progressing">{{ targetStats.growing }}</span>
            <span class="gw-stat-label">生长中</span>
          </div>
          <div class="gw-stat-item">
            <span class="gw-stat-value gw-stat-dormant">{{ targetStats.dormant }}</span>
            <span class="gw-stat-label">休眠</span>
          </div>
        </div>
      </template>

    <!-- 导出/导入 -->
    <div data-enter class="gw-io-row">
      <button class="gw-btn gw-ghost-btn" @click="exportAll">导出</button>
      <button class="gw-btn gw-ghost-btn" @click="triggerImport">导入</button>
      <input ref="importInput" type="file" accept=".json" style="display:none" @change="importAll" />
    </div>

    <!-- 目标花园（蓝图：留光阁目标的可视化） -->
    <section data-enter>
      <h3>🌳 目标花园</h3>

      <!-- 添加目标表单 -->
      <div class="gw-goal-form">
        <div class="gw-goal-form-row">
          <input v-model="newTargetName" placeholder="一个想培育的目标…" class="gw-input" @keyup.enter="addTarget" />
          <select v-model="newTargetDomain" class="gw-input gw-goal-domain-input">
            <option v-for="d in DOMAINS" :key="d" :value="d">{{ DOMAIN_LABELS[d] }}</option>
          </select>
          <button @click="addTarget" class="gw-btn">种下</button>
        </div>
      </div>

      <!-- 目标列表（每项目标是一株植物） -->
      <div v-if="goal.targets.value.length" class="gw-plant-list">
        <div v-for="g in goal.targets.value" :key="g.id" class="gw-plant" :class="'stage-' + g.status">
          <div class="gw-plant-head">
            <span class="gw-plant-emoji">{{ statusEmoji(g.status) }}</span>
            <span class="gw-plant-name">{{ g.title }}</span>
            <span class="gw-plant-domain" :style="{ color: domainColor(g.domain) }">{{ DOMAIN_LABELS[g.domain] }}</span>
            <span class="gw-plant-status">{{ STATUS_LABELS[g.status] }}</span>
          </div>

          <!-- 子计划（plan） -->
          <div v-if="goal.childrenOf(g.id).length" class="gw-plan-list">
            <div v-for="p in goal.childrenOf(g.id)" :key="p.id" class="gw-plan-row">
              <span class="gw-plan-emoji">{{ statusEmoji(p.status) }}</span>
              <span class="gw-plan-name">{{ p.title }}</span>
              <span class="gw-plan-status">{{ STATUS_LABELS[p.status] }}</span>
              <button v-if="p.tier === 'plan' && p.status !== 'bloom'" class="gw-mini-btn" @click="finishPlan(p)">标记完成</button>
              <button v-else-if="p.status !== 'bloom'" class="gw-mini-btn" @click="promote(p)">推进</button>
            </div>
          </div>

          <!-- 操作 -->
          <div class="gw-plant-actions">
            <button class="gw-mini-btn" @click="promote(g)" :disabled="g.status === 'bloom'">推进</button>
            <button class="gw-mini-btn" @click="toggleSleep(g)">{{ g.status === 'dormant' ? '唤醒' : '休眠' }}</button>
            <button class="gw-mini-btn gw-danger" @click="abandon(g)">放弃→未完成花园</button>
          </div>

          <!-- 开花 → 蜕变光茧 钩子 -->
          <div v-if="g.status === 'bloom'" class="gw-cocoon-hook">
            <p class="gw-cocoon-hint">🌸 已开花，可记录为岁时阁的一枚蜕变光茧</p>
            <button v-if="cocoonTargetId !== g.id" class="gw-mini-btn gw-cocoon-open" @click="openCocoon(g)">记录蜕变光茧</button>
            <div v-else class="gw-cocoon-form">
              <input v-model="cocoonName" placeholder="蜕变主题（默认用目标名）" class="gw-input" />
              <select v-model="cocoonDriving" class="gw-input">
                <option v-for="(label, key) in DRIVING_FORCE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
              <button class="gw-mini-btn" @click="submitCocoon">生成</button>
              <button class="gw-mini-btn" @click="cancelCocoon">取消</button>
            </div>
            <div v-if="cocoonStore.findByGoalId(g.id).length" class="gw-cocoon-linked">
              <span v-for="c in cocoonStore.findByGoalId(g.id)" :key="c.id">🌀 {{ c.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else icon="" title="还没有目标，种下一颗吧" :glow="false" cta-label="" />
    </section>

    <!-- 种子区 -->
    <section data-enter>
      <h3>🌱 种子</h3>
      <div class="gw-seed-row">
        <input v-model="seedText" placeholder="我想试试…" @keyup.enter="plantSeed" class="gw-input" />
        <button @click="plantSeed" class="gw-btn">种下</button>
      </div>
      <div class="gw-seed-grid" v-if="flourish.seeds.value.length">
        <div v-for="s in flourish.seeds.value" :key="s.id" class="gw-seed-card" :class="{ sprouted: s.sprouted }" role="button" tabindex="0" :aria-pressed="s.sprouted" :aria-label="'切换种子 ' + s.text + ' 的发芽状态'" @click="toggleSprout(s.id)" @keydown.enter.prevent="toggleSprout(s.id)" @keydown.space.prevent="toggleSprout(s.id)">
          <span>{{ s.sprouted ? '🌿' : '🌰' }}</span>
          <span>{{ s.text }}</span>
          <span class="gw-seed-date">{{ fmt(s.at) }}</span>
          <button class="gw-del" @click.stop="removeSeed(s.id)">×</button>
        </div>
      </div>
      <EmptyState v-else icon="" title="还没有种下种子" :glow="false" cta-label="" />
    </section>

    <!-- 习惯区 -->
    <section data-enter>
      <h3>🔄 习惯追踪</h3>
      <div class="gw-seed-row">
        <input v-model="habitText" placeholder="新习惯…" @keyup.enter="addHabit" class="gw-input" />
        <button @click="addHabit" class="gw-btn">添加</button>
      </div>
      <div v-if="flourish.habits.value.length" class="gw-habit-list">
        <div v-for="h in flourish.habits.value" :key="h.id" class="gw-habit-row">
          <div class="gw-habit-bar-wrap" role="button" tabindex="0" :aria-label="'打卡习惯 ' + h.text" @click="tickHabit(h.id)" @keydown.enter.prevent="tickHabit(h.id)" @keydown.space.prevent="tickHabit(h.id)">
            <div class="gw-habit-bar" :style="{ width: h.streakPct + '%' }" />
          </div>
          <span class="gw-habit-name">{{ h.text }}</span>
          <span class="gw-habit-streak">{{ h.streak }}天</span>
          <button class="gw-del" @click.stop="removeHabit(h.id)">×</button>
        </div>
      </div>
      <EmptyState v-else icon="" title="还没有追踪的习惯" :glow="false" cta-label="" />
    </section>

    <!-- 罗盘 -->
    <section data-enter>
      <h3>🧭 人生罗盘</h3>
      <p class="gw-empty">你真正在乎什么？在这里标注你的方向。</p>
      <div class="gw-compass-values" v-if="flourish.compass.value.length">
        <span v-for="c in flourish.compass.value" :key="c" class="gw-compass-chip" role="button" tabindex="0" :aria-label="'移除罗盘方向 ' + c" @click="removeCompass(c)" @keydown.enter.prevent="removeCompass(c)" @keydown.space.prevent="removeCompass(c)">{{ c }} ×</span>
      </div>
      <div class="gw-seed-row">
        <input v-model="compassText" placeholder="例如：自由、创造、家庭…" @keyup.enter="addCompass" class="gw-input" />
        <button @click="addCompass" class="gw-btn">+</button>
      </div>
    </section>

    <!-- 习惯打卡复合（INCR-07：Streaks 式打卡热图 + 习惯档案） -->
    <HabitReviewPanel />

    <!-- 目标可视化 -->
    <GoalVisualizationPanel :goals="goal.goals.value" />

    <!-- 进度统计 -->
    <GoalProgressPanel :goals="goal.goals.value" />

    <!-- 留光阁桥接总览（goal-bridge 聚合驾驶舱：总览/梯度/状态/健康关注/旧梦潭，INCR-380） -->
    <GoalBridgePanel />

    <!-- 心愿清单（garden/wish-list 引擎，习惯联动解锁，INCR-182） -->
    <WishListPanel />

    <!-- 成长气象（garden/growth-meteor 引擎：目标/种子/习惯/光茧聚合总览，INCR-189） -->
    <GrowthMeteorPanel
      :targets="goal.targets.value"
      :seeds="flourish.seeds.value"
      :habits="flourish.habits.value"
      :cocoons="cocoonStore.cocoons.value"
    />

    <!-- 蜕变光茧 + 季节日志（seasonal 薄委托面板：光茧阶段推进/年度回顾，INCR-235 补挂载孤儿组件） -->
    <SeasonalDepthPanel
      :cocoons="cocoonStore.cocoons.value"
      :stats="cocoonStore.stats.value"
      :journalEntries="journalStore.entries.value"
      :yearReview="yearReview"
      :season="currentSeason"
      @advance="onCocoonAdvance"
      @regress="onCocoonRegress"
      @remove="onCocoonRemove"
      @create="onCocoonCreate"
      @journal="onJournalSubmit"
    />

    <!-- 目标 · 成长状态机（goal/goal-state-machine 引擎：种子→发芽→生长→开花 生命周期/健康度/转换，INCR-212） -->
    <GoalGrowthStateMachinePanel />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getLocalDateKey } from '../utils/time'
import { useGoal, DOMAIN_LABELS, STATUS_LABELS } from '../modules/goal'
import { useGardenFlourish } from '../modules/garden'
import { useCocoonStore } from '../modules/seasonal/cocoon-store'
import { DRIVING_FORCE_LABELS, type DrivingForce } from '../modules/seasonal/cocoon'
import { useJournalStore } from '../modules/seasonal/journal-store'
import { generateYearReview, type Season, type SeasonalJournalEntry, type CocoonStage } from '../modules/seasonal'
import { placeInUnfinishedGarden } from '../modules/unfinished'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import type { GoalStatus } from '../modules/goal'
import GoalVisualizationPanel from '../components/GoalVisualizationPanel.vue'
import GoalProgressPanel from '../components/GoalProgressPanel.vue'
import GoalBridgePanel from '../components/GoalBridgePanel.vue'
import HabitReviewPanel from '../components/HabitReviewPanel.vue'
import WishListPanel from '../components/WishListPanel.vue'
import GrowthMeteorPanel from '../components/GrowthMeteorPanel.vue'
import GoalGrowthStateMachinePanel from '../components/GoalGrowthStateMachinePanel.vue'
import SeasonalDepthPanel from '../components/SeasonalDepthPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

// 目标系统统一来自留光阁（modules/goal）
const goal = useGoal()
const flourish = useGardenFlourish()
const cocoonStore = useCocoonStore()
const journalStore = useJournalStore()

// ---- 蜕变光茧 + 季节日志（INCR-235）----
const currentSeason = computed<Season>(() => {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
})
const yearReview = computed(() =>
  generateYearReview(new Date().getFullYear(), journalStore.entries.value, cocoonStore.cocoons.value, []),
)
function onCocoonAdvance(id: string, to: CocoonStage) { cocoonStore.advanceCocoon(id, to) }
function onCocoonRegress(id: string) { cocoonStore.regressCocoon(id) }
function onCocoonRemove(id: string) { cocoonStore.removeCocoon(id) }
function onCocoonCreate(name: string, force: DrivingForce) { cocoonStore.createCocoon(name, currentSeason.value, undefined, undefined, undefined, force) }
function onJournalSubmit(title: string, content: string, mood: SeasonalJournalEntry['mood']) { journalStore.createJournalEntry(title, content, mood, currentSeason.value) }

const DOMAINS = ['work', 'growth', 'health', 'relation', 'wealth', 'play', 'other'] as const

const newTargetName = ref('')
const newTargetDomain = ref<typeof DOMAINS[number]>('growth')

const seedText = ref('')
const habitText = ref('')
const compassText = ref('')
const importInput = ref<HTMLInputElement>()

// ---- 统计 ----
const targetStats = computed(() => {
  const ts = goal.targets.value
  return {
    total: ts.length,
    blooming: ts.filter(g => g.status === 'bloom').length,
    growing: ts.filter(g => g.status === 'growing' || g.status === 'sprout').length,
    dormant: ts.filter(g => g.status === 'dormant').length,
    seed: ts.filter(g => g.status === 'seed').length,
  }
})

const seedCount = computed(() => flourish.seeds.value.length)
const habitCount = computed(() => flourish.habits.value.length)
const cocoonCount = computed(() => cocoonStore.cocoons.value.length)

// ---- 目标花园操作 ----
function statusEmoji(s: GoalStatus): string {
  return { seed: '🌰', sprout: '🌱', growing: '🌿', bloom: '🌸', dormant: '🍂' }[s]
}
function domainColor(d: typeof DOMAINS[number]): string {
  const map: Record<string, string> = {
    work: '#6b9fc4', growth: '#8a9a7a', health: '#d98c7a',
    relation: '#f0c040', wealth: '#e0a96d', play: '#5ab8a0', other: '#a07c8c',
  }
  return map[d] || '#a07c8c'
}

function addTarget() {
  const name = newTargetName.value.trim()
  if (!name) return
  goal.create(name, 'target', newTargetDomain.value)
  newTargetName.value = ''
}
function promote(g: { id: string; status: GoalStatus }) { goal.promoteStatus(g.id) }
function toggleSleep(g: { id: string }) { goal.toggleDormant(g.id) }
function finishPlan(p: { id: string }) { goal.markPlanDone(p.id) }

/** 放弃：移入未完成花园（蓝图附录E / 蓝图14+） */
function abandon(g: { id: string; title: string }) {
  if (confirm(`将「${g.title}」移入未完成花园？此操作会从成长庭院移除它。`)) {
    placeInUnfinishedGarden(g.title, 'seed')
    goal.remove(g.id)
  }
}

// ---- 开花 → 蜕变光茧 钩子 ----
const cocoonTargetId = ref<string | null>(null)
const cocoonName = ref('')
const cocoonDriving = ref<DrivingForce>('for_goal')

function openCocoon(g: { id: string; title: string }) {
  cocoonTargetId.value = g.id
  cocoonName.value = g.title
  cocoonDriving.value = 'for_goal'
}
function submitCocoon() {
  if (!cocoonTargetId.value) return
  const name = cocoonName.value.trim() || '一段蜕变'
  cocoonStore.createCocoon(name, undefined, undefined, undefined, cocoonTargetId.value, cocoonDriving.value)
  cocoonTargetId.value = null
  cocoonName.value = ''
}
function cancelCocoon() {
  cocoonTargetId.value = null
  cocoonName.value = ''
}

// ---- 花园点缀（种子/习惯/罗盘） ----
function plantSeed() {
  if (!seedText.value.trim()) return
  flourish.plantSeed(seedText.value)
  seedText.value = ''
}
function toggleSprout(id: string) { flourish.toggleSprout(id) }
function removeSeed(id: string) { flourish.removeSeed(id) }

function addHabit() {
  if (!habitText.value.trim()) return
  flourish.addHabit(habitText.value)
  habitText.value = ''
}
function tickHabit(id: string) { flourish.tickHabit(id) }
function removeHabit(id: string) { flourish.removeHabit(id) }

function addCompass() {
  if (!compassText.value.trim()) return
  flourish.addCompassValue(compassText.value)
  compassText.value = ''
}
function removeCompass(v: string) { flourish.removeCompassValue(v) }

function fmt(iso: string) { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}` }

// ---- 导出/导入（仅点缀数据） ----
function exportAll() {
  const data = flourish.exportFlourish()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `heartflow-garden-${getLocalDateKey()}.json`
  a.click(); URL.revokeObjectURL(url)
}
function triggerImport() { importInput.value?.click() }
function importAll(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const result = flourish.importFlourish(reader.result as string)
      const parts = []
      if (result.seeds) parts.push(`${result.seeds} 颗种子`)
      if (result.habits) parts.push(`${result.habits} 个习惯`)
      if (result.compass) parts.push(`${result.compass} 个方向`)
      alert(`导入完成：${parts.join('、')}`)
    } catch { alert('导入失败：文件格式不正确') }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<style scoped>
/* =============================================
   深夜食堂 · 暖琥珀主题 — 成长庭院
   播下种子，培育习惯，收获成长
   ============================================= */

/* ---- 全局容器 + 环境光晕 ---- */
.gw {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  background: transparent;
}
.gw::before,
.gw::after {
  content: '';
  position: fixed;
  top: 0;
  width: 220px;
  height: 100dvh;
  pointer-events: none;
  z-index: 0;
}
.gw::before {
  left: 0;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}
.gw::after {
  right: 0;
  background: radial-gradient(ellipse at right center, rgba(var(--accent-rgb), 0.05), transparent 70%);
}


.gw-tended {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin: -16px 0 26px;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

/* ---- 统计概览卡片 ---- */
.gw-stats-section {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.gw-io-row {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}
.gw-ghost-btn {
  border-color: rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 5px 12px;
}
.gw-ghost-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: rgba(var(--text-primary-rgb), 0.75);
  background: var(--bg-card);
}
.gw-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-right: 1px solid rgba(var(--accent-rgb), 0.08);
}
.gw-stat-item:last-child { border-right: none; }
.gw-stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-high);
  line-height: 1.2;
}
.gw-stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.gw-stat-bloom { color: #f9a8d4; }
.gw-stat-progressing { color: #e0a96d; }
.gw-stat-dormant { color: var(--text-secondary); }

/* ---- 区域标题 ---- */
.gw section {
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.gw section h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

/* ---- 输入框 (gw-input) ---- */
.gw-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s;
  box-sizing: border-box;
}
.gw-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.gw-input::placeholder { color: var(--text-dim); }

/* ---- 按钮 (gw-btn) ---- */
.gw-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.gw-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.3);
}

/* ---- 删除按钮 (gw-del) ---- */
.gw-del {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.gw-seed-card:hover .gw-del,
.gw-habit-row:hover .gw-del { opacity: 1; }
.gw-del:hover { color: #e07050; }

/* ---- 空状态 ---- */
.gw-empty {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.15);
  padding: 8px 0;
  font-style: italic;
}

/* ---- 种子行 (共用) ---- */
.gw-seed-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

/* ---- 目标花园 ---- */
.gw-goal-form { margin-bottom: 14px; }
.gw-goal-form-row { display: flex; gap: 6px; }
.gw-goal-domain-input { flex: none; width: 84px; cursor: pointer; }

.gw-plant-list { display: flex; flex-direction: column; gap: 10px; }
.gw-plant {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-left: 3px solid rgba(var(--accent-rgb), 0.35);
  transition: all 0.25s;
}
.gw-plant.stage-bloom { border-left-color: #f9a8d4; box-shadow: 0 0 14px rgba(249, 168, 212, 0.1); }
.gw-plant.stage-dormant { border-left-color: var(--text-secondary); opacity: 0.7; }
.gw-plant.stage-growing { border-left-color: #34d399; }
.gw-plant-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.gw-plant-emoji { font-size: 18px; }
.gw-plant-name { font-size: 14px; font-weight: 500; color: var(--text-high); }
.gw-plant-domain { font-size: 11px; padding: 1px 7px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.08); }
.gw-plant-status { margin-left: auto; font-size: 11px; color: var(--text-secondary); }

.gw-plan-list { display: flex; flex-direction: column; gap: 4px; margin: 6px 0 8px 26px; }
.gw-plan-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
.gw-plan-emoji { font-size: 13px; }
.gw-plan-name { flex: 1; }
.gw-plan-status { font-size: 10px; color: var(--text-secondary); }

.gw-plant-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.gw-mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.gw-mini-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.16); color: var(--accent); }
.gw-mini-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gw-mini-btn.gw-danger { border-color: rgba(224, 112, 80, 0.25); color: rgba(224, 112, 80, 0.8); }
.gw-mini-btn.gw-danger:hover { background: rgba(224, 112, 80, 0.12); color: #e07050; }

.gw-cocoon-hook {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.15);
}
.gw-cocoon-hint { font-size: 12px; color: #f9a8d4; margin-bottom: 6px; }
.gw-cocoon-form { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.gw-cocoon-form .gw-input { flex: 1; min-width: 120px;
}
.gw-cocoon-linked { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.gw-cocoon-linked span {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(249, 168, 212, 0.1);
  color: #f9a8d4;
}

/* ---- 种子网格 ---- */
.gw-seed-grid { display: flex; flex-direction: column; gap: 6px; }
.gw-seed-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-high);
  transition: all 0.2s;
}
.gw-seed-card:hover {
  background: rgba(55, 48, 40, 0.6);
  border-color: rgba(var(--accent-rgb), 0.12);
}
.gw-seed-card.sprouted {
  border-color: rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.08);
}
.gw-seed-date { margin-left: auto; font-size: 11px; color: var(--text-secondary); }

/* ---- 习惯列表 ---- */
.gw-habit-list { display: flex; flex-direction: column; gap: 8px; }
.gw-habit-row { display: flex; align-items: center; gap: 10px; }
.gw-habit-bar-wrap {
  flex: 1;
  height: 8px;
  padding: 8px 0;
  margin: -8px 0;
  box-sizing: content-box;
  background-clip: content-box;
  border-radius: 4px;
  background: var(--bg-card);
  cursor: pointer;
  overflow: hidden;
}
.gw-habit-bar { height: 100%; border-radius: 4px; background: var(--accent); transition: width 0.3s; }
.gw-habit-name { font-size: 13px; color: var(--text-high); min-width: 80px;
}
.gw-habit-streak { font-size: 12px; font-weight: 600; color: var(--accent); min-width: 30px;
}

/* ---- 罗盘 ---- */
.gw-compass-values { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.gw-compass-chip {
  padding: 4px 10px;
  border-radius: 12px;
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.gw-compass-chip:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.06);
}

/* ---- 响应式 ---- */
@media (max-width: 600px) {
  .gw-stats-section { flex-wrap: wrap; gap: 6px; }
  .gw-stat-item { min-width: calc(50% - 3px); flex: unset; padding: 10px; }
  .gw-goal-form-row { flex-wrap: wrap; }
  .gw-input { width: 100%; box-sizing: border-box; }
  .gw-btn { width: 100%; text-align: center; }
}
@media (max-width: 400px) {
  .gw-stats-section { flex-direction: column; gap: 4px; }
  .gw-stat-item { min-width: unset; flex-direction: row; align-items: center; gap: 8px; padding: 8px 12px; }
  .gw-stat-value { margin-left: auto; }
}
:deep(.room-layout){position:relative;z-index:1}
</style>
