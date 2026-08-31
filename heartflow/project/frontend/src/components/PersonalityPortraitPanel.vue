<template>
  <section class="pcp-panel">
    <!-- 空态：尚未有留声 -->
    <template v-if="portrait.overview.userCount === 0">
      <div class="pcp-head">
        <span class="pcp-title">🪞 人格画像</span>
        <span class="pcp-badge pcp-badge-neutral">待显影</span>
      </div>
      <p class="pcp-empty">
        与镜我聊聊此刻的感受、近来的困惑与欣喜，深度画像会在一次次对话中逐渐显影：自我认知报告、常用词汇、演化趋势与成长轨迹都将在此汇聚。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="pcp-head">
        <span class="pcp-title">🪞 人格画像</span>
        <span v-if="portrait.growth" class="pcp-badge">{{ portrait.growth.icon }} {{ portrait.growth.label }}</span>
      </div>

      <!-- 自我认知报告 -->
      <div class="pcp-block">
        <h3 class="pcp-block-title">自我认知报告</h3>
        <p class="pcp-summary">{{ portrait.report.summary }}</p>
        <ul class="pcp-report-list">
          <li v-for="d in portrait.report.dimensions" :key="d.key" class="pcp-report-item">
            <span class="pcp-report-label">{{ d.label }}</span>
            <span class="pcp-report-content">{{ d.content }}</span>
          </li>
        </ul>
        <div v-if="portrait.report.recommendations.length" class="pcp-recs">
          <span v-for="r in portrait.report.recommendations" :key="r" class="pcp-rec">→ {{ r }}</span>
        </div>
      </div>

      <!-- 常用词汇 / 句式 -->
      <div class="pcp-block">
        <h3 class="pcp-block-title">常用词汇与句式</h3>
        <div v-if="portrait.vocabulary.words.length" class="pcp-words">
          <span v-for="w in portrait.vocabulary.words" :key="w.word" class="pcp-word">
            {{ w.word }}<em>{{ w.count }}</em>
          </span>
        </div>
        <ul v-if="portrait.vocabulary.patterns.length" class="pcp-patterns">
          <li v-for="p in portrait.vocabulary.patterns" :key="p.pattern" class="pcp-pattern">
            <span class="pcp-pattern-text">{{ p.pattern }}</span>
            <span class="pcp-pattern-bar"><i :style="{ width: Math.min(100, p.frequency * 140) + '%' }"></i></span>
          </li>
        </ul>
        <p v-if="!portrait.vocabulary.words.length && !portrait.vocabulary.patterns.length" class="pcp-small-empty">
          语料尚少，更多对话会让你的用词习惯浮现。
        </p>
      </div>

      <!-- 演化趋势 -->
      <div class="pcp-block">
        <h3 class="pcp-block-title">
          演化趋势
          <span class="pcp-conf">置信 {{ Math.round(portrait.evolution.overallConfidence * 100) }}%</span>
        </h3>
        <div v-if="portrait.evolution.styleChanges.some((c) => c.direction !== 'stable')" class="pcp-dims">
          <div v-for="c in portrait.evolution.styleChanges" :key="c.dimension" class="pcp-dim">
            <span class="pcp-dim-label">{{ c.label }}</span>
            <span
              class="pcp-dim-dir"
              :class="c.direction"
            >{{ dirArrow(c.direction) }}{{ dirText(c.direction) }}</span>
          </div>
        </div>
        <p v-else class="pcp-small-empty">当前各维度趋于平稳，暂无明显迁移方向。</p>
        <ul class="pcp-paths">
          <li v-for="p in portrait.evolution.possiblePaths" :key="p.label" class="pcp-path">
            <span class="pcp-path-label">{{ p.label }}</span>
            <span class="pcp-path-desc">{{ p.description }}</span>
          </li>
        </ul>
      </div>

      <!-- 成长轨迹 -->
      <div v-if="portrait.trajectory" class="pcp-block">
        <h3 class="pcp-block-title">成长轨迹</h3>
        <div class="pcp-tra">
          <div class="pcp-tra-metric">
            <b>{{ Math.round(portrait.trajectory.stabilityScore * 100) }}%</b><span>稳定性</span>
          </div>
          <div class="pcp-tra-metric">
            <b>{{ Math.round(portrait.trajectory.totalChange * 100) }}%</b><span>总变化量</span>
          </div>
          <div class="pcp-tra-metric">
            <b>{{ portrait.trajectory.turningPointCount }}</b><span>转折点</span>
          </div>
        </div>
        <div class="pcp-tra-strip">
          <span
            v-for="n in portrait.trajectory.nodes"
            :key="n.date"
            class="pcp-tra-node"
            :class="'phase-' + n.phase"
            :title="n.date"
          >
            {{ n.phaseLabel.charAt(0) }}
          </span>
        </div>
        <p class="pcp-tra-range">{{ portrait.trajectory.startDate }} → {{ portrait.trajectory.lastDate }}</p>
      </div>
      <div v-else class="pcp-block">
        <h3 class="pcp-block-title">成长轨迹</h3>
        <p class="pcp-small-empty">沉淀足够的时间跨度后，这里将呈现你的成长轨迹。</p>
      </div>

      <!-- 温和洞察 -->
      <ul class="pcp-insights">
        <li v-for="ins in portrait.insights" :key="ins.title" class="pcp-insight">
          <span class="pcp-insight-mark">✦</span>
          <span class="pcp-insight-title">{{ ins.title }}</span>
          <p class="pcp-insight-detail">{{ ins.detail }}</p>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DialogueEntry } from '../modules/mirror'
