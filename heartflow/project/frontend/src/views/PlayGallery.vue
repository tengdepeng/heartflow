<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance play">
    <!-- 氛围背景层：逸趣阁 · 星尘游乐场 -->
    <div data-enter class="pg-ambient" aria-hidden="true">
      <div class="pg-glow pg-glow--top"></div>
      <div class="pg-glow pg-glow--bottom"></div>
      <!-- 逸趣 SVG 装饰 -->
      <div class="pg-svg-decor" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="pgCoreGlow" cx="50%" cy="35%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.05"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <filter id="pgSparkle">
              <feGaussianBlur stdDeviation="1.2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- 中心光晕 -->
          <circle cx="300" cy="280" r="260" fill="url(#pgCoreGlow)"/>
          <!-- 漂浮星尘 -->
          <g fill="var(--accent)" opacity="0.05" filter="url(#pgSparkle)">
            <circle cx="80" cy="100" r="1.5" class="pg-star pg-star--1"/>
            <circle cx="520" cy="120" r="2" class="pg-star pg-star--2"/>
            <circle cx="150" cy="200" r="1.2" class="pg-star pg-star--3"/>
            <circle cx="450" cy="250" r="1.8" class="pg-star pg-star--4"/>
            <circle cx="100" cy="350" r="1.5" class="pg-star pg-star--5"/>
            <circle cx="500" cy="380" r="1.3" class="pg-star pg-star--6"/>
            <circle cx="200" cy="450" r="1.7" class="pg-star pg-star--7"/>
            <circle cx="400" cy="500" r="1.4" class="pg-star pg-star--8"/>
            <circle cx="120" cy="550" r="1.8" class="pg-star pg-star--9"/>
            <circle cx="480" cy="600" r="1.5" class="pg-star pg-star--10"/>
            <circle cx="300" cy="150" r="1.2" class="pg-star pg-star--11"/>
            <circle cx="350" cy="350" r="1.6" class="pg-star pg-star--12"/>
          </g>
          <!-- 星辰连线 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.3" class="pg-constellation">
            <line x1="80" y1="100" x2="150" y2="200"/>
            <line x1="150" y1="200" x2="100" y2="350"/>
            <line x1="520" y1="120" x2="450" y2="250"/>
            <line x1="450" y1="250" x2="500" y2="380"/>
            <line x1="200" y1="450" x2="400" y2="500"/>
            <line x1="400" y1="500" x2="480" y2="600"/>
            <line x1="120" y1="550" x2="200" y2="450"/>
          </g>
          <!-- 骰子装饰 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.6" fill="none" class="pg-dice">
            <rect x="70" y="620" width="20" height="20" rx="3"/>
            <circle cx="76" cy="626" r="1.5" fill="var(--accent)"/>
            <circle cx="84" cy="626" r="1.5" fill="var(--accent)"/>
            <circle cx="76" cy="634" r="1.5" fill="var(--accent)"/>
            <circle cx="84" cy="634" r="1.5" fill="var(--accent)"/>
          </g>
          <!-- 种子嫩芽装饰 -->
          <g opacity="0.04" stroke="var(--accent)" stroke-width="0.8" fill="none" class="pg-sprout-decor">
            <path d="M520,680 Q515,660 520,650 Q525,640 530,650 Q535,660 530,670"/>
            <ellipse cx="520" cy="648" rx="5" ry="3" fill="var(--accent)" transform="rotate(-15 520 648)"/>
            <ellipse cx="530" cy="648" rx="5" ry="3" fill="var(--accent)" transform="rotate(15 530 648)"/>
          </g>
        </svg>
      </div>
    </div>
    <!-- ===== 装饰性头部 ===== -->
    <header data-enter class="pg-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">让喜欢的游戏与藏品有一个落脚的地方</p>
      <h1>逸趣阁</h1>
      <div class="header-cards">
        <div class="header-card">
          <span class="header-card-num">{{ pg.games.length }}</span>
          <span class="header-card-label">游戏数</span>
        </div>
        <div class="header-card">
          <span class="header-card-num">{{ pg.totalItems }}</span>
          <span class="header-card-label">藏品数</span>
        </div>
        <div class="header-card">
          <span class="header-card-num">{{ pg.totalGameHours }}</span>
          <span class="header-card-label">总计时长</span>
        </div>
      </div>
    </header>

    <!-- ===== 统计概览行 ===== -->
    <section data-enter class="overview-row">
      <div class="ov-item">
        <span class="ov-num">{{ pg.games.length }}</span>
        <span class="ov-unit">款</span>
        <span class="ov-label">游戏</span>
      </div>
      <div class="ov-item">
        <span class="ov-num">{{ pg.totalGameHours }}</span>
        <span class="ov-unit">h</span>
        <span class="ov-label">总时长</span>
      </div>
      <div class="ov-item">
        <span class="ov-num ov-num--sm">{{ pg.topPlatform }}</span>
        <span class="ov-label">最常玩</span>
      </div>
      <div class="ov-item">
        <span class="ov-num">{{ pg.totalItems }}</span>
        <span class="ov-unit">件</span>
        <span class="ov-label">藏品</span>
      </div>
    </section>

    <!-- 逸趣档案（play-analytics：概览/品类/种子/节律/健康/洞察） -->
    <PlayArchivePanel />

    <!-- 平台分布 -->
    <section data-enter v-if="pg.platformDistribution.length" class="dist-section">
      <div class="section-label">平台分布</div>
      <div class="platform-dist">
        <div v-for="p in pg.platformDistribution" :key="p.platform" class="platform-row">
          <span class="platform-name">{{ p.platform }}</span>
          <div class="platform-bar-wrap">
            <div class="platform-bar" :style="{ width: (p.hours / pg.platformDistribution[0].hours) * 100 + '%' }"></div>
          </div>
          <span class="platform-count">{{ p.count }}款</span>
          <span class="platform-hours">{{ p.hours }}h</span>
        </div>
      </div>
    </section>

    <div data-enter class="tabs">
      <button
        v-for="t in pg.tabs"
        :key="t.key"
        :class="['tab', { active: pg.tab === t.key }]"
        @click="pg.tab = t.key"
      >{{ t.icon }} {{ t.label }}</button>
    </div>

    <!-- ===== 游戏时间轴 ===== -->
    <section data-enter v-if="pg.tab === 'game'" class="panel">
      <!-- 添加表单 -->
      <div class="add-row">
        <input v-model="pg.gameForm.name" placeholder="游戏名称" class="pg-input" />
        <input v-model="pg.gameForm.platform" placeholder="平台" class="pg-input" style="width: 80px" />
        <input v-model.number="pg.gameForm.hours" type="number" min="0" placeholder="小时" class="pg-input" style="width: 70px" />
        <button @click="pg.addGame" class="pg-btn">+</button>
      </div>

      <!-- 月度统计柱状图 -->
      <div v-if="pg.monthlyStats.length" class="chart-section">
        <div class="section-label">月度时长</div>
        <div class="bar-chart">
          <div v-for="m in pg.monthlyStats" :key="m.month" class="bar-col">
            <div class="bar-fill-wrap">
              <div
                class="bar-fill"
                :style="{ height: (m.hours / pg.maxMonthlyHours) * 100 + '%' }"
                :title="m.month + ' ' + m.hours + 'h'"
              ></div>
            </div>
            <span class="bar-label">{{ m.month.slice(5) }}月</span>
            <span class="bar-val">{{ m.hours }}</span>
          </div>
        </div>
      </div>

      <!-- 时长分布 -->
      <div v-if="pg.games.length" class="dist-section">
        <div class="section-label">时长分布</div>
        <div class="dist-row">
          <div class="dist-item">
            <span class="dist-badge dist-badge--lt10">&lt;10h</span>
            <span class="dist-count">{{ pg.distBuckets.lt10 }}</span>
          </div>
          <div class="dist-item">
            <span class="dist-badge dist-badge--10to50">10-50h</span>
            <span class="dist-count">{{ pg.distBuckets.mid }}</span>
          </div>
          <div class="dist-item">
            <span class="dist-badge dist-badge--50to100">50-100h</span>
            <span class="dist-count">{{ pg.distBuckets.high }}</span>
          </div>
          <div class="dist-item">
            <span class="dist-badge dist-badge--100p">100h+</span>
            <span class="dist-count">{{ pg.distBuckets.extreme }}</span>
          </div>
        </div>
      </div>

      <!-- 排序与搜索 -->
      <div v-if="pg.games.length" class="sort-bar">
        <div class="sort-btns">
          <button
            v-for="s in [{ key: 'name', label: '名称' }, { key: 'hours', label: '时长' }, { key: 'date', label: '日期' }]"
            :key="s.key"
            :class="['sort-btn', { active: pg.sortField === s.key }]"
            @click="pg.setSort(s.key as 'name' | 'hours' | 'date')"
          >{{ s.label }}<span v-if="pg.sortField === s.key" class="sort-arrow">{{ pg.sortOrder === 'desc' ? '↓' : '↑' }}</span></button>
        </div>
        <input v-model="pg.searchQuery" placeholder="搜索游戏…" class="search-input pg-input" />
      </div>

      <!-- 游戏列表（自适应网格：宽屏多列减滚屏，窄屏自动单列） -->
      <div v-if="pg.games.length" class="game-list hf-room-grid--wide">
        <div v-for="g in (pg.searchQuery ? pg.filteredGames : pg.sortedGames)" :key="g.id" class="game-card">
          <span class="game-icon">🎮</span>
          <div class="game-info">
            <span class="game-name">
              {{ g.name }}
              <span class="game-platform">{{ g.platform }}</span>
            </span>
            <div class="game-time-bar">
              <div class="game-time-fill" :style="{ width: pg.gameBarWidth(g.hours) + '%' }"></div>
            </div>
          </div>
          <span class="game-hours">{{ g.hours }}h</span>
          <span class="game-date">{{ pg.fmt(g.at) }}</span>
          <button class="pg-del" @click="pg.removeGame(g.id)">x</button>
        </div>
      </div>

      <!-- 游戏统计 -->
      <div v-if="pg.games.length" class="game-stats">
        <span>总计 {{ pg.totalGameHours }}h . {{ pg.games.length }} 款游戏</span>
        <span>最常玩: {{ pg.topGame }}</span>
      </div>
    </section>

    <!-- ===== 玩具收藏 ===== -->
    <section v-if="pg.tab === 'toy'" class="panel">
      <!-- 添加表单 -->
      <div class="add-row">
        <input v-model="pg.toyForm.name" placeholder="玩具名称" class="pg-input" />
        <input v-model="pg.toyForm.note" placeholder="故事…" class="pg-input" />
        <select v-model="pg.toyForm.value" class="pg-select">
          <option value="mint">全新</option>
          <option value="light">轻微</option>
          <option value="used">常用</option>
          <option value="display">展示</option>
        </select>
        <button @click="pg.addToy" class="pg-btn">+</button>
      </div>

      <!-- 收藏状态筛选 -->
      <div v-if="pg.toys.length" class="filter-row">
        <button
          v-for="f in pg.toyFilters"
          :key="f.key"
          :class="['filter-chip', { active: pg.toyFilter === f.key }]"
          @click="pg.toyFilter = f.key"
        >{{ f.label }}</button>
      </div>

      <!-- 玩具列表 -->
      <div class="item-grid hf-room-grid" v-if="pg.filteredToys.length">
        <div v-for="t in pg.filteredToys" :key="t.id" class="item-card">
          <span class="item-icon">🧸</span>
          <div class="item-info">
            <span class="item-name">{{ t.name }}</span>
            <span class="item-meta" v-if="t.note">{{ t.note }}</span>
          </div>
          <span :class="['value-tag', 'value-tag--' + t.value]">{{ pg.valueLabel(t.value) }}</span>
          <span class="item-date">{{ pg.fmt(t.at) }}</span>
          <button class="pg-del" @click="pg.removeToy(t.id)">x</button>
        </div>
      </div>
      <div v-else-if="pg.toys.length" class="filter-empty">当前筛选条件下无结果</div>
    </section>

    <!-- ===== 模型/手办 ===== -->
    <section v-if="pg.tab === 'model'" class="panel">
      <!-- 添加表单 -->
      <div class="add-row">
        <input v-model="pg.modelForm.name" placeholder="模型名称" class="pg-input" />
        <input v-model="pg.modelForm.series" placeholder="系列/IP" class="pg-input" />
        <select v-model="pg.modelForm.status" class="pg-select">
          <option value="sealed">未开封</option>
          <option value="display">展示</option>
          <option value="opened">拆盒</option>
        </select>
        <button @click="pg.addModel" class="pg-btn">+</button>
      </div>

      <!-- 系列分组显示 -->
      <div v-if="pg.modelGroups.length" class="series-section">
        <div v-for="group in pg.modelGroups" :key="group.series" class="series-group">
          <div class="series-title">{{ group.series || '未分类' }}
            <span class="series-count">{{ group.items.length }}</span>
          </div>
          <!-- 自适应网格：类名虽为 item-grid，原本实为单列 flex，此处接入基类改为真网格 -->
          <div class="item-grid hf-room-grid">
            <div v-for="m in group.items" :key="m.id" class="item-card">
              <span class="item-icon">🗿</span>
              <div class="item-info">
                <span class="item-name">{{ m.name }}</span>
                <span class="item-meta" v-if="m.series">{{ m.series }}</span>
              </div>
              <span :class="['status-badge', 'status-badge--' + m.status]">{{ pg.statusLabel(m.status) }}</span>
              <span class="item-date">{{ pg.fmt(m.at) }}</span>
              <button class="pg-del" @click="pg.removeModel(m.id)">x</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 其他收藏 ===== -->
    <section v-if="pg.tab === 'other'" class="panel">
      <!-- 添加表单 -->
      <div class="add-row">
        <input v-model="pg.otherForm.name" placeholder="藏品名称" class="pg-input" />
        <input v-model="pg.otherForm.cat" placeholder="类别" class="pg-input" style="width: 80px" />
        <button @click="pg.addOther" class="pg-btn">+</button>
      </div>

      <!-- 搜索 -->
      <div v-if="pg.others.length" class="search-row">
        <input v-model="pg.otherSearch" placeholder="搜索藏品…" class="pg-input search-input" />
      </div>

      <!-- 其他列表 -->
      <div class="item-grid hf-room-grid" v-if="pg.filteredOthers.length">
        <div v-for="o in pg.filteredOthers" :key="o.id" class="item-card">
          <span class="item-icon">📦</span>
          <div class="item-info">
            <span class="item-name">{{ o.name }}</span>
          </div>
          <span v-if="o.cat" class="cat-tag">{{ o.cat }}</span>
          <span class="item-date">{{ pg.fmt(o.at) }}</span>
          <button class="pg-del" @click="pg.removeOther(o.id)">x</button>
        </div>
      </div>
      <div v-else-if="pg.others.length && pg.otherSearch && !pg.filteredOthers.length" class="filter-empty">未找到匹配的藏品</div>
    </section>

    <!-- ===== 最近添加 ===== -->
    <section v-if="pg.recentItems.length" class="recent-section">
      <div class="section-label">最近添加</div>
      <div class="recent-list">
        <div v-for="item in pg.recentItems" :key="item.id" class="recent-item">
          <span class="recent-icon">{{ item.icon }}</span>
          <span class="recent-name">{{ item.name }}</span>
          <span class="recent-cat" v-if="item.sub">{{ item.sub }}</span>
          <span class="recent-date">{{ pg.fmt(item.at) }}</span>
        </div>
      </div>
    </section>

    <!-- ===== 时间种子（生长阶段动画） ===== -->
    <section class="seeds-section">
      <div class="section-label">🌱 时间种子</div>
      <p class="seeds-desc">种下一颗种子，记录此刻的心情与状态。随时间生长，每日可浇水一次。</p>

      <div class="seed-form">
        <input v-model="seedForm.content" placeholder="记录此刻的心情…" class="pg-input" />
        <div class="mood-picker">
          <button
            v-for="(emoji, mood) in MOOD_ICONS"
            :key="mood"
            :class="['mood-btn', { active: seedForm.mood === mood }]"
            @click="seedForm.mood = mood as TimeSeed['mood']"
            :title="MOOD_LABELS[mood]"
          >{{ emoji }}</button>
        </div>
        <button @click="plantSeed" class="pg-btn">种下</button>
      </div>

      <div v-if="timeSeeds.length" class="seed-list">
        <div
          v-for="seed in sortedSeeds"
          :key="seed.id"
          class="seed-card"
          :class="'seed-stage--' + getGrowthStage(seed).stage"
        >
          <div class="seed-card-header" role="button" tabindex="0" :aria-expanded="activeSeedId === seed.id" :aria-label="'展开或收起种子 ' + seed.content" @click="toggleSeed(seed.id)" @keydown.enter.prevent="toggleSeed(seed.id)" @keydown.space.prevent="toggleSeed(seed.id)">
            <!-- 生长阶段 SVG 图标 -->
            <svg class="seed-svg" viewBox="0 0 32 32" width="28" height="28">
              <!-- 种子阶段 -->
              <template v-if="getGrowthStage(seed).stage === 'seed'">
                <ellipse cx="16" cy="18" rx="5" ry="7" :fill="getGrowthStage(seed).color + '22'" :stroke="getGrowthStage(seed).color + '44'" stroke-width="0.8"/>
                <path d="M14 12 Q16 8 18 12" fill="none" :stroke="getGrowthStage(seed).color + '55'" stroke-width="0.6"/>
              </template>
              <!-- 发芽阶段 -->
              <template v-else-if="getGrowthStage(seed).stage === 'sprout'">
                <ellipse cx="16" cy="20" rx="5" ry="5" fill="rgba(139,90,43,0.15)" stroke="rgba(139,90,43,0.25)" stroke-width="0.6"/>
                <path d="M16 18 Q14 10 10 6" fill="none" :stroke="getGrowthStage(seed).color + '55'" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M16 18 Q18 10 22 6" fill="none" :stroke="getGrowthStage(seed).color + '55'" stroke-width="1.2" stroke-linecap="round"/>
                <ellipse cx="16" cy="18" rx="2" ry="3" fill="none" :stroke="getGrowthStage(seed).color + '33'" stroke-width="0.5"/>
              </template>
              <!-- 幼苗阶段 -->
              <template v-else-if="getGrowthStage(seed).stage === 'seedling'">
                <ellipse cx="16" cy="22" rx="6" ry="4" fill="rgba(139,90,43,0.12)" stroke="rgba(139,90,43,0.2)" stroke-width="0.5"/>
                <rect x="15" y="12" width="2" height="10" rx="1" :fill="getGrowthStage(seed).color + '44'"/>
                <path d="M16 16 Q10 10 6 6" fill="none" :stroke="getGrowthStage(seed).color + '55'" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M16 16 Q22 10 26 6" fill="none" :stroke="getGrowthStage(seed).color + '55'" stroke-width="1.2" stroke-linecap="round"/>
                <ellipse cx="6" cy="6" rx="3" ry="2" :fill="getGrowthStage(seed).color + '33'" transform="rotate(-30, 6, 6)"/>
                <ellipse cx="26" cy="6" rx="3" ry="2" :fill="getGrowthStage(seed).color + '33'" transform="rotate(30, 26, 6)"/>
              </template>
              <!-- 开花阶段 -->
              <template v-else>
                <ellipse cx="16" cy="23" rx="7" ry="4" fill="rgba(139,90,43,0.1)" stroke="rgba(139,90,43,0.18)" stroke-width="0.5"/>
                <rect x="15" y="12" width="2" height="11" rx="1" :fill="getGrowthStage(seed).color + '55'"/>
                <path d="M16 16 Q10 10 5 6" fill="none" :stroke="getGrowthStage(seed).color + '66'" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M16 16 Q22 10 27 6" fill="none" :stroke="getGrowthStage(seed).color + '66'" stroke-width="1.3" stroke-linecap="round"/>
                <ellipse cx="5" cy="5" rx="3.5" ry="2.5" :fill="getGrowthStage(seed).color + '40'" transform="rotate(-25, 5, 5)"/>
                <ellipse cx="27" cy="5" rx="3.5" ry="2.5" :fill="getGrowthStage(seed).color + '40'" transform="rotate(25, 27, 5)"/>
                <!-- 花朵 -->
                <g transform="translate(16, 10)">
                  <circle cx="0" cy="-3" r="2.5" :fill="getGrowthStage(seed).flowerColor + '55'" opacity="0.8">
                    <animate attributeName="r" values="2.2;2.8;2.2" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="-3" r="1.2" fill="#f0c040" opacity="0.5"/>
                  <circle cx="-2.5" cy="-1" r="2" :fill="getGrowthStage(seed).flowerColor + '40'" opacity="0.6"/>
                  <circle cx="2.5" cy="-1" r="2" :fill="getGrowthStage(seed).flowerColor + '40'" opacity="0.6"/>
                  <circle cx="-1.5" cy="2" r="2" :fill="getGrowthStage(seed).flowerColor + '35'" opacity="0.5"/>
                  <circle cx="1.5" cy="2" r="2" :fill="getGrowthStage(seed).flowerColor + '35'" opacity="0.5"/>
                </g>
              </template>
            </svg>
            <div class="seed-info-col">
              <span class="seed-mood">{{ MOOD_ICONS[seed.mood] }}</span>
              <span class="seed-stage-label" :style="{ color: getGrowthStage(seed).color }">
                {{ getGrowthStage(seed).label }}
              </span>
            </div>
            <span class="seed-date">{{ pg.fmt(seed.createdAt) }}</span>
            <!-- 浇水按钮 -->
            <button
              class="seed-water-btn"
              :class="{ watered: isWateredToday(seed) }"
              @click.stop="waterSeed(seed)"
              :disabled="isWateredToday(seed)"
              :title="isWateredToday(seed) ? '今日已浇水' : '浇水加速生长'"
            >
              <svg viewBox="0 0 16 16" width="12" height="12">
                <path d="M8 2 C8 2 3 7 3 10.5 C3 13.5 5.2 15 8 15 C10.8 15 13 13.5 13 10.5 C13 7 8 2 8 2Z"
                  :fill="isWateredToday(seed) ? 'rgba(96,165,250,0.2)' : 'rgba(96,165,250,0.08)'"
                  :stroke="isWateredToday(seed) ? 'rgba(96,165,250,0.5)' : 'rgba(96,165,250,0.2)'"
                  stroke-width="0.8"/>
              </svg>
            </button>
          </div>
          <!-- 生长进度条 -->
          <div class="seed-progress-bar">
            <div
              class="seed-progress-fill"
              :style="{
                width: getGrowthStage(seed).progress + '%',
                background: getGrowthStage(seed).progressColor
              }"
            ></div>
            <span class="seed-progress-text">{{ getGrowthStage(seed).progressText }}</span>
          </div>
          <transition name="germinate">
            <div v-if="activeSeedId === seed.id" class="seed-body">
              <div class="seed-growth-meta">
                <span class="sgm-item">
                  <span class="sgm-label">生长阶段</span>
                  <span class="sgm-value" :style="{ color: getGrowthStage(seed).color }">{{ getGrowthStage(seed).label }}</span>
                </span>
                <span class="sgm-item">
                  <span class="sgm-label">已种下</span>
                  <span class="sgm-value">{{ getGrowthStage(seed).elapsed }}</span>
                </span>
                <span class="sgm-item">
                  <span class="sgm-label">浇水</span>
                  <span class="sgm-value">{{ seed.waterCount || 0 }} 次</span>
                </span>
              </div>
              <div class="seed-sprout">
                <svg viewBox="0 0 48 24" width="48" height="24">
                  <path d="M24 24 Q16 12 8 4 Q16 8 24 12 Q32 8 40 4 Q32 12 24 24"
                    fill="none"
                    :stroke="getGrowthStage(seed).color + '55'"
                    stroke-width="1.2"
                    stroke-linecap="round">
                    <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
              <p class="seed-content-text">{{ seed.content }}</p>
            </div>
          </transition>
        </div>
      </div>
      <div v-else class="seeds-empty">还没有时间种子，种下第一颗吧</div>
    </section>

    <!-- ===== 时间种子的遗传（第46/47/48条治理面板 · 发送端） ===== -->
    <SeedInheritancePanel :seeds="collectionSeeds" />

    <!-- ===== 接收匣（第46条单向赠予落点 · 接收端） ===== -->
    <ReceivedSeedsInbox />

    <!-- 空状态 -->
    <div v-if="pg.isEmpty" class="empty">
      <span class="empty-icon">🎮</span>
      <p>还没有记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { usePlayGallery } from '../modules/play'
