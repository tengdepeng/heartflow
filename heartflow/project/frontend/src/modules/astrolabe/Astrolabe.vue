<template>
  <Teleport to="body">
    <Transition name="astrolabe-fade">
      <div v-if="astrolabe.visibility.value.visible" :class="['astrolabe-overlay', 'theme-' + astrolabeTheme.scheme]" @click.self="astrolabe.close()">
        <!-- 星辰背景 -->
        <div class="star-field" aria-hidden="true">
          <div v-for="n in 80" :key="'star-' + n" class="star" :style="astrolabe.starStyle(n)" />
        </div>

        <!-- 星盘舞台：统一居中正方形，罗盘环/节点/连线同坐标系，整体等比缩放 —— 任意屏宽图表完整可见 -->
        <div class="astrolabe-stage" :class="{ compact: astrolabe.compact.value }" :style="{ '--stage-scale': astrolabe.stageScale.value, '--world-node-scale': astrolabe.worldNodeScale.value }">
          <!-- 星盘罗盘环（随舞台等比缩放） -->
          <div class="astrolabe-bg" aria-hidden="true">
            <!-- 缓慢自转的星盘刻度环（天体运行纵深感）；方位十字与 N/S/E/W 保持静止 -->
            <div class="rings-layer">
              <!-- 外环刻度 -->
              <div class="ring ring-degrees">
                <div v-for="n in 72" :key="'deg-' + n" class="deg-tick" :style="astrolabe.degStyle(n, 72)" />
              </div>
              <!-- 主环 -->
              <div class="ring ring-outer" />
              <div class="ring ring-mid" />
              <div class="ring ring-inner" />
            </div>
            <!-- 方位十字线 -->
            <div class="compass-axis axis-h" />
            <div class="compass-axis axis-v" />
            <!-- 象限标记 -->
            <span class="compass-mark mark-n">N</span>
            <span class="compass-mark mark-s">S</span>
            <span class="compass-mark mark-e">E</span>
            <span class="compass-mark mark-w">W</span>
          </div>

          <!-- 连接线：主链路到中心 + 分支拓扑（父→子） -->
          <svg class="connection-lines" viewBox="0 0 500 500" aria-hidden="true">
            <circle cx="250" cy="250" r="3" fill="#d4a574" opacity="0.6" />
            <line
              v-for="(_, i) in astrolabe.mainPathRooms.value"
              :key="'line-main-' + i"
              :x1="250"
              :y1="250"
              :x2="astrolabe.mainPathCoord(i).x"
              :y2="astrolabe.mainPathCoord(i).y"
              stroke="rgba(var(--accent-rgb), 0.16)"
              stroke-width="0.5"
              stroke-dasharray="4 4"
            />
            <!-- 分支连线：每个世界房间从其 branchFrom 父节点连出，呈现「主链路→分支」星座结构。
                 默认极淡（0.07 / 0.35），悬停到相连节点时升亮（0.55 / 0.7）以凸显拓扑，保持整体克制。 -->
            <line
              v-for="bl in astrolabe.branchLines.value"
              :key="bl.key"
              :x1="bl.x1"
              :y1="bl.y1"
              :x2="bl.x2"
              :y2="bl.y2"
              :stroke-opacity="bl.active ? 0.55 : 0.07"
              :stroke-width="bl.active ? 0.7 : 0.35"
              stroke="rgba(var(--accent-rgb), 1)"
              stroke-dasharray="3 3"
            />
          </svg>

          <!-- 中心：心流（核心） -->
          <div
            class="astrolabe-center"
            role="button"
            tabindex="0"
            :aria-label="'返回心流首页'"
            @click="astrolabe.goTo('home')"
            @keydown.enter.prevent="astrolabe.goTo('home')"
            @keydown.space.prevent="astrolabe.goTo('home')"
          >
            <div class="center-core">
              <span class="center-icon">⊙</span>
            </div>
            <div class="center-ring-pulse" />
            <div class="center-ring-pulse ring-2" />
            <span class="center-label">心流</span>
            <p class="astrolabe-caption">✦ {{ astrolabe.mainPathRooms.value.length }} 主链路 · 1 家 · {{ astrolabe.worldRooms.value.length }} 世界房间 · 悬停看名</p>
          </div>

          <!-- 天体运行：主链路 + 世界房间整体缓慢公转；节点内容反向自转保持文字正立 -->
          <div class="orbit-group">
            <!-- 主链路房间：内环（星座链） -->
            <div
              v-for="(room, i) in astrolabe.mainPathRooms.value"
              :key="room.id"
              class="astrolabe-node node-main"
              :class="{ 'node-active': astrolabe.activeRoomId.value === room.id }"
              :style="astrolabe.mainPathStyle(i)"
              role="button"
              tabindex="0"
              :aria-label="'前往 ' + room.name"
              @click="astrolabe.goTo(room.id)"
              @keydown.enter.prevent="astrolabe.goTo(room.id)"
              @keydown.space.prevent="astrolabe.goTo(room.id)"
              @mouseenter="astrolabe.setHoveredRoom(room.id)"
              @mouseleave="astrolabe.clearHovered()"
            >
              <span class="node-glow" />
              <div class="node-content">
                <span class="node-icon">{{ room.icon }}</span>
                <span class="node-label">{{ room.name }}</span>
              </div>
            </div>

            <!-- 世界房间：外环星座 -->
            <div
              v-for="(room, i) in astrolabe.worldRooms.value"
              :key="room.id"
              class="astrolabe-node node-world"
              :class="{ 'node-active': astrolabe.activeRoomId.value === room.id, 'node-sanctuary': room.id === 'sanctuary' }"
              :style="astrolabe.worldStyle(i)"
              role="button"
              tabindex="0"
              :aria-label="'前往 ' + room.name"
              @click="astrolabe.goTo(room.id)"
              @keydown.enter.prevent="astrolabe.goTo(room.id)"
              @keydown.space.prevent="astrolabe.goTo(room.id)"
              @mouseenter="astrolabe.setHoveredRoom(room.id)"
              @mouseleave="astrolabe.clearHovered()"
            >
              <span class="node-glow" />
              <div class="node-content">
                <span class="node-icon">{{ room.icon }}</span>
                <span class="node-label">{{ room.name }}</span>
              </div>
            </div>

            <!-- 家（蓝图第二层）：贴近中心的独立节点，接入星图 -->
            <div
              v-if="astrolabe.homeSpaceRoom.value"
              class="astrolabe-node node-home-space"
              :class="{ 'node-active': astrolabe.activeRoomId.value === 'home-space' }"
              :style="astrolabe.homeSpaceStyle()"
              role="button"
              tabindex="0"
              :aria-label="'前往 ' + astrolabe.homeSpaceRoom.value.name"
              @click="astrolabe.goTo('home-space')"
              @keydown.enter.prevent="astrolabe.goTo('home-space')"
              @keydown.space.prevent="astrolabe.goTo('home-space')"
              @mouseenter="astrolabe.setHoveredRoom('home-space')"
              @mouseleave="astrolabe.clearHovered()"
            >
              <span class="node-glow" />
              <div class="node-content">
                <span class="node-icon">{{ astrolabe.homeSpaceRoom.value.icon }}</span>
                <span class="node-label">{{ astrolabe.homeSpaceRoom.value.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索过滤（覆盖层控件，不参与舞台缩放） -->
        <div class="search-launch-btn-wrap">
          <!-- 收起态：仅一个 🔍 启动按钮，不遮挡星盘节点 -->
          <button
            v-if="astrolabe.searchCollapsed.value"
            class="search-launch-btn"
            type="button"
            @click="astrolabe.expandSearch()"
            aria-label="搜索房间"
          >
            <span class="launch-icon">🔍</span>
          </button>
          <!-- 展开态：搜索框 + 收起按钮 -->
          <div v-else :class="['astrolabe-search', 'search-' + astrolabeTheme.search]">
            <div class="search-row">
              <input
                ref="searchInputRef"
                v-model="astrolabe.search.value.query"
                class="search-input astrolabe-search-input"
                type="text"
                placeholder="搜索房间... (↑↓ 选择, Enter 跳转)"
                @click.stop
                @keydown="astrolabe.onSearchKeydown($event)"
              />
              <button class="search-collapse-btn" type="button" @click="astrolabe.collapseSearch()" aria-label="收起搜索">
                <span class="collapse-cross">✕</span>
              </button>
            </div>
            <!-- 搜索结果下拉 -->
            <div class="search-results" v-if="astrolabe.search.value.query.trim().length > 0">
              <div
                v-for="(room, i) in astrolabe.searchResults.value"
                :key="room.id"
                :class="['search-result-item', { active: i === astrolabe.search.value.selectedIndex }]"
                @click="astrolabe.goTo(room.id)"
                @mouseenter="astrolabe.search.value.selectedIndex = i"
              >
                <span class="search-result-icon">{{ room.icon }}</span>
                <span class="search-result-name" v-html="astrolabe.highlightMatch(room.name)"></span>
                <span class="search-result-badge">{{ room.group === 'main-path' ? '核心' : '分支' }}</span>
              </div>
              <div v-if="astrolabe.searchResults.value.length === 0" class="search-no-results">
                <span class="search-no-icon">◇</span>
                <span>未找到匹配的房间</span>
              </div>
            </div>
            <!-- 最近访问（默认收起，点击展开；避免遮挡星盘符号） -->
            <div class="recent-section" v-else-if="astrolabe.recentRooms.value.length > 0">
              <button class="recent-header" type="button" @click="toggleRecent" :aria-expanded="!recentCollapsed">
                <span class="recent-title">最近访问</span>
                <span class="recent-caret" :class="{ collapsed: recentCollapsed }" aria-hidden="true">▾</span>
              </button>
              <div class="recent-list" v-show="!recentCollapsed">
                <div
                  v-for="room in astrolabe.recentRooms.value"
                  :key="room.id"
                  class="recent-item"
                  role="button"
                  tabindex="0"
                  :aria-label="'前往 ' + room.name"
                  @click="astrolabe.goTo(room.id)"
                  @keydown.enter.prevent="astrolabe.goTo(room.id)"
                  @keydown.space.prevent="astrolabe.goTo(room.id)"
                >
                  <span class="recent-icon">{{ room.icon }}</span>
                  <span class="recent-name">{{ room.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 关闭按钮（覆盖层控件） -->
        <button class="astrolabe-close" @click="astrolabe.close()" aria-label="关闭星盘">
          <span class="close-cross">✕</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, inject } from 'vue'
import { useAstrolabe } from './useAstrolabe'
import { useAstrolabeTheme } from './useAstrolabeTheme'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  navigate: [roomId: string]
}>()

// 优先注入父级共享的实例，兜底创建独立实例
const astrolabe = inject<ReturnType<typeof useAstrolabe>>('astrolabe') ?? useAstrolabe()
// 星图主题（背景星图 × 搜索栏造型），本地持久化、设置页可切换
const { theme: astrolabeTheme } = useAstrolabeTheme()
const searchInputRef = ref<HTMLInputElement | null>(null)

// ---- 最近访问：默认收起，避免遮挡星盘符号（用户反馈「不管大小屏都会挡住图标」） ----
// 罗盘环 / 节点 / 连线的整体缩放由 useAstrolabe 的 stageScale（统一居中正方形舞台）负责，连续自适应。
// 默认收起（所有屏宽一致），展开为按需下拉 —— 与搜索结果同理，不默认压住节点区。
const recentCollapsed = ref(true)
function toggleRecent() {
  recentCollapsed.value = !recentCollapsed.value
}

// 监听内部关闭，通知父组件
watch(() => astrolabe.visibility.value.visible, (visible) => {
  if (!visible) {
    emit('close')
  }
})
</script>

<style scoped>
/* ============================================================
   天星盘 — 古代星图导航仪
   ============================================================ */

.astrolabe-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(ellipse at center, rgba(8, 6, 4, 0.92) 0%, rgba(4, 3, 2, 0.96) 100%);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;

  /* ===== 暗金古星图 主题令牌（固定套用） =====
     集中定义，使星盘稳定为暗金外观、不受全局主题影响。
     宪法第2条「超级自定义」：此令牌即换肤入口，后续接入设置换肤器时
     只需替换这一组变量即可让用户自选星图配色/搜索栏造型。 */
  --accent: #d4af74;
  --accent-rgb: 212, 175, 116;
  --bg-card-rgb: 22, 17, 11;
  --text-primary: #ece0c6;
  --text-secondary: #9c8d70;
  --text-dim: #8a7d63;
  --text-bright: #f3e8cf;
  --font-heading-en: "Songti SC", "STSong", Georgia, serif;
}

/* ===== 星图主题换肤：各方案的令牌覆盖（设置页可切换，暗金为默认已内置） =====
   仅覆盖颜色/背景令牌，节点、连线、辉光等一律引用这些变量，故换肤即全图联动。 */
.astrolabe-overlay.theme-aurora {
  --accent: #7fe3d4;
  --accent-rgb: 127, 227, 212;
  --bg-card-rgb: 12, 24, 28;
  --text-primary: #d6f3ee;
  --text-secondary: #7fa8a4;
  --text-dim: #6a908d;
  --text-bright: #e6fbff;
  background: radial-gradient(ellipse at center, rgba(6, 16, 20, 0.92) 0%, rgba(3, 8, 12, 0.96) 100%);
}

.astrolabe-overlay.theme-cyber {
  --accent: #ff4fd8;
  --accent-rgb: 255, 79, 216;
  --bg-card-rgb: 26, 12, 28;
  --text-primary: #f6d6f0;
  --text-secondary: #c06fb0;
  --text-dim: #a85a9a;
  --text-bright: #ffe6fb;
  --font-heading-en: "Courier New", "Consolas", monospace;
  background: radial-gradient(ellipse at center, rgba(16, 6, 18, 0.92) 0%, rgba(8, 3, 10, 0.96) 100%);
}

.astrolabe-overlay.theme-ink {
  --accent: #4a6b8a;
  --accent-rgb: 74, 107, 138;
  --bg-card-rgb: 18, 22, 26;
  --text-primary: #cdd6dd;
  --text-secondary: #7d8c98;
  --text-dim: #6a7884;
  --text-bright: #e2e9ee;
  --font-heading-en: "STKaiti", "KaiTi", "Songti SC", serif;
  background: radial-gradient(ellipse at center, rgba(10, 14, 18, 0.92) 0%, rgba(5, 8, 11, 0.96) 100%);
}

.astrolabe-overlay.theme-nordic {
  --accent: #88c0d0;
  --accent-rgb: 136, 192, 208;
  --bg-card-rgb: 20, 26, 30;
  --text-primary: #dbe9ef;
  --text-secondary: #8aa3ad;
  --text-dim: #769099;
  --text-bright: #eef6f9;
  background: radial-gradient(ellipse at center, rgba(10, 16, 20, 0.92) 0%, rgba(5, 9, 12, 0.96) 100%);
}

.astrolabe-overlay.theme-rose {
  --accent: #e8a060;
  --accent-rgb: 232, 160, 96;
  --bg-card-rgb: 28, 18, 14;
  --text-primary: #f4ddc8;
  --text-secondary: #b38a6a;
  --text-dim: #9c7858;
  --text-bright: #ffe9d4;
  background: radial-gradient(ellipse at center, rgba(20, 12, 8, 0.92) 0%, rgba(10, 6, 4, 0.96) 100%);
}

/* ---- 星辰背景 ---- */
.star-field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: var(--accent);
  animation: star-twinkle ease-in-out infinite alternate;
}

