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
        </div>

        <div v-if="tierInfo(a.id).index >= 5" class="af-card-bonded">
          羁绊 · 心意相通
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState v-else icon="🏛" title="暂无幕僚数据" hint="请在幕僚大厅创建幕僚后查看好感度" :glow="false" cta-label="" />

    <button class="af-btn-back" @click="$router.push('/advisors')">← 返回幕僚大厅</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { ADVISOR_ROLES, ADVISOR_PERSONALITIES, AFFINITY_TIERS } from '../types'
import type { AdvisorProfile } from '../types'
import { useViewEntrance } from '../composables/useViewEntrance'
import EmptyState from '../components/EmptyState.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const $router = useRouter()
const advisor = useAdvisor()

const advisors = computed(() => advisor.advisors)

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