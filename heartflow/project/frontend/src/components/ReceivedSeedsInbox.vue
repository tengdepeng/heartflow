<script setup lang="ts">
// ============================================================
// 逸趣阁 · 接收匣（第46条单向赠予的落点 / 第48条反收回变暗）
// 接收方庭院里「独立来源标记的切片」：
//   浮动 → 种下(双圈光纹) / 观赏 / 拒绝；收回 → 变暗不可展开。
// 全部本地：礼包(.seed-gift)由信任的人线下交付，本组件负责导入落匣。
// ============================================================
import { ref, computed } from 'vue'
import {
  getReceivedSeeds,
  plantSeed,
  admireSeed,
  rejectSeed,
  removeReceivedSeed,
  importSeedGift,
  type ReceivedSeed,
  type ReceivedSeedState,
} from '../modules/play/received-seed'
import { TRANSFER_TYPE_LABELS } from '../modules/play/seed-transfer'

const seeds = ref<ReceivedSeed[]>(getReceivedSeeds())
const expandedId = ref<string | null>(null)
const lastMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function refresh() {
  seeds.value = getReceivedSeeds()
}

const STATE_LABEL: Record<ReceivedSeedState, string> = {
  floating: '庭院切片',
  planted: '已种下',
  admired: '已观赏',
  rejected: '已拒绝',
  revoked: '来源已收回',
}

/** 是否可展开查看内容（收回的不可展开） */
function canExpand(s: ReceivedSeed): boolean {
  return s.state !== 'revoked'
}

function toggleExpand(id: string) {
  if (!canExpand(seeds.value.find(s => s.id === id)!)) return
  expandedId.value = expandedId.value === id ? null : id
}

function act(id: string, fn: (id: string) => boolean, msg: string) {
  if (fn(id)) {
    lastMsg.value = msg
    refresh()
  }
}

function plant(id: string) {
  act(id, plantSeed, '已种下：双圈光纹显现（发送方与传递方）')
}
function admire(id: string) {
  act(id, admireSeed, '已观赏这片时间的馈赠')
}
function reject(id: string) {
  act(id, rejectSeed, '已婉拒这片切片')
}
function remove(id: string) {
  act(id, removeReceivedSeed, '已从庭院移除')
}

function pickFile() {
  fileInput.value?.click()
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const added = importSeedGift(text)
    if (!added) {
      lastMsg.value = '无法识别该礼包文件（格式不符或已损坏）'
    } else {
      lastMsg.value = `收到 ${added.length} 枚时间种子切片，静静浮在庭院里`
      refresh()
    }
  } catch {
    lastMsg.value = '读取礼包文件失败'
  } finally {
    input.value = ''
  }
}

const visibleSeeds = computed(() => seeds.value)
const hasSeeds = computed(() => seeds.value.length > 0)
</script>

