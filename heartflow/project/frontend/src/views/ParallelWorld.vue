<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance pw">
    <!-- Header -->
    <div data-enter class="pw-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">平行世界中的你，也在闪闪发光</p>
      <h1 class="pw-title">平行世界</h1>
    </div>

    <!-- Overview Cards -->
    <div data-enter class="pw-overview">
      <div class="pw-overview-card">
        <span class="pw-overview-num">{{ altSelves.length }}</span>
        <span class="pw-overview-label">平行自我</span>
      </div>
      <div class="pw-overview-card">
        <span class="pw-overview-num">{{ capsules.length }}</span>
        <span class="pw-overview-label">时间胶囊</span>
      </div>
      <div class="pw-overview-card">
        <span class="pw-overview-num">{{ forks.length }}</span>
        <span class="pw-overview-label">抉择分叉</span>
      </div>
    </div>

    <!-- 分支星图（来自 parallel-world 模块） -->
    <section data-enter class="pw-branch-stats" v-if="branchStats.branchCount > 0">
      <h2 class="pw-section-title">分支星图</h2>
      <div class="pw-branch-stats-grid">
        <div class="pw-branch-stat">
          <span class="pw-branch-stat-num">{{ branchStats.branchCount }}</span>
          <span class="pw-branch-stat-label">时间分支</span>
        </div>
        <div class="pw-branch-stat">
          <span class="pw-branch-stat-num">{{ branchStats.checkpointCount }}</span>
          <span class="pw-branch-stat-label">检查点</span>
        </div>
        <div class="pw-branch-stat">
          <span class="pw-branch-stat-num">{{ branchStats.totalSnapshots }}</span>
          <span class="pw-branch-stat-label">快照</span>
        </div>
        <div class="pw-branch-stat active">
          <span class="pw-branch-stat-name">{{ branchStats.activeBranchName }}</span>
          <span class="pw-branch-stat-label">当前分支</span>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 抉择分叉 — 分支光路可视化 -->
    <!-- ============================================================ -->
    <section data-enter class="pw-fork-section">
      <h2 class="pw-section-title">抉择分叉</h2>
      <p class="pw-hint">选了A没选B，B就进入了平行世界。每一条光路，都是另一个你的人生。</p>

      <!-- 分支光路可视化树 -->
      <div v-if="forks.length" class="pw-fork-tree">
        <!-- 树干 -->
        <div class="pw-fork-tree-trunk">
          <span class="pw-fork-tree-dot"></span>
          <span class="pw-fork-tree-label">你的人生主线</span>
        </div>

        <!-- 分支列表 -->
        <div v-for="(f, idx) in forks" :key="f.id" class="pw-fork-branch" :style="{ '--branch-index': idx }">
          <!-- 分支连接线 -->
          <div class="pw-fork-branch-line">
            <span class="pw-fork-branch-node"></span>
          </div>

          <!-- 分支卡片 -->
          <div class="pw-fork-branch-card">
            <!-- 图标题 -->
            <div class="pw-fork-branch-header">
              <span class="pw-fork-branch-icon">🔀</span>
              <span class="pw-fork-branch-date">{{ fmt(f.at) }}</span>
              <span v-if="f.date" class="pw-fork-branch-decision-date">{{ f.date }}</span>
            </div>

            <!-- 描述 -->
            <p v-if="f.description" class="pw-fork-branch-desc">{{ f.description }}</p>

            <!-- 两条路径 -->
            <div class="pw-fork-paths">
              <!-- 已选路径 -->
              <div class="pw-fork-path chosen">
                <span class="pw-fork-path-arrow">→</span>
                <span class="pw-fork-path-label">你选了</span>
                <span class="pw-fork-path-text">{{ f.chosen }}</span>
              </div>

              <!-- 分支线 -->
              <div class="pw-fork-path-divider">
                <span class="pw-fork-path-split"></span>
              </div>

              <!-- 未选路径 -->
              <div class="pw-fork-path unchosen">
                <span class="pw-fork-path-arrow">↛</span>
                <span class="pw-fork-path-label">平行世界</span>
                <span class="pw-fork-path-text">{{ f.alternative }}</span>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="pw-fork-branch-footer">
              <button class="pw-fork-gen-btn" @click="generateAltFromFork(f)" title="基于这个分叉生成平行自我">映照平行自我</button>
              <button class="pw-del pw-fork-del" aria-label="删除该抉择分叉" @click="removeFork(f.id)">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="pw-empty-hint">
        <p>还没有抉择分叉。每一次选择，都可以在这里种下一棵分叉树。</p>
      </div>

      <!-- 添加分叉表单 -->
      <div class="pw-fork-form">
        <div class="pw-fork-form-grid">
          <input v-model="forkForm.description" placeholder="这个决定的背景…" class="pw-input pw-fork-desc" />
          <input v-model="forkForm.chosen" placeholder="你选了…" class="pw-input" />
          <input v-model="forkForm.alternative" placeholder="没选…" class="pw-input" />
          <input v-model="forkForm.date" type="date" class="pw-input pw-input-date" />
        </div>
        <button @click="addFork" class="pw-btn pw-fork-add-btn" :disabled="!forkForm.chosen.trim()||!forkForm.alternative.trim()">种下分叉</button>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 时间胶囊 — 锁定光球 -->
    <!-- ============================================================ -->
    <section data-enter class="pw-capsule-section">
      <h2 class="pw-section-title">时间胶囊</h2>
      <p class="pw-hint">设定一个开启时间，给未来的自己写一段话</p>

      <div v-if="capsules.length" class="pw-capsule-list">
        <div
          v-for="c in sortedCapsules"
          :key="c.id"
          class="pw-capsule-card"
          :class="{
            opened: c.opened,
            ready: checkReady(c),
            sealed: !c.opened && !checkReady(c),
          }"
          role="button"
          tabindex="0"
          :aria-label="c.opened ? '查看已开启的时间胶囊 ' + c.message : (checkReady(c) ? '开启时间胶囊' : '查看封存的时间胶囊')"
          @click="tryOpenCapsule(c)"
          @keydown.enter.prevent="tryOpenCapsule(c)"
          @keydown.space.prevent="tryOpenCapsule(c)"
        >
          <!-- 密封光球 -->
          <div v-if="!c.opened" class="pw-capsule-orb" :class="{ pulse: checkReady(c) }">
            <span class="pw-capsule-orb-icon" role="img" :aria-label="checkReady(c) ? '可开启的时间胶囊' : '已封存的时间胶囊'">{{ checkReady(c) ? '🔮' : '🔒' }}</span>
            <span v-if="checkReady(c)" class="pw-capsule-orb-glow"></span>
          </div>

          <!-- 已开启光球 -->
          <div v-else class="pw-capsule-orb opened">
            <span class="pw-capsule-orb-icon" role="img" aria-label="已开启的时间胶囊">📭</span>
          </div>

          <div class="pw-capsule-body">
            <template v-if="c.opened">
              <strong class="pw-capsule-title">来自过去的你</strong>
              <p class="pw-capsule-content">{{ c.message }}</p>
              <span class="pw-capsule-meta">封存于 {{ fmt(c.at) }} · 于 {{ c.openDate }} 开启</span>
            </template>
            <template v-else>
              <strong class="pw-capsule-title">给 {{ c.openDate }} 的自己</strong>
              <span class="pw-capsule-meta">封存于 {{ fmt(c.at) }}</span>
            </template>
          </div>

          <div class="pw-capsule-right">
            <span v-if="!c.opened && checkReady(c)" class="pw-capsule-ready-badge">可开启</span>
            <span v-else-if="!c.opened" class="pw-capsule-countdown">{{ daysUntil(c.openDate) }}天</span>
            <button v-if="c.opened" class="pw-del" aria-label="删除该时间胶囊" @click.stop="removeCapsule(c.id)">×</button>
          </div>
        </div>
      </div>

      <div v-else class="pw-empty-hint">
        <p>还没有时间胶囊。给未来的自己写一段话，让它穿越时光吧。</p>
      </div>

      <div class="pw-add-row">
        <input v-model="capForm.message" placeholder="给未来的自己写一段话…" class="pw-input" @keydown.enter.prevent="addCapsule()" />
          <input v-model="capForm.openDate" type="date" class="pw-input pw-input-date" />
          <button @click="addCapsule()" class="pw-btn" :disabled="!capForm.message||!capForm.openDate">封存</button>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 可能性自我 — 基于分叉生成 -->
    <!-- ============================================================ -->
    <section data-enter class="pw-self-grid">
      <h2 class="pw-section-title">可能性自我</h2>
      <p class="pw-hint">如果那些搁置的种子都被浇灌了，你可能变成什么样子？</p>
      <div class="pw-self-list">
        <div
          v-for="(alt, i) in altSelves"
          :key="alt.id"
          class="pw-self-card"
          :style="{ borderColor: alt.color + '22', background: alt.color + '08' }"
          role="button"
          tabindex="0"
          :aria-expanded="!!alt.expanded"
          :aria-label="'展开或收起平行自我 ' + alt.title"
          @click="expandAlt(i)"
          @keydown.enter.prevent="expandAlt(i)"
          @keydown.space.prevent="expandAlt(i)"
        >
          <span class="pw-self-icon">{{ alt.icon }}</span>
          <div class="pw-self-body">
            <strong class="pw-self-name">{{ alt.title }}</strong>
            <p v-if="alt.expanded" class="pw-self-desc">{{ alt.desc }}</p>
            <p v-else class="pw-self-desc pw-self-preview">{{ alt.desc.slice(0, 40) }}…</p>
            <!-- 来源分叉 -->
            <span v-if="alt.originForkId" class="pw-self-origin">
              <span class="pw-self-origin-icon">🔀</span>
              {{ getOriginForkLabel(alt.originForkId) }}
            </span>
          </div>
          <button class="pw-del" aria-label="删除该平行自我" @click.stop="removeAlt(alt.id)">×</button>
        </div>
      </div>
      <div class="pw-self-actions">
        <button @click="generateAlt" class="pw-btn">映照另一个你</button>
        <span class="pw-self-date" v-if="altSelves.length">最多 6 个平行自我 · 点击展开详情</span>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 平行世界档案（INCR-290 补挂载孤儿组件 ParallelWorldArchivePanel：概览/平行自我来源/胶囊状态/抉择节奏/分支绽开/健康维度/温和回看，消费 parallel-analytics 纯函数，引擎应用库内唯一，薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <ParallelWorldArchivePanel
        :forks="forks"
        :alts="altSelves"
        :capsules="capsules"
        :branches="parallelWorld.branches.value"
      />
    </section>

    <!-- ============================================================ -->
    <!-- 分支管理（parallel-world·useParallelWorld，INCR-176） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <BranchManagementPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 场景同步（parallel-world·useSceneSync，INCR-222 薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <SceneSyncPanel
        :branches="parallelWorld.branches.value"
        :checkpoints="parallelWorld.checkpoints.value"
        :create-checkpoint="syncCreateCheckpoint"
        :update-checkpoint="syncUpdateCheckpoint"
      />
    </section>

    <!-- ============================================================ -->
    <!-- 分支回放（parallel-world·useBranchReplay，INCR-176） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <BranchReplayPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 分支时间线（parallel-world·useBranchTimeline，INCR-176） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <BranchTimelinePanel />
    </section>

    <!-- ============================================================ -->
    <!-- 分支可视化（parallel-world·useBranchVisualization，INCR-176） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <BranchVisualizationPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 分支权重（parallel-world·useBranchWeights，INCR-264 补挂载孤儿组件，薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <BranchWeightsPanel :branches="parallelWorld.branches.value" />
    </section>

    <!-- ============================================================ -->
    <!-- 知识迁移（parallel-world·useKnowledgeTransfer，INCR-265 补挂载孤儿组件，薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <KnowledgeTransferPanel :branches="parallelWorld.branches.value" />
    </section>

    <!-- ============================================================ -->
    <!-- 世界融合（parallel-world·useWorldMergeEngine，INCR-266 补挂载孤儿组件，薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <WorldMergePanel
        :branches="parallelWorld.branches.value"
        :checkpoints="parallelWorld.checkpoints.value"
        :snapshots="parallelWorld.snapshots.value"
      />
    </section>

    <!-- ============================================================ -->
    <!-- 世界对照（parallel-world·useWorldComparison，INCR-228 薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <WorldComparisonPanel
        :branches="parallelWorld.branches.value"
        :checkpoints="parallelWorld.checkpoints.value"
      />
    </section>

    <!-- ============================================================ -->
    <!-- 冲突仲裁（INCR-291 补挂载孤儿组件 AutoConflictPanel：自动解决/规则引擎/模式分析，消费 useAutoConflictResolution 引擎，薄委托化） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <AutoConflictPanel
        :branches="parallelWorld.branches.value"
        :checkpoints="parallelWorld.checkpoints.value"
      />
    </section>

    <!-- ============================================================ -->
    <!-- 情景推演（parallel-world·useScenarioSimulation，INCR-240 补挂载孤儿组件） -->
    <!-- ============================================================ -->
    <section data-enter class="pw-branch-panels">
      <ScenarioSimulationPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 梦境碎片 -->
    <!-- ============================================================ -->
    <section data-enter class="pw-dream-section">
      <h2 class="pw-section-title">梦境碎片</h2>
      <p class="pw-hint">你在另一个维度里真实经历过的碎片</p>
      <div class="pw-dream-grid" v-if="dreamFragments.length">
        <div v-for="d in dreamFragments" :key="d.id" class="pw-dream-card" role="button" tabindex="0" :aria-label="'查看梦境 ' + (d.title || '无标题梦境') + ' 的来源'" @click="openDreamSource()" @keydown.enter.prevent="openDreamSource()" @keydown.space.prevent="openDreamSource()" title="点击回到梦乡小筑">
          <span class="pw-dream-icon">🌙</span>
          <div class="pw-dream-body">
            <strong class="pw-dream-title">{{ d.title || '无标题梦境' }}</strong>
            <p class="pw-dream-text">{{ d.content.slice(0, 50) }}{{ d.content.length > 50 ? '…' : '' }}</p>
            <span class="pw-dream-source">映照自梦乡小筑 · 点击回看</span>
          </div>
          <span class="pw-dream-tag">{{ fmt(d.at) }}</span>
        </div>
      </div>
      <div v-else class="pw-empty-hint">还没有梦境被映照到这里。去「梦乡小筑」点 → 梦境区，把梦境投影到平行世界·梦境区。</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useParallelWorld, useTimeCapsule, useParallelSelves } from '../modules/parallel-world'
