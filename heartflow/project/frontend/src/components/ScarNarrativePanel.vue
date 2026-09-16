<template>
  <section class="snp-panel">
    <div class="snp-head">
      <span class="snp-title">📖 叙事工坊</span>
      <span class="snp-badge">模板 · 共鸣 · 可视化</span>
    </div>

    <!-- 空态：尚未开炉 -->
    <p v-if="!marks.length" class="snp-empty">
      工痕尚未开炉。记录一道印记后，叙事工坊便会在此显影：以叙事模板书写伤痕故事、在印记之间寻找共鸣、以可视化回望愈合与成长。
    </p>

    <template v-else>
      <!-- Tabs -->
      <div class="snp-tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['snp-tab', { active: tab === t.key }]"
          @click="tab = t.key"
        >{{ t.label }}</button>
      </div>

      <!-- Tab 1: 叙事模板 -->
      <div v-if="tab === 'templates'" class="snp-tabpane">
        <div class="snp-block">
          <h3 class="snp-block-title">叙事模板</h3>
          <div v-for="t in presetTemplates" :key="t.id" class="snp-template-card">
            <span class="snp-template-icon">{{ t.icon }}</span>
            <div class="snp-template-info">
              <span class="snp-template-name">{{ t.name }}</span>
              <span class="snp-template-desc">{{ t.description }}</span>
              <span class="snp-template-stages">{{ t.stages.length }} 个阶段</span>
            </div>
            <button class="snp-btn snp-btn--sm" @click="startDraft(t.id)">开始叙事</button>
          </div>
        </div>

        <div v-if="narrative.drafts.value.length" class="snp-block">
          <h3 class="snp-block-title">叙事草稿</h3>
          <div
            v-for="d in narrative.drafts.value"
            :key="d.id"
            :class="['snp-draft-item', { active: selectedDraftId === d.id }]"
            @click="selectDraft(d.id)"
          >
            <span class="snp-draft-name">{{ templateName(d.templateId) }}</span>
            <span class="snp-draft-stage">第 {{ d.currentStage }} 阶段</span>
            <span class="snp-draft-progress">{{ narrative.getDraftProgress(d.id) }}%</span>
            <span v-if="d.completed" class="snp-badge snp-badge-done">已完成</span>
          </div>
        </div>

        <div v-if="selectedDraft" class="snp-block snp-draft-detail">
          <h3 class="snp-block-title">阶段 {{ selectedDraft.currentStage }}/{{ currentTemplate?.stages.length || 0 }} · {{ currentStage?.name || '' }}</h3>
          <p class="snp-stage-desc">{{ currentStage?.description }}</p>
          <div class="snp-stage-prompts">
            <span v-for="(p, i) in currentStage?.prompts || []" :key="i" class="snp-stage-prompt">✦ {{ p }}</span>
          </div>
          <textarea
            v-model="stageContent"
            class="snp-textarea"
            :placeholder="'写下第 ' + selectedDraft.currentStage + ' 阶段的叙事…'"
          ></textarea>
          <div class="snp-draft-actions">
            <button class="snp-btn snp-btn--primary" @click="saveStage">保存阶段</button>
            <button class="snp-btn" @click="advance" :disabled="selectedDraft.completed">推进阶段</button>
          </div>
        </div>
      </div>

      <!-- Tab 2: 共鸣 -->
      <div v-if="tab === 'resonance'" class="snp-tabpane">
        <div class="snp-block">
          <h3 class="snp-block-title">共鸣统计</h3>
          <div class="snp-grid">
            <div class="snp-cell"><b>{{ resonanceStats.totalResonances }}</b><span>总共鸣</span></div>
            <div class="snp-cell"><b>{{ resonanceStats.maxResonanceScore }}</b><span>最高共鸣</span></div>
            <div class="snp-cell"><b>{{ resonanceStats.avgResonanceScore }}</b><span>平均共鸣</span></div>
            <div class="snp-cell"><b>{{ partLabel(resonanceStats.mostResonatedPart) }}</b><span>共鸣部位</span></div>
            <div class="snp-cell"><b>{{ typeLabel(resonanceStats.mostResonatedType) }}</b><span>共鸣类型</span></div>
          </div>
        </div>

        <div class="snp-block">
          <h3 class="snp-block-title">寻找共鸣</h3>
          <div class="snp-resonance-tools">
            <select v-model="sourceScarId" class="snp-select">
              <option value="" disabled>选择一道印记</option>
              <option v-for="m in marks" :key="m.id" :value="m.id">{{ partLabel(m.bodyPart) }} · {{ m.description }}</option>
            </select>
            <button class="snp-btn snp-btn--primary" @click="findMatches" :disabled="!sourceScarId">寻找共鸣</button>
          </div>
          <div v-if="matches.length" class="snp-matches">
            <div v-for="mt in matches" :key="mt.scar.id" class="snp-match">
              <div class="snp-match-head">
                <span class="snp-match-score">{{ mt.resonanceScore }}</span>
                <span class="snp-match-part">{{ partLabel(mt.scar.bodyPart) }}</span>
                <span class="snp-match-desc">{{ mt.scar.description }}</span>
              </div>
              <p class="snp-match-text">{{ mt.description }}</p>
              <div class="snp-match-dims">
                <span>部位 {{ mt.dimensions.bodyPartSimilarity }}</span>
                <span>类型 {{ mt.dimensions.typeSimilarity }}</span>
                <span>严重度 {{ mt.dimensions.severitySimilarity }}</span>
                <span>阶段 {{ mt.dimensions.stageSimilarity }}</span>
              </div>
              <button class="snp-btn snp-btn--sm" @click="recordResonance(mt)">记录共鸣</button>
            </div>
          </div>
          <p v-else-if="searched" class="snp-empty">未找到共鸣度 ≥ 30 的印记。</p>
        </div>
      </div>

      <!-- Tab 3: 可视化 -->
      <div v-if="tab === 'visualization'" class="snp-tabpane">
        <div class="snp-block">
          <h3 class="snp-block-title">伤痕可视化</h3>
          <button class="snp-btn snp-btn--primary" @click="generateViz">生成可视化</button>
          <template v-if="viz">
            <div class="snp-viz-block">
              <h4 class="snp-viz-title">部位分布</h4>
              <div v-for="n in viz.bodyMap" :key="n.bodyPart" class="snp-viz-row">
                <span class="snp-viz-label">{{ partLabel(n.bodyPart) }}</span>
                <div class="snp-viz-bar-bg"><div class="snp-viz-bar" :style="{ width: bodyMapPercent(n) + '%' }"></div></div>
                <span class="snp-viz-val">{{ n.count }} 道 · 均 {{ n.avgSeverity }}</span>
              </div>
            </div>
            <div class="snp-viz-block">
              <h4 class="snp-viz-title">类型分布</h4>
              <div v-for="t in viz.typeDistribution" :key="t.type" class="snp-viz-row">
                <span class="snp-viz-label">{{ t.label }}</span>
                <div class="snp-viz-bar-bg"><div class="snp-viz-bar" :style="{ width: t.percentage + '%', background: t.color }"></div></div>
                <span class="snp-viz-val">{{ t.count }} · {{ t.percentage }}%</span>
              </div>
            </div>
            <div class="snp-viz-block">
              <h4 class="snp-viz-title">严重度雷达</h4>
              <div v-for="r in viz.severityRadar" :key="r.axis" class="snp-viz-row">
                <span class="snp-viz-label">{{ r.axis }}</span>
                <div class="snp-viz-bar-bg"><div class="snp-viz-bar" :style="{ width: radarPercent(r) + '%' }"></div></div>
                <span class="snp-viz-val">{{ r.value }}</span>
              </div>
            </div>
            <div v-if="viz.healingTimeline.length" class="snp-viz-block">
              <h4 class="snp-viz-title">愈合时间线</h4>
              <div v-for="h in viz.healingTimeline" :key="h.scarId" class="snp-timeline-node">
                <span class="snp-timeline-date">{{ h.date }}</span>
                <span class="snp-timeline-label">{{ h.label }}</span>
                <span class="snp-timeline-progress">{{ h.healingProgress }}%</span>
              </div>
            </div>
            <div v-if="viz.growthCurve.length" class="snp-viz-block">
              <h4 class="snp-viz-title">成长曲线</h4>
              <div v-for="g in viz.growthCurve" :key="g.date" class="snp-timeline-node">
                <span class="snp-timeline-date">{{ g.date }}</span>
                <span class="snp-timeline-label">逆商 {{ g.adversityScore }} · 心得 {{ g.insightCount }} · 转化 {{ g.transformationCount }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useNarrativeTemplate,
  useResonanceAlgorithm,
  useScarVisualization,
} from '../modules/scar/narrative-template'
import { BODY_PART_META, SCAR_TYPE_META } from '../modules/scar/types'
import type { BodyMark, BodyPart, ScarType } from '../modules/scar/types'
import type {
  ResonanceMatch,
  ResonanceStats,
  ScarVisualizationData,
  ScarMapNode,
  SeverityRadarData,
} from '../modules/scar/narrative-template'

