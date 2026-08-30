<template>
  <section v-if="profile" class="dap-panel">
    <header class="dap-head">
      <span class="dap-title">🪞 对话分身档案</span>
      <span class="dap-tier" :style="{ color: tierColor }">{{ archive?.tier }}</span>
    </header>

    <!-- 统计速览 -->
    <div class="dap-stats">
      <div class="dap-stat">
        <span class="dap-stat-n">{{ archive?.turnCount }}</span>
        <span class="dap-stat-l">对话轮次</span>
      </div>
      <div class="dap-stat">
        <span class="dap-stat-n">{{ archive?.totalInteractions }}</span>
        <span class="dap-stat-l">总互动</span>
      </div>
      <div class="dap-stat">
        <span class="dap-stat-n">{{ archive?.witnessCount }}</span>
        <span class="dap-stat-l">见证次数</span>
      </div>
      <div class="dap-stat">
        <span class="dap-stat-n">{{ archive?.tenureDays }}</span>
        <span class="dap-stat-l">在位天数</span>
      </div>
    </div>

    <!-- 好感度进度 -->
    <div class="dap-affinity">
      <div class="dap-affinity-row">
        <span class="dap-affinity-label">好感度</span>
        <span class="dap-affinity-val">{{ archive?.affinity }} / 100</span>
      </div>
      <div class="dap-affinity-bar">
        <i :style="{ width: (archive?.affinity ?? 0) + '%' }"></i>
      </div>
      <p class="dap-affinity-hint">对话会缓慢积累好感，好感度决定关系档位。</p>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="archive?.insights.length" class="dap-insights">
      <li v-for="(ins, i) in archive?.insights" :key="i">{{ ins }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdvisor } from '../resonance/bridges/advisor'
import { dialogueArchiveOverview } from '../modules/advisor/dialogue-archive-analytics'
import { AFFINITY_TIERS } from '../types'

const props = defineProps<{ advisorId: string }>()

const advisor = useAdvisor()

const profile = computed(() => advisor.getAdvisorById(props.advisorId))
const archive = computed(() => {
  const p = profile.value
  if (!p) return null
  return dialogueArchiveOverview(p, new Date())
})
const tierColor = computed(() => {
  const idx = Math.min(
    Math.max(AFFINITY_TIERS.findIndex((t) => t.title === archive.value?.tier), 0),
    AFFINITY_TIERS.length - 1,
  )
  const colors = ['#9a9a9a', '#b0a0c0', '#a090e0', '#e0b060', '#f0c040', '#f0a830']
  return colors[idx] ?? '#9a9a9a'
})
</script>

<style scoped>
.dap-panel {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.03);
  margin-bottom: 10px;
}
.dap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.dap-title { font-size: 13px; font-weight: 600; color: rgba(240, 232, 224, 0.9); }
.dap-tier { font-size: 11px; font-weight: 600; }

.dap-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.dap-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
}
.dap-stat-n { font-size: 16px; font-weight: 600; color: var(--accent); }
.dap-stat-l { font-size: 10px; color: rgba(var(--accent-rgb), 0.5); }

.dap-affinity { margin-bottom: 10px; }
.dap-affinity-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.6);
  margin-bottom: 5px;
}
.dap-affinity-val { color: var(--accent); font-weight: 600; }
.dap-affinity-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.dap-affinity-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.4s;
}
.dap-affinity-hint { font-size: 10px; color: rgba(var(--accent-rgb), 0.3); margin: 5px 0 0; }

.dap-insights {
  margin: 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  list-style: none;
}
.dap-insights li {
  font-size: 11px;
  color: rgba(232, 221, 208, 0.55);
  line-height: 1.7;
}
.dap-insights li + li { border-top: 1px dashed rgba(var(--accent-rgb), 0.1); padding-top: 4px; }
</style>