<template>
  <section class="bep" aria-label="物品进化">
    <div class="bep-head">
      <span class="bep-title">🌱 物品进化</span>
      <span class="bep-sub">种子 · 萌芽 · 绽放 · 硕果 · 丰收</span>
    </div>

    <!-- 进化统计 -->
    <div class="bep-block">
      <div class="bep-block-title">📊 进化统计</div>
      <div class="bep-stats">
        <div class="bep-stat">
          <span class="bep-stat-value">{{ stats.totalPaths }}</span>
          <span class="bep-stat-label">总路径</span>
        </div>
        <div class="bep-stat">
          <span class="bep-stat-value">{{ stats.activePaths }}</span>
          <span class="bep-stat-label">进行中</span>
        </div>
        <div class="bep-stat">
          <span class="bep-stat-value">{{ stats.completedPaths }}</span>
          <span class="bep-stat-label">已丰收</span>
        </div>
      </div>
      <div class="bep-dist">
        <div
          v-for="s in STAGE_ORDER"
          :key="s"
          class="bep-dist-item"
          :title="stageMeta(s).label + '：' + stats.stageDistribution[s]"
        >
          <span class="bep-dist-icon">{{ stageMeta(s).icon }}</span>
          <div class="bep-dist-bar">
            <div
              class="bep-dist-fill"
              :style="{ width: distPct(s) + '%', background: stageMeta(s).color }"
            />
          </div>
          <span class="bep-dist-count">{{ stats.stageDistribution[s] }}</span>
        </div>
      </div>
    </div>

    <!-- 添加进化路径 -->
    <div class="bep-block">
      <div class="bep-block-title">➕ 添加进化路径</div>
      <div class="bep-row">
        <input
          v-model="newItemName"
          type="text"
          class="bep-input"
          placeholder="物品名称，如：吉他"
          @keyup.enter="addPath"
        />
        <button class="bep-btn bep-btn--primary" :disabled="!newItemName.trim()" @click="addPath">
          添加
        </button>
      </div>
    </div>

    <!-- 可进化物品 -->
    <div v-if="availableEvolutions.length" class="bep-block">
      <div class="bep-block-title">✨ 可进化物品</div>
      <div class="bep-avail-list">
        <div v-for="p in availableEvolutions" :key="p.id" class="bep-avail">
          <span class="bep-avail-icon">{{ stageMeta(p.currentStage).icon }}</span>
          <span class="bep-avail-name">{{ p.itemName }}</span>
          <span class="bep-avail-stage">{{ stageMeta(p.currentStage).label }} → {{ stageMeta(nextOf(p.currentStage)).label }}</span>
          <button class="bep-btn bep-btn--primary" @click="evolve(p)">进化</button>
        </div>
      </div>
    </div>

    <!-- 进化路径列表 -->
    <div class="bep-block">
      <div class="bep-block-title">🌿 进化路径</div>
      <div v-if="paths.length" class="bep-path-list">
        <div v-for="p in paths" :key="p.id" class="bep-path">
          <div class="bep-path-head">
            <span class="bep-path-icon">{{ stageMeta(p.currentStage).icon }}</span>
            <div class="bep-path-info">
              <span class="bep-path-name">{{ p.itemName }}</span>
              <span class="bep-path-meta">{{ stageMeta(p.currentStage).label }} · 始于 {{ dateLabel(p.startedAt) }}</span>
            </div>
            <button class="bep-btn bep-btn--danger" @click="remove(p)">删除</button>
          </div>
          <div class="bep-stage-track">
            <div
              v-for="s in STAGE_ORDER"
              :key="s"
              class="bep-stage-node"
              :class="{ done: stageIndex(s) <= stageIndex(p.currentStage) }"
              :style="{ '--stage-color': stageMeta(s).color }"
            >
              <span class="bep-stage-node-icon">{{ stageMeta(s).icon }}</span>
              <span class="bep-stage-node-label">{{ stageMeta(s).label }}</span>
            </div>
          </div>
          <div v-if="progressOf(p)" class="bep-req-list">
            <div
              v-for="r in progressOf(p)!.requirements"
              :key="r.type"
              class="bep-req"
              :class="{ unmet: r.current < r.target }"
            >
              <span class="bep-req-label">{{ reqLabel(r.type) }}</span>
              <div class="bep-req-bar">
                <div
                  class="bep-req-fill"
                  :style="{ width: reqPct(r) + '%' }"
                />
              </div>
              <span class="bep-req-val">{{ r.current }} / {{ r.target }}</span>
            </div>
            <div v-if="progressOf(p)!.canEvolve" class="bep-can-evolve">
              <span class="bep-can-evolve-badge">✓ 可进化</span>
              <button class="bep-btn bep-btn--primary" @click="evolve(p)">进化至{{ stageMeta(progressOf(p)!.nextStage!).label }}</button>
            </div>
            <div v-else-if="progressOf(p)!.nextStage" class="bep-cannot-evolve">
              尚未满足{{ stageMeta(progressOf(p)!.nextStage!).label }}条件
            </div>
            <div v-else class="bep-cannot-evolve">已达最终阶段 · 丰收</div>
          </div>
        </div>
      </div>
      <div v-else class="bep-empty">暂无进化路径，输入物品名称开始培育。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBagEvolution, EVOLUTION_STAGE_META } from '../modules/bag/evolution'
