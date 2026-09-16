<template>
  <section class="mm-panel" aria-label="思维导图">
    <div class="mm-panel-head">
      <span class="mm-panel-title">🧠 思维导图</span>
      <span class="mm-panel-sub">笔记结构化 · 层级展开</span>
    </div>

    <!-- 统计 -->
    <div class="mm-block">
      <span class="mm-block-label">导图概览</span>
      <div class="mm-stats">
        <div class="mm-stat">
          <span class="mm-stat-num">{{ stats.totalMaps }}</span>
          <span class="mm-stat-label">导图</span>
        </div>
        <div class="mm-stat">
          <span class="mm-stat-num">{{ stats.totalNodes }}</span>
          <span class="mm-stat-label">节点</span>
        </div>
        <div class="mm-stat">
          <span class="mm-stat-num">{{ stats.totalConnections }}</span>
          <span class="mm-stat-label">连接</span>
        </div>
        <div class="mm-stat">
          <span class="mm-stat-num">{{ stats.averageDepth }}</span>
          <span class="mm-stat-label">均深</span>
        </div>
      </div>
    </div>

    <!-- 新建 / 从笔记生成 -->
    <div class="mm-block">
      <span class="mm-block-label">新建导图</span>
      <div class="mm-row">
        <input v-model="form.title" class="mm-input" placeholder="导图标题" @keyup.enter="createMap" />
        <input v-model="form.rootLabel" class="mm-input" placeholder="根节点（可选）" @keyup.enter="createMap" />
        <button class="mm-btn mm-btn-primary" @click="createMap" :disabled="!form.title.trim()">创建</button>
      </div>
      <div class="mm-row">
        <button class="mm-btn" @click="generateFromNotes" :disabled="noteCount === 0">
          ✨ 从 {{ noteCount }} 条笔记生成
        </button>
        <span v-if="noteCount === 0" class="mm-hint">书架为空，先写笔记</span>
      </div>
    </div>

    <!-- 导图列表 -->
    <div class="mm-block" v-if="maps.length > 0">
      <span class="mm-block-label">我的导图</span>
      <div class="mm-map-chips">
        <button
          v-for="m in maps"
          :key="m.id"
          :class="['mm-chip', { active: m.id === selectedMapId }]"
          @click="selectedMapId = m.id"
        >{{ m.title }}</button>
      </div>
    </div>

    <!-- 树视图 -->
    <div class="mm-block" v-if="selectedMap">
      <div class="mm-tree-head">
        <span class="mm-block-label">{{ selectedMap.title }}</span>
        <span class="mm-hint">{{ visibleNodes.length }} 节点</span>
      </div>
      <div class="mm-tree">
        <div
          v-for="node in visibleNodes"
          :key="node.id"
          class="mm-node"
          :class="{ root: node.isRoot }"
          :style="{ paddingLeft: (node.level * 18 + 8) + 'px' }"
        >
          <button
            class="mm-node-toggle"
            :class="{ leaf: node.children.length === 0 }"
            @click="toggleNode(node)"
          >{{ node.children.length > 0 ? (node.expanded ? '▾' : '▸') : '·' }}</button>
          <span class="mm-node-dot" :style="{ background: node.color }" />
          <span class="mm-node-label" :title="node.label">{{ node.label }}</span>
          <span v-if="node.tags.length" class="mm-node-tags">
            <span v-for="t in node.tags.slice(0, 2)" :key="t" class="mm-node-tag">{{ t }}</span>
          </span>
          <button class="mm-node-add" title="添加子节点" @click="startAddChild(node)">＋</button>
          <button v-if="!node.isRoot" class="mm-node-del" title="删除" @click="removeNode(node)">✕</button>
        </div>
      </div>

      <!-- 添加子节点 -->
      <div v-if="addingTo" class="mm-add-child">
        <input v-model="childLabel" class="mm-input" :placeholder="`在「${addingTo.label}」下添加`" @keyup.enter="confirmAddChild" />
        <button class="mm-btn mm-btn-primary" @click="confirmAddChild" :disabled="!childLabel.trim()">添加</button>
        <button class="mm-btn" @click="addingTo = null">取消</button>
      </div>
    </div>

    <p v-else-if="maps.length === 0" class="mm-empty">还没有导图，创建一张或从笔记生成</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMindMap } from '../modules/note'
