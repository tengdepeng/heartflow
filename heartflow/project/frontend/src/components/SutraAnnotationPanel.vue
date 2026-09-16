<template>
  <section class="sap-panel" aria-label="经书注解">
    <div class="sap-head">
      <span class="sap-title">📖 经书注解</span>
      <span class="sap-sub">注解 · 感悟 · 冥想引导</span>
    </div>

    <!-- 注解统计 -->
    <div class="sap-block">
      <h3 class="sap-block-title">注解统计</h3>
      <div class="sap-grid">
        <div class="sap-cell">
          <b>{{ stats.total }}</b><span>总注解</span>
        </div>
        <div class="sap-cell">
          <b>{{ stats.digested }}</b><span>已消化</span>
        </div>
        <div class="sap-cell">
          <b>{{ stats.digestionRate }}%</b><span>消化率</span>
        </div>
      </div>
      <div class="sap-type-dist" v-if="typeDist.length">
        <span
          v-for="t in typeDist"
          :key="t.type"
          class="sap-type-chip"
          :style="{ color: t.color, borderColor: t.color + '55', background: t.color + '14' }"
        >{{ t.icon }} {{ t.label }} ×{{ t.count }}</span>
      </div>
    </div>

    <!-- 添加注解 -->
    <div class="sap-block">
      <h3 class="sap-block-title">添加注解</h3>
      <div class="sap-form">
        <select v-model="form.sutraId" class="sap-select" aria-label="经文">
          <option v-for="s in sutras" :key="s.id" :value="s.id">{{ s.book }} · {{ s.chapter }}</option>
        </select>
        <input v-model="form.position" type="text" class="sap-input" placeholder="位置(段落/行号)" aria-label="注解位置" />
        <div class="sap-type-picker" aria-label="注解类型">
          <button
            v-for="(meta, t) in ANNOTATION_TYPE_META"
            :key="t"
            type="button"
            class="sap-type-btn"
            :class="{ 'sap-type-btn--on': form.type === t }"
            :style="form.type === t ? { color: meta.color, borderColor: meta.color + '88', background: meta.color + '1f' } : {}"
            @click="form.type = t"
          >{{ meta.icon }} {{ meta.label }}</button>
        </div>
        <textarea v-model="form.content" class="sap-textarea" placeholder="注解内容…" aria-label="注解内容"></textarea>
        <button class="sap-save" :disabled="!canAdd" @click="onAdd">保存注解</button>
      </div>
    </div>

    <!-- 注解列表 -->
    <div class="sap-block">
      <h3 class="sap-block-title">注解列表</h3>
      <template v-if="annotations.length">
        <div v-for="a in annotations" :key="a.id" class="sap-ann" :class="{ 'sap-ann--digested': a.digested }">
          <div class="sap-ann-head">
            <span class="sap-ann-icon" :style="{ color: metaOf(a.type).color }">{{ metaOf(a.type).icon }}</span>
            <span class="sap-ann-type" :style="{ color: metaOf(a.type).color }">{{ metaOf(a.type).label }}</span>
            <span class="sap-ann-meta">{{ sutraLabel(a.sutraId) }} · {{ a.position }}</span>
            <span class="sap-ann-date">{{ dateLabel(a.createdAt) }}</span>
            <button
              v-if="!a.digested"
              type="button"
              class="sap-digest"
              @click="onDigest(a.id)"
            >消化</button>
            <span v-else class="sap-digested">✓ 已消化</span>
          </div>
          <p class="sap-ann-content">{{ a.content }}</p>
        </div>
      </template>
      <p v-else class="sap-empty">暂无注解，在下方记录对经文的注解与感悟。</p>
    </div>

    <!-- 冥想引导 -->
    <div class="sap-block">
      <h3 class="sap-block-title">冥想引导</h3>
      <div class="sap-form">
        <input v-model="guide.title" type="text" class="sap-input sap-input--wide" placeholder="引导标题" aria-label="引导标题" />
        <select v-model="guide.sutraId" class="sap-select" aria-label="关联经文">
          <option v-for="s in sutras" :key="s.id" :value="s.id">{{ s.book }} · {{ s.chapter }}</option>
        </select>
        <div class="sap-steps">
          <div v-for="(step, i) in guide.steps" :key="i" class="sap-step">
            <input v-model="step.instruction" type="text" class="sap-input sap-input--wide" :placeholder="`步骤 ${i + 1} 指令`" aria-label="步骤指令" />
            <input v-model.number="step.durationMinutes" type="number" min="1" max="60" class="sap-input" placeholder="分钟" aria-label="步骤时长" />
            <button type="button" class="sap-step-del" @click="removeStep(i)">✕</button>
          </div>
        </div>
        <button type="button" class="sap-add-step" @click="addStep">+ 添加步骤</button>
        <button class="sap-save" :disabled="!canCreateGuide" @click="onCreateGuide">创建引导</button>
      </div>
      <template v-if="guides.length">
        <div v-for="g in guides" :key="g.id" class="sap-guide">
          <div class="sap-guide-head">
            <span class="sap-guide-title">🧘 {{ g.title }}</span>
            <span class="sap-guide-meta">{{ sutraLabel(g.sutraId) }} · 共 {{ g.totalDuration }} 分钟</span>
          </div>
          <ol class="sap-guide-steps">
            <li v-for="(s, i) in g.steps" :key="i">{{ s.instruction }}（{{ s.durationMinutes }} 分钟）</li>
          </ol>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSutraAnnotations, ANNOTATION_TYPE_META } from '../modules/body-wisdom'
import type { AnnotationType } from '../modules/body-wisdom'
import { CLASSIC_EXCERPTS } from '../modules/wisdom/tcm'

