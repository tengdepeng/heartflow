<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance af">
    <!-- Header ornament -->
    <div data-enter class="af-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">与幕僚的羁绊 · 好感度一览</p>
      <h1 class="af-title">好感度</h1>
    </div>

    <!-- Overview cards -->
    <div data-enter class="af-overview">
      <div class="af-card af-overview-card">
        <div class="af-stat-value">{{ advisors.length }}</div>
        <div class="af-stat-label">幕僚总数</div>
      </div>
      <div class="af-card af-overview-card">
        <div class="af-stat-value">{{ advisors.filter(a => tierInfo(a.id).index >= 5).length }}</div>
        <div class="af-stat-label">最高羁绊</div>
      </div>
      <div class="af-card af-overview-card">
        <div class="af-stat-value">{{ advisors.reduce((sum, a) => sum + Math.round(tierInfo(a.id).affinity), 0) }}</div>
        <div class="af-stat-label">总好感度</div>
      </div>
    </div>

    <!-- INCR-443：好感度层级分布 -->
    <div data-enter v-if="advisors.length" class="af-dist" data-test="affinity-tier-dist">
      <div
        v-for="t in tierDistribution"
        :key="t.index"
        class="af-dist-seg"
        :class="{ 'af-dist-empty': t.count === 0 }"
        :style="{ background: t.color, color: t.textColor }"
        :title="`${t.title}：${t.count} 位`"
      >
        <span v-if="t.count > 0" class="af-dist-n">{{ t.count }}</span>
        <span class="af-dist-label">{{ t.title }}</span>
      </div>
    </div>

    <!-- Advisor grid -->
    <div data-enter v-if="advisors.length" class="af-grid">
      <div
        v-for="a in advisors"
        :key="a.id"
        class="af-card"
        :class="{ bonded: tierInfo(a.id).index >= 5 }"
      >
        <div class="af-card-hd">
          <div class="af-avatar" :style="avatarStyle(a)">
            <span class="af-card-icon">{{ roleIcon(a.role) }}</span>
          </div>
          <div class="af-card-meta">
            <span class="af-name">{{ a.name }}</span>
            <span class="af-role">{{ roleLabel(a.role) }}</span>
            <span class="af-card-pers">{{ personalityLabel(a.personality) }}</span>
          </div>
          <div class="af-card-tier" :style="tierBadgeStyle(tierInfo(a.id).index)">
            {{ tierInfo(a.id).title }}
          </div>
        </div>

        <div class="af-card-progress">
          <div class="af-card-tier-label">
            <span class="af-card-tier-cur">{{ tierInfo(a.id).title }}</span>
            <span class="af-card-tier-nxt" v-if="nextTier(a.id)">→ {{ nextTier(a.id)!.title }}</span>
          </div>
          <div class="af-bar">
            <div class="af-fill" :style="progressStyle(tierInfo(a.id).affinity)" />
          </div>
          <div class="af-card-stats">
            <span class="af-stat">好感度 {{ Math.round(tierInfo(a.id).affinity) }} / 100</span>
            <span class="af-stat">交互 {{ tierInfo(a.id).interactions }} 次</span>
          </div>

          <div class="af-card-meta-row" data-test="affinity-journey">
            <span class="af-meta">🕊 最近 {{ fmtAgo(a.lastActiveAt) }}</span>
            <span class="af-meta">🌱 {{ bondedDays(a.createdAt) }}</span>
            <span class="af-meta">👁 见证 {{ witnessCount(a) }}</span>
            <span class="af-meta" v-if="milestoneCount(a) > 0">✦ 里程碑 {{ milestoneCount(a) }}</span>
          </div>
        </div>

        <div v-if="tierInfo(a.id).index >= 5" class="af-card-bonded">
          羁绊 · 心意相通
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState v-else icon="🏛" title="暂无幕僚数据" hint="请在幕僚大厅创建幕僚后查看好感度" :glow="false" cta-label="" />

    <!-- INCR-443：见证之光 -->
    <div data-enter v-if="recentWitnesses.length" class="af-section" data-test="affinity-witness">
      <div class="af-section-hd">
        <span class="orn-diamond">✦</span>
        <h2 class="af-section-title">见证之光</h2>
        <span class="af-section-sub">幕僚与你共同见证的瞬间</span>
      </div>
      <div class="af-witness-list">
        <div v-for="w in recentWitnesses" :key="w.advisorId + w.at" class="af-witness-item">
          <span class="af-witness-who">{{ w.advisorName }}</span>
          <span class="af-witness-tag">{{ w.eventType }}</span>
          <span class="af-witness-time">{{ fmtAgo(w.at) }}</span>
        </div>
      </div>
    </div>

    <!-- INCR-443：好感里程碑时间线 -->
    <div data-enter v-if="milestoneTimeline.length" class="af-section" data-test="affinity-milestones">
      <div class="af-section-hd">
        <span class="orn-diamond">✦</span>
        <h2 class="af-section-title">好感里程碑</h2>
        <span class="af-section-sub">羁绊层级的每一级跨越</span>
      </div>
      <div class="af-timeline">
        <div v-for="m in milestoneTimeline" :key="m.advisorName + m.reachedAt" class="af-tl-item">
          <span class="af-tl-dot" :style="{ background: tierBadgeStyle(m.tier).background }" />
          <span class="af-tl-who">{{ m.advisorName }}</span>
          <span class="af-tl-tier">{{ m.title }}</span>
          <span class="af-tl-time">{{ fmtDate(m.reachedAt) }}</span>
        </div>
      </div>
    </div>

    <button class="af-btn-back" @click="navigateToRoom('advisors')">← 返回幕僚大厅</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdvisor } from '../resonance/bridges/advisor'
