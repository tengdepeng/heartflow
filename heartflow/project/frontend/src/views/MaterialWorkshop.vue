<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance material-workshop">
    <!-- 氛围背景层 -->
    <div data-enter class="mw-ambient" aria-hidden="true">
      <div class="mw-glow mw-glow--top"></div>
      <div class="mw-glow mw-glow--bottom"></div>
      <!-- 木纹 SVG -->
      <div class="mw-wood-grain" aria-hidden="true">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.5" opacity="0.03">
            <path d="M0,40 Q100,20 200,60 Q300,100 400,50" />
            <path d="M0,120 Q120,100 240,140 Q340,170 400,130" />
            <path d="M0,200 Q80,220 200,180 Q320,150 400,200" />
            <path d="M0,280 Q140,260 260,300 Q360,330 400,290" />
            <path d="M0,360 Q100,340 200,380 Q320,410 400,370" />
            <path d="M0,440 Q130,420 230,460 Q350,490 400,450" />
            <path d="M0,520 Q90,500 210,540 Q330,570 400,530" />
            <path d="M0,600 Q110,580 220,620 Q340,650 400,610" />
            <path d="M0,680 Q120,660 240,700 Q350,730 400,690" />
            <path d="M0,760 Q80,740 200,780 Q320,800 400,760" />
          </g>
        </svg>
      </div>
      <!-- 浮动材质符号 -->
      <div class="mw-symbol mw-sym-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M6 12h12" />
        </svg>
      </div>
      <div class="mw-symbol mw-sym-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div class="mw-symbol mw-sym-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
      </div>
      <div class="mw-symbol mw-sym-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 20h16M4 4h16v12H4z" />
        </svg>
      </div>
      <!-- 木屑粒子 -->
      <div class="mw-sawdust mw-sd-1"></div>
      <div class="mw-sawdust mw-sd-2"></div>
      <div class="mw-sawdust mw-sd-3"></div>
      <div class="mw-sawdust mw-sd-4"></div>
      <div class="mw-sawdust mw-sd-5"></div>
    </div>

    <!-- 通用氛围光晕 -->
    <div data-enter class="mw-atmos" aria-hidden="true">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-work-light"></div>
    </div>

    <!-- Header -->
    <header data-enter class="mw-header">
      <div class="breadcrumb-row">
        <button class="breadcrumb-link" @click="nav.enterRoom('home-space')">
          <svg class="breadcrumb-home-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
          <span>家</span>
        </button>
        <span class="breadcrumb-sep">›</span>
        <button class="breadcrumb-link" @click="nav.enterRoom('craft')">
          <svg class="breadcrumb-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
          </svg>
          <span>匠庐</span>
        </button>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-link current">
          <svg class="breadcrumb-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{{ roomData?.name }}</span>
        </span>
      </div>
      <div class="mw-header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">&#9670;</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="mw-title">{{ roomData?.name }}</h1>
      <p class="mw-subtitle">{{ roomData?.description }}</p>
      <p class="mw-kicker">材质配方 · 风格包与视觉隐喻的自定义工坊</p>
    </header>

    <!-- ============================================================ -->
    <!-- 风格包管理区 -->
    <!-- ============================================================ -->
    <section data-enter class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <circle cx="15" cy="15" r="2" />
        </svg>
        风格包管理
      </h2>
      <p class="section-desc">已安装的风格包，点击切换主题氛围。</p>

      <div class="pack-grid">
        <div
          v-for="pack in packs"
          :key="pack.id"
          class="pack-card"
          :class="{ 'pack-card--active': pack.id === activeId }"
          role="button"
          tabindex="0"
          :aria-pressed="pack.id === activeId"
          :aria-label="'切换风格包 ' + pack.name"
          @click="handleActivatePack(pack.id)"
          @keydown.enter.prevent="handleActivatePack(pack.id)"
          @keydown.space.prevent="handleActivatePack(pack.id)"
        >
          <div class="pack-card-accent" :style="{ background: pack.theme.colors.accent }"></div>
          <div class="pack-card-body">
            <div class="pack-card-color-swatch">
              <span class="color-dot" :style="{ background: pack.theme.colors.accent }"></span>
              <span class="color-dot" :style="{ background: pack.theme.colors.bgPrimary }"></span>
              <span class="color-dot" :style="{ background: pack.theme.colors.bgSecondary }"></span>
              <span class="color-dot" :style="{ background: pack.theme.colors.textPrimary }"></span>
            </div>
            <h3 class="pack-card-name">{{ pack.name }}</h3>
            <span class="pack-card-mode">{{ pack.theme.mode === 'dark' ? '暗色' : '亮色' }}</span>
          </div>
          <div class="pack-card-active-badge" v-if="pack.id === activeId">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 创建风格包 -->
    <!-- ============================================================ -->
    <section class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 3v18M3 12h18" />
        </svg>
        创建风格包
      </h2>
      <p class="section-desc">从基础色快速生成一个风格包，暗色/亮色可选。</p>

      <div class="create-pack-form">
        <div class="create-pack-row">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input
              v-model="createForm.name"
              class="form-input"
              type="text"
              placeholder="风格包名称"
              maxlength="20"
            />
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">基础色</label>
            <div class="color-input-wrap">
              <input
                v-model="createForm.color"
                class="form-input form-input--color-text"
                type="text"
                placeholder="#b8a080"
                maxlength="7"
              />
              <input
                v-model="createForm.color"
                class="form-input form-input--color-picker"
                type="color"
              />
            </div>
          </div>
          <div class="form-group form-group--compact">
            <label class="form-label">模式</label>
            <div class="mode-toggle">
              <button
                class="mode-btn"
                :class="{ active: createForm.mode === 'dark' }"
                @click="createForm.mode = 'dark'"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
                暗色
              </button>
              <button
                class="mode-btn"
                :class="{ active: createForm.mode === 'light' }"
                @click="createForm.mode = 'light'"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                亮色
              </button>
            </div>
          </div>
        </div>
        <div class="create-pack-preview" v-if="createForm.color">
          <div class="preview-swatch" :style="{ background: createForm.color }"></div>
          <span class="preview-label">{{ createForm.name || '未命名' }}</span>
          <span class="preview-mode">{{ createForm.mode === 'dark' ? '暗色' : '亮色' }}</span>
        </div>
        <button
          class="mw-btn mw-btn--primary"
          type="button"
          :disabled="!createForm.name.trim() || !createForm.color"
          @click="handleCreatePack"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 3v18M3 12h18" />
          </svg>
          创建并激活
        </button>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 视觉隐喻选择区 -->
    <!-- ============================================================ -->
    <section class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        视觉隐喻
      </h2>
      <p class="section-desc">选择图表的视觉语言，影响数据可视化的整体风格。</p>

      <div class="metaphor-grid">
        <div
          v-for="metaphor in metaphors"
          :key="metaphor.type"
          class="metaphor-card"
          :class="{ 'metaphor-card--active': metaphor.type === activeMetaphorType }"
          :style="{ '--metaphor-primary': metaphor.palette.primary }"
          role="button"
          tabindex="0"
          :aria-pressed="metaphor.type === activeMetaphorType"
          :aria-label="'切换视觉隐喻 ' + metaphor.name"
          @click="handleSelectMetaphor(metaphor.type)"
          @keydown.enter.prevent="handleSelectMetaphor(metaphor.type)"
          @keydown.space.prevent="handleSelectMetaphor(metaphor.type)"
        >
          <div class="metaphor-visual">
            <!-- 光 -->
            <svg v-if="metaphor.type === 'light'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="12" :stroke="metaphor.palette.primary" stroke-width="1.5" opacity="0.4" />
              <circle cx="20" cy="20" r="8" :stroke="metaphor.palette.secondary" stroke-width="1.5" opacity="0.6" />
              <circle cx="20" cy="20" r="4" :fill="metaphor.palette.accent" opacity="0.8" />
              <g :stroke="metaphor.palette.primary" stroke-width="1" opacity="0.3">
                <line x1="20" y1="2" x2="20" y2="8" /><line x1="20" y1="32" x2="20" y2="38" />
                <line x1="2" y1="20" x2="8" y2="20" /><line x1="32" y1="20" x2="38" y2="20" />
                <line x1="6.4" y1="6.4" x2="10.4" y2="10.4" /><line x1="29.6" y1="29.6" x2="33.6" y2="33.6" />
                <line x1="6.4" y1="33.6" x2="10.4" y2="29.6" /><line x1="29.6" y1="10.4" x2="33.6" y2="6.4" />
              </g>
            </svg>
            <!-- 墨 -->
            <svg v-else-if="metaphor.type === 'ink'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4C20 4 10 16 10 24a10 10 0 0020 0c0-8-10-20-10-20z" :fill="metaphor.palette.primary" opacity="0.15" :stroke="metaphor.palette.primary" stroke-width="1.2" />
              <path d="M20 8C20 8 14 18 14 24a6 6 0 0012 0c0-6-6-16-6-16z" :fill="metaphor.palette.secondary" opacity="0.2" />
              <path d="M20 14c0 0-2 4-2 6a2 2 0 104 0c0-2-2-6-2-6z" :fill="metaphor.palette.accent" opacity="0.3" />
              <line x1="8" y1="34" x2="32" y2="34" :stroke="metaphor.palette.primary" stroke-width="1" opacity="0.2" />
              <path d="M10 34 Q15 30 20 34 Q25 38 30 34" :stroke="metaphor.palette.secondary" stroke-width="0.8" opacity="0.3" fill="none" />
            </svg>
            <!-- 木 -->
            <svg v-else-if="metaphor.type === 'wood'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="18" y="20" width="4" height="16" :fill="metaphor.palette.primary" opacity="0.3" rx="1" />
              <ellipse cx="20" cy="16" rx="10" ry="10" :fill="metaphor.palette.secondary" opacity="0.15" :stroke="metaphor.palette.primary" stroke-width="1" />
              <ellipse cx="20" cy="16" rx="6" ry="6" :fill="metaphor.palette.accent" opacity="0.2" />
              <circle cx="20" cy="16" r="3" :fill="metaphor.palette.primary" opacity="0.3" />
              <path d="M10 16 Q15 12 20 16 Q25 20 30 16" :stroke="metaphor.palette.secondary" stroke-width="0.8" opacity="0.3" fill="none" />
              <path d="M12 20 Q16 18 20 20 Q24 22 28 20" :stroke="metaphor.palette.primary" stroke-width="0.6" opacity="0.2" fill="none" />
            </svg>
            <!-- 火 -->
            <svg v-else-if="metaphor.type === 'fire'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 2C20 2 10 14 10 22a10 10 0 0020 0c0-8-10-20-10-20z" :fill="metaphor.palette.primary" opacity="0.2" :stroke="metaphor.palette.primary" stroke-width="1.2" />
              <path d="M20 6C20 6 13 16 13 22a7 7 0 0014 0c0-6-7-16-7-16z" :fill="metaphor.palette.secondary" opacity="0.25" />
              <path d="M20 10C20 10 16 18 16 22a4 4 0 008 0c0-4-4-12-4-12z" :fill="metaphor.palette.accent" opacity="0.35" />
              <circle cx="20" cy="22" r="2" :fill="metaphor.palette.accent" opacity="0.5" />
              <path d="M8 34 Q14 30 20 34 Q26 38 32 34" :stroke="metaphor.palette.secondary" stroke-width="0.8" opacity="0.2" fill="none" />
            </svg>
            <!-- 水 -->
            <svg v-else-if="metaphor.type === 'water'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 2C20 2 8 18 8 26a12 12 0 0024 0c0-8-12-24-12-24z" :fill="metaphor.palette.primary" opacity="0.12" :stroke="metaphor.palette.primary" stroke-width="1" />
              <path d="M20 6C20 6 12 18 12 24a8 8 0 0016 0c0-6-8-18-8-18z" :fill="metaphor.palette.secondary" opacity="0.15" />
              <path d="M20 12C20 12 16 20 16 24a4 4 0 008 0c0-4-4-12-4-12z" :fill="metaphor.palette.accent" opacity="0.2" />
              <path d="M6 32 Q12 28 20 32 Q28 36 34 32" :stroke="metaphor.palette.primary" stroke-width="0.8" opacity="0.25" fill="none" />
              <path d="M8 36 Q14 33 20 36 Q26 39 32 36" :stroke="metaphor.palette.secondary" stroke-width="0.6" opacity="0.15" fill="none" />
            </svg>
            <!-- 土 -->
            <svg v-else-if="metaphor.type === 'earth'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="14" width="28" height="18" rx="3" :fill="metaphor.palette.primary" opacity="0.12" :stroke="metaphor.palette.primary" stroke-width="1" />
              <path d="M6 24 Q20 18 34 24" :stroke="metaphor.palette.secondary" stroke-width="0.8" opacity="0.2" fill="none" />
              <path d="M6 28 Q20 22 34 28" :stroke="metaphor.palette.primary" stroke-width="0.6" opacity="0.15" fill="none" />
              <ellipse cx="20" cy="8" rx="6" ry="4" :fill="metaphor.palette.secondary" opacity="0.12" :stroke="metaphor.palette.primary" stroke-width="0.8" />
              <path d="M14 8 L12 14" :stroke="metaphor.palette.primary" stroke-width="0.6" opacity="0.15" />
              <path d="M26 8 L28 14" :stroke="metaphor.palette.primary" stroke-width="0.6" opacity="0.15" />
              <circle cx="20" cy="7" r="1.5" :fill="metaphor.palette.accent" opacity="0.25" />
            </svg>
            <!-- 金 -->
            <svg v-else-if="metaphor.type === 'metal'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <polygon points="20,4 34,14 34,28 20,36 6,28 6,14" :stroke="metaphor.palette.primary" stroke-width="1.2" :fill="metaphor.palette.primary" opacity="0.08" />
              <polygon points="20,10 28,14 28,24 20,28 12,24 12,14" :stroke="metaphor.palette.secondary" stroke-width="0.8" :fill="metaphor.palette.secondary" opacity="0.1" />
              <polygon points="20,16 24,18 24,22 20,24 16,22 16,18" :stroke="metaphor.palette.accent" stroke-width="0.6" :fill="metaphor.palette.accent" opacity="0.15" />
              <line x1="20" y1="4" x2="20" y2="36" :stroke="metaphor.palette.primary" stroke-width="0.5" opacity="0.1" />
            </svg>
            <!-- 雾 -->
            <svg v-else-if="metaphor.type === 'mist'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M6 14 Q14 10 20 14 Q26 18 34 14" :stroke="metaphor.palette.primary" stroke-width="1.2" opacity="0.2" fill="none" />
              <path d="M6 20 Q14 16 20 20 Q26 24 34 20" :stroke="metaphor.palette.secondary" stroke-width="1" opacity="0.15" fill="none" />
              <path d="M6 26 Q14 22 20 26 Q26 30 34 26" :stroke="metaphor.palette.primary" stroke-width="0.8" opacity="0.12" fill="none" />
              <path d="M6 32 Q14 28 20 32 Q26 36 34 32" :stroke="metaphor.palette.secondary" stroke-width="0.6" opacity="0.08" fill="none" />
              <circle cx="12" cy="18" r="2" :fill="metaphor.palette.primary" opacity="0.08" />
              <circle cx="28" cy="22" r="3" :fill="metaphor.palette.secondary" opacity="0.06" />
              <circle cx="20" cy="28" r="2" :fill="metaphor.palette.primary" opacity="0.05" />
            </svg>
            <!-- 星 -->
            <svg v-else-if="metaphor.type === 'star'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="14" :stroke="metaphor.palette.primary" stroke-width="0.5" opacity="0.15" />
              <circle cx="20" cy="20" r="8" :stroke="metaphor.palette.secondary" stroke-width="0.5" opacity="0.2" />
              <polygon points="20,2 22,8 28,6 24,12 30,14 24,16 26,22 20,18 14,22 16,16 10,14 16,12 12,6 18,8" :fill="metaphor.palette.accent" opacity="0.5" :stroke="metaphor.palette.primary" stroke-width="0.5" />
              <circle cx="6" cy="8" r="1" :fill="metaphor.palette.primary" opacity="0.2" />
              <circle cx="34" cy="12" r="1.2" :fill="metaphor.palette.secondary" opacity="0.15" />
              <circle cx="8" cy="30" r="0.8" :fill="metaphor.palette.primary" opacity="0.15" />
              <circle cx="32" cy="28" r="1" :fill="metaphor.palette.secondary" opacity="0.12" />
              <circle cx="14" cy="34" r="0.6" :fill="metaphor.palette.accent" opacity="0.1" />
            </svg>
            <!-- 晶 -->
            <svg v-else-if="metaphor.type === 'crystal'" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 32,14 28,30 12,30 8,14" :stroke="metaphor.palette.primary" stroke-width="1" :fill="metaphor.palette.primary" opacity="0.08" />
              <polygon points="20,10 26,16 24,26 16,26 14,16" :stroke="metaphor.palette.secondary" stroke-width="0.8" :fill="metaphor.palette.secondary" opacity="0.1" />
              <polygon points="20,16 23,20 22,24 18,24 17,20" :stroke="metaphor.palette.accent" stroke-width="0.6" :fill="metaphor.palette.accent" opacity="0.15" />
              <line x1="20" y1="2" x2="20" y2="30" :stroke="metaphor.palette.primary" stroke-width="0.5" opacity="0.08" />
              <line x1="12" y1="30" x2="28" y2="30" :stroke="metaphor.palette.primary" stroke-width="0.5" opacity="0.08" />
            </svg>
          </div>
          <div class="metaphor-info">
            <h3 class="metaphor-name">{{ metaphor.name }}</h3>
            <p class="metaphor-desc">{{ metaphor.description }}</p>
          </div>
          <div class="metaphor-active-badge" v-if="metaphor.type === activeMetaphorType">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 材质库（视觉材质的创建 / 编辑 / 删除 / 恢复预置） -->
    <!-- ============================================================ -->
    <section data-enter class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        材质库
      </h2>
      <p class="section-desc">预置材质的起点库，可按分类浏览、增删改，或一键恢复出厂预置。</p>
      <MaterialLibraryPanel />
    </section>

    <!-- ============================================================ -->
    <!-- 自定义调色板 -->
    <!-- ============================================================ -->
    <section class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
        自定义调色板
      </h2>
      <p class="section-desc">微调当前隐喻的调色板颜色，打造专属视觉风格。</p>

      <div class="palette-editor" v-if="currentMetaphor">
        <div
          v-for="entry in paletteEntries"
          :key="entry.key"
          class="palette-row"
        >
          <div class="palette-color-preview" :style="{ background: entry.value }"></div>
          <div class="palette-color-info">
            <span class="palette-color-key">{{ PALETTE_KEY_LABELS[entry.key] || entry.key }}</span>
            <span class="palette-color-hex">{{ entry.value }}</span>
          </div>
          <div class="palette-color-edit">
            <input
              :value="entry.value"
              class="form-input form-input--color-text form-input--sm"
              type="text"
              maxlength="7"
              @input="handlePaletteChange(entry.key, ($event.target as HTMLInputElement).value)"
            />
            <input
              :value="entry.value"
              class="form-input form-input--color-picker form-input--sm"
              type="color"
              @input="handlePaletteChange(entry.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <div class="palette-actions">
          <button
            class="mw-btn"
            type="button"
            @click="handleResetPalette"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            重置为默认
          </button>
          <button
            class="mw-btn mw-btn--primary"
            type="button"
            :disabled="!hasPaletteChanges"
            @click="handleApplyPalette"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            应用自定义
          </button>
        </div>
      </div>
      <div v-else class="mw-empty">
        <span class="mw-empty-text">无可用的隐喻调色板</span>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 房间级覆盖（全局为主 + 单房间可覆盖） -->
    <!-- ============================================================ -->
    <section class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21v-6h6v6" />
        </svg>
        房间级覆盖
      </h2>
      <p class="section-desc">为单个房间设置独立主题（主色 + 底色 + 背景场景）。未开启则跟随全局主题；覆盖仅作用于该房间内容区，不影响侧边栏。</p>

      <div class="room-override-list">
        <div
          v-for="room in allRooms"
          :key="room.id"
          class="room-override-card"
          :class="{ 'room-override-card--custom': roomStyle.isRoomOverridden(room.id) }"
        >
          <div class="room-override-head">
            <div class="room-override-id">
              <span class="room-override-icon">{{ room.icon }}</span>
              <span class="room-override-name">{{ room.name }}</span>
            </div>
            <button
              class="room-override-toggle"
              :class="{ active: roomStyle.isRoomOverridden(room.id) }"
              type="button"
              @click="toggleRoomOverride(room.id)"
            >
              {{ roomStyle.isRoomOverridden(room.id) ? '自定义' : '跟随全局' }}
            </button>
          </div>

          <div v-if="roomStyle.isRoomOverridden(room.id)" class="room-override-controls">
            <div class="ro-control">
              <label class="form-label">主色</label>
              <div class="color-input-wrap">
                <input
                  class="form-input form-input--color-text form-input--sm"
                  type="text"
                  maxlength="7"
                  :value="roomStyle.getRoomOverride(room.id).accent"
                  @input="updateRoomColor(room.id, 'accent', ($event.target as HTMLInputElement).value)"
                />
                <input
                  class="form-input form-input--color-picker form-input--sm"
                  type="color"
                  :value="roomStyle.getRoomOverride(room.id).accent"
                  @input="updateRoomColor(room.id, 'accent', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>

            <div class="ro-control">
              <label class="form-label">底色</label>
              <div class="color-input-wrap">
                <input
                  class="form-input form-input--color-text form-input--sm"
                  type="text"
                  maxlength="7"
                  :value="roomStyle.getRoomOverride(room.id).bgPrimary"
                  @input="updateRoomColor(room.id, 'bgPrimary', ($event.target as HTMLInputElement).value)"
                />
                <input
                  class="form-input form-input--color-picker form-input--sm"
                  type="color"
                  :value="roomStyle.getRoomOverride(room.id).bgPrimary"
                  @input="updateRoomColor(room.id, 'bgPrimary', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>

            <div class="ro-control">
              <label class="form-label">背景场景</label>
              <select
                class="form-input form-input--sm ro-select"
                :value="roomStyle.getRoomOverride(room.id).presetScene"
                @change="updateRoomScene(room.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in presetSceneOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- 导入 / 导出 -->
    <!-- ============================================================ -->
    <section class="mw-section">
      <h2 class="section-label">
        <svg class="section-label-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        导入 / 导出
      </h2>
      <p class="section-desc">分享风格包，或从文件导入别人的风格包。</p>

      <div class="import-export-row">
        <button
          class="mw-btn"
          type="button"
          @click="handleExportPack"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          导出当前包
        </button>
        <label class="mw-btn mw-btn--file">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          导入风格包
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="file-input-hidden"
            @change="handleImportPack"
          />
        </label>
      </div>
      <p v-if="importMessage" class="mw-message" :class="`mw-message--${importMessageType}`">
        {{ importMessage }}
      </p>
    </section>

    <!-- 底部铭文 -->
    <footer class="mw-colophon">
      <div class="colophon-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">&#9670;</span>
        <span class="orn-line"></span>
      </div>
      <p class="colophon-text">材质为器 · 风格为魂</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { getRoom, getAllRooms } from '../engine/room-graph'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { useStyle } from '../resonance/bridges/style'
