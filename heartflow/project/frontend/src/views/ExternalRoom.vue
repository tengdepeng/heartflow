<script setup lang="ts">
// ============================================================
// 外链房（/external）· 外部链接与能力接入
//
// 五个分区：AI 模型与接口 / 技能 / 云同步 / 写作提示词 / 榜单通道。
// 「AI 模型与接口」「技能」「写作提示词」「云同步」「榜单通道」均已做实；
// 写作提示词为用户模板 CRUD + 实时预览，云同步为口令加密快照 + 本地目录直写（零后端），
// 榜单通道为外部数据源接入位（宪法禁排行 UI：仅接入、不呈现名次，默认关闭、启用需出口闸同意），
// 技能为能力登记面板（种子自镜我意图 intents.ts + 顾问调令 commandIntent.ts，外部技能出网经出口闸）。
//
// 宪法第 1 条（本地私有）：所有外部调用经 engine/ai/external-gate 出口闸，
// 未显式同意一律拦截。房间顶部常驻显示闸门状态，让用户随时知情。
// ============================================================
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import { isExternalAIConsented } from '../engine/ai/external-gate'
import RoomLayout from '../components/RoomLayout.vue'
import AIModelSettings from '../components/external-room/AIModelSettings.vue'
import PromptTemplates from '../components/external-room/PromptTemplates.vue'
import CloudSync from '../components/external-room/CloudSync.vue'
import RankChannel from '../components/external-room/RankChannel.vue'
import SkillChannel from '../components/external-room/SkillChannel.vue'

type SectionId = 'ai' | 'skill' | 'sync' | 'prompt' | 'rank'

const TAB_KEY = 'external:tab'
const VALID: SectionId[] = ['ai', 'skill', 'sync', 'prompt', 'rank']
const stored = storage.getKV<string>(TAB_KEY, 'ai')
const active = ref<SectionId>((VALID as string[]).includes(stored) ? (stored as SectionId) : 'ai')

function select(id: SectionId): void {
  active.value = id
  storage.setKV(TAB_KEY, id)
}

const SECTIONS: ReadonlyArray<{ id: SectionId; label: string; ready: boolean }> = [
  { id: 'ai', label: 'AI 模型与接口', ready: true },
  { id: 'skill', label: '技能 Skill', ready: true },
  { id: 'sync', label: '云同步', ready: true },
  { id: 'prompt', label: '写作提示词', ready: true },
  { id: 'rank', label: '榜单通道', ready: true },
]

const externalConsented = computed(() => isExternalAIConsented())
</script>

<template>
  <div class="view-entrance external-room">
    <!-- 统一房间壳层：RoomLayout 提供标准化头部（装饰菱形 / 标题 / 副标题 / 眉标） -->
    <RoomLayout
      title="外链房"
      kicker="外部链接房 · 能力接入"
      subtitle="连向外部的一切都收在这里。默认不外发一个字节——需要出网的调用都要你点头。"
      :ornament="true"
      data-enter
    >
      <!-- 出口闸状态常驻展示（原 header-section 内的 gate-banner 上提到 RoomHeader 的 #meta 子头位） -->
      <template #meta>
        <div class="gate-banner" :class="externalConsented ? 'is-open' : 'is-closed'">
          <span class="gate-dot"></span>
          <span class="gate-text">
            出口闸：{{ externalConsented ? '已允许远程 AI 端点' : '仅本地端点放行（默认）' }}
          </span>
        </div>
      </template>

      <div data-enter class="tab-row" role="tablist">
        <button
          v-for="s in SECTIONS"
          :key="s.id"
          class="tab"
          :class="{ 'is-on': active === s.id }"
          role="tab"
          :aria-selected="active === s.id"
          @click="select(s.id)"
        >
          {{ s.label }}
          <span v-if="!s.ready" class="tab-dot" title="待建"></span>
        </button>
      </div>

      <div data-enter class="panel">
        <AIModelSettings v-if="active === 'ai'" />
        <SkillChannel v-else-if="active === 'skill'" />
        <CloudSync v-else-if="active === 'sync'" />
        <PromptTemplates v-else-if="active === 'prompt'" />
        <RankChannel v-else-if="active === 'rank'" />
      </div>
    </RoomLayout>
  </div>
</template>

<style scoped>
.external-room {
  max-width: 900px;
  margin: 0 auto;
  min-height: 100%;
  padding: 0;
  color: var(--text-primary, #e9e0d0);
}

.gate-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}
.gate-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.gate-banner.is-closed .gate-dot {
  background: #7fd0bb;
}
.gate-banner.is-open .gate-dot {
  background: #e0a06a;
}
.gate-text {
  opacity: 0.75;
}

.tab-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 26px 0 18px;
}
.tab {
  position: relative;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary, #e9e0d0);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.tab:hover {
  border-color: rgba(212, 165, 116, 0.3);
}
.tab.is-on {
  border-color: rgba(212, 165, 116, 0.55);
  background: rgba(212, 165, 116, 0.12);
}
.tab-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  vertical-align: middle;
}

.panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
