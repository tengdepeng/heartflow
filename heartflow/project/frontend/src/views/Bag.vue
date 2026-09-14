<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance bag-view">
    <!-- 行囊氛围背景 -->
    <div data-enter class="bag-ambient" aria-hidden="true">
      <div class="bag-glow bag-glow--top"></div>
      <div class="bag-glow bag-glow--bottom"></div>
      <!-- 行囊条纹 + 指南针装饰 -->
      <div class="bag-deco" aria-hidden="true">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.5" opacity="0.03">
            <line x1="0" y1="60" x2="400" y2="60" />
            <line x1="0" y1="120" x2="400" y2="120" />
            <line x1="0" y1="180" x2="400" y2="180" />
            <line x1="0" y1="240" x2="400" y2="240" />
            <line x1="0" y1="300" x2="400" y2="300" />
            <line x1="0" y1="360" x2="400" y2="360" />
            <line x1="0" y1="420" x2="400" y2="420" />
            <line x1="0" y1="480" x2="400" y2="480" />
            <line x1="0" y1="540" x2="400" y2="540" />
            <line x1="0" y1="600" x2="400" y2="600" />
            <line x1="0" y1="660" x2="400" y2="660" />
            <line x1="0" y1="720" x2="400" y2="720" />
          </g>
          <!-- 指南针 -->
          <g opacity="0.025">
            <circle cx="200" cy="400" r="60" stroke="currentColor" stroke-width="1" />
            <circle cx="200" cy="400" r="40" stroke="currentColor" stroke-width="0.5" />
            <polygon points="200,340 207,390 200,400 193,390" fill="currentColor" />
            <polygon points="200,460 207,410 200,400 193,410" fill="currentColor" />
          </g>
          <!-- 行囊轮廓 -->
          <g opacity="0.02" stroke="currentColor" stroke-width="0.8">
            <path d="M140,220 Q140,180 200,180 Q260,180 260,220 L270,400 Q270,480 200,480 Q130,480 130,400 Z" fill="none" />
            <path d="M160,220 L160,180 Q160,140 200,140 Q240,140 240,180 L240,220" fill="none" />
          </g>
        </svg>
      </div>
      <div class="bag-compass-pulse"></div>
    </div>

    <!-- 通用氛围光晕 -->
    <div data-enter class="bag-atmos">
      <div class="atmos-warm-glow"></div>
    </div>

    <!-- ===== 头部区域 ===== -->
    <header data-enter class="bag-header">
      <div class="bag-header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>

      <!-- 面包屑导航 -->
      <nav class="bag-breadcrumb">
        <router-link to="/home-space" class="bc-link">家</router-link>
        <span class="bc-sep">→</span>
        <router-link to="/worklog" class="bc-link">更漏</router-link>
        <span class="bc-sep">→</span>
        <span class="bc-current">行囊</span>
      </nav>

      <h1 class="bag-title">
        <span class="bag-title-icon">🎒</span>
        <span class="bag-title-text">行囊</span>
      </h1>
      <p class="bag-subtitle">工作技能与工具</p>
      <p class="bag-description">随身携带的能力与资源，在职业旅途中不断积累与精进。</p>
    </header>

    <!-- ===== 概览统计 ===== -->
    <section data-enter class="bag-section">
      <div class="bag-overview">
        <div class="bag-overview-stat">
          <span class="bos-value">{{ overview.totalItems }}</span>
          <span class="bos-label">总物品</span>
        </div>
        <div class="bag-overview-stat">
          <span class="bos-value">{{ overview.avgProficiency }}<span class="bos-unit">%</span></span>
          <span class="bos-label">平均熟练度</span>
        </div>
        <div class="bag-overview-stat">
          <span class="bos-value">{{ overview.masteredItems }}</span>
          <span class="bos-label">已精通</span>
        </div>
      </div>
    </section>

    <!-- ===== 搜索筛选 ===== -->
    <section data-enter class="bag-section">
      <div class="bag-search">
        <span class="bag-search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="bag-search-input"
          placeholder="搜索物品或标签..."
        />
        <button v-if="searchQuery" class="bag-search-clear" @click="searchQuery = ''">✕</button>
      </div>
    </section>

    <!-- ===== 物品分类网格 ===== -->
    <section data-enter class="bag-section">
      <h3 class="section-label">物品分类</h3>
      <div class="bag-categories-grid">
        <div
          v-for="cat in filteredCategories"
          :key="cat.id"
          class="bag-category-card"
          :style="{ '--cat-color': cat.color }"
        >
          <div class="bcc-header">
            <span class="bcc-icon">{{ cat.icon }}</span>
            <span class="bcc-name">{{ cat.name }}</span>
          </div>
          <div class="bcc-proficiency" @click="handleProficiencyClick($event, cat)">
            <div class="bcc-progress-track" title="点击调整熟练度">
              <div
                class="bcc-progress-fill"
                :style="{ width: cat.proficiency + '%' }"
              ></div>
            </div>
            <span class="bcc-progress-label">{{ cat.proficiency }}%</span>
          </div>
          <div class="bcc-items">
            <span
              v-for="item in cat.items"
              :key="item.name"
              class="bcc-tag"
              @click="openEditModal(cat)"
            >
              {{ item.name }}
              <span class="bcc-tag-proficiency">·{{ item.proficiency }}</span>
            </span>
          </div>
          <div v-if="cat.items.length === 0" class="bcc-empty">
            <span class="bcc-empty-text">暂无记录</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 物品类别映射面板 ===== -->
    <section class="bag-section">
      <h3 class="section-label">📂 物品类别映射</h3>
      <div class="bag-cat-map">
        <div
          v-for="cat in categoryDistribution"
          :key="cat.value"
          class="bcm-card"
          :style="{ '--bcm-color': cat.color, '--bcm-bg': cat.bgColor }"
        >
          <div class="bcm-header">
            <span class="bcm-icon">{{ cat.icon }}</span>
            <span class="bcm-label">{{ cat.label }}</span>
          </div>
          <div class="bcm-stats">
            <span class="bcm-count">{{ cat.itemCount }} 件</span>
            <span class="bcm-proficiency">{{ cat.proficiency }}%</span>
          </div>
          <div class="bcm-bar">
            <div class="bcm-bar-fill" :style="{ width: cat.proficiency + '%', background: cat.color }"></div>
          </div>
          <div class="bcm-growth">
            <span class="bcm-growth-icon">{{ getGrowthStage(cat.proficiency).icon }}</span>
            <span class="bcm-growth-name">{{ getGrowthStage(cat.proficiency).name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 技能分析 ===== -->
    <section class="bag-section">
      <BagAnalyticsPanel />
    </section>

    <!-- ===== 背包整理 ===== -->
    <section class="bag-section">
      <BagOrganizePanel />
    </section>

    <!-- ===== 物品进化（bag/evolution 引擎：进化统计/添加路径/可进化物品/进化路径，INCR-207） ===== -->
    <section class="bag-section">
      <BagEvolutionPanel />
    </section>

    <!-- ===== 成长轨迹 ===== -->
    <section class="bag-section">
      <div class="bag-section-header">
        <h3 class="section-label">成长轨迹</h3>
        <button class="bag-evo-add-btn" @click="showAddEvolution = true" title="添加成长轨迹">+ 添加</button>
      </div>
      <div class="bag-evolution">
        <div
          v-for="(evo, idx) in evolution"
          :key="idx"
          class="bag-evo-item"
          :style="{ '--evo-delay': idx * 0.08 + 's' }"
        >
          <span class="be-icon">{{ evo.icon }}</span>
          <div class="be-content">
            <span class="be-title">{{ evo.title }}</span>
            <span class="be-date">{{ evo.date }}</span>
          </div>
          <span class="be-level" :class="'be-level--' + evo.levelClass">{{ evo.levelLabel }}</span>
        </div>
        <div v-if="evolution.length === 0" class="bag-evo-empty">
          <div class="bee-placeholder">
            <span class="bee-icon">🌱</span>
            <p class="bee-text">尚未记录成长轨迹，开始使用工具和技能吧。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 外部应用启动台（INCR-300 补挂载孤儿组件 LauncherPanel：外部应用入口的增删改/分类重命名/排序/启动，消费 useLauncher(键 launcher:entries)，宿主内引擎唯一，零 props 自持读桥） ===== -->
    <section class="bag-section">
      <LauncherPanel />
    </section>

    <!-- ===== 底部导航 ===== -->
    <section class="bag-section">
      <div class="bag-footer-nav">
        <router-link to="/worklog" class="bag-nav-link">
          <span class="bnl-icon">⏳</span>
          <span class="bnl-text">返回更漏</span>
        </router-link>
        <router-link to="/home-space" class="bag-nav-link">
          <span class="bnl-icon">🏠</span>
          <span class="bnl-text">回到家的</span>
        </router-link>
        <router-link to="/craft" class="bag-nav-link">
          <span class="bnl-icon">🔧</span>
          <span class="bnl-text">匠庐</span>
        </router-link>
        <router-link to="/career" class="bag-nav-link">
          <span class="bnl-icon">🌐</span>
          <span class="bnl-text">业脉</span>
        </router-link>
      </div>
    </section>

    <!-- ===== 物品编辑模态框 ===== -->
    <div v-if="editingCategory" class="bag-modal-overlay" @click.self="closeModal">
      <div class="bag-modal">
        <div class="bag-modal-header">
          <span class="bag-modal-title">
            {{ editingCategory.icon }} {{ editingCategory.name }} — 编辑物品
          </span>
          <button class="bag-modal-close" @click="closeModal">✕</button>
        </div>
        <div class="bag-modal-body">
          <div
            v-for="(item, idx) in editFormItems"
            :key="idx"
            class="bag-modal-item-row"
          >
            <div class="bmir-fields">
              <input
                v-model="item.name"
                type="text"
                class="bmir-input"
                placeholder="物品名称"
              />
              <div class="bmir-proficiency">
                <span
                  v-for="n in 5"
                  :key="n"
                  class="bmir-star"
                  :class="{ 'bmir-star--active': n <= item.proficiency }"
                  @click="item.proficiency = n"
                >★</span>
                <span class="bmir-star-label">{{ item.proficiency }}/5</span>
              </div>
              <input
                v-model="item.note"
                type="text"
                class="bmir-note"
                placeholder="备注（可选）"
              />
            </div>
            <button class="bmir-remove" @click="removeItemFromEdit(idx)" title="移除物品">✕</button>
          </div>
          <button class="bag-modal-add-item" @click="addItemToEdit">+ 添加物品</button>
        </div>
        <div class="bag-modal-footer">
          <button class="bag-modal-cancel" @click="closeModal">取消</button>
          <button class="bag-modal-save" @click="saveCategoryItems">保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 添加成长轨迹模态框 ===== -->
    <div v-if="showAddEvolution" class="bag-modal-overlay" @click.self="showAddEvolution = false">
      <div class="bag-modal bag-modal--evo">
        <div class="bag-modal-header">
          <span class="bag-modal-title">🌱 添加成长轨迹</span>
          <button class="bag-modal-close" @click="showAddEvolution = false">✕</button>
        </div>
        <div class="bag-modal-body">
          <div class="bag-evo-form">
            <div class="bef-field">
              <label class="bef-label">图标</label>
              <input v-model="newEvoForm.icon" type="text" class="bef-input" placeholder="🌟" />
            </div>
            <div class="bef-field">
              <label class="bef-label">标题</label>
              <input v-model="newEvoForm.title" type="text" class="bef-input" placeholder="如：掌握 TypeScript 高级类型" />
            </div>
            <div class="bef-field">
              <label class="bef-label">日期</label>
              <input v-model="newEvoForm.date" type="date" class="bef-input" />
            </div>
            <div class="bef-field">
              <label class="bef-label">等级</label>
              <select v-model="newEvoForm.levelLabel" class="bef-input" @change="syncLevelClass">
                <option value="精通">精通</option>
                <option value="进阶">进阶</option>
                <option value="入门">入门</option>
                <option value="新增">新增</option>
              </select>
            </div>
          </div>
        </div>
        <div class="bag-modal-footer">
          <button class="bag-modal-cancel" @click="showAddEvolution = false">取消</button>
          <button class="bag-modal-save" :disabled="!newEvoForm.title" @click="addEvolution">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBagStore } from '../modules/bag'
import { useViewEntrance } from '../composables/useViewEntrance'
import BagAnalyticsPanel from '../components/BagAnalyticsPanel.vue'
import BagOrganizePanel from '../components/bag/BagOrganizePanel.vue'
import BagEvolutionPanel from '../components/BagEvolutionPanel.vue'
import LauncherPanel from '../components/LauncherPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

// 使用频率演化状态（5 个生长阶段）
const GROWTH_STAGES = [
  { range: [0, 20], name: '蔓芽', icon: '🌱', color: '#8aba7a' },
  { range: [21, 40], name: '萌芽', icon: '🌿', color: '#6aba7a' },
  { range: [41, 60], name: '蕨叶', icon: '🌾', color: '#5aaa7a' },
  { range: [61, 80], name: '乔木', icon: '🌳', color: '#4a9a6a' },
  { range: [81, 100], name: '古木', icon: '🌲', color: '#3a8a5a' },
]

function getGrowthStage(proficiency: number) {
  return GROWTH_STAGES.find(s => proficiency >= s.range[0] && proficiency <= s.range[1]) || GROWTH_STAGES[0]
}

const store = useBagStore()

// 解构为模板可直接使用的引用
const {
  overview,
  filteredCategories,
  categoryDistribution,
  evolution,
  searchQuery,
  editingCategory,
  editFormItems,
  showAddEvolution,
  newEvoForm,
  openEditModal,
  closeModal,
  addItemToEdit,
  removeItemFromEdit,
  saveCategoryItems,
  handleProficiencyClick,
  syncLevelClass,
  addEvolution,
} = store
</script>

<style scoped>
/* =============================================================
   行囊视图 — 暖紫褐主题 (#a07c8c)
   ============================================================= */

/* ---- 根容器 ---- */
.bag-view {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 32px 100px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 36px;
  --accent: #a07c8c;
  --accent-rgb: 160, 124, 140;
  --text-primary: var(--text-primary);
  --text-secondary: var(--text-secondary);
  --text-muted: var(--text-secondary);
  --card-bg: var(--card-bg);
  --card-border: rgba(var(--accent-rgb), 0.08);
  --card-hover-bg: rgba(55, 48, 40, 0.5);
  --card-hover-border: rgba(160, 124, 140, 0.2);
  --transition: 0.25s ease;
  background: transparent;
}

/* ---- 氛围背景层 ---- */
.bag-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bag-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.bag-glow--top {
  top: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(160, 124, 140, 0.07) 0%, transparent 70%);
}