import { useConfig } from '../resonance/bridges/config'
import { getAllMetaphors, getMetaphor } from '../modules/visualization/metaphors'
import { importStylePack } from '../modules/style'
import type { MetaphorType } from '../modules/visualization/types'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomStyle } from '../modules/customization/useRoomStyle'
import MaterialLibraryPanel from '../components/MaterialLibraryPanel.vue'
import type { PresetScene } from '../types'

const { entranceRef, entranceClass } = useViewEntrance()
const nav = useRoomNavigation()
const style = useStyle()
const { packs, activeId } = style
const configBridge = useConfig()
const { config: configRef } = configBridge

// ---- 房间数据 ----
const roomData = computed(() => getRoom('material-workshop'))

// ---- 单房间风格覆盖（全局为主 + 单房间可覆盖） ----
const roomStyle = useRoomStyle()
// 列出全部「房间」（排除引力中心 home，它属于壳层而非房间）
const allRooms = computed(() => getAllRooms().filter((r) => r.group !== 'gravity'))

const presetSceneOptions: { value: PresetScene; label: string }[] = [
  { value: 'none', label: '无（跟随全局）' },
  { value: 'forest-dawn', label: '晨曦森林' },
  { value: 'coast-starlight', label: '星空海岸' },
  { value: 'autumn-courtyard', label: '秋日庭院' },
  { value: 'rainy-window', label: '雨窗' },
  { value: 'mountain-cloud', label: '山间云海' },
  { value: 'snowy-night', label: '雪夜' },
]

