<template>
  <div ref="entranceRef" class="view-entrance emotion-garden" :class="[entranceClass, ambientClass]">
    <!-- 氛围背景层：花房 · 温室花园 -->
    <div data-enter class="garden-ambient" aria-hidden="true">
      <div class="garden-glow garden-glow--top"></div>
      <div class="garden-glow garden-glow--mid"></div>
      <div class="garden-glow garden-glow--bottom"></div>
      <!-- 花房 SVG 装饰 -->
      <div class="garden-svg-decor" aria-hidden="true">
        <svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="gardenCoreGlow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.05"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="vineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.06"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <!-- 中心光晕 -->
          <circle cx="300" cy="300" r="280" fill="url(#gardenCoreGlow)"/>
          <!-- 藤蔓左 -->
          <g opacity="0.06" stroke="var(--accent)" stroke-width="0.8" fill="none" class="garden-vine garden-vine--left">
            <path d="M40,100 Q60,80 55,130 Q50,180 70,210 Q90,240 65,280 Q40,320 60,360 Q80,400 55,450 Q30,500 50,550 Q70,600 45,650"/>
            <path d="M55,130 Q80,120 85,155 Q90,190 80,200" class="vine-branch"/>
            <path d="M65,280 Q100,270 95,310 Q90,340 75,330" class="vine-branch"/>
            <path d="M55,450 Q90,440 85,480 Q80,510 60,500" class="vine-branch"/>
          </g>
          <!-- 藤蔓右 -->
          <g opacity="0.06" stroke="var(--accent)" stroke-width="0.8" fill="none" class="garden-vine garden-vine--right">
            <path d="M560,150 Q540,130 545,180 Q550,230 530,260 Q510,290 535,330 Q560,370 540,420 Q520,470 545,520 Q570,570 550,620 Q530,670 555,720"/>
            <path d="M545,180 Q520,170 515,205 Q510,240 525,250" class="vine-branch"/>
            <path d="M535,330 Q500,320 505,360 Q510,390 525,380" class="vine-branch"/>
            <path d="M545,520 Q510,510 515,550 Q520,580 540,570" class="vine-branch"/>
          </g>
          <!-- 叶片 -->
          <g fill="var(--accent)" opacity="0.04" class="garden-leaves">
            <ellipse cx="80" cy="150" rx="8" ry="4" transform="rotate(-30 80 150)"/>
            <ellipse cx="90" cy="240" rx="7" ry="3.5" transform="rotate(20 90 240)"/>
            <ellipse cx="75" cy="330" rx="8" ry="4" transform="rotate(-15 75 330)"/>
            <ellipse cx="85" cy="480" rx="7" ry="3.5" transform="rotate(25 85 480)"/>
            <ellipse cx="70" cy="600" rx="8" ry="4" transform="rotate(-20 70 600)"/>
            <ellipse cx="520" cy="180" rx="8" ry="4" transform="rotate(30 520 180)"/>
            <ellipse cx="510" cy="290" rx="7" ry="3.5" transform="rotate(-20 510 290)"/>
            <ellipse cx="525" cy="380" rx="8" ry="4" transform="rotate(15 525 380)"/>
            <ellipse cx="515" cy="550" rx="7" ry="3.5" transform="rotate(-25 515 550)"/>
          </g>
          <!-- 漂浮花瓣/花粉 -->
          <g fill="var(--accent)" opacity="0.05" class="garden-particles">
            <circle cx="150" cy="120" r="2" class="garden-particle garden-particle--1"/>
            <circle cx="450" cy="180" r="1.5" class="garden-particle garden-particle--2"/>
            <circle cx="100" cy="350" r="2.5" class="garden-particle garden-particle--3"/>
            <circle cx="500" cy="400" r="1.8" class="garden-particle garden-particle--4"/>
            <circle cx="200" cy="500" r="2" class="garden-particle garden-particle--5"/>
            <circle cx="400" cy="550" r="1.5" class="garden-particle garden-particle--6"/>
            <circle cx="120" cy="650" r="2" class="garden-particle garden-particle--7"/>
            <circle cx="480" cy="700" r="1.8" class="garden-particle garden-particle--8"/>
            <circle cx="300" cy="100" r="1.2" class="garden-particle garden-particle--9"/>
            <circle cx="350" cy="250" r="1.5" class="garden-particle garden-particle--10"/>
          </g>
          <!-- 蝴蝶 -->
          <g opacity="0.04" class="garden-butterfly garden-butterfly--1">
            <path d="M250,180 Q240,165 232,172 Q238,178 250,180" fill="var(--accent)"/>
            <path d="M250,180 Q260,165 268,172 Q262,178 250,180" fill="var(--accent)"/>
            <path d="M250,180 Q242,190 234,192 Q240,184 250,180" fill="var(--accent)"/>
            <path d="M250,180 Q258,190 266,192 Q260,184 250,180" fill="var(--accent)"/>
          </g>
          <g opacity="0.03" class="garden-butterfly garden-butterfly--2">
            <path d="M380,420 Q370,408 362,414 Q368,420 380,420" fill="var(--accent)"/>
            <path d="M380,420 Q390,408 398,414 Q392,420 380,420" fill="var(--accent)"/>
            <path d="M380,420 Q372,428 364,430 Q370,424 380,420" fill="var(--accent)"/>
            <path d="M380,420 Q388,428 396,430 Q390,424 380,420" fill="var(--accent)"/>
          </g>
          <!-- 温室拱形结构 -->
          <g opacity="0.03" stroke="var(--accent)" stroke-width="0.5" fill="none" class="greenhouse-arch">
            <path d="M200,200 Q300,80 400,200"/>
            <path d="M180,220 Q300,100 420,220"/>
            <path d="M160,240 Q300,120 440,240"/>
            <line x1="150" y1="250" x2="450" y2="250"/>
            <line x1="150" y1="250" x2="150" y2="700"/>
            <line x1="450" y1="250" x2="450" y2="700"/>
            <line x1="300" y1="110" x2="300" y2="700"/>
          </g>
        </svg>
      </div>
    </div>

    <RoomHeader
      class="garden-room-header"
      data-enter
      :ornament="false"
      subtitle="每一种情绪都先有位置，再谈理解。你不需要解释自己为什么这样，只需要把这一朵花放下。"
    >
      <template #ornament>
        <div class="header-ornament">
          <span class="orn-line" />
          <span class="orn-diamond">✦</span>
          <span class="orn-line" />
        </div>
      </template>
      <template #kicker>
        <span class="garden-kicker">只记录，不裁判</span>
      </template>
      <template #title>
        <span class="garden-title">情绪花房</span>
      </template>

      <!-- 概览卡片 -->
      <template #meta>
      <div class="garden-overview">
        <article v-for="item in overviewCards" :key="item.label" class="overview-card">
          <span class="ov-label">{{ item.label }}</span>
          <strong class="ov-value">{{ item.value }}</strong>
          <span class="ov-note">{{ item.note }}</span>
        </article>
      </div>

      <!-- 安全岛光路（蓝图心理安全机制：持续低落时温和引向圣所，不弹窗不推送） -->
      <transition name="safety-fade">
        <section v-if="showSafetyPath" class="safety-path" data-enter>
          <span class="sp-icon">♢</span>
          <div class="sp-body">
            <p class="sp-line">最近花房有些收暗。那里有一处没有灯、也没有人催你说话的地方。</p>
            <p class="sp-scroll">如果此刻很难熬，点一下，会有人陪着你——这里不会报警，也不会把你的话告诉任何人。</p>
            <button class="sp-btn" @click="goSanctuary">去安全岛走走</button>
          </div>
        </section>
      </transition>

      <!-- 关怀提示：连续负面情绪时温和浮现 -->
      <transition name="care-fade">
        <div v-if="showCare" class="emotion-care" :class="{ 'emotion-care--show': showCare }">
          <div class="care-icon">💬</div>
          <div class="care-body">
            <p class="care-message">{{ careMessage }}</p>
            <p class="care-sub">花房会一直在这里，不急</p>
          </div>
          <button class="care-close" type="button" @click="showCare = false" aria-label="关闭关怀提示">×</button>
        </div>
      </transition>

      <!-- 统计概览 -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-num">{{ todayEmotions.length }}</span>
            <span class="stat-desc">今日情绪</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ weekEmotions.length }}</span>
            <span class="stat-desc">本周情绪</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ mostFrequentLabel }}</span>
            <span class="stat-desc">最常情绪</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ weekAvg }}</span>
            <span class="stat-desc">本周均值</span>
          </div>
        </div>
      </section>

      <!-- 花园状态面板（接线 useEmotionBridge · 图鉴/健康度/季节/品种，任务①体验闭环） -->
      <GardenHealthPanel />

      <!-- 花丛分布（INCR-283 补挂载孤儿组件 FlowerClusterArchivePanel：按情绪品种统计花丛/健康分，经 useEmotionGarden 桥只读聚合记录，引擎与宿主同源但无归档等价物） -->
      <FlowerClusterArchivePanel />

      <!-- 花园叙事（INCR-368 补挂载孤儿引擎 garden-narrative：花语故事/成长日记/季节相册/分享留言） -->
      <GardenNarrativePanel />

      <!-- 筛选 -->
      <section class="filter-section">
        <div class="filter-group">
          <button
            :class="['filter-pill', { active: filterType === 'all' }]"
            @click="filterType = 'all'"
          >全部</button>
          <button
            v-for="opt in EMOTION_OPTIONS"
            :key="opt.type"
            :class="['filter-pill', { active: filterType === opt.type }]"
            :style="filterType === opt.type ? { borderColor: EMOTION_FLOWERS[opt.type].color, color: EMOTION_FLOWERS[opt.type].color } : {}"
            @click="filterType = opt.type"
          >
            <span class="filter-icon">{{ opt.icon }}</span>
            {{ opt.label }}
          </button>
        </div>
      </section>

      <!-- 情绪选择器 -->
      <div class="emotion-picker">
        <button
          v-for="opt in EMOTION_OPTIONS"
          :key="opt.type"
          :class="['emo-btn', { active: selectedType === opt.type }]"
          :style="selectedType === opt.type ? { borderColor: EMOTION_FLOWERS[opt.type].color, background: EMOTION_FLOWERS[opt.type].color + '14' } : {}"
          @click="selectedType = opt.type"
        >
          <span class="emo-icon">{{ opt.icon }}</span>
          <span class="emo-label">{{ opt.label }}</span>
        </button>
      </div>

      <!-- 天气第二轴（可选） -->
      <div class="weather-picker" title="天气是可选项，可叠加在情绪之上">
        <span class="weather-hint">天气（可选）</span>
        <button
          v-for="opt in WEATHER_OPTIONS"
          :key="opt.type"
          :class="['weather-btn', { active: selectedWeather === opt.type }]"
          :title="`天气：${opt.label}`"
          @click="toggleWeather(opt.type)"
        >{{ opt.icon }}</button>
      </div>

      <!-- 输入行 -->
      <div class="input-row">
        <input
          v-model="noteText"
          class="note-input"
          placeholder="如果想留一句话，可以放在这里…"
          @keyup.enter="plantFlower"
        />
        <button
          class="plant-btn"
          :style="{ background: EMOTION_FLOWERS[selectedType].color }"
          @click="plantFlower"
        >种下</button>
      </div>

      <!-- 选中预览 -->
      <div class="selected-preview">
        <span class="preview-dot" :style="{ background: EMOTION_FLOWERS[selectedType].color }" />
        <span>正在安放：{{ EMOTION_FLOWERS[selectedType].label }}</span>
        <span v-if="selectedWeather" class="preview-weather">{{ weatherLabel }}</span>
        <span class="preview-note">{{ previewNote }}</span>
      </div>

      <!-- 汇总 -->
      <div class="garden-summary" v-if="garden.records.value.length > 0">
        <span
          v-for="opt in EMOTION_OPTIONS"
          :key="opt.type"
          class="summary-chip"
          v-show="garden.counts.value[opt.type]"
        >{{ opt.icon }} {{ garden.counts.value[opt.type] || 0 }}</span>
      </div>

      <!-- LOD 状态指示 -->
      <div class="lod-indicator">
        <span class="lod-label">渲染品质</span>
        <span class="lod-level" :class="`lod-badge-${currentLOD}`">{{ lodInfo.label }}</span>
        <span class="lod-desc">{{ lodInfo.desc }}</span>
        <span class="lod-count">({{ garden.records.value.length }} 朵)</span>
      </div>

      <!-- 温室环境控制 -->
      <div class="env-controls">
        <div class="env-item">
          <span class="env-label">🌡️ 温度</span>
          <button class="env-btn" @click="adjustParam('temperature', -1)">−</button>
          <span class="env-value">{{ greenhouseParams.temperature }}°C</span>
          <button class="env-btn" @click="adjustParam('temperature', 1)">+</button>
        </div>
        <div class="env-item">
          <span class="env-label">💧 湿度</span>
          <button class="env-btn" @click="adjustParam('humidity', -5)">−</button>
          <span class="env-value">{{ greenhouseParams.humidity }}%</span>
          <button class="env-btn" @click="adjustParam('humidity', 5)">+</button>
        </div>
        <div class="env-item">
          <span class="env-label">☀️ 光照</span>
          <button class="env-btn" @click="adjustParam('light', -10)">−</button>
          <span class="env-value">{{ greenhouseParams.light }}%</span>
          <button class="env-btn" @click="adjustParam('light', 10)">+</button>
        </div>
      </div>

      <!-- 环境评分 -->
      <div class="env-status" :data-env-mood="ambientMoodByEnv">
        <div class="env-status-bar">
          <div
            class="env-status-fill"
            :style="{
              width: envScore + '%',
              background: envScore >= 70 ? '#7CB68E' : envScore >= 30 ? '#F5C94A' : '#6B8E9B',
            }"
          />
        </div>
        <span class="env-status-text">{{ envScore >= 70 ? '环境适宜，花朵绽放' : envScore >= 30 ? '环境一般，状态正常' : '环境恶劣，花朵枯萎' }}</span>
      </div>
      </template>
    </RoomHeader>

    <!-- 灵犀标记 -->
    <div class="lingxi-mark" v-if="lingxiVisited" title="灵犀来过">
      <span class="lingxi-dew">💧</span>
      <span>有人浇过水</span>
    </div>

    <div class="garden-floor">
      <!-- 趋势图 -->
      <section class="trend-section" v-if="emotionViz.active.value && last7Days.length > 0">
        <h3 class="section-title">近 7 天情绪趋势</h3>
        <div class="trend-chart">
          <div class="trend-y-axis">
            <span v-for="n in 5" :key="n" class="trend-y-label">{{ n * 2 }}</span>
          </div>
          <div class="trend-bars">
            <div v-for="(day, idx) in last7Days" :key="idx" class="trend-bar-col">
              <div class="trend-bar-stack" :style="{ height: barHeight(day.total) }">
                <div
                  v-for="type in emotionTypes"
                  :key="type"
                  v-show="day.typeCounts[type]"
                  class="trend-bar-segment"
                  :style="{ height: segmentHeight(day.total, day.typeCounts[type] || 0), background: EMOTION_FLOWERS[type].color }"
                  :title="`${EMOTION_FLOWERS[type].label}: ${day.typeCounts[type]||0}`"
                />
              </div>
              <span class="trend-bar-label">{{ day.dayName }}</span>
              <span class="trend-bar-date">{{ day.label }}</span>
            </div>
          </div>
        </div>
        <div class="trend-legend">
          <span v-for="type in emotionTypes" :key="type" class="trend-legend-item">
            <span class="trend-legend-dot" :style="{ background: EMOTION_FLOWERS[type].color }" />
            {{ EMOTION_FLOWERS[type].label }}
          </span>
        </div>
      </section>

      <!-- 情绪趋势深度分析（emotion/emotion-trends 引擎：概览6指标/趋势折线/分布/模式识别/未来预测，INCR-201） -->
      <EmotionTrendsPanel :records="allEmotionRecords" />

      <!-- 情绪日历 -->
      <section class="calendar-section" v-if="emotionViz.active.value">
        <h3 class="section-title">月度情绪日历</h3>
        <div class="calendar-nav">
          <button class="cal-nav-btn" @click="prevMonth">‹</button>
          <span class="cal-nav-title">{{ currentYear }} 年 {{ currentMonth }} 月</span>
          <button class="cal-nav-btn" @click="nextMonth">›</button>
        </div>
        <div class="calendar-grid">
          <span v-for="w in weekDays" :key="w" class="cal-weekday">{{ w }}</span>
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            :class="['cal-day', {
              'cal-day-empty': day.empty,
              'cal-day-today': day.isToday,
              'cal-day-has': day.hasRecord,
            }]"
          >
            <span v-if="!day.empty" class="cal-day-num">{{ day.day }}</span>
            <span v-if="!day.empty && day.hasRecord" class="cal-day-dot">●</span>
          </div>
        </div>
      </section>

      <!-- 导出 -->
      <section class="export-section">
        <button class="export-btn" @click="toggleExport">
          <span class="export-icon">📋</span>
          导出数据
        </button>
        <Transition name="export-fade">
          <div v-if="showExport" class="export-panel">
            <pre class="export-text">{{ exportText }}</pre>
            <button class="export-close-btn" @click="showExport = false">收起</button>
          </div>
        </Transition>
      </section>

      <!-- 视图切换 -->
      <div class="view-toggle" v-if="displayRecords.length > 0">
        <button
          :class="['toggle-btn', { active: viewMode === 'grid' }]"
          @click="viewMode = 'grid'"
        >🌺 花海</button>
        <button
          :class="['toggle-btn', { active: viewMode === 'layout' }]"
          @click="viewMode = 'layout'"
        >🏡 花房布局</button>
      </div>

      <!-- 花海（网格视图） -->
      <section class="flower-section" v-if="viewMode === 'grid'">
        <div v-if="displayRecords.length === 0" class="empty-garden">
          <div class="empty-icon-wrap">
            <span class="empty-icon">🌱</span>
            <span class="empty-glow" />
          </div>
          <p class="empty-text">这里还是一片安静的土壤</p>
          <p class="empty-hint">标记你此刻的情绪，种下第一朵花</p>
        </div>
        <div v-else :class="['flower-grid', `lod-${currentLOD}`]">
          <div v-for="r in displayRecords" :key="r.id" :class="['flower-item', `lod-${currentLOD}`]">
            <button
              class="flower-delete-btn"
              :style="{ '--del-color': EMOTION_FLOWERS[r.type].color }"
              @click="deleteRecord(r.id)"
              title="删除此记录"
            >✕</button>
            <GardenFlower
              :type="r.type"
              :note="r.note"
              :createdAt="r.createdAt"
              :envScore="envScore"
              @dblclick="garden.remove(r.id)"
            />
          </div>
        </div>
      </section>

      <!-- 花房布局（空间布局视图） -->
      <section class="layout-section" v-if="viewMode === 'layout'">
        <div class="greenhouse-plan">
          <!-- 阳光区 -->
          <div class="gh-zone gh-zone-sun">
            <div class="zone-label">
              <span class="zone-icon">☀️</span>
              <span class="zone-name">阳光区</span>
              <span class="zone-count">{{ zoneData.sun.count }} 朵</span>
            </div>
            <div class="zone-desc">轻快、兴奋在这里生长，温暖明亮</div>
            <div class="zone-flowers" v-if="zoneData.sun.flowers.length > 0">
              <div
                v-for="f in zoneData.sun.flowers"
                :key="f.id"
                class="zf-item"
                :style="{
                  '--x': f.x + '%',
                  '--y': f.y + '%',
                  '--color': EMOTION_FLOWERS[f.type].color,
                  '--delay': f.delay + 's',
                }"
                @click="deleteRecord(f.id)"
                :title="`${EMOTION_FLOWERS[f.type].label}${f.note ? ': ' + f.note : ''}`"
              >
                <span class="zf-dot" :style="{ background: EMOTION_FLOWERS[f.type].color }" />
              </div>
            </div>
            <div v-else class="zone-empty">暂无花朵</div>
          </div>

          <!-- 草甸区 -->
          <div class="gh-zone gh-zone-meadow">
            <div class="zone-label">
              <span class="zone-icon">🌿</span>
              <span class="zone-name">草甸区</span>
              <span class="zone-count">{{ zoneData.meadow.count }} 朵</span>
            </div>
            <div class="zone-desc">平静、低落在这里栖息，自然安宁</div>
            <div class="zone-flowers" v-if="zoneData.meadow.flowers.length > 0">
              <div
                v-for="f in zoneData.meadow.flowers"
                :key="f.id"
                class="zf-item"
                :style="{
                  '--x': f.x + '%',
                  '--y': f.y + '%',
                  '--color': EMOTION_FLOWERS[f.type].color,
                  '--delay': f.delay + 's',
                }"
                @click="deleteRecord(f.id)"
                :title="`${EMOTION_FLOWERS[f.type].label}${f.note ? ': ' + f.note : ''}`"
              >
                <span class="zf-dot" :style="{ background: EMOTION_FLOWERS[f.type].color }" />
              </div>
            </div>
            <div v-else class="zone-empty">暂无花朵</div>
          </div>

          <!-- 阴凉区 -->
          <div class="gh-zone gh-zone-shade">
            <div class="zone-label">
              <span class="zone-icon">🌑</span>
              <span class="zone-name">阴凉区</span>
              <span class="zone-count">{{ zoneData.shade.count }} 朵</span>
            </div>
            <div class="zone-desc">紧绷、烦躁在这里安放，不必自责</div>
            <div class="zone-flowers" v-if="zoneData.shade.flowers.length > 0">
              <div
                v-for="f in zoneData.shade.flowers"
                :key="f.id"
                class="zf-item"
                :style="{
                  '--x': f.x + '%',
                  '--y': f.y + '%',
                  '--color': EMOTION_FLOWERS[f.type].color,
                  '--delay': f.delay + 's',
                }"
                @click="deleteRecord(f.id)"
                :title="`${EMOTION_FLOWERS[f.type].label}${f.note ? ': ' + f.note : ''}`"
              >
                <span class="zf-dot" :style="{ background: EMOTION_FLOWERS[f.type].color }" />
              </div>
            </div>
            <div v-else class="zone-empty">暂无花朵</div>
          </div>
        </div>
      </section>
    </div>

    <!-- 快乐盒子（emotion/happy-box 模块） -->
    <HappyBoxPanel />

    <!-- 环境音景（emotion/flower-season 模块，INCR-181） -->
    <SoundscapePanel />

    <!-- 访客足迹（INCR-248 补挂载孤儿组件 VisitorFootprintsPanel：访客对花朵的点赞/浇水/留言/礼物/欣赏与回访，引擎 useVisitorFootprints 唯一、零 props 直驱，同属 emotion/flower-season 域与音景/花园稳定共存） -->
    <VisitorFootprintsPanel />

    <!-- 花种杂交（emotion/flower-season·useCrossBreeding，INCR-267 补挂载孤儿组件，零 props 直驱） -->
    <FlowerHybridPanel />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEmotionGarden } from '../modules/emotion'
