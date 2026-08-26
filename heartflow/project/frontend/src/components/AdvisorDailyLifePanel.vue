<template>
  <section class="adp">
    <div class="adp-head">
      <div class="adp-title-wrap">
        <span class="adp-title">🌗 作息与场景</span>
        <span class="adp-sub">幕僚此刻在做什么</span>
      </div>
      <span class="adp-slot">🌗 {{ TIME_SLOT_META[life.currentTimeSlot.value]?.label ?? '' }} · {{ TIME_SLOT_META[life.currentTimeSlot.value]?.vibe ?? '' }}</span>
    </div>

    <!-- 空态 -->
    <div v-if="!advisors.length" class="adp-empty">
      <span class="adp-empty-icon">🌗</span>
      <p>先创建幕僚，才能安排他们的作息</p>
    </div>

    <template v-else>
      <!-- 场景分布 -->
      <div class="adp-scenes">
        <div v-for="s in life.getAllScenes()" :key="s.id" class="adp-scene" :class="{ active: sceneHasAdvisors(s.id) }">
          <div class="adp-scene-head">
            <span class="adp-scene-name">{{ s.name }}</span>
            <span class="adp-scene-occ">{{ s.presentAdvisors.length }}/{{ s.maxAdvisors }}</span>
          </div>
          <p class="adp-scene-desc">{{ s.description }}</p>
          <div v-if="sceneHasAdvisors(s.id)" class="adp-scene-acts">
            <span v-for="act in sceneActivities(s.id)" :key="act.id" class="adp-act-chip">
              {{ actIcon(act.type) }} {{ nameOf(act.advisorId) }} · {{ actLabel(act.type) }}
            </span>
          </div>
          <div v-else class="adp-scene-empty">空</div>
        </div>
      </div>

      <!-- 幕僚作息 -->
      <div class="adp-list">
        <div v-for="a in advisors" :key="a.id" class="adp-item">
          <div class="adp-item-head">
            <span class="adp-item-name">{{ a.name }}</span>
            <span class="adp-item-state" :class="{ off: !isActive(a.id) }">{{ isActive(a.id) ? '活跃' : '休眠' }}</span>
          </div>
          <div class="adp-item-acts">
            <span v-for="t in currentActs(a.id)" :key="t" class="adp-act-chip">
              {{ actIcon(t) }} {{ actLabel(t) }}
            </span>
          </div>
          <div class="adp-item-ctrl">
            <select v-model="form[a.id]" class="adp-select">
              <option v-for="(meta, type) in ACTIVITY_META" :key="type" :value="type">{{ meta.icon }} {{ meta.label }}</option>
            </select>
            <button class="adp-btn" @click="start(a.id)">开始</button>
            <button class="adp-btn adp-btn--ghost" @click="end(a.id)">结束</button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdvisorDailyLife } from '../modules/advisor/daily-life'
import { TIME_SLOT_META, ACTIVITY_META } from '../modules/advisor/types'
import type { ActivityType } from '../modules/advisor/types'
import type { AdvisorProfile } from '../types/advisor'

const props = defineProps<{ advisors: AdvisorProfile[] }>()

const life = useAdvisorDailyLife()
const form = ref<Record<string, ActivityType>>({})

function nameOf(id: string) {
  return props.advisors.find(a => a.id === id)?.name ?? '未知'
}
function actLabel(t: ActivityType) {
  return ACTIVITY_META[t]?.label ?? t
}
function actIcon(t: ActivityType) {
  return ACTIVITY_META[t]?.icon ?? '·'
}
function isActive(id: string) {
  const s = life.scenes.value
  void s
  const schedule = (life as unknown as { currentActivities: { value: { advisorId: string }[] } }).currentActivities.value
  return schedule.some(a => a.advisorId === id)
}
function currentActs(id: string): ActivityType[] {
  return life.getCurrentActivities(id)
}
function sceneHasAdvisors(sceneId: string) {
  return life.getSceneActivities(sceneId).length > 0
}
function sceneActivities(sceneId: string) {
  return life.getSceneActivities(sceneId)
}

function start(id: string) {
  const type = form.value[id] ?? 'resting'
  const sceneId = life.getAllScenes()[0]?.id ?? 'study-room'
  life.startActivity(id, type, sceneId)
}
function end(id: string) {
  life.endActivity(id)
}

onMounted(() => {
  props.advisors.forEach(a => {
    form.value[a.id] = 'resting'
    if (!(life as unknown as { currentActivities: { value: { advisorId: string }[] } }).currentActivities.value.some(act => act.advisorId === a.id)) {
      life.initSchedule(a.id, a.personality ?? 'hermit')
    }
  })
})
</script>

<style scoped>
.adp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.adp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.adp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.adp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.adp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.adp-slot { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.adp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.adp-empty-icon { font-size: 30px; opacity: 0.5; }
.adp-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.adp-scenes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-bottom: 14px; }
.adp-scene { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.adp-scene.active { border-color: rgba(var(--accent-rgb), 0.25); }
.adp-scene-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.adp-scene-name { font-size: 12px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.adp-scene-occ { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.adp-scene-desc { font-size: 10px; color: rgba(232, 221, 208, 0.45); margin: 4px 0; line-height: 1.4; }
.adp-scene-acts { display: flex; flex-wrap: wrap; gap: 4px; }
.adp-scene-empty { font-size: 10px; color: rgba(232, 221, 208, 0.25); }

.adp-list { display: flex; flex-direction: column; gap: 8px; }
.adp-item { padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.adp-item-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.adp-item-name { font-size: 13px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.adp-item-state { font-size: 10px; padding: 1px 8px; border-radius: 8px; background: rgba(138,154,122,0.15); color: #8a9a7a; }
.adp-item-state.off { background: rgba(148,163,184,0.12); color: #94a3b8; }
.adp-item-acts { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.adp-act-chip { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); }
.adp-item-ctrl { display: flex; gap: 6px; align-items: center; }
.adp-select { flex: 1; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, #d8c3a5); font-size: 12px; font-family: inherit; outline: none; }
.adp-select:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.adp-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 11px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.adp-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.adp-btn--ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: rgba(232, 221, 208, 0.6); }
.adp-btn--ghost:hover { border-color: rgba(196,106,90,0.4); color: #c46a5a; background: rgba(196,106,90,0.08); }

@media (max-width: 640px) {
  .adp { padding: 14px 14px; }
  .adp-scenes { grid-template-columns: 1fr; }
  .adp-item-ctrl { flex-wrap: wrap; }
}
</style>