const props = defineProps<{ marks: BodyMark[] }>()

const narrative = useNarrativeTemplate()
const resonance = useResonanceAlgorithm()
const vizEngine = useScarVisualization()

const tabs = [
  { key: 'templates', label: '叙事模板' },
  { key: 'resonance', label: '共鸣' },
  { key: 'visualization', label: '可视化' },
] as const
const tab = ref<'templates' | 'resonance' | 'visualization'>('templates')

const selectedDraftId = ref('')
const stageContent = ref('')
const sourceScarId = ref('')
const matches = ref<ResonanceMatch[]>([])
const searched = ref(false)
const viz = ref<ScarVisualizationData | null>(null)
const resonanceStats = ref<ResonanceStats>({
  totalResonances: 0,
  maxResonanceScore: 0,
  avgResonanceScore: 0,
  mostResonatedPart: null,
  mostResonatedType: null,
})

onMounted(() => {
  narrative.loadAll()
  resonance.loadResonances()
  resonanceStats.value = resonance.computeResonanceStats(props.marks)
})

const presetTemplates = computed(() => narrative.getPresetTemplates())

const selectedDraft = computed(() =>
  narrative.drafts.value.find(d => d.id === selectedDraftId.value) || null,
)

const currentTemplate = computed(() =>
  narrative.templates.value.find(t => t.id === selectedDraft.value?.templateId) || null,
)