.bag-glow--bottom {
  bottom: -10%;
  right: -10%;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(160, 124, 140, 0.04) 0%, transparent 65%);
}

.bag-deco {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 500px;
  height: 100%;
  color: var(--accent);
  opacity: 0.5;
}

.bag-deco svg {
  width: 100%;
  height: 100%;
}

.bag-compass-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  animation: compass-pulse 6s ease-in-out infinite;
}

@keyframes compass-pulse {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  25% { opacity: 0.08; }
  50% { opacity: 0.15; transform: scale(1.2); }
  75% { opacity: 0.06; }
}

/* ---- 通用氛围光晕 ---- */
.bag-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-warm-glow {
  position: absolute;
  top: -10%;
  left: 10%;
  width: 80%;
  height: 50%;
  background: radial-gradient(
    ellipse at 30% 40%,
    rgba(160, 124, 140, 0.06) 0%,
    transparent 60%
  );
  animation: bag-breathe 7s ease-in-out infinite;
}

@keyframes bag-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- 头部 ---- */
.bag-header {
  text-align: center;
  position: relative;
  z-index: 1;
}

.bag-header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(160, 124, 140, 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--accent);
  opacity: 0.4;
}

/* ---- 面包屑 ---- */
.bag-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 12px;
}

.bc-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition);
  letter-spacing: 0.5px;
}