import { EMOTION_OPTIONS, EMOTION_FLOWERS, WEATHER_OPTIONS } from '../modules/emotion/types'
import type { EmotionType, EmotionWeather } from '../modules/emotion/types'
import { useAdvisor } from '../resonance/bridges/advisor'
import GardenFlower from '../components/GardenFlower.vue'
import GardenHealthPanel from '../components/GardenHealthPanel.vue'
import HappyBoxPanel from '../components/HappyBoxPanel.vue'
import SoundscapePanel from '../components/SoundscapePanel.vue'
import EmotionTrendsPanel from '../components/EmotionTrendsPanel.vue'
import VisitorFootprintsPanel from '../components/VisitorFootprintsPanel.vue'
import FlowerHybridPanel from '../components/FlowerHybridPanel.vue'
import FlowerClusterArchivePanel from '../components/FlowerClusterArchivePanel.vue'
import GardenNarrativePanel from '../components/GardenNarrativePanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useEffect } from '../modules/constitution/use-effect'
import { useRoomResonance } from '../modules/room-resonance'
import RoomHeader from '../components/RoomHeader.vue'

// A2.3 批3：情绪可视化是否展示受宪法「情绪可视化」条款门控
// （emotion:visualization，enable 型默认开启＝默认显示；关闭条款即隐藏趋势图与日历）。
const emotionViz = useEffect('emotion:visualization')
// 任务②：情绪中性呈现受宪法「情绪中性呈现」条款门控（emotion:neutral）。
// 启用后根容器切到 ambient-neutral，去除 warm/bright/dim 倾向性辉光，落实第4条「只呈现不评判」。
const emotionNeutral = useEffect('emotion:neutral')

