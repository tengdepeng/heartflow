<template>
  <section class="ahp-panel" aria-label="纪念日与羁绊健康">
    <div class="ahp-head">
      <span class="ahp-title">💝 纪念日与羁绊健康</span>
      <span class="ahp-sub">纪念日 · 提醒 · 关系健康</span>
    </div>

    <!-- 纪念日统计 -->
    <div class="ahp-block">
      <h3 class="ahp-block-title">纪念日统计</h3>
      <div class="ahp-grid">
        <div class="ahp-cell">
          <b>{{ stats.total }}</b><span>总纪念日</span>
        </div>
        <div class="ahp-cell">
          <b>{{ stats.upcoming }}</b><span>即将到来</span>
        </div>
        <div class="ahp-cell">
          <b>{{ stats.reminders }}</b><span>需提醒</span>
        </div>
        <div class="ahp-cell">
          <b>{{ stats.persons }}</b><span>覆盖人物</span>
        </div>
      </div>
    </div>

    <!-- 添加纪念日 -->
    <div class="ahp-block">
      <h3 class="ahp-block-title">添加纪念日</h3>
      <div class="ahp-form">
        <select v-model="form.personId" class="ahp-select" aria-label="人物">
          <option value="" disabled>选择人物</option>
          <option v-for="p in props.persons" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <input v-model="form.title" type="text" class="ahp-input" placeholder="纪念日名称（如：相识纪念日）" aria-label="纪念日名称" />
        <input v-model="form.date" type="date" class="ahp-input" aria-label="纪念日日期" />
        <div class="ahp-type-picker" aria-label="纪念日类型">
          <button
            v-for="(meta, t) in ANNIVERSARY_TYPE_META"
            :key="t"
            type="button"
            class="ahp-type-btn"
            :class="{ 'ahp-type-btn--on': form.type === t }"
            @click="form.type = t"
          >{{ meta.icon }} {{ meta.label }}</button>
        </div>
        <div class="ahp-form-row">
          <label class="ahp-check"><input v-model="form.recurring" type="checkbox" /> 每年重复</label>
          <label class="ahp-remind">提前
            <input v-model.number="form.reminderDays" type="number" min="0" max="30" class="ahp-num" aria-label="提前提醒天数" /> 天提醒
          </label>
        </div>
        <input v-model="form.note" type="text" class="ahp-input" placeholder="备注（可选）" aria-label="备注" />
        <button class="ahp-save" :disabled="!canAdd" @click="onAdd">保存纪念日</button>
      </div>
    </div>

    <!-- 即将到来 -->
    <div class="ahp-block" v-if="upcoming.length">
      <h3 class="ahp-block-title">即将到来</h3>
      <div v-for="a in upcoming" :key="a.id" class="ahp-ann">
        <span class="ahp-ann-icon">{{ metaOf(a.type).icon }}</span>
        <span class="ahp-ann-title">{{ a.title }}</span>
        <span class="ahp-ann-person">{{ personName(a.personId) }}</span>
        <span class="ahp-ann-date">{{ a.date }}</span>
        <span class="ahp-ann-days">{{ daysLabel(a.id) }}</span>
      </div>
    </div>

    <!-- 需提醒 -->
    <div class="ahp-block" v-if="reminders.length">
      <h3 class="ahp-block-title">需提醒</h3>
      <div v-for="a in reminders" :key="a.id" class="ahp-ann">
        <span class="ahp-ann-icon">{{ metaOf(a.type).icon }}</span>
        <span class="ahp-ann-title">{{ a.title }}</span>
        <span class="ahp-ann-person">{{ personName(a.personId) }}</span>
        <span class="ahp-ann-date">{{ a.date }}</span>
        <span class="ahp-ann-remind">提前 {{ a.reminderDays }} 天</span>
      </div>
    </div>

    <!-- 纪念日列表 -->
    <div class="ahp-block">
      <h3 class="ahp-block-title">纪念日列表</h3>
      <template v-if="anniversaries.length">
        <div v-for="a in anniversaries" :key="a.id" class="ahp-ann">
          <span class="ahp-ann-icon">{{ metaOf(a.type).icon }}</span>
          <span class="ahp-ann-title">{{ a.title }}</span>
          <span class="ahp-ann-person">{{ personName(a.personId) }}</span>
          <span class="ahp-ann-date">{{ a.date }}</span>
          <span v-if="a.recurring" class="ahp-ann-recur">每年</span>
          <button type="button" class="ahp-ann-del" aria-label="删除纪念日" @click="onRemove(a.id)">✕</button>
        </div>
      </template>
      <p v-else class="ahp-empty">暂无纪念日，在下方添加第一个纪念日。</p>
    </div>

    <!-- 关系健康 -->
    <div class="ahp-block">
      <h3 class="ahp-block-title">关系健康</h3>
      <template v-if="healthList.length">
        <div v-for="h in healthList" :key="h.personId" class="ahp-health">
          <div class="ahp-health-head">
            <span class="ahp-health-name">{{ h.personName }}</span>
            <span class="ahp-health-score" :style="{ color: levelMeta(h.level).color }">{{ h.score }}</span>
            <span
              class="ahp-health-level"
              :style="{ color: levelMeta(h.level).color, borderColor: levelMeta(h.level).color + '55', background: levelMeta(h.level).color + '14' }"
            >{{ levelMeta(h.level).label }}</span>
          </div>
          <div class="ahp-health-meta">
            <span>互动 {{ h.interactionCount }} 次</span>
            <span>频率 {{ h.interactionFrequency }}</span>
            <span>纪念日 {{ h.anniversaryCount }}</span>
          </div>
          <ul v-if="h.suggestions.length" class="ahp-health-sug">
            <li v-for="(s, i) in h.suggestions" :key="i">💡 {{ s }}</li>
          </ul>
        </div>
      </template>
      <p v-else class="ahp-empty">还没有人物数据，添加羁绊后查看关系健康。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import type { Person } from '../modules/relation/types'