.bc-link:hover {
  color: var(--accent);
}

.bc-sep {
  color: var(--text-secondary);
  opacity: 0.3;
  font-size: 10px;
}

.bc-current {
  color: var(--accent);
  opacity: 0.8;
  letter-spacing: 0.5px;
}

/* ---- 标题 ---- */
.bag-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
}

.bag-title-icon {
  font-size: 32px;
  line-height: 1;
}

.bag-title-text {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary);
}

.bag-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 8px 0 0;
  letter-spacing: 1px;
}

.bag-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 6px 0 0;
  letter-spacing: 0.5px;
  line-height: 1.6;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* ---- 通用 section ---- */
.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 16px;
  letter-spacing: 0.5px;
}

.bag-section {
  position: relative;
  z-index: 1;
}

/* ---- section 标题行（带添加按钮） ---- */
.bag-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.bag-section-header .section-label {
  margin: 0;
}

/* ---- 概览统计 ---- */
.bag-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bag-overview-stat {
  min-height: 90px;
  padding: 18px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition);
}

.bag-overview-stat:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.bos-value {
  font-size: 28px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
}

.bos-unit {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-secondary);
}

.bos-label {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ---- 搜索栏 ---- */
.bag-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  transition: all var(--transition);
}

.bag-search:focus-within {
  border-color: rgba(160, 124, 140, 0.25);
  background: var(--card-hover-bg);
}

