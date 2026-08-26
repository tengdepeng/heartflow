<template>
    <section data-enter class="craft-section">
      <h2 class="section-label">
        <span class="section-label-icon">🪚</span>
        工作台
      </h2>

      <!-- 搜索栏与操作 -->
      <div class="craft-toolbar">
        <div class="craft-search-wrap">
          <span class="craft-search-icon">🔍</span>
          <input
            v-model="searchInput"
            class="craft-search-input"
            type="text"
            placeholder="搜索作品名称、描述或标签…"
            @input="store.setSearchQuery(searchInput)"
          />
        </div>
        <button class="craft-btn craft-btn--primary" type="button" @click="openCreateModal">
          ✚ 新作品
        </button>
      </div>

      <!-- 状态筛选标签 -->
      <div class="craft-filter-chips">
        <button
          v-for="chip in statusFilterChips"
          :key="chip.value"
          class="filter-chip"
          :class="{ active: store.filterStatus === chip.value }"
          @click="store.setFilterStatus(chip.value)"
        >
          {{ chip.label }}
          <span v-if="chip.count !== undefined" class="filter-chip-count">{{ chip.count }}</span>
        </button>
      </div>

      <!-- 作品网格 -->
      <div class="workbench-grid">
        <div
          v-for="work in store.filteredWorks"
          :key="work.id"
          class="work-card"
          :style="{ '--work-accent': work.color }"
        >
          <div class="work-card-header">
            <span class="work-icon">{{ work.icon }}</span>
            <span class="work-status" :class="work.status">{{ STATUS_LABEL[work.status] }}</span>
          </div>
          <h3 class="work-name">{{ work.name }}</h3>
          <p class="work-desc">{{ work.description }}</p>
          <div v-if="work.tags.length > 0" class="work-tags">
            <span v-for="tag in work.tags.slice(0, configRef.craft.tagDisplayCount)" :key="tag" class="work-tag">{{ tag }}</span>
          </div>
          <div class="work-meta">
            <span class="work-date">{{ work.date }}</span>
            <span class="work-type">{{ TYPE_LABEL[work.type] }}</span>
          </div>
          <!-- 光质关联徽章 -->
          <div v-if="work.lightFormId" class="work-light-form" :style="{ '--lf-color': getLightForm(work.lightFormId)?.color }">
            <span class="wlf-icon">{{ getLightForm(work.lightFormId)?.icon }}</span>
            <span class="wlf-name">{{ getLightForm(work.lightFormId)?.name }}</span>
          </div>
          <!-- 进化进度条 -->
          <div class="work-evolution">
            <div class="evolution-label">
              <span class="evolution-label-text">进化程度</span>
              <span class="evolution-label-value">{{ work.evolution }}%</span>
            </div>
            <div class="evolution-track">
              <div
                class="evolution-fill"
                :style="{ width: work.evolution + '%' }"
              ></div>
              <div class="evolution-glow" :style="{ left: work.evolution + '%' }"></div>
            </div>
            <div class="evolution-stages">
              <span
                v-for="stage in evolutionStages"
                :key="stage.value"
                class="evolution-stage-dot"
                :class="{ reached: work.evolution >= stage.value }"
                :style="{ '--stage-color': stage.color }"
                :title="stage.name"
              ></span>
            </div>
          </div>
          <!-- 操作按钮 -->
          <div class="work-actions">
            <button
              v-if="work.evolution < 100"
              class="work-btn work-btn--polish"
              type="button"
              :disabled="polishingId === work.id"
              :title="'快速打磨 ' + work.name"
              @click="handlePolishWork(work)"
            >
              <span class="polish-spark" v-if="polishingId === work.id">✦</span>
              <span>{{ polishingId === work.id ? '打磨中...' : '打磨' }}</span>
            </button>
            <button
              class="work-btn work-btn--edit"
              type="button"
              title="编辑"
              @click="openEditModal(work)"
            >
              编辑
            </button>
            <button
              class="work-btn work-btn--delete"
              type="button"
              title="删除"
              @click="handleDeleteWork(work)"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="store.filteredWorks.length === 0" class="craft-empty">
        <span class="craft-empty-icon">🔨</span>
        <span class="craft-empty-text">
          {{ store.works.length === 0 ? '还没有作品，点击「新作品」开始创作吧' : '没有匹配的作品' }}
        </span>
      </div>
    </section>
</template>

<script setup lang="ts">
import { useCraftUi } from '../../modules/craft/useCraftUi'
import { STATUS_LABEL, TYPE_LABEL } from '../../modules/craft/types'
const ui = useCraftUi()
const { searchInput, store, openCreateModal, statusFilterChips, configRef, getLightForm, evolutionStages, polishingId, handlePolishWork, openEditModal, handleDeleteWork } = ui
</script>

<style scoped src="./craft-shared.css"></style>