import { usePlaySeeds, type TimeSeed } from '../modules/play/seeds'
import {
  seedFromGame,
  seedFromToy,
  seedFromModel,
  seedFromOther,
  type TimeSeed as CollectionSeed,
} from '../modules/play'
import SeedInheritancePanel from '../components/SeedInheritancePanel.vue'
import ReceivedSeedsInbox from '../components/ReceivedSeedsInbox.vue'
import PlayArchivePanel from '../components/PlayArchivePanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'

// ===== 时间种子（生长阶段系统） =====

const { entranceRef, entranceClass } = useViewEntrance()

const MOOD_ICONS: Record<TimeSeed['mood'], string> = {
  happy: '😊',
  calm: '😌',
  sad: '😢',
  excited: '🤩',
  tired: '😴',
}

const MOOD_LABELS: Record<TimeSeed['mood'], string> = {
  happy: '开心',
  calm: '平静',
  sad: '难过',
  excited: '兴奋',
  tired: '疲惫',
}

// 生长阶段定义
interface GrowthStage {
  stage: 'seed' | 'sprout' | 'seedling' | 'bloom'
  label: string
  color: string
  flowerColor: string
  progress: number     // 0-100
  progressColor: string
  progressText: string
  elapsed: string
}

// 心情→植物花色映射
const MOOD_FLOWER_COLORS: Record<TimeSeed['mood'], string> = {
  happy: '#f0c040',    // 向日葵黄
  calm: '#a07c8c',     // 薰衣草紫
  sad: '#6b9fc4',      // 勿忘我蓝
  excited: '#f87171',  // 仙人掌花红
  tired: '#f0c040',    // 夜来香金
}