const { entranceRef, entranceClass } = useViewEntrance()
const garden = useEmotionGarden()
const advisor = useAdvisor()
// 跨房间共鸣联动：情绪花房发射 mood 信号（守本地私有，零外发）
const { emitRoomSignal } = useRoomResonance()
const selectedType = ref<EmotionType>('calm')
const selectedWeather = ref<EmotionWeather | null>(null)
const noteText = ref('')

// 情绪趋势深度分析入参：garden.records 为模块级 ref，模板需解包后传入
const allEmotionRecords = computed(() => garden.records.value)

// ---- 温和情感反馈：连续负面情绪检测 + 关怀提示 ----
const showCare = ref(false)

const consecutiveNegative = computed(() => {
  const recent = garden.records.value.slice(-3)
  if (recent.length < 3) return false
  return recent.every(r => ['sad', 'anxious', 'angry'].includes(r.type))
})

const careMessages = [
  '最近似乎有些低落，让花房陪你待一会儿吧',
  '连续几天心情不太好呢，需要一个虚拟的拥抱吗？',
  '负面情绪像乌云，总会散去的，花房的光还亮着',
  '这里没有催促，也没有评判，只是陪着你',
  '每一朵暗色的花，也会被花房温柔地收下',
]

const careMessage = computed(() => {
  if (!consecutiveNegative.value) return ''
  const idx = Math.floor(Math.random() * careMessages.length)
  return careMessages[idx]
})

// 连续负面时自动弹出关怀提示
watch(consecutiveNegative, (val) => {
  if (val) showCare.value = true
})

onMounted(() => {
  garden.load()
  emitGardenSignal()
})

const weatherLabel = computed(
  () => WEATHER_OPTIONS.find(o => o.type === selectedWeather.value)?.label || '',
)