.bag-search-icon {
  font-size: 14px;
  opacity: 0.4;
  flex-shrink: 0;
}

.bag-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-primary);
  font-family: inherit;
  letter-spacing: 0.3px;
}

.bag-search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.bag-search-clear {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all var(--transition);
}

.bag-search-clear:hover {
  color: var(--text-primary);
  background: rgba(160, 124, 140, 0.12);
}

/* ---- 物品分类网格 ---- */
.bag-categories-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bag-category-card {
  padding: 20px 16px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}

.bag-category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cat-color, var(--accent)), transparent);
  opacity: 0.3;
  transition: opacity var(--transition);
}

.bag-category-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-2px);
}

.bag-category-card:hover::before {
  opacity: 0.6;
}

.bcc-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bcc-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.bcc-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

/* ---- 熟练度进度条 ---- */
.bcc-proficiency {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.bcc-progress-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--text-primary-rgb), 0.08);
  overflow: hidden;
  position: relative;
}

.bcc-progress-track:hover {
  background: rgba(var(--text-primary-rgb), 0.12);
}

.bcc-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(160, 124, 140, 0.4), var(--accent));
  transition: width 0.6s ease;
  pointer-events: none;
}

.bcc-progress-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
  pointer-events: none;
}

/* ---- 物品标签 ---- */
.bcc-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bcc-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(160, 124, 140, 0.08);
  border: 1px solid rgba(160, 124, 140, 0.1);
  line-height: 1.4;
  transition: all var(--transition);
  cursor: pointer;
}

