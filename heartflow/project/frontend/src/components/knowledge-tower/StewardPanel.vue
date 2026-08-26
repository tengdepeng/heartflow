<template>
    <!-- ========== AI管家面板 ========== -->
    <Transition name="steward-slide">
      <div v-if="showSteward" class="kt-steward-panel">
        <div class="steward-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>AI管家 · 知识洞察</span>
          <button class="steward-close" @click="showSteward=false">✕</button>
        </div>
        <div class="steward-body">
          <div class="steward-section">
            <h4 class="steward-section-title">📊 知识概览</h4>
            <div class="steward-stats">
              <div class="steward-stat">
                <span class="steward-stat-val">{{ nodes.length }}</span>
                <span class="steward-stat-lbl">知识节点</span>
              </div>
              <div class="steward-stat">
                <span class="steward-stat-val">{{ computedRelations.length }}</span>
                <span class="steward-stat-lbl">关联关系</span>
              </div>
              <div class="steward-stat">
                <span class="steward-stat-val">{{ categories.filter(c => nodesByCat(c.key).length > 0).length }}</span>
                <span class="steward-stat-lbl">活跃分类</span>
              </div>
            </div>
            <!-- 健康评分 -->
            <div class="steward-health">
              <div class="steward-health-ring">
                <svg viewBox="0 0 36 36" class="steward-health-svg">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(var(--accent-rgb), 0.08)" stroke-width="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    :stroke="healthLevel.color"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="`${healthScore * 1.02} 102`"
                    transform="rotate(-90 18 18)"
                    class="steward-health-arc"
                  />
                </svg>
                <div class="steward-health-val">{{ healthScore }}</div>
              </div>
              <div class="steward-health-info">
                <span class="steward-health-label">知识健康度</span>
                <span class="steward-health-level" :style="{ color: healthLevel.color }">{{ healthLevel.label }}</span>
              </div>
            </div>
          </div>

          <!-- 聚焦节点：驱动连接建议与深度追问 -->
          <div class="steward-section" v-if="nodes.length > 0">
            <h4 class="steward-section-title">🎯 聚焦节点</h4>
            <select class="steward-select" :value="selectedNodeId" @change="onSelectNode">
              <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.title }}</option>
            </select>
          </div>

          <!-- 连接建议 (ai-steward suggestConnections) -->
          <div class="steward-section" v-if="suggestions.length > 0">
            <h4 class="steward-section-title">🔗 连接建议</h4>
            <div class="steward-suggestions">
              <div v-for="s in suggestions" :key="s.targetId" class="steward-suggestion">
                <div class="steward-sug-head">
                  <span class="steward-sug-title">{{ nodeTitle(s.targetId) }}</span>
                  <span class="steward-sug-score">{{ s.score }}</span>
                </div>
                <p class="steward-sug-reason">{{ s.reason }}</p>
              </div>
            </div>
          </div>

          <!-- 深度追问 (ai-steward generateQuestions) -->
          <div class="steward-section" v-if="questions.length > 0">
            <h4 class="steward-section-title">❓ 深度追问</h4>
            <div class="steward-questions">
              <p v-for="(q, i) in questions" :key="i" class="steward-question">{{ i + 1 }}. {{ q }}</p>
            </div>
          </div>

          <!-- 盲区检测 (ai-steward detectBlindSpots) -->
          <div class="steward-section" v-if="blindSpots.length > 0">
            <h4 class="steward-section-title">🗺 盲区检测</h4>
            <div class="steward-blindspots">
              <div v-for="b in blindSpots" :key="b.category" class="steward-blind-row">
                <span class="steward-blind-icon">{{ b.icon }}</span>
                <span class="steward-blind-name">{{ b.label }}</span>
                <div class="steward-blind-bar-wrap">
                  <div class="steward-blind-bar" :style="{ width: b.coverageScore + '%', background: catColor(b.category) }"></div>
                </div>
                <span class="steward-blind-count">{{ b.nodeCount }}</span>
              </div>
            </div>
          </div>

          <div class="steward-section">
            <h4 class="steward-section-title">📈 分类分布</h4>
            <div class="steward-cat-list">
              <div v-for="cat in categories" :key="cat.key" class="steward-cat-row">
                <span class="steward-cat-icon">{{ cat.icon }}</span>
                <span class="steward-cat-name">{{ cat.label }}</span>
                <div class="steward-cat-bar-wrap">
                  <div class="steward-cat-bar" :style="{ width: catDensity(cat.key) + '%', background: catColor(cat.key) }"></div>
                </div>
                <span class="steward-cat-count">{{ nodesByCat(cat.key).length }}</span>
              </div>
            </div>
          </div>
          <div class="steward-section">
            <h4 class="steward-section-title">💡 建议</h4>
            <div class="steward-tips">
              <p v-if="stewardTips.length === 0" class="steward-tip-empty">暂无洞察建议</p>
              <p v-for="(tip, i) in stewardTips" :key="i" class="steward-tip">{{ tip }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useKtUi } from '../../modules/knowledge/useKnowledgeTowerUi'
import {
  suggestConnections,
  generateQuestions,
  detectBlindSpots,
} from '../../modules/knowledge/ai-steward'
import type { KnowledgeNode, KnowledgeCategory } from '../../modules/knowledge/types'
const {
  showSteward,
  nodes,
  computedRelations,
  categories,
  nodesByCat,
  catDensity,
  catColor,
  healthScore,
  healthLevel,
  stewardTips,
} = useKtUi()

// 塔节点 (KNode) 无 tags，适配为 ai-steward 所需 KnowledgeNode 形状
const stewardNodes = computed<KnowledgeNode[]>(() =>
  nodes.value.map((n) => ({
    id: n.id,
    title: n.title,
    desc: n.desc,
    cat: n.cat as KnowledgeCategory,
    tags: [],
    createdAt: '',
    updatedAt: '',
  })),
)

const selectedNodeId = ref('')
watch(
  () => nodes.value.length,
  (len) => {
    if (len > 0 && !nodes.value.some((n) => n.id === selectedNodeId.value)) {
      selectedNodeId.value = nodes.value[0].id
    }
  },
  { immediate: true },
)

function onSelectNode(e: Event) {
  selectedNodeId.value = (e.target as HTMLSelectElement).value
}

function nodeTitle(id: string): string {
  return nodes.value.find((n) => n.id === id)?.title ?? id
}

const suggestions = computed(() => {
  if (!selectedNodeId.value) return []
  return suggestConnections(selectedNodeId.value, stewardNodes.value, computedRelations.value)
})

const questions = computed(() => {
  if (!selectedNodeId.value) return []
  return generateQuestions(selectedNodeId.value, stewardNodes.value)
})

const blindSpots = computed(() => detectBlindSpots(stewardNodes.value))
</script>
<style scoped src="./knowledge-shared.css"></style>
