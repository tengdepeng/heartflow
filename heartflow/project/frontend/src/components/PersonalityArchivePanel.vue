<template>
  <section class="pac-panel">
    <template v-if="overview.userCount > 0">
      <!-- 头部 -->
      <header class="pac-head">
        <span class="pac-title">🧭 自我认知档案</span>
        <span v-if="growth" class="pac-phase-badge">{{ growth.label }}</span>
      </header>

      <!-- 概览四格 -->
      <div class="pac-overview">
        <div class="pac-ov-item"><b>{{ overview.userCount }}</b><span>次留声</span></div>
        <div class="pac-ov-item"><b>{{ overview.totalWords }}</b><span>字沉淀</span></div>
        <div class="pac-ov-item"><b>{{ overview.daySpan }}</b><span>覆盖天数</span></div>
        <div class="pac-ov-item"><b>{{ overview.recent7 }}</b><span>近7天</span></div>
      </div>

      <!-- 人格风格 -->
      <div class="pac-block">
        <h5 class="pac-block-title">人格风格</h5>
        <div class="pac-dim-row" v-for="s in styleRows" :key="s.dimension">
          <div class="pac-dim-meta">
            <span class="pac-dim-name">
              {{ s.label }}
              <em v-if="s.score >= 0.45" class="pac-dim-tag">{{ s.highLabel }}</em>
            </span>
            <span class="pac-dim-stem">{{ s.score >= 0.5 ? s.highLabel : s.score >= 0.25 ? '中庸' : s.lowLabel }}</span>
          </div>
          <div class="pac-dim-bar"><span class="pac-dim-fill" :style="{ width: `${Math.round(s.score * 100)}%` }"></span></div>
        </div>
        <p v-if="styleRows.every((s) => s.score < 0.25)" class="pac-hint">特质尚在显影，多留几分思绪便会明亮起来。</p>
      </div>

      <!-- 价值观取向 -->
      <div class="pac-block" v-if="valueRows.length">
        <h5 class="pac-block-title">价值观取向</h5>
        <div class="pac-val-row" v-for="v in valueRows" :key="v.dimension">
          <div class="pac-dim-meta">
            <span class="pac-dim-name">{{ v.label }}</span>
            <span class="pac-dim-stem">{{ Math.round(v.score * 100) }}</span>
          </div>
          <div class="pac-dim-bar"><span class="pac-dim-fill pac-val-fill" :style="{ width: `${Math.round(v.score * 100)}%` }"></span></div>
          <p v-if="v.evidence.length" class="pac-evidence">「{{ v.evidence[0] }}」</p>
        </div>
      </div>

      <!-- 成长阶段 -->
      <div class="pac-block" v-if="growth">
        <h5 class="pac-block-title">成长阶段</h5>
        <div class="pac-growth">
          <span class="pac-growth-icon">{{ growth.icon }}</span>
          <div class="pac-growth-body">
            <b class="pac-growth-label">{{ growth.label }}</b>
            <p class="pac-growth-desc">{{ growth.description }}</p>
            <p class="pac-growth-why">{{ growth.rationale }}</p>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <div class="pac-block" v-if="insights.length">
        <h5 class="pac-block-title">温和洞察</h5>
        <ul class="pac-insights">
          <li v-for="(it, i) in insights" :key="i" class="pac-insight" :data-tone="it.tone">
            <span class="pac-insight-mark">{{ it.tone === 'positive' ? '✦' : '·' }}</span>
            <div>
              <p class="pac-insight-title">{{ it.title }}</p>
              <p class="pac-insight-detail">{{ it.detail }}</p>
            </div>
          </li>
        </ul>
      </div>
    </template>

    <!-- 空态引导 -->
    <template v-else>
      <header class="pac-head">
        <span class="pac-title">🧭 自我认知档案</span>
      </header>
      <p class="pac-empty">与镜我深度对话，让每一次留声沉淀出你的倒影：人格风格、价值观与成长阶段将在这里逐渐显影。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DialogueEntry } from '../modules/mirror'
import {
  selfCognitionOverview,
  selfCognitionStyle,
  selfCognitionValues,
  selfCognitionGrowth,
  selfCognitionInsights,
} from '../modules/mirror/self-cognition-analytics'

const props = defineProps<{ dialogues: DialogueEntry[] }>()

const overview = computed(() => selfCognitionOverview(props.dialogues, new Date()))
const styleRows = computed(() => selfCognitionStyle(props.dialogues))
const valueRows = computed(() => selfCognitionValues(props.dialogues))
const growth = computed(() => selfCognitionGrowth(props.dialogues, overview.value))
const insights = computed(() => selfCognitionInsights(props.dialogues, overview.value, styleRows.value))
</script>

<style scoped>
.pac-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 18px 20px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.pac-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pac-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.pac-phase-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  color: rgba(196, 160, 184, 0.95);
  background: rgba(196, 160, 184, 0.12);
  border: 1px solid rgba(196, 160, 184, 0.22);
}

.pac-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.pac-ov-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pac-ov-item b {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.pac-ov-item span {
  font-size: 10px;
  color: var(--text-low);
}

.pac-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}
.pac-block-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-medium);
}

.pac-dim-row,
.pac-val-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.pac-dim-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pac-dim-name {
  font-size: 12px;
  color: rgba(240, 242, 255, 0.85);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pac-dim-tag {
  font-style: normal;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  color: rgba(196, 160, 184, 0.95);
  background: rgba(196, 160, 184, 0.12);
}
.pac-dim-stem {
  font-size: 10px;
  color: var(--text-low);
}
.pac-dim-bar {
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.pac-dim-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(196, 160, 184, 0.5), rgba(196, 160, 184, 0.9));
}
.pac-val-fill {
  background: linear-gradient(90deg, rgba(164, 196, 160, 0.45), rgba(164, 196, 160, 0.85));
}
.pac-evidence {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
}
.pac-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
}

.pac-growth {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pac-growth-icon {
  font-size: 22px;
  line-height: 1;
}
.pac-growth-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pac-growth-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.pac-growth-desc,
.pac-growth-why {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-medium);
}
.pac-growth-why {
  color: var(--text-low);
}

.pac-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pac-insight {
  display: flex;
  gap: 8px;
}
.pac-insight[data-tone='positive'] .pac-insight-mark {
  color: rgba(196, 160, 184, 0.85);
}
.pac-insight-mark {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-low);
}
.pac-insight-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.85);
}
.pac-insight-detail {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.pac-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.8;
  color: var(--text-low);
  text-align: center;
}
</style>