const currentStage = computed(() =>
  currentTemplate.value?.stages.find(s => s.order === selectedDraft.value?.currentStage) || null,
)

function templateName(templateId: string): string {
  return narrative.templates.value.find(t => t.id === templateId)?.name || '未知模板'
}

function partLabel(part: BodyPart | null | string): string {
  if (!part) return '—'
  const meta = BODY_PART_META[part as BodyPart]
  return meta ? meta.label : String(part)
}

function typeLabel(type: ScarType | null | string): string {
  if (!type) return '—'
  const meta = SCAR_TYPE_META[type as ScarType]
  return meta ? meta.label : String(type)
}

function startDraft(templateId: string): void {
  const draft = narrative.createDraft(templateId, props.marks.map(m => m.id))
  if (draft) {
    selectedDraftId.value = draft.id
    stageContent.value = ''
  }
}

function selectDraft(id: string): void {
  selectedDraftId.value = id
  const d = narrative.drafts.value.find(x => x.id === id)
  stageContent.value = d?.stageContents[d.currentStage] || ''
}

function saveStage(): void {
  if (!selectedDraft.value || !currentStage.value) return
  narrative.updateDraftStage(selectedDraft.value.id, currentStage.value.order, stageContent.value)
}

function advance(): void {
  if (!selectedDraft.value) return
  narrative.advanceStage(selectedDraft.value.id)
  const d = narrative.drafts.value.find(x => x.id === selectedDraft.value!.id)
  stageContent.value = d?.stageContents[d.currentStage] || ''
}

