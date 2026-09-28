<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance aar">
    <!-- Header -->
    <div data-enter class="aar-header">
      <div class="aar-back-row">
        <button class="aar-back-btn" @click="goBack">← 返回</button>
      </div>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">退役幕僚 · 档案室</p>
      <h1 class="aar-title">幕僚 · 荣休录</h1>
    </div>

    <!-- 统计摘要 -->
    <div data-enter class="aar-overview">
      <div class="aar-overview-card">
        <span class="aar-overview-value">{{ retiredAdvisors.length }}</span>
        <span class="aar-overview-label">已退役</span>
      </div>
      <div class="aar-overview-card">
        <span class="aar-overview-value">{{ activeAdvisors.length }}</span>
        <span class="aar-overview-label">在位</span>
      </div>
    </div>

    <!-- 退役幕僚列表 -->
    <div data-enter v-if="retiredAdvisors.length" class="aar-list">
      <div v-for="a in retiredAdvisors" :key="a.id" class="aar-card hf-press hf-lift">
        <div class="aar-card-hd">
          <div class="aar-avatar" :style="avatarStyle(a)">
            <span class="aar-icon">{{ roleIcon(a.role) }}</span>
          </div>
          <div class="aar-card-meta">
            <span class="aar-name">{{ a.name }}</span>
            <span class="aar-role">{{ roleLabel(a.role) }}</span>
          </div>
          <div class="aar-status-badge">已退役</div>
        </div>

        <!-- 退休信息 -->
        <div class="aar-card-body">
          <div class="aar-info-row">
            <span class="aar-info-label">退役时间</span>
            <span class="aar-info-value">{{ fmtDate(a.retiredAt) }}</span>
          </div>
          <div class="aar-info-row">
            <span class="aar-info-label">在位时长</span>
            <span class="aar-info-value">{{ tenureLabel(a) }}</span>
          </div>
          <div class="aar-info-row">
            <span class="aar-info-label">最终好感度</span>
            <span class="aar-info-value">{{ affinityLabel(a.id) }}</span>
          </div>
          <div class="aar-info-row">
            <span class="aar-info-label">总交互次数</span>
            <span class="aar-info-value">{{ a.totalInteractions ?? 0 }} 次</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="aar-card-actions">
          <button class="aar-btn-witness" @click="viewWitness(a.id)">📜 见证记录</button>
          <button class="aar-btn-unretire" @click="handleUnretire(a.id)">🌱 唤醒</button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div data-enter v-else class="aar-empty">
      <span>🏛</span>
      <p>暂无退役幕僚</p>
      <p class="aar-empty-hint">在位幕僚可在幕僚大厅中选择「沉睡」后退役</p>
    </div>

    <!-- 在位幕僚速览 -->
    <section data-enter class="aar-section" v-if="activeAdvisors.length">
      <h3 class="aar-section-label">在位幕僚</h3>
      <div class="aar-active-grid">
        <div v-for="a in activeAdvisors" :key="a.id" class="aar-active-chip">
          <span class="aar-active-icon">{{ roleIcon(a.role) }}</span>
          <span class="aar-active-name">{{ a.name }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { ADVISOR_ROLES, AFFINITY_TIERS } from '../types'
import type { AdvisorProfile } from '../types'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()
const advisor = useAdvisor()

// ---- 数据 ----
const advisors = computed(() => advisor.advisors)

const retiredAdvisors = computed(() => {
  return advisors.value.filter(a => a.retired)
})

const activeAdvisors = computed(() => {
  return advisors.value.filter(a => !a.retired)
})

// ---- 辅助函数 ----
function roleIcon(role: string): string {
  const def = ADVISOR_ROLES.find(r => r.key === role)
  return def?.icon ?? '🧘'
}

function roleLabel(role: string): string {
  const def = ADVISOR_ROLES.find(r => r.key === role)
  return def?.label ?? role
}

function avatarStyle(a: AdvisorProfile): Record<string, string> {
  const cs = a.customColorScheme
  return {
    background: cs ? `${cs.primary}22` : 'rgba(120,120,120,0.08)',
    borderColor: cs ? `${cs.primary}44` : 'rgba(120,120,120,0.15)',
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function tenureLabel(a: AdvisorProfile): string {
  if (!a.createdAt || !a.retiredAt) return '--'
  const start = new Date(a.createdAt)
  const end = new Date(a.retiredAt)
  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) return '不足一日'
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 1) return '不足一日'
  if (days < 30) return `${days} 天`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月`
  const years = Math.floor(months / 12)
  const remainMonths = months % 12
  return remainMonths > 0 ? `${years} 年 ${remainMonths} 个月` : `${years} 年`
}

function affinityLabel(advisorId: string): string {
  const p = advisors.value.find(x => x.id === advisorId)
  if (!p) return '--'
  const affinity = p.affinity ?? 0
  const interactions = p.totalInteractions ?? 0
  for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
    const t = AFFINITY_TIERS[i]
    if (affinity >= t.threshold && interactions >= t.minInteractions) {
      return `${t.title} (${Math.round(affinity)})`
    }
  }
  return `${AFFINITY_TIERS[0].title} (${Math.round(affinity)})`
}

// ---- 操作 ----
function handleUnretire(advisorId: string) {
  advisor.unretireAdvisor(advisorId)
}

function viewWitness(advisorId: string) {
  router.push(`/advisors/witness/${advisorId}`)
}

function goBack() {
  router.push('/advisors')
}
</script>

<style scoped>
/* =============================================================
   幕僚档案 · 荣休录 — Warm Amber Theme
   ============================================================= */
.aar {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.aar::before {
  content: '';
  position: absolute;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.aar-header {
  text-align: center;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.aar-back-row {
  text-align: left;
  margin-bottom: 8px;
}
.aar-back-btn {
  background: none;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  padding: 6px 14px;
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.aar-back-btn:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.25);
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.orn-diamond {
  font-size: 14px;
  color: var(--accent);
  opacity: 0.7;
}
.header-kicker {
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-bottom: 6px;
}
.aar-title {
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 6px;
  color: var(--accent);
  margin: 0;
}

/* ---- Overview ---- */
.aar-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.aar-overview-card {
  padding: 16px 12px;
  text-align: center;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  transition: border-color 0.3s, background 0.3s;
}
.aar-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.07);
}
.aar-overview-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}
.aar-overview-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-top: 4px;
  letter-spacing: 1px;
}

/* ---- Card List ---- */
.aar-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

/* ---- Card ---- */
.aar-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.aar-card:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
}

/* ---- Card Header ---- */
.aar-card-hd {
  display: flex;
  align-items: center;
  gap: 14px;
}
.aar-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.7;
}
.aar-icon {
  font-size: 22px;
}
.aar-card-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.aar-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.aar-role {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
}
.aar-status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(160,160,160,0.2);
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
}

/* ---- Card Body ---- */
.aar-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0,0,0,0.15);
}
.aar-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.aar-info-label {
  color: rgba(var(--accent-rgb), 0.4);
}
.aar-info-value {
  color: rgba(232,221,208,0.7);
  font-weight: 500;
}

/* ---- Card Actions ---- */
.aar-card-actions {
  display: flex;
  gap: 8px;
}
.aar-btn-witness {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.04);
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.aar-btn-witness:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}
.aar-btn-unretire {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid rgba(120,200,160,0.15);
  background: rgba(120,200,160,0.04);
  color: rgba(120,200,160,0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.aar-btn-unretire:hover {
  background: rgba(120,200,160,0.08);
  border-color: rgba(120,200,160,0.25);
  color: #78c8a0;
}

/* ---- Empty ---- */
.aar-empty {
  text-align: center;
  padding: 60px 0;
  color: rgba(var(--accent-rgb), 0.2);
  position: relative;
  z-index: 1;
}
.aar-empty span {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.aar-empty p {
  font-size: 15px;
  margin-bottom: 4px;
}
.aar-empty-hint {
  font-size: 12px;
  opacity: 0.5;
}

/* ---- Active Advisors Section ---- */
.aar-section {
  position: relative;
  z-index: 1;
}
.aar-section-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.45);
  margin: 0 0 10px;
  letter-spacing: 0.5px;
}
.aar-active-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.aar-active-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 12px;
}
.aar-active-icon {
  font-size: 14px;
  line-height: 1;
}
.aar-active-name {
  color: rgba(232,221,208,0.7);
}

/* ---- Responsive ---- */
@media (max-width: 860px) {
  .aar { padding: 32px 20px 64px; }
}
@media (max-width: 640px) {
  .aar { padding: 24px 14px 56px; }
  .aar-title { font-size: 22px; }
  .aar-overview { gap: 8px; }
  .aar-card-actions { flex-direction: column; }
}
</style>