import type { EvolutionPath, EvolutionStage } from '../modules/bag/evolution'

const props = withDefaults(
  defineProps<{
    itemData?: Record<string, { proficiency: number; count: number; milestone?: number }>
  }>(),
  { itemData: () => ({}) },
)

const {
  paths,
  addPath: engineAddPath,
  removePath,
  checkProgress,
  evolveItem,
  getEvolutionStats,
  getAvailableEvolutions,
  load,
  persist,
} = useBagEvolution()

const STAGE_ORDER: EvolutionStage[] = ['seed', 'sprout', 'bloom', 'fruit', 'harvest']

const newItemName = ref('')

const stats = computed(() => getEvolutionStats.value)

const availableEvolutions = computed(() => getAvailableEvolutions(props.itemData))

onMounted(() => {
  load()
})

function stageMeta(s: EvolutionStage) {
  return EVOLUTION_STAGE_META[s]
}
function stageIndex(s: EvolutionStage): number {
  return STAGE_ORDER.indexOf(s)
}
function nextOf(s: EvolutionStage): EvolutionStage {
  const idx = stageIndex(s)
  return idx >= STAGE_ORDER.length - 1 ? s : STAGE_ORDER[idx + 1]
}
function distPct(s: EvolutionStage): number {
  const total = stats.value.totalPaths
  if (total === 0) return 0
  return Math.round((stats.value.stageDistribution[s] / total) * 100)
}
function dateLabel(iso: string): string {
  return iso.slice(0, 10)
}
function reqLabel(type: string): string {
  const map: Record<string, string> = {
    proficiency: '熟练度',
    count: '数量',
    time: '天数',
    milestone: '里程碑',
  }
  return map[type] ?? type
}
function reqPct(r: { current: number; target: number }): number {
  if (r.target === 0) return 0
  return Math.min(100, Math.round((r.current / r.target) * 100))
}
function valuesOf(path: EvolutionPath) {
  return props.itemData[path.itemName] ?? { proficiency: 0, count: 0, milestone: 0 }
}
function progressOf(path: EvolutionPath) {
  return checkProgress(path.id, valuesOf(path))
}
function addPath() {
  const name = newItemName.value.trim()
  if (!name) return
  engineAddPath(name)
  persist()
  newItemName.value = ''
}
function remove(p: EvolutionPath) {
  removePath(p.id)
  persist()
}
function evolve(p: EvolutionPath) {
  const result = evolveItem(p.id, valuesOf(p))
  if (result.success) persist()
}
</script>

<style scoped>
.bep {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.bep-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.bep-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.bep-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.bep-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
}
.bep-block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.bep-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bep-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e6e1);
  font-size: 12px;
  outline: none;
}
.bep-input::placeholder {
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.bep-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.bep-btn:hover {
  border-color: #f0c040;
  color: #f0c040;
}
.bep-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.bep-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
}
.bep-btn--danger {
  border-color: rgba(196, 106, 90, 0.4);
  color: #c46a5a;
}
.bep-btn--danger:hover {
  border-color: #c46a5a;
  color: #c46a5a;
}
.bep-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.bep-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.bep-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f0c040;
}
.bep-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.bep-dist {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bep-dist-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bep-dist-icon {
  width: 18px;
  text-align: center;
  font-size: 13px;
}
.bep-dist-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.bep-dist-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.bep-dist-count {
  width: 18px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.bep-avail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bep-avail {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.bep-avail-icon {
  font-size: 16px;
}
.bep-avail-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.bep-avail-stage {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  margin-left: auto;
}
.bep-path-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bep-path {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.bep-path-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bep-path-icon {
  font-size: 18px;
}
.bep-path-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.bep-path-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.bep-path-meta {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.bep-path-head .bep-btn {
  margin-left: auto;
}
.bep-stage-track {
  display: flex;
  align-items: center;
  gap: 2px;
}
.bep-stage-node {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  border-radius: 8px;
  opacity: 0.4;
  transition: opacity 0.25s;
}
.bep-stage-node.done {
  opacity: 1;
  background: color-mix(in srgb, var(--stage-color) 12%, transparent);
}
.bep-stage-node-icon {
  font-size: 15px;
}
.bep-stage-node-label {
  font-size: 10px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
}
.bep-req-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bep-req {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bep-req-label {
  width: 52px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.bep-req-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.bep-req-fill {
  height: 100%;
  border-radius: 3px;
  background: #8a9a7a;
  transition: width 0.3s;
}
.bep-req.unmet .bep-req-fill {
  background: #c46a5a;
}
.bep-req-val {
  width: 64px;
  text-align: right;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.bep-req.unmet .bep-req-val {
  color: #c46a5a;
}
.bep-can-evolve {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.bep-can-evolve-badge {
  font-size: 12px;
  font-weight: 600;
  color: #8a9a7a;
}
.bep-cannot-evolve {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.bep-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
</style>