function toggleWeather(type: EmotionWeather) {
  selectedWeather.value = selectedWeather.value === type ? null : type
}

function plantFlower() {
  garden.add(selectedType.value, noteText.value, selectedWeather.value ?? undefined)
  advisor.onEmotionLogged(selectedType.value, noteText.value)
  noteText.value = ''
  selectedWeather.value = null
}

// 花房氛围自动回应
const lingxiVisited = ref(false)
const ambientMood = ref<'normal' | 'warm' | 'dim' | 'bright'>(garden.getAmbientMood())
// 任务② 情绪中性呈现：emotion:neutral 启用时强制 ambient-neutral（均匀中性，
// 去除 warm/bright/dim 倾向性辉光），落实第4条「只呈现不评判」。
const ambientClass = computed(() =>
  emotionNeutral.active.value ? 'ambient-neutral' : `ambient-${ambientMood.value}`,
)

// 蓝图心理安全机制（蓝图13:1233）：持续低落（ambientMood='dim'）时，
// 以温和的"安全岛光路"内嵌卡片引向圣所——不弹窗、不推送、不报警、不泄露。
const router = useRouter()
const showSafetyPath = computed(() => ambientMood.value === 'dim')
function goSanctuary() { router.push('/sanctuary') }
const previewHints: Record<EmotionType, string> = {
  happy: '轻快先留在这里，不需要额外证明什么。',
  calm: '平静就这样放着，也是一种此刻状态。',
  sad: '低落先放在这里，暂时不用把它解释清楚。',
  anxious: '紧绷先被看见，不急着把它立刻处理掉。',
  angry: '烦躁也可以被安放，它只是此刻的一种感受。',
}

const previewNote = computed(() => previewHints[selectedType.value])
const latestRecord = computed(() => garden.records.value[0])
const overviewCards = computed(() => [
  {
    label: '花房总数',
    value: `${garden.records.value.length} 朵`,
    note: garden.records.value.length > 0 ? '它们都在，不会催你解释' : '还没有第一朵花落地',
  },
  {
    label: '最近一朵',
    value: latestRecord.value ? EMOTION_FLOWERS[latestRecord.value.type].label : '未记录',
    note: latestRecord.value?.note || '最近还没有留下新的心情',
  },
  {
    label: '花房气候',
    value: ambientMood.value === 'normal' ? '安静' : ambientMood.value === 'warm' ? '偏暖' : ambientMood.value === 'bright' ? '微亮' : '收暗',
    note: lingxiVisited.value ? '灵犀来过，悄悄浇过一次水' : '这里目前由你自己照看',
  },
])

watch(() => garden.records.value.length, (next, prev) => {
  if (next > prev) {
    ambientMood.value = garden.getAmbientMood()
    if (ambientMood.value === 'warm') lingxiVisited.value = true
    window.setTimeout(() => { ambientMood.value = garden.getAmbientMood() }, 8000)
  }
})

onMounted(() => {
  const sad = garden.records.value.filter(r => r.type === 'sad').slice(-3).length
  if (sad >= 2) lingxiVisited.value = true
  ambientMood.value = garden.getAmbientMood()
})

// ============================================================
// 1. 情绪统计概览
// ============================================================
const todayEmotions = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  return garden.records.value.filter(r => {
    const rd = new Date(r.createdAt)
    return rd.getFullYear() === y && rd.getMonth() + 1 === m && rd.getDate() === d
  })
})

const weekEmotions = computed(() => garden.recent(7))

const mostFrequentType = computed<EmotionType | null>(() => {
  const counts = garden.counts.value
  let max = 0
  let maxType: EmotionType | null = null
  for (const key of Object.keys(counts)) {
    const type = key as EmotionType
    if (counts[type] > max) {
      max = counts[type]
      maxType = type
    }
  }
  return maxType
})

const mostFrequentLabel = computed(() => {
  if (!mostFrequentType.value) return '—'
  return EMOTION_FLOWERS[mostFrequentType.value].label
})

// 跨房间共鸣联动：情绪花房发射 mood 信号（守本地私有，零外发）
function gardenMoodLabel(): string {
  const count = garden.records.value.length
  if (count === 0) return '花房待第一朵花'
  const top = mostFrequentLabel.value !== '—' ? mostFrequentLabel.value : '情绪'
  const moodText =
    ambientMood.value === 'normal' ? '安静'
    : ambientMood.value === 'warm' ? '偏暖'
    : ambientMood.value === 'bright' ? '微亮'
    : '收暗'
  return `${top} · ${moodText} · ${count}朵`
}

function emitGardenSignal() {
  emitRoomSignal({
    room: 'emotion-garden',
    kind: 'mood',
    label: gardenMoodLabel(),
    detail: '本地私有情绪记录',
    ts: Date.now(),
  })
}

// 种下 / 删除花朵后，花房气候随之变化，重新发射信号
watch(() => garden.records.value.length, emitGardenSignal)

const weekAvg = computed(() => {
  const total = weekEmotions.value.length
  return total > 0 ? (total / 7).toFixed(1) : '0'
})

// ============================================================
// 2. 情绪趋势图（近 7 天）
// ============================================================
const emotionTypes: EmotionType[] = ['happy', 'calm', 'sad', 'anxious', 'angry']

const last7Days = computed(() => {
  const days: {
    date: string
    label: string
    dayName: string
    total: number
    typeCounts: Record<string, number>
  }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const dateStr = `${y}-${m}-${day}`
    const dayRecords = garden.records.value.filter(r => {
      const rd = new Date(r.createdAt)
      return rd.getFullYear() === y && rd.getMonth() + 1 === m && rd.getDate() === day
    })
    const typeCounts: Record<string, number> = {}
    for (const r of dayRecords) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1
    }
    days.push({
      date: dateStr,
      label: `${m}/${day}`,
      dayName: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      total: dayRecords.length,
      typeCounts,
    })
  }
  return days
})

const MAX_BAR_PX = 120
const PX_PER_UNIT = 20

function barHeight(total: number): string {
  const h = Math.min(total * PX_PER_UNIT, MAX_BAR_PX)
  return h > 0 ? `${Math.max(h, 4)}px` : '2px'
}

function segmentHeight(total: number, count: number): string {
  if (total === 0) return '0px'
  const pct = (count / total) * 100
  return `${pct}%`
}

// ============================================================
// 3. 情绪日历
// ============================================================
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1
  const todayD = today.getDate()

  const days: { day: number; empty: boolean; hasRecord: boolean; isToday: boolean }[] = []

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ day: 0, empty: true, hasRecord: false, isToday: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const hasRecord = garden.records.value.some(r => {
      const rd = new Date(r.createdAt)
      return rd.getFullYear() === year && rd.getMonth() + 1 === month && rd.getDate() === d
    })
    const isToday = year === todayY && month === todayM && d === todayD
    days.push({ day: d, empty: false, hasRecord, isToday })
  }
  return days
})

// ============================================================
// 4. 情绪导出
// ============================================================
const showExport = ref(false)
const exportText = ref('')

function toggleExport() {
  if (showExport.value) {
    showExport.value = false
    return
  }
  const records = garden.records.value
  if (records.length === 0) {
    exportText.value = '暂无情绪记录。'
    showExport.value = true
    return
  }
  const lines = records.map(r => {
    const d = new Date(r.createdAt)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    const typeLabel = EMOTION_FLOWERS[r.type]?.label || r.type
    const icon = EMOTION_OPTIONS.find(o => o.type === r.type)?.icon || ''
    const weatherPart = r.weather ? ` 天气：${WEATHER_OPTIONS.find(o => o.type === r.weather)?.label || ''}` : ''
    const notePart = r.note ? ` 备注：${r.note}` : ''
    return `${icon} [${dateStr}] ${typeLabel}${weatherPart}${notePart}`
  })
  exportText.value = `=== 情绪花房导出 ===\n总记录数：${records.length}\n\n${lines.join('\n')}`
  showExport.value = true
}

// ============================================================
// 5. 删除情绪
// ============================================================
function deleteRecord(id: string) {
  garden.remove(id)
}

// ============================================================
// 6. 情绪分类筛选
// ============================================================
const filterType = ref<EmotionType | 'all'>('all')

// 视图模式：网格花海 / 花房布局
const viewMode = ref<'grid' | 'layout'>('grid')

const displayRecords = computed(() => {
  if (filterType.value === 'all') return garden.records.value
  return garden.records.value.filter(r => r.type === filterType.value)
})

// ============================================================
// 6a. 花房空间布局数据
// ============================================================
// 情绪类型 → 空间区域映射
const FLOWER_ZONES: Record<string, 'sun' | 'meadow' | 'shade'> = {
  happy: 'sun',
  excited: 'sun',
  calm: 'meadow',
  sad: 'meadow',
  anxious: 'shade',
  angry: 'shade',
}

