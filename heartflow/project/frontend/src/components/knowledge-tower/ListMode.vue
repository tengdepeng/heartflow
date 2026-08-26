<template>
    <!-- 列表模式(默认) -->
    <div data-enter class="kt-panel">
      <div class="kt-input-row">
        <input v-model="form.title" placeholder="知识节点…" @keyup.enter="addNode" class="kt-input"/>
        <select v-model="form.cat" class="kt-select"><option value="concept">概念</option><option value="rule">法则</option><option value="frame">框架</option><option value="insight">直觉</option><option value="pitfall">误区</option><option value="metaphor">比喻</option></select>
        <button @click="addNode" class="kt-btn" :disabled="!form.title">+</button>
      </div>
      <div class="kt-list-count" v-if="searchQuery && filteredNodes.length < nodes.length">
        搜索到 {{ filteredNodes.length }} / {{ nodes.length }} 个节点
      </div>
      <div v-if="filteredNodes.length" class="kt-list-area">
        <div v-for="n in filteredNodes" :key="n.id" class="kt-list-item" @click="openEdit(n)">
          <span class="kt-list-cat">{{catIcon(n.cat)}}</span>
          <div class="kt-node-info"><span class="kt-node-title">{{n.title}}</span><span class="kt-node-desc" v-if="n.desc">{{n.desc.slice(0,60)}}</span></div>
          <button class="kt-del" @click.stop="removeNode(n.id)">×</button>
        </div>
      </div>
      <div v-else class="kt-empty"><span>🌟</span><p>知识星图等待第一个节点</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  form,
  addNode,
  filteredNodes,
  nodes,
  searchQuery,
  catIcon,
  removeNode,
  openEdit,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