function toggleRoomOverride(roomId: string) {
  if (roomStyle.isRoomOverridden(roomId)) {
    roomStyle.clearRoomOverride(roomId)
  } else {
    roomStyle.setRoomOverride(roomId, {})
  }
}

function updateRoomColor(roomId: string, key: 'accent' | 'bgPrimary', value: string) {
  if (!value) return
  if (key === 'accent') {
    roomStyle.setRoomOverride(roomId, { accent: value })
  } else {
    roomStyle.setRoomOverride(roomId, { bgPrimary: value })
  }
}

function updateRoomScene(roomId: string, value: string) {
  roomStyle.setRoomOverride(roomId, { presetScene: value as PresetScene })
}

// ---- 隐喻数据 ----
const metaphors = getAllMetaphors()

const activeMetaphorType = computed<MetaphorType>(() => {
  return (configRef.visualization.activeMetaphor as MetaphorType) || 'light'
})

const currentMetaphor = computed(() => getMetaphor(activeMetaphorType.value))

// ---- 调色板键名中文映射 ----
const PALETTE_KEY_LABELS: Record<string, string> = {
  primary: '主色',
  secondary: '辅色',
  accent: '强调色',
  muted: '柔和色',
  bg: '背景色',
  surface: '表面色',
  border: '边框色',
  positive: '正向色',
  negative: '负向色',
  neutral: '中性色',
}