import type { Fork } from '../modules/parallel-world'
import { DREAM_REALM_ID } from '../stores/dreamNook'
import BranchManagementPanel from '../components/BranchManagementPanel.vue'
import ParallelWorldArchivePanel from '../components/ParallelWorldArchivePanel.vue'
import AutoConflictPanel from '../components/AutoConflictPanel.vue'
import BranchReplayPanel from '../components/BranchReplayPanel.vue'
import BranchTimelinePanel from '../components/BranchTimelinePanel.vue'
import BranchVisualizationPanel from '../components/BranchVisualizationPanel.vue'
import SceneSyncPanel from '../components/SceneSyncPanel.vue'
import WorldComparisonPanel from '../components/WorldComparisonPanel.vue'
import ScenarioSimulationPanel from '../components/ScenarioSimulationPanel.vue'
import BranchWeightsPanel from '../components/BranchWeightsPanel.vue'
import KnowledgeTransferPanel from '../components/KnowledgeTransferPanel.vue'
import WorldMergePanel from '../components/WorldMergePanel.vue'
import { PARALLEL_WORLD_STORAGE_KEYS } from '../modules/parallel-world/types'
import type { Checkpoint } from '../modules/parallel-world/types'

const { entranceRef, entranceClass } = useViewEntrance()
const parallelWorld = useParallelWorld()