<template>
  <div class="inbox">
    <div class="section-label">🪷 接收匣 · 时间的馈赠</div>
    <p class="inbox-desc">
      信任的人将一片时间打包成礼包交给你。它作为<strong>独立来源标记的切片</strong>浮在庭院里——
      种下会显出<strong>双圈光纹</strong>（发送方与传递方），也可只观赏或婉拒。对方一旦收回，切片会变暗、不可展开。
    </p>

    <div class="inbox-toolbar">
      <button class="import-btn" @click="pickFile">导入时间种子礼包</button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden-file"
        @change="onFile"
      />
      <span v-if="lastMsg" class="inbox-msg">{{ lastMsg }}</span>
    </div>

    <div v-if="!hasSeeds" class="inbox-empty">
      庭院还空着。当有人把时间种子礼包交给你，导入后便会在此静静浮起。
    </div>

    <div v-else class="seed-list">
      <div
        v-for="s in visibleSeeds"
        :key="s.id"
        :class="['seed-slice', s.state, { expanded: expandedId === s.id }]"
        @click="toggleExpand(s.id)"
      >
        <!-- 双圈光纹：种下后显现（发送方 + 传递方） -->
        <span class="ring ring-outer" aria-hidden="true"></span>
        <span class="ring ring-inner" aria-hidden="true"></span>

        <div class="slice-head">
          <span class="slice-cat">{{ TRANSFER_TYPE_LABELS[s.category] }}</span>
          <span class="slice-state">{{ STATE_LABEL[s.state] }}</span>
        </div>
        <div class="slice-name">{{ s.name }}</div>
        <div class="slice-source">
          来源：{{ s.senderName }}<template v-if="s.transferorName"> · 经 {{ s.transferorName }} 传递</template>
        </div>

        <div v-if="expandedId === s.id && canExpand(s)" class="slice-detail">
          <p class="slice-desc">{{ s.description }}</p>
          <div v-if="s.tags.length" class="slice-tags">
            <span v-for="t in s.tags" :key="t" class="slice-tag">{{ t }}</span>
          </div>
          <div class="slice-when">{{ new Date(s.timestamp).toLocaleString() }}</div>
        </div>

        <!-- 操作（收回的不可操作） -->
        <div v-if="s.state === 'floating'" class="slice-actions" @click.stop>
          <button class="act plant" @click="plant(s.id)">种下</button>
          <button class="act admire" @click="admire(s.id)">观赏</button>
          <button class="act reject" @click="reject(s.id)">婉拒</button>
        </div>
        <div v-else-if="s.state === 'planted' || s.state === 'admired'" class="slice-actions" @click.stop>
          <button class="act admire" @click="admire(s.id)">观赏</button>
          <button class="act remove" @click="remove(s.id)">移除</button>
        </div>
        <div v-else-if="s.state === 'rejected' || s.state === 'revoked'" class="slice-actions" @click.stop>
          <button class="act remove" @click="remove(s.id)">移除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inbox {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}
.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-high);
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.inbox-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.6;
  margin-bottom: 14px;
}
.inbox-desc strong { color: var(--accent); font-weight: 600; }
.inbox-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.import-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.import-btn:hover { background: rgba(var(--accent-rgb), 0.2); }
.hidden-file { display: none; }
.inbox-msg {
  font-size: 11px;
  color: var(--text-secondary);
}
.inbox-empty {
  text-align: center;
  padding: 20px 0;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px dashed rgba(var(--accent-rgb), 0.2);
  border-radius: 10px;
}

.seed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.seed-slice {
  position: relative;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.25s;
  overflow: hidden;
}
.seed-slice:hover { border-color: rgba(var(--accent-rgb), 0.32); }

/* 单圈来源标记（浮动时） */
.seed-slice .ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s, transform 0.4s;
}
.seed-slice .ring-outer {
  width: 120px; height: 120px;
  top: -40px; right: -30px;
}
.seed-slice .ring-inner {
  width: 90px; height: 90px;
  top: -25px; right: -15px;
  border-color: rgba(var(--accent-rgb), 0.4);
}
/* 种下后：双圈光纹显现（发送方 + 传递方） */
.seed-slice.planted .ring-outer,
.seed-slice.planted .ring-inner { opacity: 0.7; }
.seed-slice.planted .ring-outer { animation: ringPulse 6s ease-in-out infinite; }
.seed-slice.planted .ring-inner { animation: ringPulse 6s ease-in-out infinite 1.5s; }
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50% { transform: scale(1.06); opacity: 0.8; }
}

/* 收回：变暗、不可展开 */
.seed-slice.revoked {
  opacity: 0.42;
  cursor: default;
  filter: grayscale(0.4);
}
.seed-slice.revoked .ring { opacity: 0 !important; }
/* 拒绝：静默收起 */
.seed-slice.rejected { opacity: 0.6; }

.slice-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.slice-cat {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}
.slice-state {
  font-size: 10px;
  color: var(--text-secondary);
}
.slice-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-high);
}
.slice-source {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.slice-detail {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.15);
}
.slice-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.6;
}
.slice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.slice-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: var(--text-low);
}
.slice-when {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.slice-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.act {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.act:hover { background: rgba(var(--accent-rgb), 0.1); color: var(--text-high); }
.act.plant {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}
.act.reject { border-color: rgba(239, 68, 68, 0.3); color: var(--error); }
.act.remove { border-color: rgba(239, 68, 68, 0.2); color: var(--error); }
</style>