import { ADVISOR_ROLES, ADVISOR_PERSONALITIES, AFFINITY_TIERS } from '../types'
import type { AdvisorProfile } from '../types'
import { useViewEntrance } from '../composables/useViewEntrance'
import EmptyState from '../components/EmptyState.vue'
import { navigateToRoom } from '../composables/useRoomNavigation'

const { entranceRef, entranceClass } = useViewEntrance()
const advisor = useAdvisor()

const advisors = computed(() => advisor.advisors)

// ---- INCR-443：好感度层级分布（复用 tierInfo） ----
const tierDistribution = computed(() => {
  const counts = AFFINITY_TIERS.map(() => 0)
  for (const a of advisors.value) {
    const idx = tierInfo(a.id).index
    if (idx >= 0 && idx < counts.length) counts[idx]++
  }
  return AFFINITY_TIERS.map((t, i) => ({
    index: i,
    title: t.title,
    count: counts[i],
    color: tierBadgeStyle(i).background,
    textColor: tierBadgeStyle(i).color,
  }))
})

// ---- INCR-443：见证之光（聚合近期见证） ----
const recentWitnesses = computed(() => {
  const items: { advisorId: string; advisorName: string; eventType: string; at: string }[] = []
  for (const a of advisors.value) {
    for (const w of a.witnessLog ?? []) {
      items.push({ advisorId: a.id, advisorName: a.name, eventType: w.eventType, at: w.at })
    }
  }
  items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  return items.slice(0, 12)
})

// ---- INCR-443：好感里程碑时间线（聚合各幕僚层级达成） ----
const milestoneTimeline = computed(() => {
  const items: { advisorName: string; tier: number; title: string; reachedAt: string }[] = []
  for (const a of advisors.value) {
    for (const m of a.affinityMilestones ?? []) {
      items.push({ advisorName: a.name, tier: m.tier, title: m.title, reachedAt: m.reachedAt })
    }
  }
  items.sort((x, y) => new Date(y.reachedAt).getTime() - new Date(x.reachedAt).getTime())
  return items.slice(0, 12)
})