// 场景同步的同步适配回调（INCR-222 薄委托化：宿主持久化，面板只读+回调）
function syncCreateCheckpoint(
  branchId: string,
  label: string,
  description = '',
  snapshot: Record<string, unknown> = {},
  tags: string[] = [],
): Checkpoint {
  const cp: Checkpoint = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    branchId,
    label,
    description,
    snapshot,
    createdAt: new Date().toISOString(),
    tags,
  }
  parallelWorld.checkpoints.value.push(cp)
  storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.CHECKPOINTS, parallelWorld.checkpoints.value)
  return cp
}

function syncUpdateCheckpoint(checkpointId: string, updates: Partial<Checkpoint>): Checkpoint | undefined {
  const cp = parallelWorld.checkpoints.value.find(c => c.id === checkpointId)
  if (!cp) return undefined
  Object.assign(cp, updates)
  storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.CHECKPOINTS, parallelWorld.checkpoints.value)
  return cp
}
const { capsules, capForm, sortedCapsules, checkReady, tryOpenCapsule, addCapsule, removeCapsule, load: loadCapsules } = useTimeCapsule()
const router = useRouter()

// ---- 可能性自我 & 抉择分叉（数据层已下沉至 useParallelSelves） ----
const pw = useParallelSelves()
const forks = pw.forks
const altSelves = pw.alts
const dreamFragments = ref<{ id: string; title: string; content: string; at: string }[]>([])

