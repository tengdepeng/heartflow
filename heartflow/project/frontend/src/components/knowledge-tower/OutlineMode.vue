<template>
    <!-- 大纲模式 -->
    <div data-enter class="kt-panel">
      <div v-for="cat in categories" :key="cat.key" class="kt-outline-section">
        <h4>{{cat.icon}} {{cat.label}} ({{nodesByCat(cat.key).length}})</h4>
        <div v-for="n in nodesByCat(cat.key)" :key="n.id" class="kt-outline-item" @click="openEdit(n)">
          <span class="kt-oi-dot"/><span>{{n.title}}</span><span class="kt-oi-desc" v-if="n.desc"> — {{n.desc.slice(0,40)}}</span>
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  categories,
  nodesByCat,
  openEdit,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