@keyframes star-twinkle {
  0% { opacity: 0.15; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* ---- 星盘舞台：统一居中正方形，整体等比缩放（连续自适应，非三档死跳） ---- */
.astrolabe-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 560px;
  height: 560px;
  transform: translate(-50%, -50%) scale(var(--stage-scale, 1));
  transform-origin: center center;
  z-index: 2;
  /* 舞台本身不拦截点击：空白处点击穿透到遮罩关闭，只有节点/中心可点，杜绝「点不到后面」 */
  pointer-events: none;
  will-change: transform;
  /* 尺寸连续缩放时轻微缓动，快速拖拽窗口更顺滑（避免突兀跳变） */
  transition: transform 0.12s ease-out;
  /* 反缩放：舞台缩小时，文字/图标保持恒定可读（封顶 1.9 避免小屏元素过大） */
  --inv-scale: clamp(1, calc(1 / var(--stage-scale, 1)), 1.9);
  /* 光晕反向放大封顶更低(1.2)，避免小屏世界节点光晕相撞 */
  --glow-inv-scale: clamp(1, calc(1 / var(--stage-scale, 1)), 1.2);
}

/* 舞台背后的柔和星云辉光，强化古星图的沉浸氛围 */
.astrolabe-stage::before {
  content: '';
  position: absolute;
  inset: -10%;
  border-radius: 50%;
  background: radial-gradient(circle at center, rgba(var(--accent-rgb), 0.12), transparent 60%);
  filter: blur(14px);
  pointer-events: none;
}

/* ---- 星盘罗盘环（舞台内 100%，随舞台缩放） ---- */
.astrolabe-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 星盘刻度环层：缓慢自转，营造天体运行的纵深感（N/S/E/W 与十字线保持静止，见下方） */
.rings-layer {
  position: absolute;
  inset: 0;
  transform-origin: center center;
  animation: orbit 220s linear infinite;
  will-change: transform;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
}

.ring-outer {
  border-color: rgba(var(--accent-rgb), 0.14);
  box-shadow:
    0 0 42px rgba(var(--accent-rgb), 0.09) inset,
    0 0 26px rgba(var(--accent-rgb), 0.07);
}

.ring-mid {
  inset: 80px;
  border-color: rgba(var(--accent-rgb), 0.10);
  border-style: dashed;
}

.ring-inner {
  inset: 160px;
  border-color: rgba(var(--accent-rgb), 0.08);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.07) inset;
}