.bcc-tag:hover {
  color: var(--text-primary);
  background: rgba(160, 124, 140, 0.15);
  border-color: rgba(160, 124, 140, 0.2);
}

.bcc-tag-proficiency {
  font-size: 9px;
  opacity: 0.5;
  color: var(--accent);
}

.bcc-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
}

.bcc-empty-text {
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
  opacity: 0.6;
}

/* ---- 成长轨迹 ---- */
.bag-evolution {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bag-evo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  transition: all var(--transition);
  animation: evo-fade-in 0.5s ease both;
  animation-delay: var(--evo-delay, 0s);
}

@keyframes evo-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bag-evo-item:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateX(4px);
}

.be-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.7;
}

.be-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.be-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.be-date {
  font-size: 11px;
  color: var(--text-secondary);
}

.be-level {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.be-level--master {
  color: #e8c060;
  background: rgba(232, 192, 96, 0.12);
  border: 1px solid rgba(232, 192, 96, 0.2);
}

.be-level--advanced {
  color: #8ab87a;
  background: rgba(138, 184, 122, 0.12);
  border: 1px solid rgba(138, 184, 122, 0.2);
}

.be-level--beginner {
  color: #8a9ab8;
  background: rgba(138, 154, 184, 0.12);
  border: 1px solid rgba(138, 154, 184, 0.2);
}

.be-level--new {
  color: var(--accent);
  background: rgba(160, 124, 140, 0.12);
  border: 1px solid rgba(160, 124, 140, 0.2);
}

/* ---- 添加成长轨迹按钮 ---- */
.bag-evo-add-btn {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  background: rgba(160, 124, 140, 0.1);
  border: 1px solid rgba(160, 124, 140, 0.15);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  letter-spacing: 0.3px;
}

.bag-evo-add-btn:hover {
  color: var(--text-primary);
  background: rgba(160, 124, 140, 0.2);
  border-color: rgba(160, 124, 140, 0.3);
}

/* ---- 空状态 ---- */
.bag-evo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px dashed var(--card-border);
}

.bee-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.bee-icon {
  font-size: 28px;
  opacity: 0.4;
}

.bee-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  max-width: 280px;
}

/* ---- 底部导航 ---- */
.bag-footer-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.bag-nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  transition: all var(--transition);
  cursor: pointer;
}

.bag-nav-link:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-2px);
}

.bnl-icon {
  font-size: 22px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity var(--transition);
}

.bag-nav-link:hover .bnl-icon {
  opacity: 1;
}