// 生长阶段颜色
const STAGE_COLORS: Record<string, string> = {
  seed: '#8b7355',
  sprout: '#34d399',
  seedling: '#22c55e',
  bloom: '#f0c040',
}

const STAGE_LABELS: Record<string, string> = {
  seed: '种子',
  sprout: '发芽',
  seedling: '幼苗',
  bloom: '开花',
}

// 阶段时长阈值（毫秒），考虑浇水加速
const STAGE_THRESHOLDS: { stage: 'seed' | 'sprout' | 'seedling' | 'bloom'; ms: number }[] = [
  { stage: 'seed', ms: 24 * 60 * 60 * 1000 },       // 0-1天
  { stage: 'sprout', ms: 3 * 24 * 60 * 60 * 1000 },  // 1-3天
  { stage: 'seedling', ms: 7 * 24 * 60 * 60 * 1000 }, // 3-7天
  { stage: 'bloom', ms: Infinity },                    // 7天+
]

// 每次浇水加速 4 小时
const WATER_BOOST_MS = 4 * 60 * 60 * 1000

// 时间种子数据层已下沉至 usePlaySeeds（键 hf:play_seeds）
const seeds = usePlaySeeds()
const timeSeeds = seeds.seeds

const seedForm = reactive({ content: '', mood: 'calm' as TimeSeed['mood'] })