.ring-degrees {
  position: absolute;
  inset: 0;
  border: none;
  pointer-events: none;
}

.deg-tick {
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  background: var(--accent);
  transform-origin: 0 280px;
}

/* ---- 方位十字线 ---- */
.compass-axis {
  position: absolute;
  background: rgba(var(--accent-rgb), 0.06);
}

.axis-h {
  top: 50%;
  left: 5%;
  width: 90%;
  height: 1px;
}

.axis-v {
  left: 50%;
  top: 5%;
  width: 1px;
  height: 90%;
}

.compass-mark {
  position: absolute;
  font-family: var(--font-heading-en);
  font-size: calc(11px * var(--inv-scale, 1));
  color: rgba(var(--accent-rgb), 0.25);
  letter-spacing: 2px;
}

.mark-n { top: 12px; left: 50%; transform: translateX(-50%); }
.mark-s { bottom: 12px; left: 50%; transform: translateX(-50%); }
.mark-e { right: 12px; top: 50%; transform: translateY(-50%); }
.mark-w { left: 12px; top: 50%; transform: translateY(-50%); }

/* ---- 搜索框 ---- */
.search-launch-btn-wrap {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  justify-content: flex-start;
}

.astrolabe-search {
  position: relative;
  width: min(360px, 82vw);
  animation: search-rise 0.5s ease-out backwards;
  animation-delay: 0.12s;
}

