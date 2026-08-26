<template>
  <section class="ssp" aria-label="专注声场">
    <div class="ssp-head">
      <span class="ssp-title">🎧 专注声场</span>
      <span class="ssp-sub">白噪音 / 自然声素材库 · 按场景推荐 · 音量与淡入配置</span>
    </div>
    <!-- 场景切换 -->
    <div class="ssp-scenes">
      <button
        v-for="s in sceneTabs"
        :key="s.key"
        type="button"
        class="ssp-scene"
        :class="{ active: scene === s.key }"
        @click="scene = s.key"
      >
        {{ s.icon }} {{ s.label }}
      </button>
    </div>
    <!-- 当前播放 -->
    <div class="ssp-block">
      <span class="ssp-block-label">当前声场</span>
      <div v-if="active" class="ssp-active">
        <span class="ssp-active-icon">{{ active.icon }}</span>
        <div class="ssp-active-body">
          <strong class="ssp-active-name">{{ active.name }}</strong>
          <span class="ssp-active-note">{{ active.note }}</span>
        </div>
        <span class="ssp-active-gain">增益 {{ Math.round(activeGain * 100) }}%</span>
      </div>
      <p v-else class="ssp-empty">尚未选择声场，从下方素材库挑选一个开始。</p>
    </div>
    <!-- 素材库 -->
    <div class="ssp-block">
      <div class="ssp-toolbar">
        <span class="ssp-block-label">素材库 · {{ sceneLabel }}</span>
        <input v-model="keyword" class="ssp-input" placeholder="搜索声场…" />
      </div>
      <div class="ssp-cats">
        <button
          v-for="c in catTabs"
          :key="c.key"
          type="button"
          class="ssp-cat"
          :class="{ active: category === c.key }"
          @click="category = c.key"
        >
          {{ c.icon }} {{ c.label }}
        </button>
      </div>
      <div class="ssp-list">
        <button
          v-for="s in filtered"
          :key="s.id"
          type="button"
          class="ssp-item"
          :class="{ active: pref.soundId === s.id }"
          @click="select(s.id)"
        >
          <span class="ssp-item-icon">{{ s.icon }}</span>
          <div class="ssp-item-body">
            <strong class="ssp-item-name">{{ s.name }}</strong>
            <span class="ssp-item-note">{{ s.note }}</span>
          </div>
          <span class="ssp-item-scenes">
            <span v-for="sc in s.scenes" :key="sc" class="ssp-item-scene">{{ sceneLabelOf(sc) }}</span>
          </span>
        </button>
        <p v-if="!filtered.length" class="ssp-empty">没有匹配的声场。</p>
      </div>
    </div>
    <!-- 播放配置 -->
    <div class="ssp-block">
      <span class="ssp-block-label">播放配置</span>
      <div class="ssp-config">
        <label class="ssp-config-row">
          <span class="ssp-config-name">音量</span>
          <input v-model.number="volume" type="range" min="0" max="100" class="ssp-range" />
          <span class="ssp-config-val">{{ volume }}%</span>
        </label>
        <label class="ssp-config-row">
          <span class="ssp-config-name">淡入（秒）</span>
          <input v-model.number="fadeIn" type="range" min="0" max="10" class="ssp-range" />
          <span class="ssp-config-val">{{ fadeIn }}s</span>
        </label>
        <label class="ssp-config-row ssp-config-row--toggle">
          <span class="ssp-config-name">循环播放</span>
          <input v-model="loop" type="checkbox" class="ssp-toggle" />
        </label>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  useSoundScene,
  SOUND_CATEGORY_META,
  type SoundScene,
  type SoundCategory,
} from '../modules/sound-scene'

const store = useSoundScene()

const scene = ref<SoundScene>('focus')
const category = ref<SoundCategory | 'all'>('all')
const keyword = ref('')

const sceneTabs: { key: SoundScene; icon: string; label: string }[] = [
  { key: 'focus', icon: '🎯', label: '专注' },
  { key: 'rest', icon: '🍵', label: '休息' },
  { key: 'sleep', icon: '🌙', label: '睡眠' },
]

const catTabs = computed(() => [
  { key: 'all' as const, icon: '🗂️', label: '全部' },
  ...Object.entries(SOUND_CATEGORY_META).map(([k, m]) => ({
    key: k as SoundCategory,
    icon: m.icon,
    label: m.label,
  })),
])

const pref = computed(() => store.pref.value)
const active = computed(() => store.active.value)
const activeGain = computed(() => store.activeGain())

const sceneLabel = computed(() => sceneTabs.find(s => s.key === scene.value)?.label ?? scene.value)

const filtered = computed(() => {
  const byScene = store.pickForScene(store.library.value, scene.value)
  const byCat = category.value === 'all' ? byScene : store.byCategory(byScene, category.value)
  return store.searchSounds(byCat, keyword.value)
})

function select(id: string) {
  store.select(store.pref.value.soundId === id ? null : id)
}

function sceneLabelOf(sc: SoundScene): string {
  return sceneTabs.find(s => s.key === sc)?.label ?? sc
}

const volume = computed({
  get: () => pref.value.volume,
  set: (v: number) => store.patch({ volume: v }),
})
const fadeIn = computed({
  get: () => pref.value.fadeIn,
  set: (v: number) => store.patch({ fadeIn: v }),
})
const loop = computed({
  get: () => pref.value.loop,
  set: (v: boolean) => store.patch({ loop: v }),
})

watch(scene, () => {
  category.value = 'all'
  keyword.value = ''
})
</script>

<style scoped>
.ssp {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ssp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.ssp-title {
  font-size: 16px;
  font-weight: 700;
}
.ssp-sub {
  font-size: 12px;
  opacity: 0.6;
}
.ssp-scenes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ssp-scene {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}
.ssp-scene.active {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: var(--accent);
}
.ssp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
}
.ssp-block-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}
.ssp-active {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ssp-active-icon {
  font-size: 26px;
}
.ssp-active-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.ssp-active-name {
  font-size: 14px;
}
.ssp-active-note {
  font-size: 12px;
  opacity: 0.6;
}
.ssp-active-gain {
  font-size: 12px;
  opacity: 0.7;
}
.ssp-empty {
  font-size: 12px;
  opacity: 0.55;
  margin: 0;
}
.ssp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ssp-input {
  flex: 0 1 180px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: transparent;
  color: inherit;
  font-size: 12px;
}
.ssp-cats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ssp-cat {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}
.ssp-cat.active {
  background: rgba(var(--accent-rgb), 0.15);
}
.ssp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ssp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.ssp-item.active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
}
.ssp-item-icon {
  font-size: 20px;
}
.ssp-item-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.ssp-item-name {
  font-size: 13px;
}
.ssp-item-note {
  font-size: 11px;
  opacity: 0.6;
}
.ssp-item-scenes {
  display: flex;
  gap: 4px;
}
.ssp-item-scene {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.12);
}
.ssp-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ssp-config-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ssp-config-name {
  flex: 0 0 72px;
  font-size: 12px;
}
.ssp-range {
  flex: 1;
  accent-color: var(--accent);
}
.ssp-config-val {
  flex: 0 0 44px;
  font-size: 12px;
  text-align: right;
  opacity: 0.8;
}
.ssp-config-row--toggle {
  gap: 0;
}
.ssp-toggle {
  accent-color: var(--accent);
}
</style>