interface PaletteEntry {
  key: string
  value: string
}

const paletteEntries = computed<PaletteEntry[]>(() => {
  if (!currentMetaphor.value) return []
  const palette = currentMetaphor.value.palette
  return Object.entries(palette)
    .filter(([key]) => key !== 'gradient')
    .map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : '',
    }))
})

// 跟踪调色板编辑状态
const paletteDraft = ref<Record<string, string>>({})
const hasPaletteChanges = computed(() => Object.keys(paletteDraft.value).length > 0)

function handlePaletteChange(key: string, value: string) {
  if (!value) return
  paletteDraft.value[key] = value
}

function handleResetPalette() {
  paletteDraft.value = {}
}

function handleApplyPalette() {
  if (!hasPaletteChanges.value) return
  // 将调色板变更写入 config visualization customPalette
  const currentCustom = configRef.visualization.customPalette
  const customPalette: Record<string, string> = currentCustom ? JSON.parse(currentCustom) : {}

  for (const [key, val] of Object.entries(paletteDraft.value)) {
    customPalette[key] = val
  }

  configBridge.updateVisualization({
    customPalette: JSON.stringify(customPalette),
  })
  paletteDraft.value = {}
}

// ---- 创建风格包 ----
const createForm = reactive({
  name: '',
  color: '#b8a080',
  mode: 'dark' as 'dark' | 'light',
})