// ---- INCR-443：工具函数 ----
function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return '尚未互动'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return '即将'
  const day = Math.floor(diff / 86400000)
  if (day <= 0) {
    const hr = Math.floor(diff / 3600000)
    return hr <= 0 ? '刚刚' : `约 ${hr} 小时前`
  }
  if (day === 1) return '昨天'
  if (day < 30) return `${day} 天前`
  const mo = Math.floor(day / 30)
  return `${mo} 个月前`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function bondedDays(iso: string | null | undefined): string {
  if (!iso) return '新生'
  const day = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (day <= 0) return '今日结契'
  return `相识 ${day} 天`
}

function witnessCount(a: AdvisorProfile): number {
  return a.witnessLog?.length ?? 0
}

function milestoneCount(a: AdvisorProfile): number {
  return a.affinityMilestones?.length ?? 0
}

function roleIcon(role: string): string {
  const def = ADVISOR_ROLES.find(r => r.key === role)
  return def?.icon ?? '🧘'
}

function roleLabel(role: string): string {
  const def = ADVISOR_ROLES.find(r => r.key === role)
  return def?.label ?? role
}

function personalityLabel(key: string): string {
  const def = ADVISOR_PERSONALITIES.find(p => p.key === key)
  return def?.label ?? key
}

function avatarStyle(a: AdvisorProfile): Record<string, string> {
  const personality = ADVISOR_PERSONALITIES.find(p => p.key === a.personality)
  const cs = a.customColorScheme ?? personality?.colorScheme
  return {
    background: cs ? `${cs.primary}22` : 'rgba(255,255,255,0.05)',
    borderColor: cs ? `${cs.primary}44` : 'rgba(255,255,255,0.1)',
  }
}

function tierInfo(advisorId: string) {
  const a = advisors.value.find(x => x.id === advisorId)
  const affinity = a?.affinity ?? 0
  const interactions = a?.totalInteractions ?? 0
  let idx = 0
  for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
    const t = AFFINITY_TIERS[i]
    if (affinity >= t.threshold && interactions >= t.minInteractions) {
      idx = i
      break
    }
  }
  return { title: AFFINITY_TIERS[idx].title, affinity, interactions, index: idx }
}

function nextTier(advisorId: string): { title: string; threshold: number } | null {
  const info = tierInfo(advisorId)
  if (info.index >= AFFINITY_TIERS.length - 1) return null
  const next = AFFINITY_TIERS[info.index + 1]
  return { title: next.title, threshold: next.threshold }
}

function tierBadgeStyle(index: number): Record<string, string> {
  const colors = [
    'rgba(120,120,120,0.3)',  // 陌路
    'rgba(160,160,160,0.3)',  // 相识
    'rgba(140,120,200,0.3)',  // 熟稔
    'rgba(120,100,220,0.35)', // 信赖
    'rgba(200,160,80,0.35)',  // 知己
    'rgba(220,180,60,0.4)',   // 羁绊
  ]
  const textColors = [
    'rgba(255,255,255,0.4)',
    'rgba(255,255,255,0.5)',
    'rgba(255,255,255,0.6)',
    'rgba(200,180,255,0.8)',
    'rgba(255,220,120,0.9)',
    'rgba(255,200,80,1)',
  ]
  return {
    background: colors[index] ?? colors[0],
    color: textColors[index] ?? textColors[0],
  }
}

function progressStyle(affinity: number): Record<string, string> {
  const pct = Math.min(100, Math.max(0, affinity))
  // 渐变色: 灰 -> 紫 -> 金
  const ratio = pct / 100
  let gradient: string
  if (ratio < 0.5) {
    // 灰到紫
    const t = ratio * 2
    gradient = `linear-gradient(90deg, #666 ${(1-t)*100}%, #8b6aaa ${t*100}%)`
  } else {
    // 紫到金
    const t = (ratio - 0.5) * 2
    gradient = `linear-gradient(90deg, #8b6aaa ${(1-t)*100}%, #f0c040 ${t*100}%)`
  }
  return {
    width: `${pct}%`,
    background: gradient,
  }
}
</script>

<style scoped>
/* ================================
   Warm Amber Theme — AdvisorAffinity
   ================================ */

