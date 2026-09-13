<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance clepsydra">
    <!-- 氛围背景 -->
    <div data-enter class="clps-atmos">
      <div class="clps-warm-glow"></div>
      <div class="clps-vignette"></div>
    </div>

    <!-- 装饰性头部 -->
    <header data-enter class="clps-header">
      <div class="clps-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="clps-title">更漏</h1>
      <p class="clps-subtitle">工作类空间 · 入口枢纽<br />安放每一段为生活投入的时间</p>
      <div class="clps-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
    </header>

    <!-- 更漏本体：工作光仪 -->
    <ClepsydraPanel data-enter />

    <!-- 四象限看板：任务管理（INCR-298 补挂载孤儿组件 QuadrantKanban：紧急×重要矩阵，新增/状态切换/删除/完成率统计，消费 useTaskManager + buildQuadrantBoard，宿主内引擎唯一，零 props 自持读桥） -->
    <QuadrantKanban data-enter />

    <!-- 工作类子空间入口 -->
    <section data-enter class="clps-subgrid">
      <h2 class="clps-sub-title">工作类空间</h2>
      <p class="clps-sub-desc">从更漏内部进入 · 你的工作痕迹与回报都在这里安放</p>
      <div class="clps-sub-cards">
        <RouterLink v-for="s in subspaces" :key="s.to" :to="s.to" class="clps-sub-card">
          <span class="clps-sub-icon" :style="s.style">{{ s.icon }}</span>
          <div class="clps-sub-body">
            <b class="clps-sub-name">{{ s.name }}</b>
            <span class="clps-sub-desc2">{{ s.desc }}</span>
          </div>
          <span class="clps-sub-go">›</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useViewEntrance } from '../composables/useViewEntrance'
import ClepsydraPanel from '../components/ClepsydraPanel.vue'
import QuadrantKanban from '../components/QuadrantKanban.vue'

const { entranceRef, entranceClass } = useViewEntrance()

interface Subspace { to: string; icon: string; name: string; desc: string; style: Record<string, string> }

const subspaces: Subspace[] = [
  { to: '/scar', icon: '⛏', name: '工痕', desc: '被反复敲打过的工作印记', style: { color: '#c9a35a', filter: 'drop-shadow(0 0 6px rgba(201,163,90,0.4))' } },
  { to: '/reward', icon: '⚖', name: '劳酬', desc: '付出与回报的光之天平', style: { color: '#f0cf6a', filter: 'drop-shadow(0 0 6px rgba(240,207,106,0.4))' } },
  { to: '/craft', icon: '🛠', name: '匠庐', desc: '打磨手艺与材料的地方', style: { color: '#8fc99a', filter: 'drop-shadow(0 0 6px rgba(143,201,154,0.4))' } },
  { to: '/career', icon: '🧭', name: '业脉', desc: '职业生涯的脉络与路径', style: { color: '#8ab4ff', filter: 'drop-shadow(0 0 6px rgba(138,180,255,0.4))' } },
  { to: '/bag', icon: '🎒', name: '行囊', desc: '一路走来收集的行装', style: { color: '#c7a2f5', filter: 'drop-shadow(0 0 6px rgba(199,162,245,0.4))' } },
  { to: '/rest', icon: '🌱', name: '息壤', desc: '工作间隙休息扎根的土壤', style: { color: '#7fd6a8', filter: 'drop-shadow(0 0 6px rgba(127,214,168,0.4))' } },
]
</script>

<style scoped>
.view-entrance.clepsydra { position: relative; min-height: 100%; }
.clps-atmos .clps-warm-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at 50% -10%, rgba(240, 185, 90, 0.12), transparent 55%);
}
.clps-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 20%, transparent 40%, rgba(0,0,0,0.5) 100%); }

.clps-header { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 8px 0 4px; }
.clps-ornament { display: inline-flex; align-items: center; gap: 10px; }
.orn-line { width: 44px; height: 1px; background: linear-gradient(90deg, transparent, rgba(240,185,90,0.6), transparent); }
.orn-diamond { color: #f0b95a; font-size: 11px; }
.clps-title { margin: 0; font-size: 30px; letter-spacing: 10px; text-indent: 10px; color: #f0c878; text-shadow: 0 0 18px rgba(240,185,90,0.4); }
.clps-subtitle { margin: 0; font-size: 13px; line-height: 1.7; opacity: 0.72; }
.clps-header { margin-bottom: 4px; }

.clps-subgrid { margin-top: 30px; padding-top: 6px; }
.clps-sub-title { margin: 0; font-size: 15px; letter-spacing: 4px; color: var(--text-high, #fff); }
.clps-sub-desc { margin: 6px 0 14px; font-size: 12px; opacity: 0.6; }
.clps-sub-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.clps-sub-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border-radius: 14px; text-decoration: none; color: inherit;
  background: radial-gradient(circle at 12% 20%, rgba(255,255,255,0.05), rgba(0,0,0,0.14));
  border: 1px solid rgba(255, 255, 255, 0.09);
  transition: all 0.18s;
}
.clps-sub-card:hover { border-color: rgba(240, 185, 90, 0.45); transform: translateY(-2px); background: radial-gradient(circle at 12% 20%, rgba(240,185,90,0.08), rgba(0,0,0,0.12)); }
.clps-sub-icon { font-size: 22px; flex: 0 0 auto; }
.clps-sub-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.clps-sub-name { font-size: 15px; letter-spacing: 1px; }
.clps-sub-desc2 { font-size: 12px; opacity: 0.6; }
.clps-sub-go { color: #f0b95a; font-size: 18px; opacity: 0.7; }
</style>