function handleCreatePack() {
  const name = createForm.name.trim()
  const color = createForm.color
  if (!name || !color) return
  style.createFromBaseColor(name, color, createForm.mode)
  createForm.name = ''
  createForm.color = '#b8a080'
  createForm.mode = 'dark'
}

// ---- 激活风格包 ----
function handleActivatePack(id: string) {
  style.activate(id)
}

// ---- 导入导出 ----
const fileInputRef = ref<HTMLInputElement | null>(null)
const importMessage = ref('')
const importMessageType = ref<'success' | 'error'>('success')

function handleExportPack() {
  style.exportPack(activeId)
}

function handleImportPack(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const share = importStylePack(text)
    if (share) {
      style.importPack(share)
      importMessage.value = `风格包「${share.name}」已导入并激活`
      importMessageType.value = 'success'
    } else {
      importMessage.value = '导入失败：无效的风格包文件'
      importMessageType.value = 'error'
    }
    // 重置 input 以便重复导入同一文件
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
  reader.readAsText(file)
}

// ---- 选择隐喻 ----
function handleSelectMetaphor(type: MetaphorType) {
  configBridge.updateVisualization({
    activeMetaphor: type,
  })
  // 切换隐喻时重置自定义调色板
  paletteDraft.value = {}
}
</script>