.bnl-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
  transition: color var(--transition);
}

.bag-nav-link:hover .bnl-text {
  color: var(--text-primary);
}

/* =============================================================
   模态框
   ============================================================= */

/* ---- 模态框遮罩 ---- */
.bag-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 4, 5, 0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: modal-fade-in 0.2s ease;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---- 模态框卡片 ---- */
.bag-modal {
  width: 90%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: rgba(26, 22, 18, 0.95);
  border: 1px solid rgba(160, 124, 140, 0.15);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modal-slide-up 0.25s ease;
}

@keyframes modal-slide-up {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.bag-modal--evo {
  max-width: 440px;
}

.bag-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(160, 124, 140, 0.08);
}

.bag-modal-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.bag-modal-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(160, 124, 140, 0.1);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition);
}

.bag-modal-close:hover {
  color: var(--text-primary);
  background: rgba(160, 124, 140, 0.12);
  border-color: rgba(160, 124, 140, 0.2);
}

.bag-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bag-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(160, 124, 140, 0.08);
}

/* ---- 模态框内物品行 ---- */
.bag-modal-item-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(160, 124, 140, 0.08);
}

.bmir-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.bmir-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(160, 124, 140, 0.1);
  background: rgba(6, 4, 5, 0.4);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition);
  box-sizing: border-box;
}

.bmir-input:focus {
  border-color: rgba(160, 124, 140, 0.3);
}

.bmir-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

/* ---- 熟练度星级 ---- */
.bmir-proficiency {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bmir-star {
  font-size: 16px;
  color: rgba(var(--text-primary-rgb), 0.12);
  cursor: pointer;
  transition: all var(--transition);
  line-height: 1;
}

.bmir-star:hover {
  transform: scale(1.2);
}

.bmir-star--active {
  color: #e8c060;
  text-shadow: 0 0 6px rgba(232, 192, 96, 0.3);
}

.bmir-star-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-left: 4px;
}

/* ---- 备注输入 ---- */
.bmir-note {
  width: 100%;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid rgba(160, 124, 140, 0.08);
  background: rgba(6, 4, 5, 0.3);
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition);
  box-sizing: border-box;
}

.bmir-note:focus {
  border-color: rgba(160, 124, 140, 0.2);
}

.bmir-note::placeholder {
  color: var(--text-secondary);
  opacity: 0.4;
}

/* ---- 移除物品按钮 ---- */
.bmir-remove {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(160, 124, 140, 0.1);
  border-radius: 6px;
  color: rgba(var(--text-primary-rgb), 0.25);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition);
  margin-top: 2px;
}

.bmir-remove:hover {
  color: #e05050;
  border-color: rgba(224, 80, 80, 0.3);
  background: rgba(224, 80, 80, 0.08);
}

/* ---- 添加物品按钮 ---- */
.bag-modal-add-item {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px dashed rgba(160, 124, 140, 0.15);
  background: rgba(160, 124, 140, 0.04);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.3px;
}

.bag-modal-add-item:hover {
  color: var(--accent);
  border-color: rgba(160, 124, 140, 0.25);
  background: rgba(160, 124, 140, 0.08);
}

/* ---- 模态框按钮 ---- */
.bag-modal-cancel {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(160, 124, 140, 0.1);
  background: rgba(160, 124, 140, 0.06);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.3px;
}

.bag-modal-cancel:hover {
  color: var(--text-secondary);
  background: rgba(160, 124, 140, 0.12);
}

.bag-modal-save {
  padding: 8px 24px;
  border-radius: 8px;
  border: 1px solid rgba(160, 124, 140, 0.2);
  background: rgba(160, 124, 140, 0.15);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.3px;
}

.bag-modal-save:hover {
  background: rgba(160, 124, 140, 0.25);
  border-color: rgba(160, 124, 140, 0.35);
}

.bag-modal-save:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ---- 成长轨迹表单 ---- */
.bag-evo-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bef-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bef-label {
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.bef-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(160, 124, 140, 0.1);
  background: rgba(6, 4, 5, 0.4);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition);
  box-sizing: border-box;
}

.bef-input:focus {
  border-color: rgba(160, 124, 140, 0.3);
}

.bef-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

select.bef-input {
  cursor: pointer;
  appearance: auto;
}

/* =============================================================
   响应式
   ============================================================= */