/* 收起态启动按钮：仅一个 🔍，不遮挡星盘节点 */
.search-launch-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--bg-card-rgb), 0.7);
  color: rgba(var(--accent-rgb), 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.12);
  transition: all 0.3s ease;
  animation: fade-in 0.4s ease-out backwards;
}

.search-launch-btn:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.5);
  box-shadow: 0 0 26px rgba(var(--accent-rgb), 0.22);
  transform: scale(1.06);
}

.launch-icon {
  font-size: 20px;
  line-height: 1;
}

/* 搜索框 + 收起按钮 横向排列 */
.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  width: auto;
  padding: 12px 18px;
  /* 玻璃搜索栏造型：磨砂半透明 + 细白边 + 圆角，悬浮有景深 */
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}

.search-input:focus {
  border-color: rgba(var(--accent-rgb), 0.6);
  background: rgba(255, 255, 255, 0.11);
  box-shadow: 0 0 22px rgba(var(--accent-rgb), 0.18), 0 8px 24px rgba(0, 0, 0, 0.35);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

/* ===== 搜索栏造型修饰（设置页切换，作用于 .astrolabe-search 容器） =====
   玻璃为默认（即上方 .search-input 基础样式），此处仅覆盖差异项。 */
/* 胶囊：全圆角药丸 */
.astrolabe-search.search-capsule .search-input {
  border-radius: 999px;
  padding-left: 22px;
  padding-right: 22px;
}

/* 霓虹：发光描边，强化赛博/极光等主题的氛围 */
.astrolabe-search.search-neon .search-input {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.55);
  border-radius: 10px;
  color: var(--text-bright);
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.32), inset 0 0 2px rgba(var(--accent-rgb), 0.5);
}
.astrolabe-search.search-neon .search-input:focus {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 0 26px rgba(var(--accent-rgb), 0.5), 0 8px 24px rgba(0, 0, 0, 0.35);
}