function plantSeed() {
  if (!seedForm.content.trim()) return
  timeSeeds.value.unshift({
    id: `sd${Date.now()}`,
    content: seedForm.content,
    mood: seedForm.mood,
    createdAt: new Date().toISOString(),
    waterCount: 0,
    lastWateredAt: undefined,
  })
  seeds.save(timeSeeds.value)
  seedForm.content = ''
  seedForm.mood = 'calm'
}

const activeSeedId = ref<string | null>(null)

function toggleSeed(id: string) {
  activeSeedId.value = activeSeedId.value === id ? null : id
}

const sortedSeeds = computed(() => {
  return [...timeSeeds.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

// 计算有效生长时间（考虑浇水加速）
function getEffectiveAge(seed: TimeSeed): number {
  const now = Date.now()
  const plantedAt = new Date(seed.createdAt).getTime()
  const elapsed = now - plantedAt
  const waterBoost = (seed.waterCount || 0) * WATER_BOOST_MS
  return Math.max(0, elapsed + waterBoost)
}

// 获取生长阶段
function getGrowthStage(seed: TimeSeed): GrowthStage {
  const effectiveAge = getEffectiveAge(seed)
  const plantedAt = new Date(seed.createdAt).getTime()
  const now = Date.now()
  const realElapsed = now - plantedAt

  let stageIndex = 0
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (effectiveAge < STAGE_THRESHOLDS[i].ms) {
      stageIndex = i
      break
    }
  }

  const currentStage = STAGE_THRESHOLDS[stageIndex].stage
  const prevThreshold = stageIndex > 0 ? STAGE_THRESHOLDS[stageIndex - 1].ms : 0
  const nextThreshold = STAGE_THRESHOLDS[stageIndex].ms
  const stageProgress = nextThreshold === Infinity
    ? 100
    : Math.min(100, Math.round(((effectiveAge - prevThreshold) / (nextThreshold - prevThreshold)) * 100))

  // 进度条渐变色
  const progressColors: Record<string, string> = {
    seed: 'linear-gradient(90deg, #8b7355, #a08060)',
    sprout: 'linear-gradient(90deg, #34d399, #22c55e)',
    seedling: 'linear-gradient(90deg, #22c55e, #16a34a)',
    bloom: 'linear-gradient(90deg, #f0c040, #c4956a)',
  }

  // 阶段内的进度文字
  let progressText = ''
  if (currentStage === 'seed') {
    const hoursLeft = Math.max(0, Math.ceil((STAGE_THRESHOLDS[0].ms - effectiveAge) / (60 * 60 * 1000)))
    progressText = hoursLeft > 0 ? `约 ${hoursLeft} 小时后发芽` : '即将发芽'
  } else if (currentStage === 'sprout') {
    const hoursLeft = Math.max(0, Math.ceil((STAGE_THRESHOLDS[1].ms - effectiveAge) / (60 * 60 * 1000)))
    progressText = hoursLeft > 0 ? `约 ${hoursLeft} 小时后长成幼苗` : '即将长成幼苗'
  } else if (currentStage === 'seedling') {
    const daysLeft = Math.max(0, Math.ceil((STAGE_THRESHOLDS[2].ms - effectiveAge) / (24 * 60 * 60 * 1000)))
    progressText = daysLeft > 0 ? `约 ${daysLeft} 天后开花` : '即将开花'
  } else {
    progressText = '已盛开'
  }

  // 已种下时长
  const totalDays = Math.floor(realElapsed / (24 * 60 * 60 * 1000))
  const totalHours = Math.floor(realElapsed / (60 * 60 * 1000))
  let elapsed = ''
  if (totalDays > 0) {
    elapsed = `${totalDays} 天`
  } else if (totalHours > 0) {
    elapsed = `${totalHours} 小时`
  } else {
    elapsed = '刚刚'
  }

  return {
    stage: currentStage,
    label: STAGE_LABELS[currentStage],
    color: STAGE_COLORS[currentStage],
    flowerColor: MOOD_FLOWER_COLORS[seed.mood],
    progress: stageProgress,
    progressColor: progressColors[currentStage],
    progressText,
    elapsed,
  }
}

// 判断今天是否已浇水
function isWateredToday(seed: TimeSeed): boolean {
  if (!seed.lastWateredAt) return false
  const lastWatered = new Date(seed.lastWateredAt)
  const now = new Date()
  return (
    lastWatered.getFullYear() === now.getFullYear() &&
    lastWatered.getMonth() === now.getMonth() &&
    lastWatered.getDate() === now.getDate()
  )
}

// 浇水
function waterSeed(seed: TimeSeed) {
  if (isWateredToday(seed)) return
  seed.waterCount = (seed.waterCount || 0) + 1
  seed.lastWateredAt = new Date().toISOString()
  seeds.save(timeSeeds.value)
}

const pg = reactive(usePlayGallery())

// 由收藏记录生成「时间种子」（接入遗传分享治理层）
const collectionSeeds = computed<CollectionSeed[]>(() => {
  const out: CollectionSeed[] = []
  pg.games.forEach(g => out.push(seedFromGame(g)))
  pg.toys.forEach(t => out.push(seedFromToy(t)))
  pg.models.forEach(m => out.push(seedFromModel(m)))
  pg.others.forEach(o => out.push(seedFromOther(o)))
  return out
})
</script>

<style scoped>
/* ===== 布局 ===== */
.play {
  max-width: 520px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100%;
  overflow-y: auto;
  background: transparent;
  color: var(--text-high);
}

/* 氛围背景层 */
.pg-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.pg-glow {
  position: absolute;
  pointer-events: none;
}
.pg-glow--top {
  top: -150px;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 350px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}
.pg-glow--bottom {
  bottom: -150px;
  left: 50%;
  transform: translateX(-50%);
  width: 450px;
  height: 280px;
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
}

/* SVG 装饰层 */
.pg-svg-decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.pg-svg-decor svg {
  width: 100%;
  height: 100%;
  opacity: 0.7;
}

/* 星尘闪烁 */
.pg-star {
  animation: pg-star-twinkle 3.5s ease-in-out infinite;
}
.pg-star--1 { animation-delay: 0s; }
.pg-star--2 { animation-delay: -0.4s; }
.pg-star--3 { animation-delay: -0.8s; }
.pg-star--4 { animation-delay: -1.2s; }
.pg-star--5 { animation-delay: -1.6s; }
.pg-star--6 { animation-delay: -2s; }
.pg-star--7 { animation-delay: -2.4s; }
.pg-star--8 { animation-delay: -2.8s; }
.pg-star--9 { animation-delay: -3.2s; }
.pg-star--10 { animation-delay: -0.2s; }
.pg-star--11 { animation-delay: -1s; }
.pg-star--12 { animation-delay: -2s; }
@keyframes pg-star-twinkle {
  0%, 100% { opacity: 0.05; transform: scale(1); }
  50% { opacity: 0.15; transform: scale(1.5); }
}

/* 星辰连线呼吸 */
.pg-constellation {
  animation: pg-constellation-breathe 8s ease-in-out infinite;
}
@keyframes pg-constellation-breathe {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.06; }
}

/* 骰子旋转 */
.pg-dice {
  animation: pg-dice-roll 12s ease-in-out infinite;
  transform-origin: 80px 630px;
}
@keyframes pg-dice-roll {
  0%, 100% { transform: rotate(0deg); opacity: 0.03; }
  50% { transform: rotate(15deg); opacity: 0.05; }
}

/* 嫩芽微动 */
.pg-sprout-decor {
  animation: pg-sprout-sway 6s ease-in-out infinite;
  transform-origin: 525px 660px;
}
@keyframes pg-sprout-sway {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  75% { transform: rotate(-2deg); }
}

/* ===== 装饰性头部 ===== */
.pg-header {
  text-align: center;
  margin-bottom: 28px;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.orn-line {
  display: block;
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}
.orn-diamond {
  font-size: 8px;
  color: var(--accent);
  opacity: 0.35;
}
.header-kicker {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.pg-header h1 {
  font-family: var(--font-heading-en);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 4px;
  color: rgba(var(--text-primary-rgb), 0.92);
  margin-bottom: 20px;
}
.header-cards {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.header-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  padding: 10px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.header-card-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}
.header-card-label {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ===== 统计概览行 ===== */
.overview-row {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  justify-content: center;
}
.ov-item {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  padding: 10px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.ov-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}
.ov-num--sm {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}
.ov-unit {
  font-size: 10px;
  color: var(--text-secondary);
  margin-left: 1px;
}
.ov-label {
  font-size: 10px;
  color: var(--text-secondary);
}

/* ===== Tabs ===== */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  justify-content: center;
}
.tab {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-low);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.tab:hover { color: var(--text-high); }
.tab.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

/* ===== Form elements ===== */
.add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.pg-input {
  flex: 1;
  min-width: 70px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.pg-input:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.pg-select {
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-high);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.pg-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.pg-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
*:hover > .pg-del { opacity: 1; }
.pg-del:hover { color: var(--danger); }

/* ===== Section labels ===== */
.section-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
  letter-spacing: 1px;
}

/* ===== 柱状图 ===== */
.chart-section { margin-bottom: 18px; }
.bar-chart {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 80px;
  padding: 0 4px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  height: 100%;
}
.bar-fill-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar-fill {
  width: 70%;
  max-width: 28px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #e8c8a8, var(--accent));
  transition: height 0.4s;
  min-height: 2px;
}
.bar-label {
  font-size: 9px;
  color: var(--text-secondary);
}
.bar-val {
  font-size: 9px;
  color: var(--text-secondary);
  font-weight: 600;
}

/* ===== 时长分布 ===== */
.dist-section { margin-bottom: 18px; }
.dist-row {
  display: flex;
  gap: 6px;
}
.dist-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.dist-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.dist-badge--lt10 { background: rgba(52, 211, 153, 0.15); color: var(--success); }
.dist-badge--10to50 { background: rgba(107, 159, 196, 0.15); color: #6b9fc4; }
.dist-badge--50to100 { background: rgba(240, 192, 64, 0.15); color: #f0c040; }
.dist-badge--100p { background: rgba(239, 68, 68, 0.15); color: var(--error); }
.dist-count {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-bright);
}

/* ===== 游戏列表 ===== */
.game-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.game-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-left: 3px solid var(--accent);
}
.game-card:hover {
  background: rgba(55, 48, 40, 0.7);
}
.game-icon { font-size: 22px; }
.game-info { flex: 1; }
.game-name {
  font-size: 14px;
  font-weight: 500;
  display: block;
}
.game-platform {
  font-size: 10px;
  color: var(--text-secondary);
  margin-left: 4px;
}
.game-time-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--bg-card);
  overflow: hidden;
  margin-top: 4px;
}
.game-time-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), #c4956a);
  transition: width 0.5s;
}
.game-hours {
  font-size: 13px;
  font-weight: 600;
  color: #c4956a;
}
.game-date {
  font-size: 11px;
  color: var(--text-secondary);
}
.game-stats {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 筛选行 ===== */
.filter-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-low);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  min-height: 26px;
}
.filter-chip:hover { color: var(--text-high); }
.filter-chip.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

