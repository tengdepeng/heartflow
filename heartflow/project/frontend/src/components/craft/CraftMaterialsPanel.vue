<template>
  <section class="craft-section">
    <h2 class="section-label">
      <span class="section-label-icon">🧰</span>
      材料库
    </h2>
    <p class="section-desc">管理创作材料的库存、获取与消耗，稀有材料蕴含更深的匠心。</p>

    <!-- 统计 -->
    <div class="stats-overview mat-stats">
      <div class="stat-card">
        <span class="stat-value">{{ stats.totalMaterials }}</span>
        <span class="stat-label">材料种类</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.totalQuantity }}</span>
        <span class="stat-label">库存总量</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.lowStock.length }}</span>
        <span class="stat-label">库存告急</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ usages.length }}</span>
        <span class="stat-label">消耗记录</span>
      </div>
    </div>

    <!-- 新增材料 -->
    <div class="mat-add-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">名称</label>
          <input v-model="form.name" class="form-input" type="text" placeholder="材料名称" maxlength="20" />
        </div>
        <div class="form-group">
          <label class="form-label">图标</label>
          <input v-model="form.icon" class="form-input" type="text" placeholder="✨" maxlength="4" />
        </div>
        <div class="form-group">
          <label class="form-label">稀有度</label>
          <select v-model="form.rarity" class="form-select">
            <option v-for="(meta, key) in MATERIAL_RARITY_META" :key="key" :value="key">{{ meta.label }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">数量</label>
          <input v-model.number="form.quantity" class="form-input" type="number" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">单位</label>
          <input v-model="form.unit" class="form-input" type="text" placeholder="个" maxlength="6" />
        </div>
        <div class="form-group">
          <label class="form-label">上限</label>
          <input v-model.number="form.maxQuantity" class="form-input" type="number" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea v-model="form.description" class="form-textarea" placeholder="材料描述…"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">标签（逗号分隔）</label>
        <input v-model="form.tagsInput" class="form-input" type="text" placeholder="灵感, 基础" />
      </div>
      <button
        class="craft-btn craft-btn--primary"
        type="button"
        :disabled="!form.name.trim()"
        @click="handleAddMaterial"
      >
        添加材料
      </button>
    </div>

    <!-- 材料网格 -->
    <div v-if="materials.length === 0" class="craft-empty">
      <span class="craft-empty-icon">🧰</span>
      <span class="craft-empty-text">材料库空空如也，先添加一些材料吧</span>
    </div>
    <div v-else class="mat-grid">
      <div
        v-for="m in materials"
        :key="m.id"
        class="mat-card"
        :class="{ 'mat-card--low': isLowStock(m) }"
        :style="matStyle(m)"
      >
        <div class="mat-card-header">
          <span class="mat-icon">{{ m.icon }}</span>
          <span
            class="mat-rarity"
            :style="{
              color: rarityMeta(m).color,
              borderColor: rarityMeta(m).color + '44',
              background: rarityMeta(m).color + '14',
            }"
          >
            {{ rarityMeta(m).label }}
          </span>
        </div>
        <h4 class="mat-name">{{ m.name }}</h4>
        <p class="mat-desc">{{ m.description }}</p>
        <div v-if="m.tags.length > 0" class="work-tags">
          <span v-for="t in m.tags" :key="t" class="work-tag">{{ t }}</span>
        </div>
        <div class="mat-quantity">
          <span class="mat-qty-label">库存</span>
          <div class="mat-qty-control">
            <button
              class="mat-qty-btn"
              type="button"
              :disabled="m.quantity <= 0"
              @click="adjustQuantity(m, -1)"
            >
              −
            </button>
            <span class="mat-qty-value">{{ m.quantity }} / {{ m.maxQuantity }} {{ m.unit }}</span>
            <button
              class="mat-qty-btn"
              type="button"
              :disabled="m.quantity >= m.maxQuantity"
              @click="adjustQuantity(m, 1)"
            >
              +
            </button>
          </div>
        </div>
        <div class="mat-actions">
          <button class="work-btn work-btn--delete" type="button" @click="handleRemove(m)">移除</button>
        </div>
      </div>
    </div>

    <!-- 消耗记录 -->
    <div v-if="usages.length > 0" class="mat-usages">
      <h3 class="mat-subtitle">最近消耗</h3>
      <div v-for="(u, idx) in recentUsages" :key="idx" class="mat-usage-row">
        <span class="mat-usage-icon">{{ materialIcon(u.materialId) }}</span>
        <span class="mat-usage-name">{{ materialName(u.materialId) }}</span>
        <span class="mat-usage-qty">−{{ u.quantity }}</span>
        <span class="mat-usage-date">{{ formatDate(u.usedAt) }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useCraftMaterials,
  MATERIAL_RARITY_META,
  type Material,
  type MaterialRarity,
} from '../../modules/craft/materials'

const {
  materials,
  usages,
  addMaterial,
  updateMaterial,
  removeMaterial,
  getStats,
} = useCraftMaterials()

const stats = getStats

interface MaterialForm {
  name: string
  icon: string
  rarity: MaterialRarity
  quantity: number
  unit: string
  maxQuantity: number
  description: string
  tagsInput: string
}

const defaultForm: MaterialForm = {
  name: '',
  icon: '✨',
  rarity: 'common',
  quantity: 0,
  unit: '个',
  maxQuantity: 10,
  description: '',
  tagsInput: '',
}

const form = ref<MaterialForm>({ ...defaultForm })

function rarityMeta(m: Material) {
  return MATERIAL_RARITY_META[m.rarity]
}

function isLowStock(m: Material): boolean {
  return m.quantity < m.maxQuantity * 0.2
}

function matStyle(m: Material) {
  return { '--mat-color': rarityMeta(m).color }
}

function handleAddMaterial() {
  const name = form.value.name.trim()
  if (!name) return
  const tags = form.value.tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
  const material: Material = {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    icon: form.value.icon.trim() || '✨',
    rarity: form.value.rarity,
    quantity: Math.max(0, form.value.quantity),
    unit: form.value.unit.trim() || '个',
    maxQuantity: Math.max(1, form.value.maxQuantity),
    description: form.value.description.trim(),
    tags,
    obtainedAt: '',
    updatedAt: '',
  }
  addMaterial(material)
  form.value = { ...defaultForm }
}

function adjustQuantity(m: Material, delta: number) {
  const next = Math.max(0, Math.min(m.maxQuantity, m.quantity + delta))
  updateMaterial(m.id, { quantity: next })
}

function handleRemove(m: Material) {
  if (window.confirm(`确定移除材料「${m.name}」吗？`)) {
    removeMaterial(m.id)
  }
}

const recentUsages = computed(() =>
  [...usages.value].sort((a, b) => b.usedAt.localeCompare(a.usedAt)).slice(0, 8),
)

function materialName(id: string): string {
  return materials.value.find(m => m.id === id)?.name ?? '未知材料'
}

function materialIcon(id: string): string {
  return materials.value.find(m => m.id === id)?.icon ?? '❓'
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
</script>

<style scoped src="./craft-shared.css"></style>