const sutra = useSutraAnnotations()
const { annotations, guides } = sutra

const sutras = CLASSIC_EXCERPTS

const stats = computed(() => sutra.annotationStats.value)
const typeDist = computed(() =>
  Object.entries(stats.value.byType).map(([type, count]) => ({
    type: type as AnnotationType,
    label: ANNOTATION_TYPE_META[type as AnnotationType]?.label ?? type,
    icon: ANNOTATION_TYPE_META[type as AnnotationType]?.icon ?? '📝',
    color: ANNOTATION_TYPE_META[type as AnnotationType]?.color ?? '#8a9a7a',
    count,
  })),
)

function metaOf(type: AnnotationType) {
  return ANNOTATION_TYPE_META[type] ?? { label: type, icon: '📝', color: '#8a9a7a' }
}

function sutraLabel(id: string): string {
  const s = sutras.find((x) => x.id === id)
  return s ? `${s.book}·${s.chapter}` : id
}

function dateLabel(iso: string): string {
  return iso.slice(0, 10)
}

// ---- 添加注解 ----
const form = ref({
  sutraId: sutras[0]?.id ?? '',
  position: '',
  type: 'reflection' as AnnotationType,
  content: '',
})

const canAdd = computed(() => form.value.sutraId !== '' && form.value.content.trim() !== '')

function onAdd(): void {
  if (!canAdd.value) return
  sutra.addAnnotation(form.value.sutraId, form.value.position || '未标注', form.value.type, form.value.content.trim())
  form.value.position = ''
  form.value.content = ''
}

function onDigest(id: string): void {
  sutra.digestAnnotation(id)
}

// ---- 冥想引导 ----
const guide = ref({
  title: '',
  sutraId: sutras[0]?.id ?? '',
  steps: [{ instruction: '', durationMinutes: 5 }],
})

const canCreateGuide = computed(() => guide.value.title.trim() !== '' && guide.value.steps.some((s) => s.instruction.trim() !== ''))

function addStep(): void {
  guide.value.steps.push({ instruction: '', durationMinutes: 5 })
}

function removeStep(i: number): void {
  if (guide.value.steps.length > 1) guide.value.steps.splice(i, 1)
}

function onCreateGuide(): void {
  if (!canCreateGuide.value) return
  const steps = guide.value.steps.filter((s) => s.instruction.trim() !== '')
  sutra.createMeditationGuide(guide.value.sutraId, guide.value.title.trim(), sutraLabel(guide.value.sutraId), steps)
  guide.value.title = ''
  guide.value.steps = [{ instruction: '', durationMinutes: 5 }]
}

onMounted(() => {
  sutra.loadAnnotations()
})
</script>

<style scoped>
.sap-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.08), rgba(240, 192, 64, 0.04));
  border: 1px solid rgba(138, 154, 122, 0.22);
}

.sap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sap-title {
  font-size: 15px;
  font-weight: 600;
  color: #d8dcd0;
}

.sap-sub {
  font-size: 12px;
  color: #9aa090;
}

.sap-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sap-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #c8ccb8;
}

.sap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sap-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
  text-align: center;
}

.sap-cell b {
  font-size: 16px;
  color: #e8c060;
}

.sap-cell span {
  font-size: 11px;
  color: #9aa090;
}

.sap-type-dist {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sap-type-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.sap-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sap-select,
.sap-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(138, 154, 122, 0.25);
  background: rgba(138, 154, 122, 0.08);
  color: #d8dcd0;
  font-size: 12px;
  outline: none;
}

.sap-select {
  width: 100%;
}

.sap-input {
  width: 100%;
}

.sap-input--wide {
  flex: 1;
}

.sap-type-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sap-type-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(138, 154, 122, 0.25);
  background: rgba(138, 154, 122, 0.08);
  color: #9aa090;
  cursor: pointer;
}

.sap-textarea {
  min-height: 64px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(138, 154, 122, 0.25);
  background: rgba(138, 154, 122, 0.08);
  color: #d8dcd0;
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  font-family: inherit;
}

.sap-save {
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(232, 192, 96, 0.4);
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  font-size: 12px;
  cursor: pointer;
}

.sap-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sap-ann {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
}

.sap-ann--digested {
  opacity: 0.65;
}

.sap-ann-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sap-ann-icon {
  font-size: 14px;
}

.sap-ann-type {
  font-size: 12px;
  font-weight: 600;
}

.sap-ann-meta {
  font-size: 11px;
  color: #9aa090;
}

.sap-ann-date {
  font-size: 11px;
  color: #9aa090;
  margin-left: auto;
}

.sap-digest {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.1);
  color: #c8ccb8;
  cursor: pointer;

  min-height: 26px;
}

.sap-digested {
  font-size: 11px;
  color: #8a9a7a;
}

.sap-ann-content {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #b8bca8;
}

.sap-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #9aa090;
}

.sap-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sap-step {
  display: flex;
  gap: 6px;
  align-items: center;
}

.sap-step-del {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(196, 106, 90, 0.3);
  background: rgba(196, 106, 90, 0.1);
  color: #c46a5a;
  font-size: 11px;
  cursor: pointer;
}

.sap-add-step {
  align-self: flex-start;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(138, 154, 122, 0.35);
  background: transparent;
  color: #c8ccb8;
  cursor: pointer;
}

.sap-guide {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.07);
}

.sap-guide-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.sap-guide-title {
  font-size: 13px;
  font-weight: 600;
  color: #d8dcd0;
}

.sap-guide-meta {
  font-size: 11px;
  color: #9aa090;
}

.sap-guide-steps {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.7;
  color: #b8bca8;
}
</style>