interface ZoneFlower {
  id: string
  type: EmotionType
  note: string
  x: number
  y: number
  delay: number
}

interface ZoneData {
  sun: { count: number; flowers: ZoneFlower[] }
  meadow: { count: number; flowers: ZoneFlower[] }
  shade: { count: number; flowers: ZoneFlower[] }
}

const zoneData = computed<ZoneData>(() => {
  const sun: ZoneFlower[] = []
  const meadow: ZoneFlower[] = []
  const shade: ZoneFlower[] = []

  const records = garden.records.value

  // 按区域分配花朵
  for (const r of records) {
    const zone = FLOWER_ZONES[r.type] || 'meadow'
    // 在该区域内随机位置（使用 id 哈希确保稳定）
    const hash = r.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const x = 5 + ((hash * 13) % 90)
    const y = 5 + ((hash * 7) % 80)
    const delay = (hash % 20) * 0.3
    const flower: ZoneFlower = { id: r.id, type: r.type, note: r.note || '', x, y, delay }
    if (zone === 'sun') sun.push(flower)
    else if (zone === 'shade') shade.push(flower)
    else meadow.push(flower)
  }

  return {
    sun: { count: sun.length, flowers: sun },
    meadow: { count: meadow.length, flowers: meadow },
    shade: { count: shade.length, flowers: shade },
  }
})

// ============================================================
// 7. LOD 降级系统
// ============================================================
const LOD_THRESHOLDS = [
  { level: 'full', max: 50, label: '完整', desc: '花瓣级渲染' },
  { level: 'simplified', max: 100, label: '简化', desc: '圆形替代' },
  { level: 'dot', max: 200, label: '光点', desc: '点状显示' },
  { level: 'blur', max: Infinity, label: '模糊', desc: '模糊块' },
] as const

const currentLOD = computed(() => {
  const count = garden.records.value.length
  if (count <= 50) return 'full'
  if (count <= 100) return 'simplified'
  if (count <= 200) return 'dot'
  return 'blur'
})

const lodInfo = computed(() => {
  const level = currentLOD.value
  return LOD_THRESHOLDS.find(t => t.level === level)!
})

// ============================================================
// 8. 温室环境参数
// ============================================================
const ENV_OPTIMAL = {
  temperature: { min: 20, max: 26, ideal: 23 },
  humidity: { min: 50, max: 75, ideal: 60 },
  light: { min: 40, max: 85, ideal: 65 },
} as const

const greenhouseParams = ref({
  temperature: 22,
  humidity: 60,
  light: 70,
})

function scoreParam(value: number, optimal: { min: number; max: number; ideal: number }): number {
  if (value >= optimal.min && value <= optimal.max) {
    return 100
  }
  const distBelow = Math.abs(value - optimal.min)
  const distAbove = Math.abs(value - optimal.max)
  const dist = Math.min(distBelow, distAbove)
  return Math.max(0, 100 - dist * 5)
}

const envScore = computed(() => {
  const tScore = scoreParam(greenhouseParams.value.temperature, ENV_OPTIMAL.temperature)
  const hScore = scoreParam(greenhouseParams.value.humidity, ENV_OPTIMAL.humidity)
  const lScore = scoreParam(greenhouseParams.value.light, ENV_OPTIMAL.light)
  return Math.round((tScore + hScore + lScore) / 3)
})

const ambientMoodByEnv = computed(() => {
  if (envScore.value >= 70) return 'bright'
  if (envScore.value >= 30) return 'normal'
  return 'dim'
})

function adjustParam(param: 'temperature' | 'humidity' | 'light', delta: number) {
  const limits: Record<string, { min: number; max: number }> = {
    temperature: { min: 18, max: 30 },
    humidity: { min: 30, max: 90 },
    light: { min: 0, max: 100 },
  }
  const { min, max } = limits[param]
  greenhouseParams.value[param] = Math.max(min, Math.min(max, greenhouseParams.value[param] + delta))
}
</script>

<style scoped>
/* ============================================================
   CSS 变量 - 花房设计系统
   ============================================================ */
.emotion-garden {
  --sun-zone-color: #F5C94A;
  --meadow-zone-color: #7CB68E;
  --shade-zone-color: #6B8E9B;
  --accent: var(--accent);
  --amber-light: rgba(var(--accent-rgb), 0.08);
  --amber-mid: rgba(var(--accent-rgb), 0.15);
  --amber-strong: rgba(var(--accent-rgb), 0.25);
}

/* ============================================================
   容器 & 氛围背景
   ============================================================ */
.emotion-garden {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
  /* 注意：不可在此写 transition（含 background 30s ease）。
     根部 transition 会以 scoped 优先级覆盖 animations.css 的 .light-gate-*-leave-active
     页面过渡规则，导致离开动画不触发 transitionend，路由切换永久卡死在本房间
     （真机遍历发现：花园 → 任何房间均无法离开）。
     氛围背景的 30s 慢过渡由 .garden-ambient 固定层承担，根部恒为 transparent。 */
}
.emotion-garden.ambient-warm {
  background: transparent;
}
.emotion-garden.ambient-dim {
  background: transparent;
}
.emotion-garden.ambient-bright {
  background: transparent;
}
/* 任务② 情绪中性呈现（emotion:neutral 启用）：去除冷暖/明暗倾向性辉光，
   所有情绪均匀中性呈现，落实第4条「只呈现不评判」。 */
.emotion-garden.ambient-neutral .garden-glow--top,
.emotion-garden.ambient-neutral .garden-glow--mid,
.emotion-garden.ambient-neutral .garden-glow--bottom {
  filter: grayscale(0.85) opacity(0.55);
}
.emotion-garden.ambient-neutral .garden-svg-decor svg {
  opacity: 0.35;
  filter: grayscale(0.6);
}
.emotion-garden.ambient-neutral .garden-title,
.emotion-garden.ambient-neutral .overview-card,
.emotion-garden.ambient-neutral .stat-box {
  text-shadow: none;
}

/* ---- 三区空间氛围层 ---- */
.garden-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: transparent;
  transition: background 30s ease;
}

/* 光晕层 */
.garden-glow {
  position: absolute;
  pointer-events: none;
  transition: opacity 30s ease, background 30s ease;
}

/* 阳光区光晕 - 暖琥珀色，从左到右 */
.garden-glow--top {
  top: 0;
  left: -5%;
  width: 50%;
  height: 50%;
  background: radial-gradient(ellipse at 30% 15%, rgba(var(--accent-rgb), 0.05), transparent 55%);
}

/* 草甸区光晕 - 绿色温润中央光 */
.garden-glow--mid {
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 60%;
  background: radial-gradient(ellipse at 50% 50%, rgba(124, 182, 142, 0.03), transparent 60%);
}

/* 阴凉区光晕 - 蓝紫色冷光，从右到左 */
.garden-glow--bottom {
  bottom: 0;
  right: -5%;
  width: 55%;
  height: 55%;
  background: radial-gradient(ellipse at 60% 85%, rgba(107, 142, 155, 0.04), rgba(139, 157, 196, 0.02) 40%, transparent 60%);
}

/* SVG 装饰层 */
.garden-svg-decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.garden-svg-decor svg {
  width: 100%;
  height: 100%;
  opacity: 0.7;
}

/* 藤蔓动画 */
.garden-vine {
  animation: vine-sway 12s ease-in-out infinite;
}
.garden-vine--right {
  animation-delay: -6s;
}
.vine-branch {
  animation: vine-branch-sway 8s ease-in-out infinite;
}
@keyframes vine-sway {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(3px); }
  75% { transform: translateX(-3px); }
}
@keyframes vine-branch-sway {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* 叶片动画 */
.garden-leaves {
  animation: leaves-rustle 6s ease-in-out infinite;
}
@keyframes leaves-rustle {
  0%, 100% { opacity: 0.04; transform: rotate(0deg); }
  50% { opacity: 0.06; transform: rotate(1deg); }
}

/* 漂浮粒子动画 */
.garden-particle {
  animation: pollen-float 8s ease-in-out infinite;
}
.garden-particle--1 { animation-delay: 0s; }
.garden-particle--2 { animation-delay: -1s; }
.garden-particle--3 { animation-delay: -2s; }
.garden-particle--4 { animation-delay: -3s; }
.garden-particle--5 { animation-delay: -4s; }
.garden-particle--6 { animation-delay: -5s; }
.garden-particle--7 { animation-delay: -6s; }
.garden-particle--8 { animation-delay: -7s; }
.garden-particle--9 { animation-delay: -2.5s; }
.garden-particle--10 { animation-delay: -5.5s; }
@keyframes pollen-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.05; }
  25% { transform: translate(8px, -12px) scale(1.3); opacity: 0.08; }
  50% { transform: translate(-4px, -20px) scale(0.9); opacity: 0.04; }
  75% { transform: translate(-10px, -8px) scale(1.2); opacity: 0.07; }
}

