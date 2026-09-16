<template>
  <div class="view-entrance plugin-demo-room">
    <!-- 装饰性顶部 -->
    <div class="header-ornament" data-enter>
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <div class="header-kicker" data-enter>插件贡献点 · 最小可行演示</div>
    <h1 class="pdr-title" data-enter>示例插件房</h1>

    <p class="pdr-desc" data-enter>
      这个房间不是蓝图里的 84 个静态房间之一——它由「插件贡献点」在运行时注册：
      manifest 声明 contributes.rooms，注册器把它写进房间图与路由表，于是它出现在侧栏、
      星盘与邻接导航里，可直达访问，也可在插件管理器中一键停用。
    </p>

    <div class="pdr-meta" data-enter>
      <div class="pdr-meta-card">
        <span class="pdr-meta-icon">🧩</span>
        <span class="pdr-meta-label">来源插件</span>
        <span class="pdr-meta-value">demo-room · 示例插件房</span>
      </div>
      <div class="pdr-meta-card">
        <span class="pdr-meta-icon">🏠</span>
        <span class="pdr-meta-label">注册方式</span>
        <span class="pdr-meta-value">room-graph 覆盖层 + router.addRoute</span>
      </div>
      <div class="pdr-meta-card">
        <span class="pdr-meta-icon">🗺</span>
        <span class="pdr-meta-label">默认邻接</span>
        <span class="pdr-meta-value">家 · 心流</span>
      </div>
    </div>

    <div class="pdr-note" data-enter>
      停用此插件（插件管理器 → 示例插件房 → 停用）后，本房间会从导航与路由中消失。
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PluginDemoRoom' })
</script>

<style scoped>
.plugin-demo-room {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 20px 64px;
  color: var(--text-primary, #e8e0d0);
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.orn-line {
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.6), transparent);
}
.orn-diamond {
  color: rgba(212, 165, 116, 0.85);
  font-size: 12px;
}

.header-kicker {
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: rgba(212, 165, 116, 0.65);
  margin-bottom: 8px;
}

.pdr-title {
  text-align: center;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-primary, #e8e0d0);
  margin: 0 0 20px;
}

.pdr-desc {
  font-size: 14px;
  line-height: 1.8;
  color: rgba(232, 224, 208, 0.72);
  text-align: center;
  max-width: 520px;
  margin: 0 auto 28px;
}

.pdr-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.pdr-meta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.pdr-meta-icon {
  font-size: 22px;
}
.pdr-meta-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(232, 224, 208, 0.5);
}
.pdr-meta-value {
  font-size: 13px;
  color: rgba(232, 224, 208, 0.85);
  text-align: center;
}

.pdr-note {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(232, 224, 208, 0.55);
  text-align: center;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(212, 165, 116, 0.06);
  border: 1px dashed rgba(212, 165, 116, 0.25);
}
</style>