/* ---- Page container ---- */
.af {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow: hidden;
}

/* Ambient glow — top */
.af::before {
  content: '';
  position: fixed;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(
    ellipse,
    rgba(var(--accent-rgb), 0.08) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

/* Ambient glow — bottom */
.af::after {
  content: '';
  position: fixed;
  bottom: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 300px;
  background: radial-gradient(
    ellipse,
    rgba(var(--accent-rgb), 0.05) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.af-header {
  text-align: center;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.orn-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.4),
    transparent
  );
}

.orn-diamond {
  color: var(--accent);
  font-size: 12px;
  opacity: 0.7;
}

.header-kicker {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 3px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.af-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--accent);
}

/* ---- Overview cards ---- */
.af-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}

.af-overview-card {
  padding: 16px 12px;
  text-align: center;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  transition: border-color 0.3s, background 0.3s;
}

.af-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.07);
}

.af-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}

.af-stat-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-top: 4px;
  letter-spacing: 1px;
}

/* ---- Grid ---- */
.af-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

/* ---- Card ---- */
.af-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.af-card:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.af-card.bonded {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.06);
}

/* ---- Card header ---- */
.af-card-hd {
  display: flex;
  align-items: center;
  gap: 14px;
}

.af-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.af-card-icon {
  font-size: 22px;
}

.af-card-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.af-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.af-role {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
}

.af-card-pers {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.3);
}

.af-card-tier {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* ---- Progress section ---- */
.af-card-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.af-card-tier-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.af-card-tier-cur {
  color: rgba(var(--accent-rgb), 0.7);
  font-weight: 500;
}

.af-card-tier-nxt {
  color: rgba(var(--accent-rgb), 0.25);
  font-size: 11px;
}

.af-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.af-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease, background 0.5s ease;
}

.af-card-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- Bonded badge ---- */
.af-card-bonded {
  text-align: center;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  border-top: 1px solid rgba(var(--accent-rgb), 0.15);
  letter-spacing: 1px;
}


/* ---- Back button ---- */
.af-btn-back {
  display: block;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  position: relative;
  z-index: 1;
}

.af-btn-back:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.2);
}

/* ---- INCR-443：层级分布条 ---- */
.af-dist {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
.af-dist-seg {
  flex: 1;
  min-height: 56px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: transform 0.2s, border-color 0.2s;
}
.af-dist-seg:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.af-dist-seg.af-dist-empty { opacity: 0.4; }
.af-dist-n { font-size: 18px; font-weight: 700; }
.af-dist-label { font-size: 10px; letter-spacing: 1px; opacity: 0.85; }

/* ---- INCR-443：每卡旅程元数据 ---- */
.af-card-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.af-meta {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 20px;
  padding: 3px 10px;
}

/* ---- INCR-443：区块通用 ---- */
.af-section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
.af-section-hd {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}
.af-section-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--accent);
}
.af-section-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

/* ---- INCR-443：见证之光 ---- */
.af-witness-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.af-witness-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.af-witness-who {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}
.af-witness-tag {
  flex: 1;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.af-witness-time {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
  flex-shrink: 0;
}

/* ---- INCR-443：里程碑时间线 ---- */
.af-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.af-tl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.af-tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}
.af-tl-who { font-size:13px; font-weight: 600; color: var(--text-primary); flex-shrink: 0; }
.af-tl-tier { font-size: 13px; color: var(--accent); flex-shrink: 0; }
.af-tl-time { font-size: 11px; color: rgba(var(--accent-rgb), 0.4); margin-left: auto; flex-shrink: 0; }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .af { padding: 32px 20px 64px; }
  .af-overview { grid-template-columns: repeat(2, 1fr); gap: 8px; }
}

@media (max-width: 640px) {
  .af { padding: 24px 14px 56px; }
  .af-overview { grid-template-columns: 1fr; gap: 8px; }
  .af-btn-back { width: 100%; }
  .af-card-progress { gap: 6px; }
  .af-card-stats { flex-direction: column; gap: 2px; }
}
</style>