import type { MindNode } from '../modules/note'
import { useStudy } from '../modules/study'
import type { StickyNote } from '../modules/note'

const mind = useMindMap()
const study = useStudy()

mind.loadMaps()
mind.loadConnections()

const maps = computed(() => mind.maps.value)
const stats = computed(() => mind.computeStats())
const noteCount = computed(() => study.notes.value.length)

const selectedMapId = ref('')
const selectedMap = computed(() => maps.value.find(m => m.id === selectedMapId.value) || null)

const visibleNodes = computed(() => {
  const map = selectedMap.value
  if (!map) return []
  const out: MindNode[] = []
  function walk(node: MindNode) {
    out.push(node)
    if (node.expanded) node.children.forEach(walk)
  }
  walk(map.rootNode)
  return out
})

watch(maps, (list) => {
  if (!list.some(m => m.id === selectedMapId.value)) {
    selectedMapId.value = list[0]?.id ?? ''
  }
}, { immediate: true })

const form = reactive({ title: '', rootLabel: '' })

function createMap() {
  if (!form.title.trim()) return
  const map = mind.createMap(form.title.trim(), form.rootLabel.trim() || form.title.trim())
  selectedMapId.value = map.id
  form.title = ''
  form.rootLabel = ''
}

function generateFromNotes() {
  const notes = study.notes.value as unknown as StickyNote[]
  if (notes.length === 0) return
  const title = `笔记导图 ${new Date().toISOString().slice(0, 10)}`
  const map = mind.generateFromNotes(title, notes)
  selectedMapId.value = map.id
}

function toggleNode(node: MindNode) {
  if (selectedMap.value) mind.toggleNode(selectedMap.value.id, node.id)
}

const addingTo = ref<MindNode | null>(null)
const childLabel = ref('')

function startAddChild(node: MindNode) {
  addingTo.value = node
  childLabel.value = ''
}

function confirmAddChild() {
  if (!selectedMap.value || !addingTo.value || !childLabel.value.trim()) return
  mind.addChildNode(selectedMap.value.id, addingTo.value.id, childLabel.value.trim())
  addingTo.value = null
  childLabel.value = ''
}

function removeNode(node: MindNode) {
  if (!selectedMap.value) return
  mind.removeNode(selectedMap.value.id, node.id)
}
</script>

<style scoped>
.mm-panel {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.mm-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.mm-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.mm-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.mm-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.mm-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.mm-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.mm-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.mm-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.mm-stat-label {
  font-size: 10px;
  color: var(--text-low);
}
.mm-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.mm-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}
.mm-btn {
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.mm-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.mm-btn-primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.3);
  color: #f0c040;
}
.mm-hint {
  font-size: 11px;
  color: var(--text-low);
}
.mm-map-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mm-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(240, 242, 255, 0.6);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.mm-chip.active {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.3);
  color: #f0c040;
}
.mm-tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mm-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow: auto;
}
.mm-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  font-size: 12px;
}
.mm-node.root {
  background: rgba(240, 192, 64, 0.08);
}
.mm-node-toggle {
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: rgba(240, 242, 255, 0.5);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 24px;
  min-width: 24px;
}
.mm-node-toggle.leaf {
  cursor: default;
  color: rgba(240, 242, 255, 0.2);
}
.mm-node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mm-node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(240, 242, 255, 0.85);
}
.mm-node-tags {
  display: flex;
  gap: 3px;
}
.mm-node-tag {
  padding: 0 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 9px;
  color: rgba(240, 242, 255, 0.4);
}
.mm-node-add,
.mm-node-del {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(240, 242, 255, 0.3);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 24px;
  min-width: 24px;
  min-height: 24px;
  min-width: 24px;
}
.mm-node-add:hover {
  color: #f0c040;
  background: rgba(240, 192, 64, 0.1);
}
.mm-node-del:hover {
  color: #e06b6b;
  background: rgba(224, 107, 107, 0.1);
}
.mm-add-child {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.mm-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-low);
  text-align: center;
  padding: 12px 0;
}
</style>