<style scoped>
/* =============================================================
   Material Workshop — 材质工坊
   Theme Color: #b8a080 | Warm amber wood
   -------------------------------------------------------------
   蓝图概念映射（D4 · 五维视觉材质工坊）
   本视图 = 蓝图中「五维视觉材质工坊」的【视觉材质】半：
   风格包 / 视觉隐喻 / 自定义调色板 / 单房间风格覆盖 / 导入导出。
   五维【环境】半（光/声音/动态/触觉/气味）由
   modules/home/home-atmosphere-engine.ts 承接，二者协作无缺漏。
   ============================================================= */

/* ---- CSS Variables ---- */
.material-workshop {
  --mw-accent: var(--accent);
  --mw-accent-rgb: var(--accent-rgb);
  --mw-bg: #0a0908;
  --mw-surface: var(--card-bg);
  --mw-surface-hover: rgba(55, 48, 40, 0.5);
  --mw-border: rgba(var(--accent-rgb), 0.08);
  --mw-border-hover: rgba(var(--accent-rgb), 0.2);
}

/* ---- Root ---- */
.material-workshop {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 32px 100px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 40px;
  background: transparent;
  overflow: hidden;
}

/* ---- Ambient Background ---- */
.mw-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.mw-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.mw-glow--top {
  top: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(184, 160, 128, 0.07) 0%, transparent 70%);
}

.mw-glow--bottom {
  bottom: -10%;
  right: -10%;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(184, 160, 128, 0.04) 0%, transparent 65%);
}

/* Wood grain */
.mw-wood-grain {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 500px;
  height: 100%;
  color: var(--mw-accent);
  opacity: 0.5;
}

.mw-wood-grain svg {
  width: 100%;
  height: 100%;
}

/* Floating symbols */
.mw-symbol {
  position: absolute;
  opacity: 0;
  animation: symbol-float 14s ease-in-out infinite;
  color: var(--mw-accent);
}

.mw-sym-1 { top: 10%; left: 6%; animation-delay: 0s; }
.mw-sym-2 { top: 35%; right: 8%; animation-delay: 3.5s; }
.mw-sym-3 { top: 60%; left: 8%; animation-delay: 7s; }
.mw-sym-4 { top: 80%; right: 12%; animation-delay: 10.5s; }

@keyframes symbol-float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0; }
  20% { opacity: 0.04; }
  50% { transform: translateY(-18px) rotate(8deg); opacity: 0.08; }
  80% { opacity: 0.03; }
}

/* Sawdust particles */
.mw-sawdust {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--mw-accent);
  opacity: 0;
  animation: sawdust-drift 15s ease-in-out infinite;
}

.mw-sd-1 { left: 20%; top: 25%; animation-delay: 0s; }
.mw-sd-2 { left: 60%; top: 35%; animation-delay: 4s; }
.mw-sd-3 { left: 35%; top: 55%; animation-delay: 8s; }
.mw-sd-4 { left: 75%; top: 20%; animation-delay: 2s; }
.mw-sd-5 { left: 50%; top: 70%; animation-delay: 6s; }

@keyframes sawdust-drift {
  0%, 100% { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
  25% { opacity: 0.08; transform: translateY(-30px) translateX(10px) scale(1); }
  50% { opacity: 0.12; transform: translateY(-60px) translateX(-5px) scale(0.8); }
  75% { opacity: 0.04; transform: translateY(-90px) translateX(15px) scale(0.4); }
}

/* ---- Atmosphere glow ---- */
.mw-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.mw-atmos .atmos-warm-glow {
  position: absolute;
  top: -10%;
  left: 10%;
  width: 80%;
  height: 50%;
  background: radial-gradient(
    ellipse at 30% 40%,
    rgba(var(--accent-rgb), 0.06) 0%,
    transparent 60%
  );
  animation: mw-breathe 7s ease-in-out infinite;
}

.mw-atmos .atmos-work-light {
  position: absolute;
  bottom: -10%;
  right: 10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(184, 160, 128, 0.03) 0%,
    transparent 60%
  );
  animation: mw-breathe 9s ease-in-out infinite 2s;
}

@keyframes mw-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- Header ---- */
.mw-header {
  text-align: center;
  position: relative;
  z-index: 1;
}

/* Breadcrumb */
.breadcrumb-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 12px;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted, var(--text-muted));
  text-decoration: none;
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition: all 0.25s ease;
}

.breadcrumb-link:hover {
  color: var(--text-primary, #e8e0d8);
  background: rgba(184, 160, 128, 0.08);
}

.breadcrumb-link.current {
  color: var(--mw-accent, #b8a080);
  cursor: default;
  pointer-events: none;
}

.breadcrumb-home-icon,
.breadcrumb-icon {
  line-height: 1;
  opacity: 0.7;
}

.breadcrumb-sep {
  color: var(--text-muted, var(--text-faint));
  font-size: 14px;
}

.mw-header-ornament {
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
    rgba(184, 160, 128, 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--mw-accent, #b8a080);
  opacity: 0.4;
}

.mw-title {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.mw-subtitle {
  font-size: 14px;
  color: var(--text-secondary, var(--text-secondary));
  margin: 8px 0 4px;
  letter-spacing: 1px;
}

.mw-kicker {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  margin: 0;
  letter-spacing: 0.5px;
}

/* ---- Section ---- */
.mw-section {
  position: relative;
  z-index: 1;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, var(--text-secondary));
  margin: 0 0 6px;
  letter-spacing: 0.5px;
}

.section-label-icon {
  opacity: 0.7;
  flex-shrink: 0;
}

.section-desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted, var(--text-muted));
  margin: 0 0 16px;
  font-style: italic;
  padding-left: 24px;
  border-left: 2px solid rgba(184, 160, 128, 0.15);
}

/* =============================================================
   风格包网格
   ============================================================= */
.pack-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.pack-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--mw-surface);
  border: 1px solid var(--mw-border);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
}

