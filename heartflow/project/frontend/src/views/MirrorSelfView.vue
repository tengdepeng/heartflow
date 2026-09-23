<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance mirror-self-room">
    <!-- 氛围背景（仅辉光，房间根透明，不铺不透明渐变） -->
    <div data-enter class="msr-atmos">
      <div class="msr-warm-glow"></div>
    </div>

    <!-- 统一房间壳层 -->
    <RoomLayout
      title="镜我"
      subtitle="陈列而非叙事 · 你的年度对话面"
      data-enter
    >
      <!-- 镜我载体：复用全局组件，内嵌于页面中央作为房间焦点 -->
      <section data-enter class="msr-stage">
        <MirrorSelf :embedded="true" />
        <p class="msr-hint">点玉珠开始对话 · 长按看今日状态 · 左右滑动切换房间</p>
      </section>

    <!-- 跨房间共鸣态势：镜我既消费也参与 6 房联动 -->
    <section data-enter class="msr-climate" aria-label="跨房间共鸣态势">
      <h2 class="msr-section-title">跨房间共鸣态势</h2>
      <p v-if="otherRoomFeed.length === 0" class="msr-climate-empty">
        各房间尚在静默，去其他房间留一道光痕吧。
      </p>
      <ul v-else class="msr-climate-list">
        <li v-for="s in otherRoomFeed" :key="s.room + '-' + s.ts" class="msr-climate-item">
          <span class="msr-climate-room">{{ roomLabel(s.room) }}</span>
          <span class="msr-climate-signal">{{ s.label }}</span>
        </li>
      </ul>
    </section>

    <!-- 近期反思：镜我房间的连续性叙事表面（玉珠 tooltip 未呈现） -->
    <section data-enter class="msr-reflections" aria-label="近期反思">
      <h2 class="msr-section-title">近期反思</h2>
      <p v-if="recentReflections.length === 0" class="msr-reflect-empty">
        与镜我对话，沉淀你自己的倒影。
      </p>
      <ul v-else class="msr-reflect-list">
        <li v-for="r in recentReflections" :key="r.id" class="msr-reflect-item">
          <span class="msr-reflect-role" :class="r.role">{{ r.role === 'mirror' ? '镜我' : '你' }}</span>
          <p class="msr-reflect-text">{{ r.text }}</p>
          <span class="msr-reflect-time">{{ relTime(r.ts) }}</span>
        </li>
      </ul>
    </section>

    <!-- 对话模板：晨昏签到/周回顾/专注准备/情绪检查/决策辅助 预设引导（INCR-297 补挂载孤儿组件 DialogueTemplatesPanel：消费 useDialogueTemplates 引擎的推荐/列表/热门/使用记录，引擎应用库内唯一，零 props 自持读桥） -->
    <section data-enter class="msr-templates" aria-label="对话模板">
      <h2 class="msr-section-title">对话模板</h2>
      <DialogueTemplatesPanel />
    </section>

    <!-- 自我认知档案：人格风格/价值观取向/成长阶段/温和洞察（INCR-294 补挂载孤儿组件 PersonalityArchivePanel：消费 self-cognition-analytics 五纯函数，面板级应用库内唯一，薄委托化） -->
    <section data-enter class="msr-portrait" aria-label="自我认知档案">
      <h2 class="msr-section-title">自我认知档案</h2>
      <PersonalityArchivePanel :dialogues="dialogues" />
    </section>

    <!-- 人格画像：自我认知报告/常用词汇/演化趋势/成长轨迹/温和洞察（INCR-293 补挂载孤儿组件 PersonalityPortraitPanel：消费 buildPersonalityPortrait 纯函数，应用库内唯一，薄委托化） -->
    <section data-enter class="msr-portrait" aria-label="人格画像">
      <h2 class="msr-section-title">人格画像</h2>
      <PersonalityPortraitPanel :dialogues="dialogues" />
    </section>

    <!-- 自体镜像：四柱画像 / 自体镜像 / 十二宫格 / 自体星盘（原已实现但未挂载的 self-mirror 面板） -->
    <section data-enter class="msr-selfmirror" aria-label="自体镜像">
      <h2 class="msr-section-title">自体镜像</h2>
      <FourPillarsPanel />
      <SelfMirrorPanel />
      <TwelveHousesGrid />
      <SelfAstrolabeChart />
    </section>

    <!-- 镜我深处：年度对话 / 幕僚调度 / 任务拆解 深度能力（INCR-301 补挂载孤儿组件 MirrorDeepPanel：消费 annual-review/dispatch/decomposer 引擎，零 props 自持读桥） -->
    <section data-enter class="msr-deep" aria-label="镜我深处">
      <h2 class="msr-section-title">镜我深处</h2>
      <MirrorDeepPanel />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import MirrorSelf from '../components/MirrorSelf.vue'