/* 蝴蝶动画 */
.garden-butterfly {
  animation: butterfly-flight 14s ease-in-out infinite;
  transform-origin: center;
}
.garden-butterfly--2 {
  animation-delay: -7s;
  animation-duration: 16s;
}
@keyframes butterfly-flight {
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.04; }
  15% { transform: translate(30px, -20px) rotate(5deg); opacity: 0.06; }
  30% { transform: translate(60px, -10px) rotate(-3deg); opacity: 0.03; }
  45% { transform: translate(40px, -30px) rotate(8deg); opacity: 0.05; }
  60% { transform: translate(10px, -15px) rotate(-5deg); opacity: 0.04; }
  75% { transform: translate(-20px, -25px) rotate(3deg); opacity: 0.06; }
  90% { transform: translate(-10px, -5px) rotate(-2deg); opacity: 0.03; }
}

/* 温室拱形结构 */
.greenhouse-arch {
  animation: arch-breathe 20s ease-in-out infinite;
}
@keyframes arch-breathe {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.05; }
}

/* ---- ambient 状态：阳光区增强，暖色更暖 ---- */
.ambient-warm .garden-glow--top {
  background: radial-gradient(ellipse at 30% 15%, rgba(var(--accent-rgb), 0.10), transparent 55%);
}
.ambient-warm .garden-glow--mid {
  background: radial-gradient(ellipse at 50% 50%, rgba(245, 201, 74, 0.04), transparent 60%);
}
.ambient-warm .garden-glow--bottom {
  background: radial-gradient(ellipse at 60% 85%, rgba(var(--accent-rgb), 0.04), transparent 55%);
}
.ambient-warm .garden-svg-decor svg {
  opacity: 0.85;
}

/* ---- ambient 状态：整体变暗，阴凉区扩大 ---- */
.ambient-dim .garden-glow--top {
  background: radial-gradient(ellipse at 30% 15%, rgba(120, 100, 80, 0.03), transparent 55%);
}
.ambient-dim .garden-glow--mid {
  background: radial-gradient(ellipse at 50% 50%, rgba(107, 142, 155, 0.03), transparent 60%);
}
.ambient-dim .garden-glow--bottom {
  background: radial-gradient(ellipse at 60% 85%, rgba(107, 142, 155, 0.06), transparent 55%);
}
.ambient-dim .garden-svg-decor svg {
  opacity: 0.5;
}

/* ---- ambient 状态：整体明亮，阳光区扩大 ---- */
.ambient-bright .garden-glow--top {
  background: radial-gradient(ellipse at 30% 15%, rgba(var(--accent-rgb), 0.08), transparent 50%);
}
.ambient-bright .garden-glow--mid {
  background: radial-gradient(ellipse at 50% 50%, rgba(245, 201, 74, 0.03), transparent 60%);
}
.ambient-bright .garden-glow--bottom {
  background: radial-gradient(ellipse at 60% 85%, rgba(90, 184, 160, 0.03), transparent 55%);
}
.ambient-bright .garden-svg-decor svg {
  opacity: 0.9;
}

/* ============================================================
   头部 - 自然花房氛围
   ============================================================ */
.garden-room-header {
  padding: 36px 32px 20px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.garden-room-header :deep(.rh-main) {
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.garden-room-header :deep(.rh-titles) {
  align-items: center;
  gap: 0;
}
.garden-room-header :deep(.rh-title) {
  margin: 0;
}
.garden-room-header :deep(.rh-subtitle) {
  max-width: 600px;
  text-align: center;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(var(--text-primary-rgb), 0.45);
  margin-bottom: 20px;
}

/* 装饰横条 - 仿藤蔓枝叶 */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
  position: relative;
}
.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), rgba(245, 201, 74, 0.15), rgba(var(--accent-rgb), 0.25), transparent);
  position: relative;
}
.orn-line::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 15%;
  width: 6px;
  height: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 201, 74, 0.08), transparent);
}
.orn-line::after {
  content: '';
  position: absolute;
  top: -3px;
  right: 20%;
  width: 4px;
  height: 4px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 182, 142, 0.06), transparent);
}
.orn-line:last-child::before {
  left: 20%;
}
.orn-line:last-child::after {
  right: 15%;
}
.orn-diamond {
  font-size: 10px;
  color: var(--accent);
  opacity: 0.3;
  animation: orn-breathe 4s ease-in-out infinite;
  text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.15);
}
@keyframes orn-breathe {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(1.15); }
}

.garden-kicker {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-low);
  margin-bottom: 8px;
  position: relative;
}
.garden-kicker::before,
.garden-kicker::after {
  content: '~';
  display: inline-block;
  margin: 0 6px;
  opacity: 0.2;
  font-size: 9px;
}

.garden-title {
  font-size: 30px;
  font-weight: 500;
  color: var(--text-high);
  text-align: center;
  margin-bottom: 10px;
  letter-spacing: 6px;
  font-family: var(--font-heading-zh);
  position: relative;
  text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.08), 0 0 60px rgba(245, 201, 74, 0.03);
  transition: text-shadow 30s ease;
}
.ambient-warm .garden-title {
  text-shadow: 0 0 25px rgba(var(--accent-rgb), 0.15), 0 0 80px rgba(245, 201, 74, 0.06);
}
.ambient-dim .garden-title {
  text-shadow: 0 0 15px rgba(107, 142, 155, 0.06), 0 0 40px rgba(107, 142, 155, 0.03);
}
.ambient-bright .garden-title {
  text-shadow: 0 0 30px rgba(var(--accent-rgb), 0.12), 0 0 100px rgba(245, 201, 74, 0.05);
}

.garden-desc {
  max-width: 600px;
  text-align: center;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(var(--text-primary-rgb), 0.45);
  margin-bottom: 20px;
}

/* ---- 概览卡片 ---- */
.garden-overview {
  width: min(860px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

/* ---- 安全岛光路（蓝图心理安全机制，不弹窗不推送） ---- */
.safety-path {
  width: min(860px, 100%);
  margin: 0 auto 18px;
  padding: 16px 18px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(43, 108, 176, 0.08), rgba(43, 108, 176, 0.03));
  border: 1px solid rgba(43, 108, 176, 0.18);
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.sp-icon {
  font-size: 22px;
  color: rgba(43, 108, 176, 0.6);
  line-height: 1.4;
}
.sp-body { flex: 1; }
.sp-line {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.72);
  margin: 0 0 6px;
}
.sp-scroll {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(var(--text-primary-rgb), 0.5);
  margin: 0 0 10px;
}
.sp-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid rgba(43, 108, 176, 0.3);
  background: rgba(43, 108, 176, 0.12);
  color: rgba(43, 108, 176, 0.9);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.sp-btn:hover { background: rgba(43, 108, 176, 0.2); }
.safety-fade-enter-active, .safety-fade-leave-active { transition: opacity 0.6s ease; }
.safety-fade-enter-from, .safety-fade-leave-to { opacity: 0; }

.overview-card {
  padding: 18px 16px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.25s ease, box-shadow 30s ease;
  position: relative;
  overflow: hidden;
}
.overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: radial-gradient(ellipse at 30% 0%, rgba(245, 201, 74, 0.02), transparent 60%);
  pointer-events: none;
  transition: opacity 30s ease;
}
.overview-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.ambient-warm .overview-card {
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.03);
}
.ambient-dim .overview-card {
  box-shadow: none;
}
.ambient-bright .overview-card {
  box-shadow: 0 0 30px rgba(245, 201, 74, 0.02);
}

.ov-label {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}
.ov-value {
  font-size: 22px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}
.ov-note {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* ---- 统计概览 ---- */
.stats-section {
  width: min(860px, 100%);
  margin-bottom: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: border-color 0.2s, background 0.2s, box-shadow 30s ease;
}
.stat-box:hover {
  background: rgba(55, 48, 40, 0.4);
  border-color: rgba(var(--accent-rgb), 0.1);
}
.ambient-warm .stat-box {
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.02);
}
.stat-num {
  font-size: 18px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
}
.stat-desc {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

/* ---- 筛选 ---- */
.filter-section {
  width: min(860px, 100%);
  margin-bottom: 16px;
}
.filter-group {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-dim);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s, box-shadow 0.2s;
}
.filter-pill:hover {
  background: rgba(55, 48, 40, 0.5);
  color: rgba(var(--text-primary-rgb), 0.65);
  border-color: rgba(var(--accent-rgb), 0.12);
}
.filter-pill.active {
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.85);
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.03);
}
.filter-icon {
  font-size: 13px;
}

/* ---- 情绪选择器 ---- */
.emotion-picker {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.emo-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-dim);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s, box-shadow 30s ease;
  position: relative;
  overflow: hidden;
}
.emo-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: radial-gradient(ellipse at 50% 0%, rgba(245, 201, 74, 0.02), transparent 60%);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.emo-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  color: rgba(var(--text-primary-rgb), 0.65);
  border-color: rgba(var(--accent-rgb), 0.12);
}
.emo-btn:hover::before {
  opacity: 1;
}
.emo-btn.active {
  color: rgba(var(--text-primary-rgb), 0.85);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.03);
}
.emo-icon {
  font-size: 18px;
}
.emo-label {
  font-size: 10px;
  letter-spacing: 0.5px;
}