function findMatches(): void {
  searched.value = true
  const source = props.marks.find(m => m.id === sourceScarId.value)
  if (!source) return
  matches.value = resonance.findResonanceMatches(source, props.marks)
}

function recordResonance(match: ResonanceMatch): void {
  if (!sourceScarId.value) return
  resonance.createCommunityResonance(sourceScarId.value, match.scar.id)
  resonanceStats.value = resonance.computeResonanceStats(props.marks)
}

function generateViz(): void {
  viz.value = vizEngine.generateVisualizationData(props.marks)
}

function bodyMapPercent(node: ScarMapNode): number {
  const counts = viz.value?.bodyMap.map(n => n.count) || []
  const max = Math.max(...counts, 1)
  return Math.round((node.count / max) * 100)
}

function radarPercent(r: SeverityRadarData): number {
  return Math.round((r.value / r.max) * 100)
}
</script>

<style scoped>
.snp-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 16px;
  border: 1px solid rgba(196, 138, 106, 0.18);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(196, 138, 106, 0.08), rgba(232, 192, 96, 0.04));
}

.snp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.snp-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #e8c060;
}

.snp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 192, 96, 0.14);
  color: #e8c060;
  border: 1px solid rgba(232, 192, 96, 0.25);
  white-space: nowrap;
}

.snp-badge-done {
  background: rgba(138, 138, 122, 0.12);
  color: #8a8a7a;
  border-color: rgba(138, 138, 122, 0.2);
}

.snp-empty {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(220, 208, 196, 0.72);
}

.snp-tabs {
  display: flex;
  gap: 6px;
}

.snp-tab {
  flex: 1;
  padding: 7px 0;
  border-radius: 8px;
  border: 1px solid rgba(196, 138, 106, 0.12);
  background: transparent;
  color: rgba(196, 138, 106, 0.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.snp-tab.active {
  background: rgba(232, 192, 96, 0.14);
  color: #e8c060;
  border-color: rgba(232, 192, 96, 0.28);
}

.snp-tabpane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.snp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.snp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: rgba(220, 208, 196, 0.9);
}

.snp-template-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(196, 138, 106, 0.05);
  border: 1px solid rgba(196, 138, 106, 0.1);
}

.snp-template-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.snp-template-info {
  flex: 1;
  min-width: 0;
}

.snp-template-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #e8c060;
}

.snp-template-desc {
  display: block;
  font-size: 11px;
  color: rgba(220, 208, 196, 0.6);
  margin-top: 2px;
  line-height: 1.5;
}

.snp-template-stages {
  display: block;
  font-size: 10px;
  color: rgba(196, 138, 106, 0.4);
  margin-top: 2px;
}

.snp-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(196, 138, 106, 0.2);
  background: transparent;
  color: rgba(196, 138, 106, 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.snp-btn:hover:not(:disabled) {
  background: rgba(196, 138, 106, 0.12);
  border-color: rgba(196, 138, 106, 0.35);
}

.snp-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.snp-btn--primary {
  background: rgba(232, 192, 96, 0.14);
  color: #e8c060;
  border-color: rgba(232, 192, 96, 0.28);
}

.snp-btn--primary:hover:not(:disabled) {
  background: rgba(232, 192, 96, 0.22);
}

.snp-btn--sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;

  min-height: 26px;
}

