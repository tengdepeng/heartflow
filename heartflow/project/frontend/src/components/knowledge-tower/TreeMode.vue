<template>
    <!-- 树状模式 -->
    <div data-enter class="kt-panel">
      <div v-if="nodes.length" class="kt-tree-wrap">
        <div class="kt-tree-legend">
          <span class="kt-tree-legend-icon">🌳</span>
          <span>知识树状图 · {{ nodes.length }} 节点</span>
        </div>
        <div class="kt-tree-root">
          <div class="kt-tree-node kt-tree-root-node">
            <span class="kt-tree-dot" style="background:#d4a574"></span>
            <span class="kt-tree-label">知识根</span>
            <span class="kt-tree-count">{{ nodes.length }}</span>
          </div>
          <div class="kt-tree-children">
            <div v-for="cat in categories" :key="cat.key" class="kt-tree-branch" v-show="nodesByCat(cat.key).length > 0">
              <div class="kt-tree-node kt-tree-cat-node">
                <span class="kt-tree-cat-icon">{{ cat.icon }}</span>
                <span class="kt-tree-branch-line"></span>
                <span class="kt-tree-label">{{ cat.label }}</span>
                <span class="kt-tree-count">{{ nodesByCat(cat.key).length }}</span>
              </div>
              <div class="kt-tree-leaves">
                <div v-for="n in nodesByCat(cat.key)" :key="n.id" class="kt-tree-node kt-tree-leaf" @click="openEdit(n)">
                  <span class="kt-tree-leaf-line"></span>
                  <span class="kt-tree-dot" :style="{ background: catColor(cat.key) }"></span>
                  <span class="kt-tree-label">{{ n.title }}</span>
                  <span class="kt-tree-leaf-desc" v-if="n.desc"> — {{ n.desc.slice(0, 30) }}</span>
                  <span class="kt-tree-leaf-links" v-if="computedRelations.filter(r => r.sourceId === n.id || r.targetId === n.id).length">
                    🔗 {{ computedRelations.filter(r => r.sourceId === n.id || r.targetId === n.id).length }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="kt-empty"><span>🌳</span><p>知识树等待第一个节点</p></div>
    </div>
</template>
<script setup lang="ts">
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
const {
  nodes,
  categories,
  nodesByCat,
  catColor,
  computedRelations,
  openEdit,
} = useKtUi()
</script>
<style scoped src="./knowledge-shared.css"></style>
