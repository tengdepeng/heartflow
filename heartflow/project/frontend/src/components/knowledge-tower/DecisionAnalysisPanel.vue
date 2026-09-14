<template>
  <section class="dap" aria-label="决策分析">
    <div class="dap-head">
      <span class="dap-title">🧭 决策分析</span>
      <span class="dap-sub">策略评估 · 决策树 · 场景规划</span>
    </div>

    <div class="dap-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['dap-tab', { active: active === t.key }]"
        @click="active = t.key"
      >{{ t.icon }} {{ t.label }}</button>
    </div>

    <StrategyEvaluatorPanel v-if="active === 'strategy'" />
    <DecisionTreePanel v-else-if="active === 'tree'" />
    <ScenarioPlannerPanel v-else-if="active === 'scenario'" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StrategyEvaluatorPanel from './StrategyEvaluatorPanel.vue'
import DecisionTreePanel from './DecisionTreePanel.vue'
import ScenarioPlannerPanel from './ScenarioPlannerPanel.vue'

const tabs = [
  { key: 'strategy', label: '策略评估', icon: '⚖️' },
  { key: 'tree', label: '决策树', icon: '🌳' },
  { key: 'scenario', label: '场景规划', icon: '🔭' },
]

const active = ref('strategy')
</script>

<style scoped>
.dap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.dap-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.dap-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, #d8c3a5);
}
.dap-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.dap-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.dap-tab {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(232, 221, 208, 0.6);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.dap-tab.active {
  border-color: rgba(240, 192, 64, 0.4);
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
</style>
