<template>
  <div class="star-map-view">
    <RoomLayout title="知识星图" subtitle="把经略阁的知识节点铺成可旋转的 3D 星云">
      <main class="smv-body">
        <template v-if="nodes.length">
          <section class="smv-scene">
            <StarMap3D :nodes="nodes" :relations="relations" @select-node="onSelect" />
          </section>
          <aside v-if="selected" class="smv-detail">
            <h2 class="smv-detail-title">{{ selected.title }}</h2>
            <p class="smv-detail-cat">{{ catLabel(selected.cat) }}</p>
            <p class="smv-detail-desc">{{ selected.desc || '（暂无描述）' }}</p>
          </aside>
        </template>
        <p v-else class="smv-empty">
          经略阁还没有知识节点。先去「语丝」或「经略阁」沉淀一些想法，星图会随之点亮。
        </p>
      </main>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RoomLayout from '../components/RoomLayout.vue'
import StarMap3D from '../components/knowledge/StarMap3D.vue'
import { getNodes, getRelations } from '../modules/knowledge'
import type { KnowledgeNode, KnowledgeCategory } from '../modules/knowledge/types'

const nodes = ref<KnowledgeNode[]>([])
const relations = ref(getRelations())
const selected = ref<KnowledgeNode | null>(null)

const CAT_LABELS: Record<KnowledgeCategory, string> = {
  concept: '概念',
  rule: '规律',
  frame: '框架',
  insight: '洞见',
  pitfall: '陷阱',
  metaphor: '隐喻',
}

function catLabel(cat: KnowledgeCategory): string {
  return CAT_LABELS[cat] ?? cat
}

function load(): void {
  nodes.value = getNodes()
  relations.value = getRelations()
  selected.value = null
}

function onSelect(nodeId: string): void {
  selected.value = nodes.value.find((n) => n.id === nodeId) ?? null
}

onMounted(load)
</script>

<style scoped>
.star-map-view {
  min-height: 100%;
}

.smv-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 420px;
  display: flex;
  gap: 20px;
}

.smv-scene {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.smv-detail {
  flex: 0 0 260px;
  align-self: flex-start;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.smv-detail-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.smv-detail-cat {
  margin: 0 0 10px;
  font-size: 12px;
  opacity: 0.6;
}

.smv-detail-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.82;
}

.smv-empty {
  margin: auto;
  max-width: 360px;
  text-align: center;
  font-size: 14px;
  line-height: 1.7;
  opacity: 0.6;
}

/* 窄屏：详情列改为整行堆叠，避免 260px 固定列挤占星图场景 */
@media (max-width: 640px) {
  .smv-body {
    flex-direction: column;
  }

  .smv-detail {
    flex: 0 0 auto;
    width: 100%;
    order: 2;
  }
}
</style>