/* 下划线：去边框/去底，仅留底部细线，极简 */
.astrolabe-search.search-underline .search-input {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: none;
  border-bottom: 1.5px solid rgba(var(--accent-rgb), 0.4);
  border-radius: 0;
  box-shadow: none;
  padding-left: 4px;
  padding-right: 4px;
}
.astrolabe-search.search-underline .search-input:focus {
  background: transparent;
  border-bottom-color: var(--accent);
  box-shadow: 0 4px 10px -8px rgba(var(--accent-rgb), 0.7);
}

/* 像素：硬边、实心、等宽字，复古游戏感 */
.astrolabe-search.search-pixel .search-input {
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(var(--accent-rgb), 0.55);
  border-radius: 0;
  box-shadow: 3px 3px 0 rgba(var(--accent-rgb), 0.35);
  font-family: "Courier New", "Consolas", monospace;
  letter-spacing: 1px;
}
.astrolabe-search.search-pixel .search-input:focus {
  border-color: var(--accent);
  background: rgba(0, 0, 0, 0.72);
  box-shadow: 4px 4px 0 rgba(var(--accent-rgb), 0.5);
}

/* 收起按钮（展开态右侧） */
.search-collapse-btn {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--accent-rgb), 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.search-collapse-btn:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.1);
}

