<template>
  <section class="kap">
    <div class="kap-head">
      <div class="kap-title-wrap">
        <span class="kap-title">🗼 知识档案</span>
        <span class="kap-sub">把知识点看作星图上的光，看看它们的远近与相连</span>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="kap-metrics">
      <div class="kap-metric"><b>{{ ov.nodeCount }}</b><span>节点</span></div>
      <div class="kap-metric"><b>{{ ov.edgeCount }}</b><span>关联</span></div>
      <div class="kap-metric"><b>{{ ov.linkedNodeCount }}</b><span>已关联节点</span></div>
      <div class="kap-metric"><b>{{ ov.categoryCount }}</b><span>分类</span></div>
      <div class="kap-metric"><b>{{ ov.avgDegree }}</b><span>均关联数</span></div>
      <div class="kap-metric"><b>{{ imp.total }}</b><span>导入来源</span></div>
    </div>

    <!-- 网络形状：连通率 + 星图铺展 -->
    <div class="kap-shape" v-if="ov.nodeCount">
      <div class="kap-ring" :style="{ background: ringStyle }">
        <span class="kap-ring-num">{{ shape.connectivity }}<i>%</i></span>
        <span class="kap-ring-label">连通率</span>
      </div>
      <div class="kap-axes">
        <div class="kap-axis">
          <span class="kap-axis-label">孤立节点</span>
          <div class="kap-bar"><i :style="{ width: isolatedPct + '%' }"></i></div>
          <b>{{ shape.isolated }}</b>
        </div>
        <div class="kap-axis">
          <span class="kap-axis-label">网络密度</span>
          <div class="kap-bar"><i :style="{ width: densityPct + '%' }"></i></div>
          <b>{{ shape.density }}</b>
        </div>
        <div class="kap-axis">
          <span class="kap-axis-label">星图铺展</span>
          <div class="kap-bar"><i :style="{ width: starPct + '%' }"></i></div>
          <b>{{ starPct }}%</b>
        </div>
      </div>
    </div>

    <!-- 分类分布 -->
    <div v-if="ov.categories.length" class="kap-cats">
      <div v-for="c in ov.categories" :key="c.cat" class="kap-cat">
        <span class="kap-cat-name">{{ c.label }}</span>
        <div class="kap-cat-bar"><i :style="{ width: catPct(c) + '%' }"></i></div>
        <span class="kap-cat-count">{{ c.count }}</span>
      </div>
    </div>

    <!-- 枢纽节点 -->
    <div v-if="shape.hubs.length && shape.hubs[0].degree" class="kap-hubs">
      <span class="kap-hubs-label">枢纽节点</span>
      <div class="kap-hub" v-for="h in shape.hubs" :key="h.id">
        <span class="kap-hub-name">{{ h.title }}</span>
        <span class="kap-hub-degree">{{ h.degree }} 关联</span>
      </div>
    </div>

    <!-- 导入来源分布 -->
    <div v-if="imp.byType.length" class="kap-imports">
      <div v-for="t in imp.byType" :key="t.type" class="kap-import">
        <span class="kap-import-icon">{{ t.icon }}</span>
        <span class="kap-import-name">{{ t.label }}</span>
        <span class="kap-import-count">{{ t.count }}</span>
      </div>
    </div>

    <!-- 温和提示 -->
    <div v-if="insights.length" class="kap-insights">
      <p v-for="(ins, i) in insights" :key="i" class="kap-insight">{{ ins.text }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { KNode } from '../../modules/knowledge'
import type { ImportSource } from '../../modules/knowledge'
import {
  knowledgeOverview,
  knowledgeGraphShape,
  importOverview,
  knowledgeInsights,
  starLayoutProgress,
} from '../../modules/knowledge'

const props = defineProps<{
  nodes: KNode[]
  importSources: ImportSource[]
  starPositions: Record<string, { x: number; y: number }>
}>()

const ov = computed(() => knowledgeOverview(props.nodes))
const shape = computed(() => knowledgeGraphShape(props.nodes))
const imp = computed(() => importOverview(props.importSources))
const insights = computed(() => knowledgeInsights(ov.value, shape.value, imp.value))

const starPct = computed(() => starLayoutProgress(props.starPositions, props.nodes.length))

const isolatedPct = computed(() =>
  ov.value.nodeCount ? Math.round((shape.value.isolated / ov.value.nodeCount) * 100) : 0,
)
const densityPct = computed(() => Math.min(100, Math.round(shape.value.density * 100)))

const disclosure = `conic-gradient(var(--accent) ${shape.value.connectivity}%, rgba(var(--accent-rgb),0.1) 0%)`
const ringStyle = computed(() => `background: ${disclosure}`)

function catPct(c: { count: number }): number {
  if (!ov.value.nodeCount) return 0
  return Math.round((c.count / ov.value.nodeCount) * 100)
}
</script>

<style scoped>
.kap {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 24px auto 0;
  padding: 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.kap-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}
.kap-title { font-size: 15px; font-weight: 500; color: var(--accent); }
.kap-sub { font-size: 11px; color: var(--text-faint); }
.kap-metrics {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.kap-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1 1 90px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}
.kap-metric b { font-size: 16px; color: var(--text-bright); }
.kap-metric span { font-size: 11px; color: var(--text-low); }
.kap-shape {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
}
.kap-ring {
  position: relative;
  width: 92px;
  height: 92px;
  flex: none;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.kap-ring-num { font-size: 20px; font-weight: 600; color: var(--accent); }
.kap-ring-num i { font-style: normal; font-size: 12px; }
.kap-ring-label { font-size: 10px; color: var(--text-faint); }
.kap-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.kap-axis { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.kap-axis-label { color: var(--text-low); min-width: 52px; }
.kap-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.kap-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.4s;
}
.kap-axis b { color: var(--text-bright); min-width: 30px; text-align: right; }
.kap-cats { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.kap-cat { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.kap-cat-name { color: var(--text-low); min-width: 40px; }
.kap-cat-bar { flex: 1; height: 5px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.kap-cat-bar i { display: block; height: 100%; background: color-mix(in srgb, var(--accent) 70%, transparent); border-radius: 3px; }
.kap-cat-count { color: var(--text-bright); min-width: 20px; text-align: right; }
.kap-hubs {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.kap-hubs-label { font-size: 11px; color: var(--text-faint); }
.kap-hub {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  display: flex;
  gap: 6px;
  align-items: center;
}
.kap-hub-name { font-size: 11px; color: var(--text-bright); }
.kap-hub-degree { font-size: 10px; color: var(--accent); }
.kap-imports { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.kap-import {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.kap-import-icon { font-size: 13px; }
.kap-import-name { font-size: 11px; color: var(--text-low); }
.kap-import-count { font-size: 11px; color: var(--accent); }
.kap-insights { display: flex; flex-direction: column; gap: 6px; }
.kap-insight {
  font-size: 12px;
  color: var(--text-low);
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border-left: 2px solid rgba(var(--accent-rgb), 0.4);
}
</style>