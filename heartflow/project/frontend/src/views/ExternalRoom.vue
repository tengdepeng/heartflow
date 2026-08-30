<script setup lang="ts">
// ============================================================
// 外链房（/external）· 外部链接与能力接入
//
// 五个分区：AI 模型与接口 / 技能 / 云同步 / 写作提示词 / 榜单通道。
// 本轮按用户拍板先把「AI 模型与接口」做实（引擎就绪但零设置 UI，缺口最大），
// 其余四项以 PendingSection 明确标「待建」——不做空壳假装功能存在。
//
// 宪法第 1 条（本地私有）：所有外部调用经 engine/ai/external-gate 出口闸，
// 未显式同意一律拦截。房间顶部常驻显示闸门状态，让用户随时知情。
// ============================================================
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import { isExternalAIConsented } from '../engine/ai/external-gate'
import AIModelSettings from '../components/external-room/AIModelSettings.vue'
import PendingSection from '../components/external-room/PendingSection.vue'

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
  { id: 'skill', label: '技能 Skill', ready: false },
  { id: 'sync', label: '云同步', ready: false },
  { id: 'prompt', label: '写作提示词', ready: false },
  { id: 'rank', label: '榜单通道', ready: false },
]

const externalConsented = computed(() => isExternalAIConsented())

const PENDING: Record<
  Exclude<SectionId, 'ai'>,
  { title: string; summary: string; plan: string[] }
> = {
  skill: {
    title: '技能 Skill',
    summary:
      '全仓尚无「技能 / 能力插件」系统（代码里出现的 skill 均为背包技能点，非此处所指）。这块要从零建模，且与镜我、顾问能力体系耦合较深，故单独一轮推进。',
    plan: [
      '技能元数据模型：名称 / 能力声明 / 触发词 / 所需权限',
      '启停与排序持久化，复用侧栏分组重排的既有拖拽',
      '与镜我意图（modules/mirror/intents）及顾问能力对接',
      '外部技能需经出口闸同意，默认只允许本地技能',
    ],
  },
  sync: {
    title: '云同步',
    summary:
      '备份 / 恢复 / 加密 / 导出已有（BackupRecoveryPanel 347 行、DataSecurityPanel 560 行、EncryptionPanel 131 行），缺的是「跨设备」这一层。已定方案：本地同步文件夹 + 加密快照。',
    plan: [
      '用户自选一个本地目录（可放在自己的 OneDrive / 坚果云同步盘里）',
      '写入前加密，读回时校验；数据不出用户自己的盘，零后端',
      '冲突策略：按时间戳较新者胜出，冲突副本保留可回滚',
      '同步状态与最近同步时间在房内可见',
    ],
  },
  prompt: {
    title: '写作提示词',
    summary:
      'engine/ai/prompt.ts 已有 BUILTIN_TEMPLATES 与 renderTemplate 变量渲染，但只有内置模板，用户无法增删改自己的模板。',
    plan: [
      '用户模板持久化 CRUD（名称 / 系统模板 / 用户模板 / 变量默认值）',
      '变量填充实时预览，复用 renderTemplate',
      '内置模板只读，用户模板可复制内置为起点',
      '与写作助手（WritingAssistantPanel）打通，可直接选用',
    ],
  },
  rank: {
    title: '榜单通道',
    summary:
      '宪法禁止竞速 / 排行类 UI，故本分区默认关闭，仅保留外部接入通道（用户已拍板：默认关闭、只提供通道）。',
    plan: [
      '不提供任何内置排行榜界面',
      '仅暴露一个外部数据源接入位，用户自填才启用',
      '启用前需经出口闸同意，且明确告知数据外发',
      '默认关闭，关闭时不占任何渲染与网络开销',
    ],
  },
}
</script>

<template>
  <div class="view-entrance external-room">
    <div data-enter class="header-section">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">⇄</span>
        <span class="orn-line"></span>
      </div>
      <span class="header-kicker">外部链接房 · 能力接入</span>
      <h1 class="header-title">外链房</h1>
      <p class="header-sub">
        连向外部的一切都收在这里。默认不外发一个字节——需要出网的调用都要你点头。
      </p>

      <div class="gate-banner" :class="externalConsented ? 'is-open' : 'is-closed'">
        <span class="gate-dot"></span>
        <span class="gate-text">
          出口闸：{{ externalConsented ? '已允许远程 AI 端点' : '仅本地端点放行（默认）' }}
        </span>
      </div>
    </div>

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
      <PendingSection
        v-else-if="active === 'skill'"
        v-bind="PENDING.skill"
      />
      <PendingSection v-else-if="active === 'sync'" v-bind="PENDING.sync" />
      <PendingSection v-else-if="active === 'prompt'" v-bind="PENDING.prompt" />
      <PendingSection v-else v-bind="PENDING.rank" />
    </div>
  </div>
</template>

<style scoped>
.external-room {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 24px 140px;
  color: var(--text-primary, #e9e0d0);
}

.header-section {
  text-align: center;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0.7;
}
.orn-line {
  width: 46px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent, #d4a574), transparent);
}
.orn-diamond {
  color: var(--accent, #d4a574);
  font-size: 13px;
}
.header-kicker {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  letter-spacing: 3px;
  opacity: 0.5;
}
.header-title {
  margin: 4px 0 0;
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 2px;
}
.header-sub {
  margin: 8px auto 0;
  max-width: 560px;
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.55;
}

.gate-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
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