.pack-card:hover {
  background: var(--mw-surface-hover);
  border-color: var(--mw-border-hover);
  transform: translateY(-3px);
}

.pack-card:focus-visible {
  outline: 2px solid rgba(184, 160, 128, 0.6);
  outline-offset: 1px;
  border-color: var(--mw-border-hover);
}

.pack-card--active {
  border-color: rgba(184, 160, 128, 0.3);
  background: rgba(184, 160, 128, 0.06);
}

.pack-card-accent {
  height: 8px;
  width: 100%;
  flex-shrink: 0;
}

.pack-card-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pack-card-color-swatch {
  display: flex;
  gap: 5px;
  align-items: center;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.pack-card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
  letter-spacing: 0.5px;
}

.pack-card-mode {
  font-size: 10px;
  color: var(--text-muted, var(--text-muted));
  letter-spacing: 0.5px;
}

.pack-card-active-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(106, 186, 122, 0.15);
  border: 1px solid rgba(106, 186, 122, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success-light);
}

/* =============================================================
   创建风格包表单
   ============================================================= */
.create-pack-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: var(--mw-surface);
  border: 1px solid var(--mw-border);
}

.create-pack-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.form-group--compact {
  flex: 0 0 auto;
  min-width: 140px;
}

.form-label {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  letter-spacing: 0.5px;
}

.form-input {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: var(--card-bg);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
}

.form-input::placeholder {
  color: var(--text-muted, var(--text-muted));
}

.form-input:focus {
  border-color: var(--mw-accent, #b8a080);
  background: var(--mw-surface-hover);
}

.form-input--sm {
  padding: 6px 8px;
  font-size: 12px;
}

.form-input--color-text {
  flex: 1;
  min-width: 0;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.form-input--color-picker {
  width: 34px;
  height: 34px;
  padding: 2px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.form-input--color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.form-input--color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.color-input-wrap {
  display: flex;
  gap: 6px;
  align-items: center;
}

.mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--card-bg);
  border-radius: 8px;
  padding: 3px;
  border: 1px solid var(--mw-border);
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, var(--text-muted));
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.mode-btn:hover {
  color: var(--text-secondary, var(--text-secondary));
}

.mode-btn.active {
  background: rgba(184, 160, 128, 0.15);
  color: var(--mw-accent, #b8a080);
}

.create-pack-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(184, 160, 128, 0.08);
}

.preview-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.preview-label {
  font-size: 13px;
  color: var(--text-primary, #e8e0d8);
  font-weight: 500;
}

.preview-mode {
  font-size: 10px;
  color: var(--text-muted, var(--text-muted));
  margin-left: auto;
  letter-spacing: 0.5px;
}

/* ---- Buttons ---- */
.mw-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: var(--mw-surface, rgba(42, 36, 30, 0.4));
  color: var(--text-secondary, var(--text-secondary));
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
}

.mw-btn:hover:not(:disabled) {
  background: var(--mw-surface-hover, rgba(55, 48, 40, 0.5));
  border-color: var(--mw-border-hover, rgba(184, 160, 128, 0.2));
  color: var(--text-primary, #e8e0d8);
}

.mw-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mw-btn--primary {
  background: rgba(184, 160, 128, 0.15);
  border-color: rgba(184, 160, 128, 0.2);
  color: var(--mw-accent, #b8a080);
}

.mw-btn--primary:hover:not(:disabled) {
  background: rgba(184, 160, 128, 0.25);
  border-color: rgba(184, 160, 128, 0.35);
}

.mw-btn--file {
  position: relative;
  cursor: pointer;
}

.file-input-hidden {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
}

/* =============================================================
   隐喻网格
   ============================================================= */
.metaphor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metaphor-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-radius: 14px;
  background: var(--mw-surface);
  border: 1px solid var(--mw-border);
  cursor: pointer;
  transition: all 0.25s ease;
}

.metaphor-card:hover {
  background: var(--mw-surface-hover);
  border-color: var(--mw-border-hover);
  transform: translateY(-3px);
}

.metaphor-card:focus-visible {
  outline: 2px solid rgba(184, 160, 128, 0.6);
  outline-offset: 1px;
  border-color: var(--metaphor-primary, #b8a080);
}

.metaphor-card--active {
  border-color: var(--metaphor-primary, #b8a080);
  background: rgba(184, 160, 128, 0.06);
}

.metaphor-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(184, 160, 128, 0.08);
  transition: all 0.25s ease;
}

.metaphor-card:hover .metaphor-visual {
  border-color: rgba(184, 160, 128, 0.2);
}

.metaphor-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.metaphor-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
  letter-spacing: 1px;
}

.metaphor-desc {
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-muted, var(--text-muted));
  margin: 0;
}

.metaphor-active-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(106, 186, 122, 0.15);
  border: 1px solid rgba(106, 186, 122, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success-light);
}

/* =============================================================
   调色板编辑器
   ============================================================= */
.palette-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 14px;
  background: var(--mw-surface);
  border: 1px solid var(--mw-border);
}

.palette-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.palette-row:hover {
  background: rgba(var(--bg-card-rgb), 0.3);
}

.palette-color-preview {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.palette-color-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 64px;
}

.palette-color-key {
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
  letter-spacing: 0.5px;
}

.palette-color-hex {
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  color: var(--text-muted, var(--text-muted));
}