const forkForm = reactive({ description: '', chosen: '', alternative: '', date: '' })

// ---- Alt Self Templates ----
const altTemplates = [
  { icon: '🏃', title: '坚持运动的你', color: '#8a9a7a', desc: '你可能已经跑完了一场马拉松。膝盖上那道疤是你引以为傲的标记——不是伤痕，是里程。每天清晨的跑步成了你雷打不动的仪式，风穿过耳边的声音是你一天中最安静的时刻。' },
  { icon: '🌍', title: '远方的你', color: '#6b9fc4', desc: '你可能已经学会了那门语言，在地球的另一端用另一种口音讲着自己的故事。你住的房间窗外是另一片海，你习惯了另一种食物的味道，你开始用另一种方式思考。' },
  { icon: '📖', title: '写出书的你', color: '#f0c040', desc: '你可能已经把那本开了头的书写完了。封面上是你的名字。你不敢相信自己真的写完了——那些深夜里的坚持、删了又写的段落、反复推翻的章节，终于变成了一本厚实的、可以放在书架上的书。' },
  { icon: '☕', title: '开小店的你', color: '#d98c7a', desc: '你可能已经开了那家小店。每天早上自己磨咖啡豆，阳光从东边的窗户照进来落在木地板上。你认识了几十个常客，知道每个人的口味。店不大，但每样东西都是你亲手挑的。' },
  { icon: '🎵', title: '玩音乐的你', color: '#a07c8c', desc: '你终于学会了那件乐器。现在你可以把脑子里那些呼之欲出的旋律变成真实的音符了。你组了一个小乐队，每周在街角的 livehouse 演出。台下只有十几个人，但每个音符都是你。' },
  { icon: '🌱', title: '归隐田园的你', color: '#8a9a7a', desc: '你搬到了一个小镇，有一个院子。你种了番茄、薄荷和向日葵。你每天早起看日出，傍晚散步时和遇到的每个人打招呼。你开始写信——用纸和笔。你发现慢下来之后，时间反而变长了。' },
  { icon: '🐱', title: '有猫的你', color: '#e0a96d', desc: '你收养了那只流浪猫。现在它每天在你腿上睡觉，你工作的时候它趴在键盘旁边。你学会了猫的语言——每种叫声代表了不同的意思。你开始理解为什么有人说"猫是家里的主人"。' },
  { icon: '🧗', title: '挑战极限的你', color: '#b5707a', desc: '你完成了那次徒步。你在山顶看了一次日出，云海在你脚下翻涌。你开始尝试更多户外运动——攀岩、潜水、滑雪。每次突破自己的极限后，你发现"极限"这个词本身就在后退。' },
]