import {
  useInteractionJournal,
  useAnniversaries,
  useRelationshipHealth,
  ANNIVERSARY_TYPE_META,
  HEALTH_LEVEL_META,
} from '../modules/relation/interaction-journal'
import type { Anniversary, RelationshipHealth } from '../modules/relation/interaction-journal'

const props = defineProps<{ persons: Person[] }>()

const journal = useInteractionJournal()
const anniversariesModule = useAnniversaries()
const healthModule = useRelationshipHealth(journal, anniversariesModule)

const anniversaries = computed(() => anniversariesModule.anniversaries.value)
const upcoming = computed(() => anniversariesModule.getUpcomingAnniversaries(30))
const reminders = computed(() => anniversariesModule.getReminderAnniversaries())
const healthList = computed(() => healthModule.computeAllHealth(props.persons))

const stats = computed(() => {
  const uniquePersons = new Set(anniversaries.value.map((a) => a.personId))
  return {
    total: anniversaries.value.length,
    upcoming: upcoming.value.length,
    reminders: reminders.value.length,
    persons: uniquePersons.size,
  }
})

function metaOf(type: Anniversary['type']) {
  return ANNIVERSARY_TYPE_META[type] ?? { label: type, icon: '📌', color: '#f0c040' }
}

function levelMeta(level: RelationshipHealth['level']) {
  return HEALTH_LEVEL_META[level] ?? { label: level, color: '#94a3b8', minScore: 0 }
}

function personName(personId: string): string {
  return props.persons.find((p) => p.id === personId)?.name ?? '未知'
}

function daysLabel(anniversaryId: string): string {
  const days = anniversariesModule.daysUntilAnniversary(anniversaryId)
  if (days === null) return ''
  if (days === 0) return '今天'
  return `${days} 天后`
}

// ---- 添加纪念日 ----
const form = reactive({
  personId: '',
  title: '',
  date: '',
  type: 'custom' as Anniversary['type'],
  recurring: true,
  reminderDays: 3,
  note: '',
})