import { buildPersonalityPortrait } from '../modules/mirror/personality-portrait-analytics'
import type { EvolutionDimensionChange } from '../modules/mirror/personality-portrait-analytics'

const props = defineProps<{ dialogues: DialogueEntry[] }>()

const portrait = computed(() => buildPersonalityPortrait(props.dialogues))

function dirArrow(dir: EvolutionDimensionChange['direction']): string {
  return dir === 'increasing' ? '↗' : dir === 'decreasing' ? '↘' : '→'
}
function dirText(dir: EvolutionDimensionChange['direction']): string {
  return dir === 'increasing' ? '上行' : dir === 'decreasing' ? '回落' : '走稳'
}
</script>

<style scoped>
.pcp-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pcp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px 2px;
}
.pcp-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.pcp-badge {
  font-size: 10px;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 12px;
  color: rgba(196, 160, 184, 0.92);
  background: rgba(196, 160, 184, 0.12);
  border: 1px solid rgba(196, 160, 184, 0.18);
}
.pcp-badge-neutral {
  color: rgba(240, 242, 255, 0.55);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.pcp-empty,
.pcp-small-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-low);
}
.pcp-small-empty {
  padding: 2px 0 0;
}

.pcp-block {
  padding: 14px 16px 16px;
  border-radius: 16px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.pcp-block-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(196, 160, 184, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 自我认知报告 */
.pcp-summary {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(240, 242, 255, 0.85);
}
.pcp-report-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pcp-report-item {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pcp-report-label {
  display: block;
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(196, 160, 184, 0.85);
  margin-bottom: 3px;
}
.pcp-report-content {
  font-size: 11px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.78);
}
.pcp-recs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.pcp-rec {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.8);
}

/* 常用词汇 / 句式 */
.pcp-words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.pcp-word {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 10px;
  color: rgba(240, 242, 255, 0.82);
  background: rgba(196, 160, 184, 0.1);
  border: 1px solid rgba(196, 160, 184, 0.14);
}
.pcp-word em {
  font-style: normal;
  font-size: 9px;
  color: rgba(196, 160, 184, 0.7);
  margin-left: 3px;
}
.pcp-patterns {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pcp-pattern {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pcp-pattern-text {
  font-size: 11px;
  color: rgba(240, 242, 255, 0.8);
  min-width: 76px;
}
.pcp-pattern-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.pcp-pattern-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(196, 160, 184, 0.5), rgba(196, 160, 184, 0.85));
}

/* 演化趋势 */
.pcp-conf {
  font-size: 9px;
  font-weight: 400;
  color: var(--text-low);
}
.pcp-dims {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.pcp-dim {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pcp-dim-label {
  font-size: 11px;
  color: rgba(240, 242, 255, 0.82);
}
.pcp-dim-dir {
  font-size: 10px;
}
.pcp-dim-dir.increasing { color: rgba(196, 160, 184, 0.9); }
.pcp-dim-dir.decreasing { color: rgba(124, 165, 190, 0.85); }
.pcp-dim-dir.stable { color: var(--text-low); }
.pcp-paths {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.pcp-path {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pcp-path-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: rgba(196, 160, 184, 0.9);
  margin-bottom: 2px;
}
.pcp-path-desc {
  font-size: 11px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.75);
}
.pcp-recs,
.pcp-path { box-sizing: border-box; }

/* 成长轨迹 */
.pcp-tra {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.pcp-tra-metric {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pcp-tra-metric b {
  display: block;
  font-size: 15px;
  color: rgba(240, 242, 255, 0.9);
}
.pcp-tra-metric span {
  font-size: 9px;
  color: var(--text-low);
}
.pcp-tra-strip {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.pcp-tra-node {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  border-radius: 8px;
  color: rgba(240, 242, 255, 0.85);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.pcp-tra-node.phase-exploration { background: rgba(124, 165, 190, 0.18); border-color: rgba(124, 165, 190, 0.3); }
.pcp-tra-node.phase-consolidation { background: rgba(196, 160, 184, 0.18); border-color: rgba(196, 160, 184, 0.3); }
.pcp-tra-node.phase-transformation { background: rgba(220, 180, 140, 0.2); border-color: rgba(220, 180, 140, 0.32); }
.pcp-tra-node.phase-integration { background: rgba(196, 160, 184, 0.32); border-color: rgba(196, 160, 184, 0.45); }
.pcp-tra-range {
  margin: 0;
  font-size: 10px;
  color: var(--text-low);
}

/* 温和洞察 */
.pcp-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pcp-insight {
  padding: 10px 12px 10px 28px;
  position: relative;
  border-radius: 12px;
  background: rgba(196, 160, 184, 0.07);
  border: 1px solid rgba(196, 160, 184, 0.12);
}
.pcp-insight-mark {
  position: absolute;
  left: 12px;
  top: 10px;
  color: rgba(196, 160, 184, 0.85);
  font-size: 11px;
}
.pcp-insight-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.88);
}
.pcp-insight-detail {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.68);
}
</style>