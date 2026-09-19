<template>
  <section class="bbp" data-test="bag-bridge-panel" aria-label="行囊桥 · 总览">
    <header class="bbp-head">
      <span class="bbp-title">🎒 行囊桥 · 此刻</span>
      <span class="bbp-badge" data-test="bbp-badge">共 {{ health.totalItems }} 件 · 健康 {{ health.healthScore }}</span>
    </header>

    <!-- 行囊健康度 -->
    <div class="bbp-card" data-test="bbp-health">
      <span class="bbp-card-t">🩺 行囊健康度</span>
      <div class="bbp-health-grid">
        <div class="bbp-hstat"><b data-test="bbp-hscore">{{ health.healthScore }}</b><span>健康分</span></div>
        <div class="bbp-hstat"><b>{{ health.totalItems }}</b><span>总物品</span></div>
        <div class="bbp-hstat"><b>{{ health.avgProficiency }}</b><span>平均熟练</span></div>
        <div class="bbp-hstat"><b>{{ health.masteredCount }}</b><span>精通</span></div>
      </div>
      <p v-if="health.topSkill" class="bbp-hline" data-test="bbp-hline">
        最强 <b>{{ health.topSkill.name }}</b>（{{ health.topSkill.proficiency }}）
        <template v-if="health.weakestSkill"> · 最弱 <b>{{ health.weakestSkill.name }}</b>（{{ health.weakestSkill.proficiency }}）</template>
      </p>
      <ul v-if="health.suggestions.length" class="bbp-hsug" data-test="bbp-hsug">
        <li v-for="(s, i) in health.suggestions" :key="i">{{ s }}</li>
      </ul>
    </div>

    <!-- 技能概览 -->
    <div v-if="hasContent" class="bbp-card" data-test="bbp-overview">
      <span class="bbp-card-t">🗂 技能概览</span>
      <div v-for="s in skillOverviews" :key="s.categoryType" class="bbp-skill" :data-test="`bbp-skill-${s.categoryType}`">
        <span class="bbp-skill-icon">{{ s.icon }}</span>
        <div class="bbp-skill-body">
          <div class="bbp-skill-top">
            <strong>{{ s.name }}</strong>
            <span class="bbp-skill-meta">{{ s.itemCount }} 件 · 精通 {{ s.masteredCount }} {{ directionMark(s.growthDirection) }}</span>
          </div>
          <div class="bbp-skill-bar"><div class="bbp-skill-seg" :style="{ width: pct(s.proficiency) }"></div></div>
          <span class="bbp-skill-val">{{ s.proficiency }}</span>
        </div>
      </div>
    </div>

    <!-- 技能雷达 -->
    <div v-if="hasContent" class="bbp-card" data-test="bbp-radar">
      <span class="bbp-card-t">📡 技能雷达</span>
      <div v-for="r in radar" :key="r.category" class="bbp-radar-row">
        <span class="bbp-radar-label">{{ r.label }}</span>
        <div class="bbp-radar-bar"><div class="bbp-radar-seg" :style="{ width: pct(r.proficiency) }"></div></div>
        <span class="bbp-radar-val">{{ r.proficiency }}</span>
      </div>
    </div>

    <!-- 成长趋势 -->
    <div v-if="trend.length" class="bbp-card" data-test="bbp-trend">
      <span class="bbp-card-t">📈 成长趋势 · 近 90 天</span>
      <div v-for="t in trend" :key="t.date" class="bbp-trend-row">
        <span class="bbp-trend-date">{{ t.date }}</span>
        <span class="bbp-trend-val">均 {{ t.avgProficiency }} · 新增 {{ t.newItems }} · 精通 {{ t.masteredItems }}</span>
      </div>
    </div>

    <!-- 熟练度预测 -->
    <div v-if="hasContent" class="bbp-card" data-test="bbp-predict">
      <span class="bbp-card-t">🔮 熟练度预测</span>
      <div v-for="p in predictions" :key="p.category" class="bbp-predict-row">
        <span class="bbp-predict-label">{{ p.label }}</span>
        <span class="bbp-predict-cur">{{ p.currentProficiency }}</span>
        <span class="bbp-predict-arrow">→</span>
        <span class="bbp-predict-30">{{ p.predicted30Days }}</span>
        <span class="bbp-predict-arrow">→</span>
        <span class="bbp-predict-90">{{ p.predicted90Days }}</span>
        <span v-if="p.daysTo80 !== null" class="bbp-predict-days">约 {{ p.daysTo80 }} 天达 80</span>
      </div>
    </div>

    <!-- 学习路径 -->
    <div v-if="paths.length" class="bbp-card" data-test="bbp-paths">
      <span class="bbp-card-t">🛤 进行中的学习路径</span>
      <div v-for="p in paths" :key="p.id" class="bbp-path">
        <div class="bbp-path-top">
          <strong>{{ p.name }}</strong>
          <span class="bbp-path-progress">{{ p.currentStep }}/{{ p.steps.length }} 步</span>
        </div>
        <span class="bbp-path-meta">{{ p.description }} · {{ pathTargetLabel(p.targetCategory) }}</span>
      </div>
    </div>

    <!-- 技能推荐 -->
    <div v-if="recommendations.length" class="bbp-card" data-test="bbp-recs">
      <span class="bbp-card-t">💡 技能推荐</span>
      <div v-for="(r, i) in recommendations" :key="i" class="bbp-rec">
        <span class="bbp-rec-prio" :class="`bbp-rec-prio--${r.priority}`">{{ prioLabel(r.priority) }}</span>
        <div class="bbp-rec-body">
          <strong>{{ r.title }}</strong>
          <span class="bbp-rec-desc">{{ r.description }}</span>
          <span v-if="r.expectedBenefit" class="bbp-rec-benefit">{{ r.expectedBenefit }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBagBridge } from '../modules/bag/bag-bridge'

