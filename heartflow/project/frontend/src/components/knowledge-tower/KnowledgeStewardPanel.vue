<template>
  <section class="ksp" aria-label="AI管家·连接与追问">
    <div class="ksp-head">
      <span class="ksp-title">🧭 AI 管家 · 连接与追问</span>
      <span class="ksp-sub">把知识串成网 · 发现隐藏联系 · 苏格拉底式追问</span>
    </div>

    <!-- 空态 -->
    <div v-if="nodes.length === 0" class="ksp-empty">
      <span>🌱</span>
      <p>还没有知识节点。先在经略阁添加节点，AI 管家才能帮你串起知识的网。</p>
    </div>

    <template v-else>
      <!-- 节点选择 -->
      <div class="ksp-pick">
        <label class="ksp-pick-label" for="ksp-select">聚焦节点</label>
        <select id="ksp-select" v-model="selectedId" class="ksp-select">
          <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.title }}</option>
        </select>
      </div>

      <!-- 连接建议 -->
      <div class="ksp-block">
        <span class="ksp-block-label">🔗 连接建议</span>
        <p v-if="!selectedNode" class="ksp-note">选择上方节点后，AI 管家会推荐可能相关的知识节点。</p>
        <p v-else-if="suggestions.length === 0" class="ksp-note">「{{ selectedNode.title }}」暂无新的连接建议，它已与所有候选节点建立联系。</p>
        <ul v-else class="ksp-suggests">
          <li v-for="s in suggestions" :key="s.targetId" class="ksp-suggest">
            <div class="ksp-suggest-main">
              <span class="ksp-suggest-title">{{ targetTitle(s.targetId) }}</span>
              <div class="ksp-suggest-score">
                <i class="ksp-suggest-bar" :style="{ width: s.score + '%' }"></i>
              </div>
              <span class="ksp-suggest-reason">{{ s.reason }}</span>
            </div>
            <button type="button" class="ksp-link-btn" @click="linkSuggestion(s.targetId)">建立连接</button>
          </li>
        </ul>
      </div>

      <!-- 苏格拉底追问 -->
      <div class="ksp-block">
        <span class="ksp-block-label">❓ 苏格拉底追问</span>
        <p v-if="!selectedNode" class="ksp-note">针对所选节点的分类，生成一组深度追问，帮你把知识想透。</p>
        <ul v-else class="ksp-questions">
          <li v-for="(q, i) in questions" :key="i" class="ksp-question">
            <span class="ksp-q-num">{{ i + 1 }}</span>
            <span class="ksp-q-text">{{ q }}</span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  suggestConnections,
  generateQuestions,
  getNodes,
  getRelations,
  createRelation,
} from '../../modules/knowledge'

const nodes = ref(getNodes())
const relations = ref(getRelations())

const selectedId = ref<string>('')
watch(
  nodes,
  (list) => {
    if (!list.some((n) => n.id === selectedId.value)) {
      selectedId.value = list[0]?.id ?? ''
    }
  },
  { immediate: true },
)

const selectedNode = computed(() => nodes.value.find((n) => n.id === selectedId.value) ?? null)

const suggestions = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  return suggestConnections(node.id, nodes.value, relations.value)
})

const questions = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  return generateQuestions(node.id, nodes.value)
})

function targetTitle(id: string): string {
  return nodes.value.find((n) => n.id === id)?.title ?? '未知节点'
}

function linkSuggestion(targetId: string) {
  const node = selectedNode.value
  if (!node) return
  createRelation({
    sourceId: node.id,
    targetId,
    type: 'related',
    label: 'AI 建议关联',
  } as never)
  relations.value = getRelations()
}
</script>

<style scoped>
.ksp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.ksp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.ksp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high, #d8c3a5);
}
.ksp-sub {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.4);
}
.ksp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 16px;
  text-align: center;
}
.ksp-empty span {
  font-size: 28px;
}
.ksp-empty p {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
}
.ksp-pick {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ksp-pick-label {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.5);
  white-space: nowrap;
}
.ksp-select {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(18, 14, 11, 0.5);
  color: var(--text-high, #d8c3a5);
  font-size: 12px;
  font-family: inherit;
}
.ksp-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(18, 14, 11, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.ksp-block-label {
  display: block;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(232, 221, 208, 0.5);
  margin-bottom: 10px;
}
.ksp-note {
  margin: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.45);
  line-height: 1.6;
}
.ksp-suggests,
.ksp-questions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ksp-suggest {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.ksp-suggest-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ksp-suggest-title {
  font-size: 13px;
  color: var(--text-high, #d8c3a5);
  word-break: break-word;
}
.ksp-suggest-score {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.ksp-suggest-bar {
  display: block;
  height: 100%;
  background: #f0c040;
  border-radius: 999px;
  transition: width 0.3s;
}
.ksp-suggest-reason {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.45);
  word-break: break-word;
}
.ksp-link-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(240, 192, 64, 0.3);
  background: rgba(240, 192, 64, 0.1);
  color: var(--accent, #d8c3a5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.ksp-link-btn:hover {
  background: rgba(240, 192, 64, 0.2);
}
.ksp-question {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.ksp-q-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #f0c040;
  border: 1px solid rgba(240, 192, 64, 0.3);
}
.ksp-q-text {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.75);
  line-height: 1.6;
  word-break: break-word;
}
</style>