/* ===== 搜索行 ===== */
.search-row { margin-bottom: 12px; }
.search-input { width: 100%; box-sizing: border-box; }

/* ===== 通用网格 ===== */
.item-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.item-card:hover {
  background: rgba(55, 48, 40, 0.7);
}
.item-icon { font-size: 20px; }
.item-info { flex: 1; }
.item-name {
  font-size: 13px;
  font-weight: 500;
}
.item-meta {
  font-size: 11px;
  color: var(--text-secondary);
}
.item-date {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ===== 收藏价值标签 ===== */
.value-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}
.value-tag--mint { background: rgba(52, 211, 153, 0.15); color: var(--success); }
.value-tag--light { background: rgba(107, 159, 196, 0.15); color: #6b9fc4; }
.value-tag--used { background: rgba(240, 192, 64, 0.15); color: #f0c040; }
.value-tag--display { background: rgba(160, 124, 140, 0.15); color: #a07c8c; }

/* ===== 收藏状态标签 ===== */
.status-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
}
.status-badge--sealed { background: rgba(52, 211, 153, 0.15); color: var(--success); }
.status-badge--display { background: rgba(160, 124, 140, 0.15); color: #a07c8c; }
.status-badge--opened { background: rgba(240, 192, 64, 0.15); color: #f0c040; }

/* ===== 类别标签 ===== */
.cat-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

/* ===== 系列分组 ===== */
.series-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.series-group {
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  padding: 10px;
  background: var(--bg-card);
}
.series-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(var(--text-primary-rgb), 0.6);
  display: flex;
  align-items: center;
  gap: 6px;
}
.series-count {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ===== 最近添加 ===== */
.recent-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-card);
}
.recent-item:hover {
  background: rgba(55, 48, 40, 0.7);
}
.recent-icon { font-size: 16px; }
.recent-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}
.recent-cat {
  font-size: 10px;
  color: var(--text-secondary);
}
.recent-date {
  font-size: 11px;
  color: var(--text-secondary);
}

/* ===== 空状态 & 筛选空 ===== */
.empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.filter-empty {
  text-align: center;
  padding: 24px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 排序与搜索 ===== */
.sort-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.sort-btns {
  display: flex;
  gap: 4px;
}
.sort-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--text-low);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  min-height: 26px;
}
.sort-btn:hover { color: var(--text-high); }
.sort-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}
.sort-arrow {
  margin-left: 2px;
  font-size: 10px;
}

