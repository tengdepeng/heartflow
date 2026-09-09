<template>
  <div class="carrier-editor">
    <!-- 根形态（默认形态，应用于未被覆盖的生命阶段） -->
    <section class="ce-section">
      <h4 class="ce-title">载体形态</h4>
      <CarrierFormPiece v-model="draft" />
    </section>

    <!-- 各生命阶段形态覆盖（蓝图16:444 / 585：为每个阶段分别设形态） -->
    <section class="ce-section">
      <h4 class="ce-title">生命阶段形态 <span class="ce-opt">（可选覆盖）</span></h4>
      <p class="ce-hint">蓝图：可为「诞生 / 成长 / 成熟 / 衰老 / 传承」各阶段分别设不同形态；留空则沿用上方形态。</p>
      <div v-for="s in CARRIER_STAGE_ORDER" :key="s" class="ce-stage">
        <label class="ce-stage-toggle">
          <input type="checkbox" v-model="stageOn[s]" />
          <span class="ce-stage-name">{{ CARRIER_STAGE_LABELS[s] }}</span>
        </label>
        <div v-if="stageOn[s]" class="ce-stage-body">
          <CarrierFormPiece v-model="stageDrafts[s]" />
        </div>
      </div>
    </section>

    <!-- 分享：本地 .carrier 文件（社区下载 = 本地文件，不触云） -->
    <section class="ce-section ce-share">
      <h4 class="ce-title">分享载体</h4>
      <div class="ce-share-actions">
        <button type="button" class="ce-btn" @click="doExport">导出 .carrier 文件</button>
        <label class="ce-btn ce-btn--import">
          导入 .carrier 文件
          <input type="file" accept=".carrier,application/json" hidden @change="onImport" />
        </label>
      </div>
      <p v-if="importError" class="ce-error">{{ importError }}</p>
      <p class="ce-hint">社区分享以本地文件形式进行，绝不上传云端（符合本地私有）。</p>
      <p v-if="shareLocalOnly" class="ce-notice">
        宪法第49条「分享的本地边界」已生效：载体分享仅限本地 .carrier 文件或 P2P，不经任何官方服务器。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import {
  CARRIER_STAGE_ORDER,
  CARRIER_STAGE_LABELS,
  type AdvisorCarrier,
  type AdvisorCarrierStage,
} from '../types'
import { downloadCarrierFile, parseCarrierFile } from '../modules/advisor/carrier-io'
import { isShareLocalOnly } from '../modules/share/share-local'
import CarrierFormPiece from './CarrierFormPiece.vue'

const props = defineProps<{ modelValue?: AdvisorCarrier }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: AdvisorCarrier): void }>()

// 第49条 分享的本地边界（默认启用，UI 据以提示用户）
const shareLocalOnly = isShareLocalOnly()

function emptyCarrier(): AdvisorCarrier {
  return { kind: 'official-geometry', geometry: 'orb', formLabel: '' }
}

function newStageMap(): Record<AdvisorCarrierStage, AdvisorCarrier> {
  const m = {} as Record<AdvisorCarrierStage, AdvisorCarrier>
  for (const s of CARRIER_STAGE_ORDER) m[s] = emptyCarrier()
  return m
}

// ---- 初始化（仅一次） ----
const draft = reactive<AdvisorCarrier>({ ...(props.modelValue ?? emptyCarrier()) })
const stageDrafts = reactive<Record<AdvisorCarrierStage, AdvisorCarrier>>(newStageMap())
const stageOn = reactive<Record<AdvisorCarrierStage, boolean>>(
  Object.fromEntries(CARRIER_STAGE_ORDER.map((s) => [s, false])) as Record<AdvisorCarrierStage, boolean>,
)
const importError = ref('')

function initFromModel() {
  const m = props.modelValue
  Object.assign(draft, emptyCarrier(), m ?? {})
  const onMap: Record<string, boolean> = {}
  const sMap = newStageMap()
  if (m?.stages) {
    for (const s of CARRIER_STAGE_ORDER) {
      if (m.stages[s]) {
        onMap[s] = true
        Object.assign(sMap[s], emptyCarrier(), m.stages[s])
      }
    }
  }
  for (const s of CARRIER_STAGE_ORDER) {
    stageOn[s] = !!onMap[s]
    Object.assign(stageDrafts[s], sMap[s])
  }
}
initFromModel()

// ---- 构建并向上 emit ----
function currentCarrier(): AdvisorCarrier {
  const carrier: AdvisorCarrier = { ...draft }
  const stages: Partial<Record<AdvisorCarrierStage, AdvisorCarrier>> = {}
  for (const s of CARRIER_STAGE_ORDER) {
    if (stageOn[s]) stages[s] = { ...stageDrafts[s] }
  }
  if (Object.keys(stages).length) carrier.stages = stages
  else delete carrier.stages
  return carrier
}

function emitNow() {
  emit('update:modelValue', currentCarrier())
}

watch([draft, stageDrafts, stageOn], emitNow, { deep: true })

// ---- 导出 / 导入 ----
function doExport() {
  const c = currentCarrier()
  downloadCarrierFile(c, c.formLabel || '幕僚载体')
}

async function onImport(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  importError.value = ''
  try {
    const text = await f.text()
    const { name, carrier } = parseCarrierFile(text)
    Object.assign(draft, emptyCarrier(), carrier)
    const onMap: Record<string, boolean> = {}
    const sMap = newStageMap()
    if (carrier.stages) {
      for (const s of CARRIER_STAGE_ORDER) {
        if (carrier.stages[s]) {
          onMap[s] = true
          Object.assign(sMap[s], emptyCarrier(), carrier.stages[s])
        }
      }
    }
    for (const s of CARRIER_STAGE_ORDER) {
      stageOn[s] = !!onMap[s]
      Object.assign(stageDrafts[s], sMap[s])
    }
    if (name && !draft.formLabel) draft.formLabel = name
    emitNow()
  } catch (err) {
    importError.value = err instanceof Error ? err.message : '载体文件解析失败'
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>

<style scoped>
.carrier-editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ce-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px dashed rgba(var(--accent-rgb), 0.12);
}
.ce-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ce-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-primary, #e8e0d8);
}
.ce-opt {
  font-size: 11px;
  font-weight: 400;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 1px;
}
.ce-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  line-height: 1.5;
}
.ce-notice {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px dashed rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  padding: 8px 10px;
}
.ce-stage {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
}
.ce-stage-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.8);
  cursor: pointer;
}
.ce-stage-name {
  letter-spacing: 1px;
}
.ce-share-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ce-btn {
  padding: 8px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary, #e8e0d8);
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.18s;
}
.ce-btn:hover {
  border-color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.1);
}
.ce-btn--import {
  display: inline-flex;
  align-items: center;
}
.ce-error {
  font-size: 12px;
  color: #f0a0a0;
}
</style>