.collapse-cross {
  font-size: 14px;
  line-height: 1;
}

.search-results,
.recent-section {
  margin-top: 8px;
  background: rgba(30, 26, 22, 0.95);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  max-height: 320px;
  overflow-y: auto;
  backdrop-filter: blur(12px);
}

.search-result-item,
.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-result-item:hover,
.search-result-item.active,
.recent-item:hover {
  background: rgba(var(--accent-rgb), 0.1);
}

.recent-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: rgba(var(--accent-rgb), 0.1);
}

.search-result-icon,
.recent-icon {
  width: 24px;
  text-align: center;
  font-size: 16px;
  opacity: 0.7;
}

.search-result-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.search-result-name :deep(mark) {
  background: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
  border-radius: 2px;
  padding: 0 2px;
}

.search-result-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.6);
}

.search-no-results {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 14px;
  color: var(--text-dim);
  font-size: 13px;
  justify-content: center;
}

.search-no-icon {
  font-size: 18px;
  opacity: 0.5;
}

.recent-title {
  padding: 10px 14px 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* 最近访问可折叠头部 */
.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.recent-caret {
  font-size: 10px;
  opacity: 0.5;
  transition: transform 0.2s ease;
}

.recent-caret.collapsed {
  transform: rotate(-90deg);
}

.recent-icon {
  opacity: 0.5;
}

.recent-name {
  font-size: 13px;
  color: var(--text-bright);
}

/* ---- 关闭按钮 ---- */
.astrolabe-close {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 50%;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--accent-rgb), 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  animation: fade-in 0.5s ease-out backwards;
  animation-delay: 0.18s;
}

.astrolabe-close:hover {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.close-cross {
  font-size: 14px;
  line-height: 1;
}

/* ---- 中心：心流 ---- */
.astrolabe-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  animation: fade-in 0.5s ease-out backwards;
  animation-delay: 0.05s;
}

.astrolabe-center:hover {
  transform: translate(-50%, -50%) scale(1.08);
}

.astrolabe-center:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 6px;
  border-radius: 16px;
  transform: translate(-50%, -50%) scale(1.08);
}

.center-core {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(var(--accent-rgb), 0.3), rgba(var(--accent-rgb), 0.05));
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 中心搏动：让核心更有生命力 */
  animation: core-breathe 3.6s ease-in-out infinite;
}

@keyframes core-breathe {
  0%, 100% { box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.18); }
  50% { box-shadow: 0 0 28px rgba(var(--accent-rgb), 0.4); }
}

.center-icon {
  font-size: calc(24px * var(--inv-scale, 1));
  color: var(--accent);
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.3));
}