// ---- Fork Templates for Alt Self Generation ----
const forkAltTemplates = [
  { icon: '🔀', title: '另一种选择的你', color: '#c4956a', descTemplate: (fork: Fork) => `在"${fork.description||fork.alternative}"这个岔路口，你走了另一条路。你选择了"${fork.alternative}"而不是"${fork.chosen}"。在平行世界里，那个决定改变了一切——你的人生轨迹完全不同了。` },
  { icon: '🌌', title: '分叉点的你', color: '#7a9a8a', descTemplate: (fork: Fork) => `当你面临"${fork.chosen}"与"${fork.alternative}"的选择时，宇宙裂开了。在另一个维度里，你选了后者。你常常想，如果那天你犹豫了一秒，现在的你会站在哪里。` },
  { icon: '🪞', title: '镜像里的你', color: '#e8c8a0', descTemplate: (fork: Fork) => `镜子那头是选了"${fork.alternative}"的你。你们做着不同的工作，过着不同的生活，但眼睛里藏着同样的光。只是你选择了"${fork.chosen}"，而ta走向了另一边。` },
]

// ============================================================
// 可能性自我
// ============================================================

function generateAlt() {
  if (altSelves.value.length >= 6) return
  const existing = altSelves.value.map(a => a.title)
  const available = altTemplates.filter(t => !existing.includes(t.title))
  if (available.length === 0) return
  const picked = available[Math.floor(Math.random() * available.length)]
  altSelves.value.push({
    id: `alt${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    title: picked.title,
    desc: picked.desc,
    icon: picked.icon,
    color: picked.color,
    expanded: false,
    originForkId: null,
  })
  pw.saveAlts()
}

function generateAltFromFork(fork: Fork) {
  if (altSelves.value.length >= 6) return
  const existing = altSelves.value.map(a => a.title)
  const available = forkAltTemplates.filter(t => !existing.includes(t.title))
  if (available.length === 0) return
  const picked = available[Math.floor(Math.random() * available.length)]
  altSelves.value.push({
    id: `alt${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    title: picked.title,
    desc: picked.descTemplate(fork),
    icon: picked.icon,
    color: picked.color,
    expanded: false,
    originForkId: fork.id,
  })
  pw.saveAlts()
}

function getOriginForkLabel(originForkId: string): string {
  const fork = forks.value.find(f => f.id === originForkId)
  if (!fork) return '来自某一抉择'
  const label = fork.chosen.length > 12 ? fork.chosen.slice(0, 12) + '…' : fork.chosen
  return `来自「${label}」的抉择`
}

function expandAlt(i: number) {
  altSelves.value[i].expanded = !altSelves.value[i].expanded
  pw.saveAlts()
}

function removeAlt(id: string) {
  altSelves.value = altSelves.value.filter(a => a.id !== id)
  pw.saveAlts()
}

// 时间胶囊逻辑已抽取至 parallel-world/time-capsule.ts（useTimeCapsule）

// ============================================================
// 抉择分叉
// ============================================================

function addFork() {
  if (!forkForm.chosen.trim() || !forkForm.alternative.trim()) return
  forks.value.unshift({
    id: `fk${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    description: forkForm.description.trim(),
    chosen: forkForm.chosen.trim(),
    alternative: forkForm.alternative.trim(),
    date: forkForm.date,
    at: new Date().toISOString(),
  })
  pw.saveForks()
  forkForm.description = ''
  forkForm.chosen = ''
  forkForm.alternative = ''
  forkForm.date = ''
}

function removeFork(id: string) {
  forks.value = forks.value.filter(f => f.id !== id)
  pw.saveForks()
}

// ============================================================
// 数据持久化（forks / alts 已下沉至 useParallelSelves，仅保留只读关联的梦境载入）
// ============================================================

function loadDreams() {
  try {
    const all = storage.getKV('hf:dreams', []) as { id: string; title: string; content: string; at: string; relatedParallelWorldId?: string | null }[]
    // 仅投影被用户显式映照到平行世界·梦境区 的梦境（#87 双向联动）
    dreamFragments.value = all
      .filter(d => d.relatedParallelWorldId === DREAM_REALM_ID)
      .slice(0, 12)
  } catch { dreamFragments.value = [] }
}

/** 双向联动：点击梦境碎片，回到梦乡小筑查看原始梦境 */
function openDreamSource() {
  router.push('/dream-nook')
}

// ============================================================
// 工具函数
// ============================================================

function daysUntil(date: string) {
  const d = new Date(date)
  const now = new Date()
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86400000))
}

function fmt(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ---- 分支统计（来自 parallel-world 模块） ----
const branchStats = computed(() => {
  const bs = parallelWorld.branches.value
  const cps = parallelWorld.checkpoints.value
  return {
    branchCount: bs.length,
    checkpointCount: cps.length,
    activeBranchName: parallelWorld.activeBranch.value?.name ?? '主干',
    totalSnapshots: parallelWorld.snapshots.value.length,
  }
})

onMounted(() => { pw.load(); loadCapsules(); loadDreams(); parallelWorld.load() })
</script>

<style scoped>
/* ============================================
   ParallelWorld — Warm Amber Theme
   Background: var(--bg-primary) → var(--bg-deep) → var(--bg-surface-alt) → var(--bg-deepest)
   Accent:     var(--accent)
   Max-width:  600px
   ============================================ */

/* ---- CSS Variables ---- */
.pw {
  --accent: var(--accent);
  --accent-dim: rgba(var(--accent-rgb), 0.35);
  --accent-faint: rgba(var(--accent-rgb), 0.08);
  --text-primary: var(--text-primary);
  --text-dim: rgba(232, 213, 192, 0.45);
  --text-faint: rgba(232, 213, 192, 0.25);
  --border-faint: rgba(var(--accent-rgb), 0.08);
  --border-dim: rgba(var(--accent-rgb), 0.12);
  --bg-card: rgba(var(--accent-rgb), 0.03);
  --bg-hover: rgba(var(--accent-rgb), 0.06);

  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 48px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
}

/* Ambient glow — full-page atmosphere */
.pw::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 600px 400px at 20% 15%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 500px 500px at 80% 85%, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%),
    radial-gradient(ellipse 300px 300px at 50% 50%, rgba(var(--accent-rgb), 0.02) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.pw-header {
  text-align: center;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}

.orn-line {
  display: block;
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}

.orn-diamond {
  color: var(--accent);
  font-size: 10px;
  opacity: 0.6;
  letter-spacing: 0;
}

.header-kicker {
  font-size: 13px;
  color: var(--accent);
  opacity: 0.65;
  margin: 0 0 10px;
  letter-spacing: 3px;
  font-weight: 300;
}

.pw-title {
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 6px;
  color: var(--text-primary);
  margin: 0;
}

/* ---- Overview Cards ---- */
.pw-overview {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.pw-overview-card {
  flex: 1;
  background: var(--accent-faint);
  border: 1px solid var(--border-dim);
  border-radius: 14px;
  padding: 18px 12px 14px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;
}

.pw-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
}

/* ---- 分支星图 ---- */
.pw-branch-stats {
  margin-bottom: 32px;
}

.pw-branch-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pw-branch-stat {
  text-align: center;
  padding: 12px 8px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-dim);
}

.pw-branch-stat.active {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.06);
}

.pw-branch-stat-num {
  display: block;
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.pw-branch-stat-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.3;
}

.pw-branch-stat-label {
  display: block;
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
  letter-spacing: 0.5px;
}

.pw-overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 0 0 2px 2px;
}

.pw-overview-num {
  display: block;
  font-size: 30px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.15;
}

.pw-overview-label {
  display: block;
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 4px;
  letter-spacing: 1px;
}

/* ---- Shared Section Styles ---- */
section {
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.pw-section-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--accent);
  margin: 0 0 4px;
  letter-spacing: 2px;
}

.pw-hint {
  font-size: 12px;
  color: var(--text-dim);
  opacity: 0.78;
  margin: 0 0 14px;
  line-height: 1.5;
}

/* ============================================================
   抉择分叉 — 分支光路树
   ============================================================ */

.pw-fork-section {
  /* section */
}

/* ---- 分支树容器 ---- */
.pw-fork-tree {
  position: relative;
  padding-left: 32px;
  margin-bottom: 20px;
}

/* ---- 树干 ---- */
.pw-fork-tree-trunk {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 16px;
  position: relative;
}

.pw-fork-tree-trunk::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 24px;
  bottom: -8px;
  width: 1px;
  background: linear-gradient(
    to bottom,
    var(--accent-dim),
    rgba(var(--accent-rgb), 0.08)
  );
}

.pw-fork-tree-dot {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.4), 0 0 24px rgba(var(--accent-rgb), 0.15);
  flex-shrink: 0;
}

.pw-fork-tree-label {
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

/* ---- 分支 ---- */
.pw-fork-branch {
  position: relative;
  padding-bottom: 16px;
  animation: branch-grow 0.6s ease-out both;
  animation-delay: calc(var(--branch-index, 0) * 0.1s);
}

@keyframes branch-grow {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 分支连接线 */
.pw-fork-branch-line {
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 24px;
  display: flex;
  align-items: flex-start;
}

.pw-fork-branch-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    to bottom,
    rgba(var(--accent-rgb), 0.25),
    rgba(var(--accent-rgb), 0.05)
  );
}

.pw-fork-branch-line::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 24px;
  height: 1px;
  background: linear-gradient(
    to right,
    rgba(var(--accent-rgb), 0.25),
    transparent
  );
}

.pw-fork-branch-node {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.5);
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.2);
  position: relative;
  z-index: 1;
}

/* ---- 分支卡片 ---- */
.pw-fork-branch-card {
  margin-left: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border-dim);
  border-radius: 12px;
  padding: 14px 14px 10px;
  position: relative;
  transition: border-color 0.2s, background 0.2s;
}

.pw-fork-branch-card:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: var(--bg-hover);
}

.pw-fork-branch-card::before {
  content: '';
  position: absolute;
  top: 14px;
  left: -8px;
  width: 1px;
  height: 20px;
  background: linear-gradient(to bottom, var(--accent-dim), transparent);
  border-radius: 0 0 1px 1px;
}

/* 图标题 */
.pw-fork-branch-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.pw-fork-branch-icon {
  font-size: 14px;
}

.pw-fork-branch-date {
  font-size: 11px;
  color: var(--text-faint);
}

.pw-fork-branch-decision-date {
  font-size: 11px;
  color: var(--accent-dim);
  margin-left: auto;
  padding: 1px 8px;
  background: rgba(var(--accent-rgb), 0.06);
  border-radius: 5px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

/* 描述 */
.pw-fork-branch-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0 0 10px;
  line-height: 1.5;
  font-style: italic;
}

/* 两条路径 */
.pw-fork-paths {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.pw-fork-path {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 12px;
  line-height: 1.4;
}

.pw-fork-path.chosen {
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}

.pw-fork-path.unchosen {
  background: rgba(232, 213, 192, 0.03);
  border: 1px solid rgba(232, 213, 192, 0.05);
}

.pw-fork-path-arrow {
  font-size: 14px;
  flex-shrink: 0;
}

.pw-fork-path.chosen .pw-fork-path-arrow {
  color: var(--accent);
}

.pw-fork-path.unchosen .pw-fork-path-arrow {
  color: rgba(232, 213, 192, 0.2);
}

.pw-fork-path-label {
  font-size: 10px;
  color: var(--text-faint);
  letter-spacing: 1px;
  flex-shrink: 0;
}

.pw-fork-path-text {
  color: var(--text-primary);
  font-weight: 500;
}

.pw-fork-path.unchosen .pw-fork-path-text {
  color: rgba(232, 213, 192, 0.45);
}

/* 路径分隔线 */
.pw-fork-path-divider {
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 8px;
  position: relative;
}

.pw-fork-path-split {
  display: block;
  width: 100%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(var(--accent-rgb), 0.15),
    rgba(var(--accent-rgb), 0.08),
    transparent
  );
}

/* 底部操作 */
.pw-fork-branch-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.pw-fork-gen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: var(--accent-dim);
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;

  min-height: 26px;
}

.pw-fork-gen-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

.pw-fork-del {
  opacity: 0;
  transition: opacity 0.2s;
}

.pw-fork-branch-card:hover .pw-fork-del {
  opacity: 1;
}

/* ---- 添加分叉表单 ---- */
.pw-fork-form {
  margin-top: 0;
}

.pw-fork-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.pw-fork-desc {
  grid-column: 1 / -1;
}

.pw-fork-add-btn {
  width: 100%;
}

/* ============================================================
   时间胶囊 — 锁定光球
   ============================================================ */

.pw-capsule-section {
  /* section */
}

.pw-capsule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.pw-capsule-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 14px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-faint);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.pw-capsule-card:hover {
  background: var(--bg-hover);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.pw-capsule-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: rgba(var(--accent-rgb), 0.3);
}

.pw-capsule-card.ready {
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.05);
}

.pw-capsule-card.ready::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 15px;
  background: linear-gradient(
    135deg,
    rgba(var(--accent-rgb), 0.18),
    transparent 50%,
    rgba(var(--accent-rgb), 0.06)
  );
  z-index: -1;
  animation: capsule-glow-pulse 2s ease-in-out infinite;
}

@keyframes capsule-glow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.pw-capsule-card.opened {
  opacity: 0.55;
  cursor: default;
}

.pw-capsule-card.sealed {
  cursor: default;
}

/* ---- 光球 ---- */
.pw-capsule-orb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  transition: all 0.3s ease;
}

.pw-capsule-orb-icon {
  font-size: 18px;
  position: relative;
  z-index: 1;
}

/* 脉冲光效 — 可开启状态 */
.pw-capsule-orb.pulse {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.4);
  animation: orb-pulse 2s ease-in-out infinite;
}

.pw-capsule-orb-glow {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(var(--accent-rgb), 0.2) 0%,
    transparent 70%
  );
  animation: orb-glow 2s ease-in-out infinite;
}

@keyframes orb-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.15);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3);
  }
}

@keyframes orb-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

/* 已开启光球 */
.pw-capsule-orb.opened {
  background: rgba(232, 213, 192, 0.03);
  border-color: rgba(232, 213, 192, 0.06);
  opacity: 0.5;
}

/* ---- 胶囊内容 ---- */
.pw-capsule-body {
  flex: 1;
  min-width: 0;
}

.pw-capsule-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  display: block;
  line-height: 1.4;
  margin-bottom: 2px;
}

.pw-capsule-content {
  font-size: 13px;
  color: var(--text-dim);
  margin: 6px 0 4px;
  line-height: 1.6;
  font-style: italic;
}

.pw-capsule-meta {
  font-size: 11px;
  color: var(--text-faint);
  display: block;
}

.pw-capsule-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.pw-capsule-countdown {
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
}

.pw-capsule-ready-badge {
  font-size: 10px;
  color: var(--accent);
  padding: 2px 8px;
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 6px;
  letter-spacing: 1px;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ---- 可能性自我 ---- */
.pw-self-grid {
  /* section */
}

.pw-self-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.pw-self-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.pw-self-card:hover {
  background: var(--bg-hover);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.pw-self-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: rgba(var(--accent-rgb), 0.3);
}

.pw-self-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 1px;
}

.pw-self-body {
  flex: 1;
  min-width: 0;
}

.pw-self-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: block;
  margin-bottom: 2px;
}

.pw-self-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-dim);
  margin: 0 0 4px;
}

.pw-self-preview {
  font-size: 12px;
  opacity: 0.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pw-self-origin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--accent-dim);
  padding: 2px 8px;
  background: rgba(var(--accent-rgb), 0.05);
  border-radius: 5px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  margin-top: 2px;
}

.pw-self-origin-icon {
  font-size: 10px;
}

.pw-self-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pw-self-date {
  font-size: 11px;
  color: rgba(232, 213, 192, 0.3);
  letter-spacing: 0.5px;
}

/* ---- 梦境碎片 ---- */
.pw-dream-section {
  /* section */
}

.pw-branch-panels {
  margin-bottom: 24px;
  padding: 0;
}

.pw-dream-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pw-dream-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: border-color 0.2s;
  cursor: pointer;
}

.pw-dream-card:hover {
  border-color: rgba(var(--accent-rgb), 0.22);
}

.pw-dream-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: rgba(var(--accent-rgb), 0.3);
}

.pw-dream-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.pw-dream-body {
  flex: 1;
  min-width: 0;
}

.pw-dream-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  display: block;
  margin-bottom: 1px;
}

.pw-dream-text {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.5;
}

.pw-dream-tag {
  font-size: 10px;
  color: var(--text-faint);
  flex-shrink: 0;
}

.pw-dream-source {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.6);
}

/* ---- Empty State ---- */
.pw-empty-hint {
  font-size: 12px;
  color: var(--text-faint);
  opacity: 0.85;
  text-align: center;
  padding: 20px 0;
  letter-spacing: 0.5px;
}

.pw-empty-hint p {
  margin: 0;
}

/* ---- Shared Controls ---- */
.pw-btn {
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.pw-btn:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.4);
}

.pw-btn:active {
  transform: scale(0.97);
}

.pw-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.pw-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--border-dim);
  border-radius: 9px;
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.pw-input::placeholder {
  color: rgba(232, 213, 192, 0.2);
}

.pw-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.06);
}

.pw-input-date {
  width: 120px;
  flex: none;
  color-scheme: dark;
}

.pw-del {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(232, 213, 192, 0.12);
  cursor: pointer;
  opacity: 0;
  font-size: 13px;
  line-height: 1;
  transition: color 0.2s, opacity 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pw-self-card:hover .pw-del,
.pw-fork-branch-card:hover .pw-del,
.pw-capsule-card:hover .pw-del,
.pw-self-card:focus-within .pw-del,
.pw-fork-branch-card:focus-within .pw-del,
.pw-capsule-card:focus-within .pw-del {
  opacity: 1;
}

.pw-del:hover {
  color: #e85a5a;
}

.pw-del:focus-visible {
  opacity: 1;
}

.pw-add-row {
  display: flex;
  gap: 8px;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .pw { padding: 32px 20px 64px; }
  .pw-overview { gap: 8px; }
  .pw-fork-tree { padding-left: 24px; }
  .pw-fork-branch-card { margin-left: 24px; }
}

@media (max-width: 640px) {
  .pw { padding: 24px 14px 56px; }
  .pw-overview { flex-direction: column; }
  .pw-fork-form-grid { grid-template-columns: 1fr; }
  .pw-fork-tree { padding-left: 20px; }
  .pw-fork-branch-card { margin-left: 20px; }
}

@media (max-width: 480px) {
  .pw { padding: 12px; }
  .pw-overview { flex-direction: column; gap: 6px; }
  .pw-self-list { gap: 4px; }
  .pw-fork-tree { padding-left: 16px; }
  .pw-fork-branch-card { margin-left: 16px; }
}
</style>