/* ---- 平板端 (max-width: 860px) ---- */
@media (max-width: 860px) {
  .bag-view {
    padding: 28px 20px 100px;
    gap: 28px;
  }

  .bag-title-text {
    font-size: 24px;
  }

  .bag-title-icon {
    font-size: 28px;
  }

  .bag-header-ornament {
    gap: 8px;
  }

  .orn-line {
    width: 40px;
  }

  /* 分类网格：2列 */
  .bag-categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* 概览：3列保持 */
  .bag-overview {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .bag-overview-stat {
    min-height: 80px;
    padding: 14px;
  }

  .bos-value {
    font-size: 22px;
  }

  /* 底部导航：2列 */
  .bag-footer-nav {
    grid-template-columns: repeat(2, 1fr);
  }

  /* 模态框 */
  .bag-modal {
    max-width: 480px;
  }
}

/* ---- 移动端 (max-width: 640px) ---- */
@media (max-width: 640px) {
  .bag-view {
    padding: 20px 14px 90px;
    gap: 24px;
  }

  .bag-header {
    padding-top: 32px;
  }

  .bag-title-text {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .bag-title-icon {
    font-size: 24px;
  }

  .bag-subtitle {
    font-size: 12px;
  }

  .bag-description {
    font-size: 11px;
  }

  .bag-header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 28px;
  }

  .orn-diamond {
    font-size: 7px;
  }

  .bag-breadcrumb {
    font-size: 11px;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* 分类网格：1列 */
  .bag-categories-grid {
    grid-template-columns: 1fr;
  }

  .bag-category-card {
    padding: 16px 14px;
  }

  .bcc-icon {
    font-size: 20px;
  }

  .bcc-name {
    font-size: 14px;
  }

  /* 概览：3列紧凑 */
  .bag-overview {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .bag-overview-stat {
    min-height: 64px;
    padding: 10px 12px;
    border-radius: 12px;
    gap: 4px;
  }

  .bos-value {
    font-size: 18px;
  }

  .bos-unit {
    font-size: 13px;
  }

  .bos-label {
    font-size: 10px;
  }

  /* 成长轨迹紧凑 */
  .bag-evo-item {
    padding: 10px 14px;
    border-radius: 10px;
    gap: 10px;
  }

  .bag-evo-item:hover {
    transform: none;
  }

  .be-icon {
    font-size: 16px;
  }

  .be-title {
    font-size: 12px;
  }

  .be-date {
    font-size: 10px;
  }

  .be-level {
    font-size: 10px;
    padding: 2px 8px;
  }

  /* 底部导航：2列紧凑 */
  .bag-footer-nav {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .bag-nav-link {
    padding: 12px 10px;
    border-radius: 12px;
  }

  .bag-nav-link:hover {
    transform: none;
  }

  .bnl-icon {
    font-size: 18px;
  }

  .bnl-text {
    font-size: 11px;
  }

  /* 模态框适应移动端 */
  .bag-modal {
    max-width: 100%;
    width: 94%;
    max-height: 85vh;
    border-radius: 16px;
  }

  .bag-modal-header {
    padding: 14px 16px 10px;
  }

  .bag-modal-body {
    padding: 12px 16px;
  }

  .bag-modal-footer {
    padding: 10px 16px 14px;
  }

  .bag-modal-item-row {
    padding: 8px 10px;
  }
}

/* =============================================================
   物品类别映射面板
   ============================================================= */
.bag-cat-map {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bcm-card {
  padding: 18px 14px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}

.bcm-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--bcm-color, var(--accent)), transparent);
  opacity: 0.3;
  transition: opacity var(--transition);
}

.bcm-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-2px);
}

.bcm-card:hover::before {
  opacity: 0.6;
}

.bcm-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bcm-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.bcm-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.bcm-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.bcm-count {
  opacity: 0.7;
}

.bcm-proficiency {
  color: var(--bcm-color, var(--accent));
  font-weight: 500;
  opacity: 0.8;
}

.bcm-bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--text-primary-rgb), 0.06);
  overflow: hidden;
}

.bcm-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.bcm-growth {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.bcm-growth-icon {
  font-size: 14px;
  line-height: 1;
}

.bcm-growth-name {
  opacity: 0.7;
  letter-spacing: 0.3px;
}

/* 响应式 */
@media (max-width: 860px) {
  .bag-cat-map {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .bag-cat-map {
    grid-template-columns: 1fr;
  }
}
</style>