.snp-draft-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(196, 138, 106, 0.04);
  border: 1px solid rgba(196, 138, 106, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.snp-draft-item.active {
  border-color: rgba(232, 192, 96, 0.35);
  background: rgba(232, 192, 96, 0.08);
}

.snp-draft-name {
  flex: 1;
  font-size: 13px;
  color: rgba(220, 208, 196, 0.85);
}

.snp-draft-stage {
  font-size: 11px;
  color: rgba(196, 138, 106, 0.5);
}

.snp-draft-progress {
  font-size: 12px;
  font-weight: 600;
  color: #e8c060;
}

.snp-draft-detail {
  padding: 14px;
  border-radius: 10px;
  background: rgba(196, 138, 106, 0.04);
  border: 1px solid rgba(196, 138, 106, 0.1);
}

.snp-stage-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(220, 208, 196, 0.7);
}

.snp-stage-prompts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.snp-stage-prompt {
  font-size: 11px;
  color: rgba(196, 138, 106, 0.55);
}

.snp-textarea {
  width: 100%;
  min-height: 90px;
  padding: 10px 12px;
  border: 1px solid rgba(196, 138, 106, 0.14);
  border-radius: 8px;
  background: rgba(10, 8, 7, 0.4);
  color: rgba(220, 208, 196, 0.85);
  font-size: 12px;
  font-family: inherit;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
}

.snp-textarea:focus {
  border-color: rgba(232, 192, 96, 0.35);
}

.snp-draft-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.snp-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.snp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(196, 138, 106, 0.06);
  border: 1px solid rgba(196, 138, 106, 0.1);
}

.snp-cell b {
  font-size: 15px;
  font-weight: 700;
  color: #e8c060;
  line-height: 1.2;
}

.snp-cell span {
  font-size: 10px;
  color: rgba(220, 208, 196, 0.6);
}

.snp-resonance-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

.snp-select {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid rgba(196, 138, 106, 0.14);
  border-radius: 8px;
  background: rgba(10, 8, 7, 0.4);
  color: rgba(220, 208, 196, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}

.snp-select option {
  background: #0a0807;
  color: rgba(220, 208, 196, 0.85);
}

.snp-matches {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.snp-match {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(196, 138, 106, 0.04);
  border: 1px solid rgba(196, 138, 106, 0.1);
}

.snp-match-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snp-match-score {
  font-size: 15px;
  font-weight: 700;
  color: #e8c060;
  flex-shrink: 0;
}

.snp-match-part {
  font-size: 12px;
  color: #c48a6a;
  flex-shrink: 0;
}

.snp-match-desc {
  font-size: 12px;
  color: rgba(220, 208, 196, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snp-match-text {
  margin: 6px 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(220, 208, 196, 0.6);
}

.snp-match-dims {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.snp-match-dims span {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(196, 138, 106, 0.08);
  color: rgba(196, 138, 106, 0.6);
}

.snp-viz-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.snp-viz-title {
  margin: 8px 0 2px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(220, 208, 196, 0.85);
}

.snp-viz-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snp-viz-label {
  width: 64px;
  font-size: 11px;
  color: rgba(196, 138, 106, 0.6);
  flex-shrink: 0;
}

.snp-viz-bar-bg {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(196, 138, 106, 0.1);
  overflow: hidden;
}

.snp-viz-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c48a6a, #e8c060);
  transition: width 0.4s ease;
}

.snp-viz-val {
  width: 92px;
  font-size: 11px;
  color: rgba(220, 208, 196, 0.6);
  text-align: right;
  flex-shrink: 0;
}

.snp-timeline-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(196, 138, 106, 0.04);
  border: 1px solid rgba(196, 138, 106, 0.08);
}

.snp-timeline-date {
  font-size: 11px;
  color: #c48a6a;
  flex-shrink: 0;
}

.snp-timeline-label {
  flex: 1;
  font-size: 11px;
  color: rgba(220, 208, 196, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snp-timeline-progress {
  font-size: 11px;
  font-weight: 600;
  color: #e8c060;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .snp-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .snp-resonance-tools {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
