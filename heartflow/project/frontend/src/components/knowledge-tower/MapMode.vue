<template>
    <!-- 地图模式 -->
    <div data-enter class="kt-panel">
      <div class="kt-map-legend"><span>🏔 密集区</span><span>🌫 未探索</span></div>
      <div v-for="cat in categories" :key="cat.key" class="kt-map-row">
        <span class="kt-map-cat">{{cat.icon}}</span>
        <div class="kt-map-bar"><div class="kt-map-fill" :style="{width:catDensity(cat.key)+'%',background:catColor(cat.key)}"/></div>
        <span class="kt-map-count">{{nodesByCat(cat.key).length}}</span>
        <span v-if="catDensity(cat.key)<20" class="kt-blind-spot">盲区</span>
      </div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  categories,
  nodesByCat,
  catDensity,
  catColor,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