import RoomLayout from '../components/RoomLayout.vue'
import FourPillarsPanel from '../components/FourPillarsPanel.vue'
import SelfMirrorPanel from '../components/SelfMirrorPanel.vue'
import TwelveHousesGrid from '../components/TwelveHousesGrid.vue'
import SelfAstrolabeChart from '../components/SelfAstrolabeChart.vue'
import PersonalityPortraitPanel from '../components/PersonalityPortraitPanel.vue'
import PersonalityArchivePanel from '../components/PersonalityArchivePanel.vue'
import DialogueTemplatesPanel from '../components/DialogueTemplatesPanel.vue'
import MirrorDeepPanel from '../components/MirrorDeepPanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomResonance, ROOM_LABELS } from '../modules/room-resonance'
import { getDialogueSessions } from '../modules/mirror/dialogue-persistence'
import type { DialogueSession } from '../modules/mirror/dialogue-persistence'

const { entranceRef, entranceClass } = useViewEntrance()

// ---- 跨房间共鸣联动（任务①：让镜我既消费也参与 6 房联动） ----
const { crossRoomFeed, emitRoomSignal } = useRoomResonance()

// 消费其他房间的信号（过滤本房，避免自家信号回声）
const otherRoomFeed = computed(() =>
  crossRoomFeed.value.filter((s) => s.room !== 'mirror-self'),
)

function roomLabel(room: string): string {
  return ROOM_LABELS[room as keyof typeof ROOM_LABELS] ?? room
}

// ---- 近期反思：房间级连续性叙事（取自镜面对话引擎，玉珠 tooltip 未呈现） ----
function lastEntryTs(s: DialogueSession): number {
  return s.entries.length ? s.entries[s.entries.length - 1].timestamp : 0
}

const recentReflections = computed(() => {
  const sessions = getDialogueSessions()
    .slice()
    .sort((a, b) => lastEntryTs(b) - lastEntryTs(a))
    .slice(0, 3)
  const items: { id: string; role: 'user' | 'mirror'; text: string; ts: number }[] = []
  for (const s of sessions) {
    if (!s.entries.length) continue
    const last = s.entries[s.entries.length - 1]
    items.push({ id: `${s.id}-${last.id}`, role: last.role, text: last.text, ts: last.timestamp })
  }
  return items
})

function relTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d === 1) return '昨天'
  if (d < 7) return `${d} 天前`
  return new Date(ts).toLocaleDateString()
}

// ---- 人格画像：全部镜面对话条目（喂给 PersonalityPortraitPanel） ----
const dialogues = computed(() => getDialogueSessions().flatMap((s) => s.entries))

// 进入房间即向跨房间态势注入一道镜我信号（双向联动）
onMounted(() => {
  const count = getDialogueSessions().length
  emitRoomSignal({
    room: 'mirror-self',
    kind: 'mirror',
    label: count > 0 ? `已沉淀 ${count} 次镜面对话` : '镜我静候',
    ts: Date.now(),
  })
})
</script>

<style scoped>
.mirror-self-room {
  /* 房间根透明，仅留主题辉光；视图根用 min-height:100% 避免硬撑 100vh */
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 28px;
  position: relative;
  overflow: hidden;
}

/* 统一房间壳层置于氛围辉光之上，并居中内容列（维持原 520px 视觉列宽） */
.mirror-self-room :deep(.room-layout) {
  position: relative;
  z-index: 1;
}
.mirror-self-room :deep(.room-layout__body) {
  align-items: center;
}

/* 氛围辉光（不透明渐变禁止，仅用半透明径向辉光） */
.msr-atmos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.msr-warm-glow {
  position: absolute;
  top: 12%;
  left: 50%;
  width: min(520px, 80vw);
  height: min(520px, 80vw);
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(196, 160, 184, 0.10), transparent 68%);
  filter: blur(8px);
}

.msr-stage,
.msr-climate,
.msr-reflections,
.msr-templates,
.msr-portrait,
.msr-selfmirror,
.msr-deep {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
}

.msr-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  margin-top: 12px;
}
.msr-hint {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--text-low);
  text-align: center;
}

/* 通用小节标题 */
.msr-section-title {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-medium);
  text-align: center;
}

/* ========== 跨房间共鸣态势 ========== */
.msr-climate {
  padding: 18px 18px 20px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.msr-climate-empty {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--text-low);
  text-align: center;
  line-height: 1.6;
}
.msr-climate-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.msr-climate-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.msr-climate-room {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.7);
  flex-shrink: 0;
}
.msr-climate-signal {
  font-size: 11px;
  color: rgba(240, 242, 255, 0.7);
  text-align: right;
}

/* ========== 近期反思 ========== */
.msr-reflections {
  padding: 18px 18px 20px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.msr-reflect-empty {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--text-low);
  text-align: center;
  line-height: 1.6;
}
.msr-reflect-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msr-reflect-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.msr-reflect-role {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 1px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 6px;
}
.msr-reflect-role.mirror {
  color: rgba(196, 160, 184, 0.85);
  background: rgba(196, 160, 184, 0.12);
}
.msr-reflect-role.user {
  color: rgba(var(--accent-rgb), 0.7);
  background: rgba(var(--accent-rgb), 0.1);
}
.msr-reflect-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.82);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.msr-reflect-time {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-low);
  text-align: right;
}

/* 移动端：收窄 padding，避免溢出 */
@media (max-width: 640px) {
  .mirror-self-room {
    gap: 20px;
  }
  .msr-climate,
  .msr-reflections {
    padding: 16px 14px 18px;
  }
}
</style>