.center-ring-pulse {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  animation: ring-pulse 3s ease-out infinite;
  top: -10px;
  left: -10px;
}

.center-ring-pulse.ring-2 {
  animation-delay: 1.5s;
  width: 100px;
  height: 100px;
  top: -20px;
  left: -20px;
}

@keyframes ring-pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(1.3); opacity: 0; }
}

.center-label {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: calc(11px * var(--inv-scale, 1));
  color: rgba(var(--accent-rgb), 0.6);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: var(--font-heading-en);
}

.astrolabe-caption {
  position: absolute;
  top: calc(100% + 22px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: calc(10px * var(--inv-scale, 1));
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 0.5px;
  font-family: var(--font-body, inherit);
}

/* 公转组：承载全部房间节点，整体缓慢绕中心运转（天体运动） */
.orbit-group {
  position: absolute;
  inset: 0;
  transform-origin: center center;
  animation: orbit 160s linear infinite;
  pointer-events: none;
  will-change: transform;
  z-index: 3;
}

/* ---- 星盘节点 ---- */
.astrolabe-node {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.3s ease;
  animation: node-appear 0.5s ease-out backwards;
  animation-delay: var(--node-delay, 0s);
}

/* 节点内容层：反向自转抵消父层公转，保持图标与文字始终正立 */
.node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: orbit-rev 160s linear infinite;
  will-change: transform;
}

/* 悬停/选中：放大 3 倍，缩小屏也能一眼看清图标与标签 */
.astrolabe-node:hover {
  transform: translate(-50%, -50%) scale(3);
  z-index: 6;
}

/* 键盘焦点：可见轮廓提示（与悬停放大同视觉语言） */
.astrolabe-node:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 12px;
  transform: translate(-50%, -50%) scale(3);
  z-index: 6;
}

.node-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(36px * var(--glow-inv-scale, 1) * var(--world-node-scale, 1));
  height: calc(36px * var(--glow-inv-scale, 1) * var(--world-node-scale, 1));
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.18), transparent 70%);
  opacity: 0.45;
  transform: translate(-50%, -50%);
  /* 错峰呼吸光晕，让星盘在静止时也有生命力 */
  animation: node-breathe 4.2s ease-in-out infinite;
  animation-delay: var(--node-delay, 0s);
  transition: opacity 0.3s ease;
}

@keyframes node-breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(0.82); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.62; }
}

.astrolabe-node:hover .node-glow,
.node-active .node-glow {
  opacity: 1;
  animation: none;
  transform: translate(-50%, -50%) scale(1.22);
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.32), transparent 70%);
}

.node-icon {
  font-size: calc(18px * var(--inv-scale, 1));
  filter: drop-shadow(0 0 4px rgba(var(--accent-rgb), 0.15));
  opacity: 0.7;
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.astrolabe-node:hover .node-icon {
  opacity: 1;
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.3));
}

.node-active .node-icon {
  opacity: 1;
  filter: drop-shadow(0 0 12px rgba(var(--accent-rgb), 0.4));
}

.node-label {
  font-size: calc(10px * var(--inv-scale, 1));
  color: rgba(var(--accent-rgb), 0.62);
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
  transition: color 0.3s ease;
}

.astrolabe-node:hover .node-label {
  color: rgba(var(--accent-rgb), 0.8);
}

.node-active .node-label {
  color: var(--accent);
}

/* 紧凑模式（小屏）：隐藏节点标签，消除宽标签互相压住的遮挡；图标仍反向放大可辨，hover 放大 3 倍可查看 */
.astrolabe-stage.compact .node-label {
  display: none;
}

/* 主链路节点 */
.node-main {
  --node-angle: 0deg;
  --node-delay: 0s;
}

/* 世界房间节点 */
.node-world {
  --node-angle: 0deg;
  --node-delay: 0s;
}

.node-world .node-icon {
  font-size: calc(14px * var(--inv-scale, 1) * var(--world-node-scale, 1));
  opacity: 0.62;
}

/* 世界节点标签默认隐藏，悬停/选中时浮现——约 65 个房间不再挤成一团，星图呈干净星座 */
.node-world .node-label {
  font-size: calc(8px * var(--inv-scale, 1));
  opacity: 0;
  transition: opacity 0.25s ease;
}