const canAdd = computed(() => form.personId !== '' && form.title.trim() !== '' && form.date !== '')

function onAdd(): void {
  if (!canAdd.value) return
  anniversariesModule.createAnniversary(
    form.personId,
    form.title.trim(),
    form.date,
    form.type,
    form.recurring,
    form.reminderDays,
    form.note.trim() || undefined,
  )
  form.title = ''
  form.date = ''
  form.type = 'custom'
  form.note = ''
}

function onRemove(id: string): void {
  anniversariesModule.removeAnniversary(id)
}

onMounted(() => {
  journal.loadInteractions()
  anniversariesModule.loadAnniversaries()
})
</script>

<style scoped>
.ahp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(240, 192, 64, 0.07), rgba(138, 154, 122, 0.04));
  border: 1px solid rgba(240, 192, 64, 0.18);
}

.ahp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ahp-title {
  font-size: 15px;
  font-weight: 600;
  color: #e8e0d4;
}

.ahp-sub {
  font-size: 12px;
  color: #a89e90;
}

.ahp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ahp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #d8ccb8;
}

.ahp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.ahp-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.07);
  text-align: center;
}

.ahp-cell b {
  font-size: 16px;
  color: #e8c060;
}

.ahp-cell span {
  font-size: 11px;
  color: #a89e90;
}

.ahp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ahp-select,
.ahp-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(240, 192, 64, 0.25);
  background: rgba(240, 192, 64, 0.08);
  color: #e8e0d4;
  font-size: 12px;
  outline: none;
  width: 100%;
}

.ahp-select option {
  background: #1c1814;
  color: #e8e0d4;
}

.ahp-type-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ahp-type-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(240, 192, 64, 0.25);
  background: rgba(240, 192, 64, 0.08);
  color: #a89e90;
  cursor: pointer;
}

.ahp-type-btn--on {
  border-color: rgba(240, 192, 64, 0.5);
  background: rgba(240, 192, 64, 0.16);
  color: #e8c060;
}

.ahp-form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #a89e90;
}

.ahp-check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.ahp-remind {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ahp-num {
  width: 48px;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid rgba(240, 192, 64, 0.25);
  background: rgba(240, 192, 64, 0.08);
  color: #e8e0d4;
  font-size: 12px;
  outline: none;
}

.ahp-save {
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(232, 192, 96, 0.4);
  background: rgba(232, 192, 96, 0.16);
  color: #e8c060;
  font-size: 12px;
  cursor: pointer;
}

.ahp-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ahp-ann {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.06);
  flex-wrap: wrap;
}

.ahp-ann-icon {
  font-size: 14px;
}

.ahp-ann-title {
  font-size: 13px;
  font-weight: 500;
  color: #e8e0d4;
}

.ahp-ann-person {
  font-size: 11px;
  color: #a89e90;
}

.ahp-ann-date {
  font-size: 11px;
  color: #a89e90;
  margin-left: auto;
}

.ahp-ann-days {
  font-size: 11px;
  color: #e8c060;
}

.ahp-ann-remind {
  font-size: 11px;
  color: #c46a5a;
}

.ahp-ann-recur {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.1);
  color: #8a9a7a;
}

.ahp-ann-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(196, 106, 90, 0.3);
  background: rgba(196, 106, 90, 0.1);
  color: #c46a5a;
  font-size: 11px;
  cursor: pointer;

  min-height: 24px;
  min-width: 24px;
}

.ahp-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #a89e90;
}

.ahp-health {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(240, 192, 64, 0.06);
}

.ahp-health-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ahp-health-name {
  font-size: 13px;
  font-weight: 600;
  color: #e8e0d4;
}

.ahp-health-score {
  font-size: 16px;
  font-weight: 600;
}

.ahp-health-level {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.ahp-health-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #a89e90;
}

.ahp-health-sug {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.7;
  color: #c8bca8;
}
</style>