.palette-color-edit {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}

.palette-color-edit .form-input--color-text {
  width: 84px;
}

.palette-color-edit .form-input--color-picker {
  width: 30px;
  height: 30px;
}

.palette-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--mw-border);
}

/* =============================================================
   房间级覆盖
   ============================================================= */
.room-override-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-override-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--mw-surface);
  border: 1px solid var(--mw-border);
  transition: all 0.25s ease;
}

.room-override-card--custom {
  border-color: rgba(184, 160, 128, 0.25);
  background: rgba(184, 160, 128, 0.05);
}

.room-override-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.room-override-id {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.room-override-icon {
  font-size: 16px;
  opacity: 0.7;
  flex-shrink: 0;
}

.room-override-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.5px;
}

.room-override-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--mw-border);
  background: transparent;
  color: var(--text-muted, var(--text-muted));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
}

.room-override-toggle:hover {
  color: var(--text-secondary, var(--text-secondary));
  border-color: var(--mw-border-hover);
}

.room-override-toggle.active {
  background: rgba(184, 160, 128, 0.15);
  border-color: rgba(184, 160, 128, 0.3);
  color: var(--mw-accent, #b8a080);
}

.room-override-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--mw-border);
}

.ro-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ro-control .form-label {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  letter-spacing: 0.5px;
}

.ro-control .color-input-wrap {
  display: flex;
  gap: 6px;
  align-items: center;
}

.ro-control .form-input--color-text {
  width: 84px;
}

.ro-control .form-input--color-picker {
  width: 30px;
  height: 30px;
}

.ro-select {
  min-width: 140px;
  cursor: pointer;
}

/* =============================================================
   导入导出
   ============================================================= */
.import-export-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* ---- Message ---- */
.mw-message {
  font-size: 12px;
  margin: 8px 0 0;
  padding: 8px 14px;
  border-radius: 8px;
  animation: mw-fade-in 0.3s ease;
}

.mw-message--success {
  color: var(--success-light);
  background: rgba(106, 186, 122, 0.08);
  border: 1px solid rgba(106, 186, 122, 0.12);
}

.mw-message--error {
  color: var(--danger);
  background: rgba(212, 106, 106, 0.08);
  border: 1px solid rgba(212, 106, 106, 0.12);
}

@keyframes mw-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Empty State ---- */
.mw-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border-radius: 14px;
  border: 1px dashed var(--mw-border, rgba(var(--accent-rgb), 0.08));
  background: rgba(var(--bg-card-rgb), 0.2);
}

.mw-empty-text {
  font-size: 13px;
  color: var(--text-muted, var(--text-muted));
}

/* ---- Colophon ---- */
.mw-colophon {
  text-align: center;
  position: relative;
  z-index: 1;
  margin-top: 8px;
}

.colophon-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.colophon-text {
  font-size: 12px;
  color: var(--text-muted, var(--text-faint));
  letter-spacing: 2px;
  font-style: italic;
  margin: 0;
}

/* =============================================================
   Responsive — Tablet ( <= 860px )
   ============================================================= */
@media (max-width: 860px) {
  .material-workshop {
    padding: 28px 20px 100px;
    gap: 32px;
  }

  .pack-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .metaphor-grid {
    gap: 10px;
  }

  .create-pack-row {
    flex-direction: column;
    gap: 10px;
  }

  .form-group--compact {
    min-width: 0;
  }

  .mw-title {
    font-size: 24px;
  }

  .mw-header-ornament {
    gap: 8px;
  }

  .orn-line {
    width: 40px;
  }
}

/* =============================================================
   Responsive — Mobile ( <= 640px )
   ============================================================= */
@media (max-width: 640px) {
  .material-workshop {
    padding: 20px 14px 90px;
    gap: 24px;
  }

  .mw-header {
    padding-top: 40px;
  }

  .mw-title {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .mw-subtitle {
    font-size: 12px;
  }

  .mw-kicker {
    font-size: 10px;
  }

  .mw-header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 28px;
  }

  .orn-diamond {
    font-size: 7px;
  }

  .breadcrumb-row {
    font-size: 11px;
  }

  .breadcrumb-link {
    font-size: 11px;
    padding: 3px 6px;
  }

  .section-desc {
    font-size: 11px;
    padding-left: 12px;
  }

  /* Style packs: single column */
  .pack-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .pack-card:hover {
    transform: none;
  }

  /* Metaphor: single column */
  .metaphor-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .metaphor-card {
    flex-direction: row;
    padding: 14px 16px;
  }

  .metaphor-card:hover {
    transform: none;
  }

  .metaphor-info {
    align-items: flex-start;
    text-align: left;
  }

  .metaphor-name {
    font-size: 14px;
  }

  .metaphor-desc {
    font-size: 10px;
  }

  /* Palette editor */
  .palette-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .palette-color-edit {
    width: 100%;
    margin-left: 38px;
  }

  .palette-color-edit .form-input--color-text {
    width: 100%;
  }

  .palette-actions {
    flex-direction: column;
  }

  .palette-actions .mw-btn {
    width: 100%;
    justify-content: center;
  }

  /* Import/export */
  .import-export-row {
    flex-direction: column;
  }

  .import-export-row .mw-btn {
    width: 100%;
    justify-content: center;
  }

  /* Create pack */
  .create-pack-row {
    flex-direction: column;
    gap: 10px;
  }

  .create-pack-form {
    padding: 16px;
  }

  .create-pack-form .mw-btn {
    width: 100%;
    justify-content: center;
  }

  .mode-toggle {
    width: 100%;
  }

  .mode-btn {
    flex: 1;
    justify-content: center;
  }

  /* Colophon */
  .mw-colophon {
    margin-top: 4px;
  }

  .colophon-text {
    font-size: 11px;
  }
}
</style>