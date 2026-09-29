<template>
  <section class="dmo-archive" aria-label="意象之镜">
    <!-- 空态（无梦境） -->
    <template v-if="!hasData">
      <div class="dmo-head">
        <span class="dmo-title">🪞 意象之镜</span>
        <span class="dmo-badge dmo-badge-neutral">梦镜未启</span>
      </div>
      <p class="dmo-empty">
        梦乡还空着。记下第一场梦，意象会在这面镜子里显影——水、飞、坠落，都是心绪的倒影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="dmo-head">
        <span class="dmo-title">🪞 意象之镜</span>
        <span class="dmo-badge dmo-badge-gold">{{ omenCount }} 意象</span>
      </div>

      <!-- 高频意象 -->
      <div class="dmo-block" v-if="freq.length">
        <h3 class="dmo-block-title">高频意象</h3>
        <div class="dmo-omen-chips">
          <span v-for="f in freq" :key="f.omen.id" class="dmo-omen-chip">
            {{ f.omen.emoji }} {{ f.omen.name }}<b>{{ f.count }}</b>
          </span>
        </div>
      </div>

      <!-- 意象回响（近期梦境） -->
      <div class="dmo-block" v-if="echoes.length">
        <h3 class="dmo-block-title">意象回响</h3>
        <div v-for="e in echoes" :key="e.dream.id" class="dmo-echo">
          <div class="dmo-echo-head">
            <span class="dmo-echo-title">{{ e.dream.title || '无题之梦' }}</span>
            <span class="dmo-echo-mood">{{ moodLabel(e.dream.mood) }}</span>
          </div>
          <p class="dmo-echo-prefix">{{ e.prefix }}</p>
          <div class="dmo-echo-omens">
            <span v-for="h in e.hits" :key="h.omen.id" class="dmo-echo-omen">{{ h.omen.emoji }} {{ h.omen.name }}</span>
          </div>
          <p v-for="h in e.hits" :key="h.omen.id" class="dmo-echo-line">
            {{ omenLine(h) }}
            <em class="dmo-echo-prompt">{{ h.omen.prompt }}</em>
          </p>
        </div>
      </div>

      <!-- 温和观照 -->
      <ul v-if="insights.length" class="dmo-insights">
        <li v-for="ins in insights" :key="ins" class="dmo-insight">
          <span class="dmo-insight-mark">✦</span>
          <span class="dmo-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDreamNookStore } from '../stores/dreamNook'
import { omenFrequency, omensOfDream, omenEchoPrefix, omenLine } from '../modules/dream'

const store = useDreamNookStore()

const dreams = computed(() => store.dreams)
const hasData = computed(() => dreams.value.length > 0)

const freq = computed(() => omenFrequency(dreams.value, 5))

const echoes = computed(() =>
  [...dreams.value]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 3)
    .map(dream => ({ dream, hits: omensOfDream(dream), prefix: omenEchoPrefix(dream.mood) }))
    .filter(e => e.hits.length > 0),
)

const omenCount = computed(() => {
  const set = new Set<string>()
  for (const d of dreams.value) {
    for (const h of omensOfDream(d)) set.add(h.omen.id)
  }
  return set.size
})

const insights = computed(() => {
  const list: string[] = []
  if (freq.value.length) {
    const top = freq.value[0]
    list.push(`「${top.omen.name}」是梦里最常显影的意象（${top.count} 次）——它或许在替你反复说同一句话。`)
  } else {
    list.push('这些梦尚未显影出清晰的意象——它们或许更想以情绪的方式被你记住。')
  }
  const multi = echoes.value.find(e => e.hits.length > 1)
  if (multi) {
    list.push(`有一场梦同时映出 ${multi.hits.length} 个意象——它们之间或许藏着隐秘的关联。`)
  }
  if (echoes.value[0]) {
    list.push(echoes.value[0].prefix)
  }
  return list.slice(0, 4)
})

function moodLabel(mood: string): string {
  return store.moodLabel(mood)
}
</script>

<style scoped>
.dmo-archive {
  display: block;
  width: 100%;
  max-width: 640px;
}
.dmo-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.dmo-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.02em;
}
.dmo-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.dmo-badge-gold {
  color: var(--accent-warm, #f0c040);
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.dmo-badge-neutral {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.dmo-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.dmo-block {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, #3a332a);
}
.dmo-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-bottom: 10px;
  letter-spacing: 0.06em;
}
.dmo-omen-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dmo-omen-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-primary, #e8e0d8);
  background: color-mix(in srgb, var(--bg-card, #241f18) 55%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.dmo-omen-chip b {
  color: #f0c040;
  font-weight: 600;
}
.dmo-echo {
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  margin-bottom: 10px;
}
.dmo-echo-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.dmo-echo-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}
.dmo-echo-mood {
  font-size: 14px;
}
.dmo-echo-prefix {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 0 0 6px;
}
.dmo-echo-omens {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.dmo-echo-omen {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #8a9a7a;
  background: color-mix(in srgb, #8a9a7a 10%, transparent);
  border: 1px solid color-mix(in srgb, #8a9a7a 35%, transparent);
}
.dmo-echo-line {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin: 4px 0 0;
}
.dmo-echo-prompt {
  display: block;
  margin-top: 2px;
  color: #c46a5a;
  font-style: normal;
}
.dmo-insights {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.dmo-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #e8e0d8);
}
.dmo-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