/* ---- 天气第二轴（可选） ---- */
.weather-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.weather-hint {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
  margin-right: 2px;
  opacity: 0.6;
}
.weather-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: all 0.2s, box-shadow 0.2s;
}
.weather-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.12);
  transform: translateY(-1px);
}
.weather-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.04);
  transform: translateY(-1px);
}

/* ---- 输入行 ---- */
.input-row {
  display: flex;
  gap: 10px;
  max-width: 400px;
  margin: 0 auto 14px;
  position: relative;
}
.note-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.note-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.03);
}
.note-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.plant-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.25s, transform 0.15s, box-shadow 0.25s;
  box-shadow: 0 0 8px rgba(0,0,0,0.2);
}
.plant-btn:hover {
  opacity: 0.85;
  transform: scale(1.02);
  box-shadow: 0 0 16px rgba(0,0,0,0.3);
}
.plant-btn:active {
  transform: scale(0.97);
}

/* ---- 选中预览 ---- */
.selected-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
}
.preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 12px currentColor, 0 0 24px currentColor;
}
.preview-note {
  color: var(--text-secondary);
  font-style: italic;
  transition: opacity 0.3s;
}
.preview-weather {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--text-primary-rgb), 0.6);
}

/* ---- 汇总 ---- */
.garden-summary {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.summary-chip {
  font-size: 11px;
  opacity: 0.4;
}

/* ---- LOD 状态指示 ---- */
.lod-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 12px;
  font-size: 11px;
  color: var(--text-low);
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(var(--bg-card-rgb), 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  backdrop-filter: blur(4px);
}
.lod-label {
  opacity: 0.5;
}
.lod-level {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.lod-badge-full {
  background: rgba(124, 182, 142, 0.15);
  color: rgba(124, 182, 142, 0.8);
  border: 1px solid rgba(124, 182, 142, 0.2);
}
.lod-badge-simplified {
  background: rgba(245, 201, 74, 0.12);
  color: rgba(245, 201, 74, 0.7);
  border: 1px solid rgba(245, 201, 74, 0.18);
}
.lod-badge-dot {
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.6);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}
.lod-badge-blur {
  background: rgba(160, 140, 120, 0.08);
  color: rgba(160, 140, 120, 0.5);
  border: 1px solid rgba(160, 140, 120, 0.12);
}
.lod-desc {
  opacity: 0.4;
}
.lod-count {
  opacity: 0.45;
  font-size: 10px;
}

/* ---- 温室环境控制 ---- */
.env-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.env-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  backdrop-filter: blur(6px);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.env-item:hover {
  border-color: rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.04);
}
.env-label {
  font-size: 11px;
  color: var(--text-low);
  min-width: 42px;
}
.env-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-dim);
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  padding: 0;
}
.env-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  color: var(--text-bright);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.env-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 32px;
  text-align: center;
}

/* ---- 环境评分 ---- */
.env-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.env-status-bar {
  width: 120px;
  height: 6px;
  border-radius: 999px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.env-status-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease, background 0.5s ease;
}
.env-status-text {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.5px;
}

/* ---- LOD 降级样式 ---- */
.lod-simplified .flower-item {
  transform: scale(0.85);
  opacity: 0.85;
}
.lod-simplified .flower-item::before {
  width: 50px;
  height: 50px;
}
.lod-simplified .flower-item::after {
  display: none;
}

.lod-dot .flower-item {
  transform: scale(0.5);
  opacity: 0.6;
}
.lod-dot .flower-item::before {
  width: 24px;
  height: 24px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.12) 0%, transparent 70%);
}
.lod-dot .flower-item::after {
  display: none;
}
.lod-dot .flower-delete-btn {
  display: none;
}

.lod-blur .flower-item {
  transform: scale(0.35);
  opacity: 0.35;
  filter: blur(2px);
}
.lod-blur .flower-item::before {
  width: 16px;
  height: 16px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.08) 0%, transparent 70%);
}
.lod-blur .flower-item::after {
  display: none;
}
.lod-blur .flower-delete-btn {
  display: none;
}

/* ---- 灵犀标记 ---- */
.lingxi-mark {
  text-align: center;
  padding: 6px 16px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
  z-index: 2;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.02);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  backdrop-filter: blur(4px);
}
.lingxi-dew {
  animation: dew-glimmer 3s ease-in-out infinite;
}
@keyframes dew-glimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}

/* ============================================================
   花房地板（可滚动区域）
   ============================================================ */
.garden-floor {
  flex: 1;
  overflow-y: auto;
  padding: 10px 32px 60px;
  position: relative;
  z-index: 1;
}

/* ============================================================
   趋势图 - 微光背景 & 醒目柱子
   ============================================================ */
.trend-section {
  padding: 20px 0 12px;
  position: relative;
}
.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-dim);
  margin: 0 0 16px;
  text-align: center;
  letter-spacing: 1px;
  position: relative;
}
.section-title::after {
  content: '';
  display: block;
  width: 40px;
  height: 1px;
  margin: 8px auto 0;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.15), transparent);
}
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 150px;
  padding: 0 10px;
  position: relative;
}
/* 柱子区域微光背景 */
.trend-chart::before {
  content: '';
  position: absolute;
  bottom: 24px;
  left: 30px;
  right: 10px;
  height: 100px;
  background: radial-gradient(ellipse 80% 60% at 50% 100%, rgba(var(--accent-rgb), 0.02), transparent 70%);
  pointer-events: none;
  z-index: 0;
  transition: background 30s ease;
}
.ambient-warm .trend-chart::before {
  background: radial-gradient(ellipse 80% 60% at 50% 100%, rgba(245, 201, 74, 0.03), transparent 70%);
}
.ambient-bright .trend-chart::before {
  background: radial-gradient(ellipse 80% 60% at 50% 100%, rgba(var(--accent-rgb), 0.03), transparent 70%);
}
.trend-y-axis {
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  height: 130px;
  width: 20px;
  flex-shrink: 0;
  padding-bottom: 24px;
  position: relative;
  z-index: 1;
}
.trend-y-label {
  font-size: 9px;
  color: rgba(var(--text-primary-rgb), 0.15);
  text-align: right;
}
.trend-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 130px;
  padding-bottom: 24px;
  position: relative;
  z-index: 1;
}
.trend-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.trend-bar-stack {
  width: 24px;
  border-radius: 4px 4px 0 0;
  background: rgba(var(--accent-rgb), 0.04);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  transition: height 0.4s ease;
  min-height: 2px;
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.03);
}
.trend-bar-segment {
  width: 100%;
  border-radius: 0;
  transition: height 0.3s ease, opacity 0.3s ease;
  opacity: 0.75;
}
.trend-bar-segment:first-child {
  border-radius: 4px 4px 0 0;
}
.trend-bar-segment:hover {
  opacity: 1;
  filter: brightness(1.15);
}
.trend-bar-label {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.25);
}
.trend-bar-date {
  font-size: 9px;
  color: rgba(var(--text-primary-rgb), 0.15);
}
.trend-legend {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.trend-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-low);
}
.trend-legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 4px currentColor;
}

/* ============================================================
   情绪日历 - 柔和标记
   ============================================================ */
.calendar-section {
  padding: 16px 0 20px;
}
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 14px;
}
.cal-nav-btn {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-dim);
  font-size: 16px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.cal-nav-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  color: var(--text-bright);
}
.cal-nav-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.45);
  min-width: 120px;
  text-align: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  max-width: 400px;
  margin: 0 auto;
}
.cal-weekday {
  text-align: center;
  font-size: 10px;
  color: var(--text-faint);
  padding: 6px 0;
}
.cal-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  position: relative;
  transition: all 0.2s;
}
.cal-day-empty {
  visibility: hidden;
}
.cal-day-has {
  color: var(--text-medium);
  background: rgba(var(--accent-rgb), 0.04);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.02);
}
.cal-day-today {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.05);
}
.cal-day-num {
  line-height: 1;
}
.cal-day-dot {
  font-size: 6px;
  line-height: 1;
  color: var(--accent);
  opacity: 0.5;
  margin-top: 2px;
}

/* ============================================================
   导出
   ============================================================ */
