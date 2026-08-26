<template>
    <!-- 年轮模式 -->
    <div data-enter class="kt-panel">
      <div v-if="nodes.length" class="kt-ring-wrap">
        <svg viewBox="0 0 300 300" class="kt-ring-svg">
          <circle v-for="r in ringData" :key="'ring'+r.year" :cx="150" :cy="150" :r="r.radius" fill="none" stroke="rgba(var(--accent-rgb), 0.12)" stroke-width="1"/>
          <text v-for="r in ringData" :key="'lb'+r.year" :x="150" :y="150 - r.radius - 8" text-anchor="middle" fill="rgba(var(--accent-rgb), 0.4)" font-size="9">{{r.year}}</text>
          <template v-for="r in ringData" :key="'g'+r.year">
            <circle v-for="n in r.nodes" :key="n.id" :cx="n.cx" :cy="n.cy" r="4" fill="rgba(var(--accent-rgb), 0.7)" stroke="rgba(42,36,30,0.6)" stroke-width="1" class="kt-ring-dot" @click="openEdit(n)"/>
            <text v-for="n in r.nodes" :key="'t'+n.id" :x="n.cx" :y="n.cy - 9" text-anchor="middle" fill="rgba(232,224,216,0.6)" font-size="7" class="kt-ring-label">{{n.title.slice(0,6)}}</text>
          </template>
          <circle cx="150" cy="150" r="18" fill="rgba(var(--accent-rgb), 0.08)" stroke="rgba(var(--accent-rgb), 0.15)" stroke-width="1"/>
          <text x="150" y="150" text-anchor="middle" dominant-baseline="central" fill="rgba(var(--accent-rgb), 0.5)" font-size="16" style="font-family: var(--font-heading-zh, 'Noto Serif SC', serif)">知</text>
        </svg>
      </div>
      <div v-else class="kt-empty"><span>🌟</span><p>知识星图等待第一个节点</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  ringData,
  openEdit,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