/* ===== 平台分布 ===== */
.platform-dist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.platform-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.platform-name {
  font-size: 12px;
  font-weight: 500;
  min-width: 50px;
  color: var(--text-bright);
}
.platform-bar-wrap {
  flex: 1;
  height: 6px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
}
.platform-bar {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--accent), #c4956a);
  transition: width 0.4s;
}
.platform-count {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.45);
  min-width: 30px;
  text-align: right;
}
.platform-hours {
  font-size: 12px;
  font-weight: 600;
  color: #c4956a;
  min-width: 40px;
  text-align: right;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .play { padding: 32px 20px 64px; }
  .header-cards { gap: 8px; }
  .header-card { padding: 12px 8px; }
  .item-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .play { padding: 24px 14px 56px; }
  .header-cards { flex-direction: column; }
  .section-label { font-size: 12px; }
}

@media (max-width: 480px) {
  .play { padding: 12px; }
  .header-cards { flex-direction: column; gap: 6px; }
  .item-grid { gap: 4px; }
}

/* ===== 时间种子 ===== */
.seeds-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}
.seeds-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 12px;
}
.seed-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.mood-picker {
  display: flex;
  gap: 6px;
}
.mood-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.mood-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(55, 48, 40, 0.7);
}
.mood-btn.active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.15);
  transform: scale(1.15);
}
.seed-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.seed-card {
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
  transition: border-color 0.2s;
}
.seed-card:hover {
  background: rgba(55, 48, 40, 0.7);
}
/* 阶段边框颜色 */
.seed-card.seed-stage--seed { border-left: 2px solid rgba(139, 115, 85, 0.3); }
.seed-card.seed-stage--sprout { border-left: 2px solid rgba(52, 211, 153, 0.35); }
.seed-card.seed-stage--seedling { border-left: 2px solid rgba(34, 197, 94, 0.4); }
.seed-card.seed-stage--bloom { border-left: 2px solid rgba(240, 192, 64, 0.45); }
.seed-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  user-select: none;
}
.seed-card-header:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-radius: 8px;
}
.seed-svg {
  flex-shrink: 0;
  display: block;
}
.seed-info-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.seed-mood {
  font-size: 16px;
  line-height: 1.2;
}
.seed-stage-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.5px;
}
.seed-date {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: auto;
  flex-shrink: 0;
}
/* 浇水按钮 */
.seed-water-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(107, 159, 196, 0.15);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.25s;
  padding: 0;
}
.seed-water-btn:hover:not(:disabled) {
  border-color: rgba(96, 165, 250, 0.4);
  background: rgba(96, 165, 250, 0.08);
  transform: scale(1.15);
}
.seed-water-btn:active:not(:disabled) {
  transform: scale(0.9);
}
.seed-water-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.seed-water-btn.watered {
  border-color: rgba(96, 165, 250, 0.3);
  background: rgba(96, 165, 250, 0.06);
}
/* 生长进度条 */
.seed-progress-bar {
  position: relative;
  height: 14px;
  margin: 0 10px 10px;
  border-radius: 7px;
  background: rgba(var(--bg-card-rgb), 0.5);
  overflow: hidden;
}
.seed-progress-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.6s ease-out;
  min-width: 2px;
  position: relative;
}
.seed-progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%);
  border-radius: 7px;
}
.seed-progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: var(--text-medium);
  pointer-events: none;
}
/* 生长元数据 */
.seed-growth-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
}
.sgm-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sgm-label {
  font-size: 10px;
  color: var(--text-low);
}
.sgm-value {
  font-size: 12px;
  font-weight: 600;
}
.seed-body {
  padding: 0 10px 10px 42px;
  animation: germinate-in 0.4s ease-out;
}
.seed-sprout {
  margin-bottom: 4px;
}
.seed-content-text {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.75);
  line-height: 1.5;
  margin: 0;
}
.seeds-empty {
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

@keyframes germinate-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.germinate-enter-active {
  animation: germinate-in 0.4s ease-out;
}
.germinate-leave-active {
  animation: germinate-in 0.25s ease-in reverse;
}
</style>