.export-section {
  width: 100%;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: rgba(var(--text-primary-rgb), 0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.export-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  color: var(--text-bright);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.export-icon {
  font-size: 13px;
}
.export-panel {
  width: 100%;
  max-width: 540px;
  background: rgba(26, 22, 18, 0.7);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(8px);
}
.export-text {
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  font-family: inherit;
}
.export-close-btn {
  margin-top: 10px;
  padding: 4px 16px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: var(--text-low);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.export-close-btn:hover {
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.6);
}

/* ============================================================
   花海 - 花朵光晕增强
   ============================================================ */
.flower-section {
  padding: 8px 0;
}
.flower-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 20px;
  justify-items: center;
  padding: 20px 0;
}
.flower-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* 通用花朵光晕底座 - 暖色微光环绕 */
.flower-item::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.5s, transform 0.5s, background 0.5s;
}
.flower-item:hover::before {
  opacity: 0.8;
  transform: translate(-50%, -55%) scale(1.2);
}
/* 花朵上方的聚集微光 */
.flower-item::after {
  content: '';
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 201, 74, 0.02), transparent 60%);
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.6s ease;
}
.flower-item:hover::after {
  opacity: 1;
}
.flower-delete-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 5;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(13, 11, 9, 0.7);
  color: var(--del-color, var(--text-dim));
  font-size: 10px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  padding: 0;
  backdrop-filter: blur(4px);
}
.flower-item:hover .flower-delete-btn {
  opacity: 0.6;
}
.flower-delete-btn:hover {
  opacity: 1 !important;
  background: rgba(13, 11, 9, 0.9);
}

/* ---- 空状态 ---- */
.empty-garden {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 8px;
}
.empty-icon-wrap {
  position: relative;
  margin-bottom: 8px;
}
.empty-icon {
  font-size: 48px;
  opacity: 0.35;
  position: relative;
  z-index: 1;
  animation: empty-breathe 4s ease-in-out infinite;
}
@keyframes empty-breathe {
  0%, 100% { transform: scale(1); opacity: 0.35; }
  50% { transform: scale(1.08); opacity: 0.5; }
}
.empty-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06), transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 4s ease-in-out infinite;
}
@keyframes glow-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
}
.empty-text {
  font-size: 14px;
  color: rgba(var(--text-primary-rgb), 0.25);
}
.empty-hint {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.15);
}

/* ============================================================
   花房空间布局
   ============================================================ */
/* 视图切换按钮 */
.view-toggle {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}
.toggle-btn {
  padding: 6px 18px;
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: var(--text-medium);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: var(--font-body-zh);
}
.toggle-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--text-bright);
}
.toggle-btn.active {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--text-primary-rgb), 0.9);
}

/* 温室平面布局 */
.layout-section {
  padding: 0 16px 40px;
  position: relative;
  z-index: 2;
}
.greenhouse-plan {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 700px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(10, 8, 6, 0.5);
  box-shadow:
    0 0 40px rgba(var(--accent-rgb), 0.02),
    inset 0 0 60px rgba(var(--accent-rgb), 0.02);
  position: relative;
}
.greenhouse-plan::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background:
    radial-gradient(ellipse 80% 30% at 50% 0%, rgba(245, 201, 74, 0.04), transparent 60%),
    radial-gradient(ellipse 80% 30% at 50% 100%, rgba(107, 142, 155, 0.04), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

/* 区域卡片 */
.gh-zone {
  padding: 16px 20px;
  position: relative;
  min-height: 100px;
  transition: background 0.5s ease;
  z-index: 1;
}
.gh-zone-sun {
  background: linear-gradient(135deg, rgba(245, 201, 74, 0.06), rgba(245, 201, 74, 0.02));
  border-bottom: 1px solid rgba(245, 201, 74, 0.06);
  position: relative;
}
.gh-zone-sun::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse 60% 80% at 30% 50%, rgba(245, 201, 74, 0.04), transparent 70%);
  pointer-events: none;
}
.gh-zone-meadow {
  background: linear-gradient(135deg, rgba(124, 182, 142, 0.04), rgba(124, 182, 142, 0.01));
  border-bottom: 1px solid rgba(124, 182, 142, 0.04);
  position: relative;
}
.gh-zone-meadow::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse 50% 80% at 50% 50%, rgba(124, 182, 142, 0.03), transparent 70%);
  pointer-events: none;
}
.gh-zone-shade {
  background: linear-gradient(135deg, rgba(107, 142, 155, 0.05), rgba(107, 142, 155, 0.02));
  position: relative;
}
.gh-zone-shade::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse 60% 80% at 70% 50%, rgba(107, 142, 155, 0.04), transparent 70%);
  pointer-events: none;
}

/* 区域标签 */
.zone-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.zone-icon {
  font-size: 16px;
}
.zone-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(var(--text-primary-rgb), 0.8);
  letter-spacing: 2px;
}
.zone-count {
  font-size: 11px;
  color: var(--text-low);
  margin-left: auto;
}
.zone-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

/* 区域花朵容器 */
.zone-flowers {
  position: relative;
  height: 60px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

/* 花朵点 */
.zf-item {
  position: absolute;
  left: var(--x);
  top: var(--y);
  cursor: pointer;
  z-index: 2;
}
.zf-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: zf-breathe 3s ease-in-out infinite;
  animation-delay: var(--delay);
  box-shadow: 0 0 6px var(--color);
  transition: transform 0.2s ease;
}
.zf-item:hover .zf-dot {
  transform: scale(1.8);
}
@keyframes zf-breathe {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

/* 区域空状态 */
.zone-empty {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.15);
  text-align: center;
  padding: 20px 0;
  font-style: italic;
}

/* ============================================================
   过渡动画
   ============================================================ */
.export-fade-enter-active,
.export-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.export-fade-enter-from,
.export-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 860px) {
  .garden-room-header { padding: 24px 16px 16px; }
  .garden-overview { grid-template-columns: 1fr; }
  .garden-title { font-size: 26px; }
  .selected-preview { align-items: flex-start; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .trend-section { padding: 16px 0 8px; }
  .calendar-section { padding: 12px 0 16px; }
  .garden-floor { padding: 8px 16px 40px; }
}

@media (max-width: 480px) {
  .garden-room-header { padding: 48px 12px 12px; }
  .garden-title { font-size: 22px; letter-spacing: 3px; }
  .garden-kicker { font-size: 10px; letter-spacing: 2px; }

  .garden-overview { gap: 6px; }

  .garden-stat {
    padding: 10px 12px;
    min-height: 56px;
  }
  .garden-stat-value { font-size: 18px; }
  .garden-stat-label { font-size: 9px; }

  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .stat-card { padding: 8px; min-height: 56px; }
  .stat-value { font-size: 16px; }
  .stat-label { font-size: 9px; }

  .calendar-grid { gap: 2px; }
  .cal-day {
    font-size: 9px;
    height: 28px;
    width: 28px;
  }
  .cal-day-header { font-size: 8px; height: 20px; }
  .cal-month-label { font-size: 12px; }

  .trend-section { padding: 12px 0 6px; }
  .trend-chart { gap: 4px; }
  .trend-bar { width: 16px; border-radius: 3px 3px 0 0; }
  .trend-label { font-size: 8px; }

  .flower-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
  .flower-card { padding: 10px; }
  .flower-mood { font-size: 22px; }
  .flower-label { font-size: 10px; }
  .flower-date { font-size: 8px; }

  .emotion-picker { gap: 6px; }
  .emotion-btn { font-size: 20px; padding: 6px; }
  .emotion-label { font-size: 9px; }
  .emotion-note-input { padding: 8px 10px; font-size: 12px; }
  .emotion-save-btn { font-size: 11px; padding: 6px 14px; }

  .filter-group { gap: 4px; }
  .filter-btn { font-size: 9px; padding: 3px 8px; }

  .garden-floor { padding: 6px 12px 40px; }

  .export-btn { font-size: 10px; padding: 4px 10px; }
}

/* ========== 关怀提示面板 ========== */
.emotion-care {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  margin: 0 16px;
  border-radius: 14px;
  background: rgba(24, 20, 18, 0.88);
  border: 1px solid rgba(212, 165, 116, 0.18);
  backdrop-filter: blur(12px);
  animation: care-slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes care-slide-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.care-fade-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.care-fade-leave-active {
  transition: all 0.4s ease-in;
}
.care-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.care-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.care-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
  animation: care-icon-float 3s ease-in-out infinite;
}

@keyframes care-icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.care-body {
  flex: 1;
  min-width: 0;
}

.care-message {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(232, 224, 216, 0.85);
  letter-spacing: 0.3px;
}

.care-sub {
  margin: 6px 0 0;
  font-size: 11px;
  color: rgba(232, 224, 216, 0.35);
  letter-spacing: 0.5px;
}

.care-close {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(232, 224, 216, 0.1);
  background: rgba(232, 224, 216, 0.04);
  color: rgba(232, 224, 216, 0.35);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-top: 1px;
}

.care-close:hover {
  background: rgba(232, 224, 216, 0.1);
  border-color: rgba(232, 224, 216, 0.2);
  color: rgba(232, 224, 216, 0.6);
}

@media (max-width: 640px) {
  .emotion-care {
    margin: 0 8px;
    padding: 12px 14px;
    gap: 8px;
  }
  .care-message { font-size: 12px; }
  .care-icon { font-size: 18px; }
}
</style>