.astrolabe-node:hover .node-label,
.node-active .node-label {
  opacity: 0.88;
}

/* 家节点：贴近中心，区别于主链路三节点 */
.node-home-space .node-icon {
  font-size: calc(16px * var(--inv-scale, 1));
  opacity: 0.85;
}

.node-home-space .node-label {
  font-size: calc(10px * var(--inv-scale, 1));
  opacity: 0.7;
}

/* 安全岛节点（system 组，蓝图「全局庇护层」）：区别于普通世界星点，用蓝调辉光 + 柔光环呈现「庇护所」 */
/* 世界节点缩放 + 玉珠拟态（缩放系数见 useAstrolabe.worldNodeScale）
   - hover 放大降级(2.2×系数)，避免 65 节点时单点盖住邻点
   - 紧凑模式再缩一档；加玉珠底座提升精致度（用户审美偏好玉珠拟态） */
.node-world:hover {
  transform: translate(-50%, -50%) scale(calc(2.2 * var(--world-node-scale, 1)));
  z-index: 6;
}

.astrolabe-stage.compact .node-world .node-icon {
  font-size: calc(12px * var(--inv-scale, 1) * var(--world-node-scale, 1));
}

.node-world:not(.node-sanctuary)::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(26px * var(--inv-scale, 1) * var(--world-node-scale, 1));
  height: calc(26px * var(--inv-scale, 1) * var(--world-node-scale, 1));
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.38), rgba(var(--accent-rgb), 0.12) 42%, rgba(var(--accent-rgb), 0.02) 72%);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: -1;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0, 0, 0, 0.4);
}

.astrolabe-node:hover .node-world:not(.node-sanctuary)::after {
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.5), rgba(var(--accent-rgb), 0.22) 42%, rgba(var(--accent-rgb), 0.04) 72%);
  border-color: rgba(var(--accent-rgb), 0.4);
}

.node-sanctuary .node-glow {
  background: radial-gradient(circle, rgba(107, 159, 196, 0.24), transparent 70%);
}

.node-sanctuary .node-icon {
  opacity: 0.85;
  filter: drop-shadow(0 0 6px rgba(107, 159, 196, 0.4));
}

.node-sanctuary::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(30px * var(--inv-scale, 1));
  height: calc(30px * var(--inv-scale, 1));
  border-radius: 50%;
  border: 1px solid rgba(107, 159, 196, 0.32);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* ---- 连接线 ---- */
.connection-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  transform-origin: center center;
  /* 连线随节点一起公转，始终指向各房间节点 */
  animation: orbit 160s linear infinite;
  will-change: transform;
}

/* 连线流光：虚线沿主链路向外流动，增强星图的「能量流动」感 */
.connection-lines line {
  animation: line-flow 1.6s linear infinite;
}

@keyframes line-flow {
  to { stroke-dashoffset: -16; }
}

/* 天体公转 / 自转：节点组正向公转，节点内容反向自转以保持文字正立 */
@keyframes orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes orbit-rev {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

/* ---- 过渡动画 ---- */
.astrolabe-fade-enter-active,
.astrolabe-fade-leave-active {
  transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
}

.astrolabe-fade-enter-from,
.astrolabe-fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

@keyframes node-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(calc(var(--node-angle, 0deg) - 30deg));
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 搜索框入场：保留 translateX(-50%) 居中，避免覆盖导致的位移 */
@keyframes search-rise {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(12px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* ---- 响应式：极小屏让中心说明文字换行，避免长时间单行溢出 ---- */
/* 注：罗盘环 / 节点 / 连线尺寸已由 .astrolabe-stage 的 --stage-scale 连续自适应，
   无需再按断点收缩节点字号，避免小屏标签过小难以辨认。 */
@media (max-width: 520px) {
  .astrolabe-caption {
    white-space: normal;
    max-width: 78vw;
    text-align: center;
    line-height: 1.4;
  }
}

/* 尊重「减少动态效果」系统偏好：关闭公转/呼吸等持续动画，避免眩晕并省电 */
@media (prefers-reduced-motion: reduce) {
  .rings-layer,
  .orbit-group,
  .connection-lines,
  .node-content,
  .node-glow,
  .center-core,
  .connection-lines line,
  .center-ring-pulse {
    animation: none !important;
  }
}
</style>