const bridge = useBagBridge()

const health = computed(() => bridge.bagHealth.value)
const skillOverviews = computed(() => bridge.skillOverviews.value)
const radar = computed(() => bridge.radarData.value)
const trend = computed(() => bridge.growthTrendData.value)
const predictions = computed(() => bridge.predictions.value)
const paths = computed(() => bridge.activePaths.value)
const recommendations = computed(() => bridge.recommendations.value)

const hasContent = computed(() => health.value.totalItems > 0)

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, v))}%`
}

function directionMark(d: string): string {
  if (d === 'up') return '↑'
  if (d === 'down') return '↓'
  return '→'
}

function prioLabel(p: string): string {
  if (p === 'high') return '优先'
  if (p === 'medium') return '建议'
  return '留意'
}

function pathTargetLabel(t: string): string {
  const map: Record<string, string> = {
    tool: '工具', language: '语言', framework: '框架', design: '设计',
    softskill: '软技能', domain: '领域', certification: '认证',
  }
  return map[t] ?? t
}
</script>

<style scoped>
.bbp {
  --bbp-line: rgba(255, 255, 255, 0.08);
  --bbp-mut: rgba(255, 255, 255, 0.6);
  --bbp-acc: #c4a0b8;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--bbp-line);
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(196, 160, 184, 0.09), rgba(255, 255, 255, 0.02));
}

.bbp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.bbp-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.bbp-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(196, 160, 184, 0.18);
  color: var(--bbp-acc);
}

.bbp-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--bbp-line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.bbp-card-t {
  font-size: 13px;
  font-weight: 700;
  opacity: 0.9;
}

.bbp-health-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.bbp-hstat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.bbp-hstat b {
  font-size: 18px;
}

.bbp-hstat span {
  font-size: 11px;
  color: var(--bbp-mut);
}

.bbp-hline {
  font-size: 12px;
  color: var(--bbp-mut);
}

.bbp-hsug {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--bbp-mut);
}

.bbp-skill,
.bbp-radar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bbp-skill-icon {
  flex: none;
  font-size: 16px;
}

.bbp-skill-body {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 34px;
}

.bbp-skill-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.bbp-skill-top strong {
  font-size: 13px;
}

.bbp-skill-meta {
  font-size: 11px;
  color: var(--bbp-mut);
}

.bbp-skill-bar,
.bbp-radar-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.bbp-skill-seg,
.bbp-radar-seg {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #c4a0b8, #e8c060);
}

.bbp-skill-val,
.bbp-radar-val {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--bbp-mut);
}

.bbp-radar-row {
  position: relative;
}

.bbp-radar-row .bbp-radar-label {
  flex: none;
  width: 56px;
  font-size: 12px;
}

.bbp-radar-row .bbp-radar-bar {
  flex: 1;
}

.bbp-radar-row .bbp-radar-val {
  position: static;
  transform: none;
  width: 24px;
  text-align: right;
}

.bbp-trend-row,
.bbp-predict-row,
.bbp-path {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.bbp-trend-date,
.bbp-predict-label,
.bbp-path-meta {
  color: var(--bbp-mut);
}

.bbp-predict-row {
  justify-content: flex-start;
}

.bbp-predict-label {
  flex: none;
  width: 56px;
}

.bbp-predict-cur,
.bbp-predict-30,
.bbp-predict-90 {
  min-width: 26px;
  text-align: center;
}

.bbp-predict-arrow {
  color: var(--bbp-mut);
}

.bbp-predict-days {
  margin-left: auto;
  color: var(--bbp-acc);
}

.bbp-path {
  flex-direction: column;
  align-items: stretch;
}

.bbp-path-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bbp-path-progress {
  font-size: 11px;
  color: var(--bbp-acc);
}

.bbp-rec {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--bbp-line);
}

.bbp-rec-prio {
  flex: none;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.bbp-rec-prio--high { background: rgba(196, 106, 90, 0.2); color: #c46a5a; }
.bbp-rec-prio--medium { background: rgba(232, 192, 96, 0.18); color: #e8c060; }
.bbp-rec-prio--low { background: rgba(138, 154, 122, 0.2); color: #8a9a7a; }

.bbp-rec-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bbp-rec-body strong {
  font-size: 13px;
}

.bbp-rec-desc,
.bbp-rec-benefit {
  font-size: 11px;
  color: var(--bbp-mut);
}
</style>
