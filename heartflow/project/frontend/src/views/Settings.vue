<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance settings">
    <!-- Ambient background layer -->
    <div data-enter class="settings-ambient" aria-hidden="true">
      <div class="ambient-grid"></div>
      <div class="ambient-glow"></div>
    </div>

    <div class="settings-layout">
      <nav class="settings-nav" aria-label="设置分组导航">
        <p class="settings-nav__title">分组</p>
        <ul class="settings-nav__list">
          <li
            v-for="item in navItems"
            :key="item.key"
            class="settings-nav__item"
            :class="{ 'is-active': activeKey === item.key }"
            role="button"
            tabindex="0"
            @click="onNavClick(item.key)"
            @keydown.enter="onNavClick(item.key)"
            @keydown.space.prevent="onNavClick(item.key)"
          >{{ item.label }}</li>
        </ul>
      </nav>
      <div class="settings-content">
        <div class="settings-filter">
          <input
            class="settings-filter__input"
            type="search"
            placeholder="搜索设置项…"
            :value="sectionFilter"
            @input="sectionFilter = ($event.target as HTMLInputElement).value"
          />
        </div>

    <RoomHeader
      class="settings-room-header"
      data-enter
      kicker="CONTROL PANEL"
      title="殿堂设置"
      subtitle="自定义你的心流工坊环境与交互体验"
    >
      <template #ornament>
        <div class="settings-ornament">
          <span class="ornament-line"></span>
          <span class="ornament-diamond">✦</span>
          <span class="ornament-line"></span>
        </div>
      </template>
    </RoomHeader>

    <div data-enter class="settings-section super-custom">
      <h2 class="section-title">超级自定义</h2>
      <p class="section-desc">统一调校你的心流工坊环境、动效与界面显隐，打造只属于你的沉浸空间。</p>

      <div class="sub-group" :class="sectionClass('bg')" :data-section="'bg'">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('bg')" @keydown.enter="toggleSection('bg')" @keydown.space.prevent="toggleSection('bg')">
          <span class="sub-group__chevron">{{ openSections.bg ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">背景介质</h3>
            <p class="sub-desc">图片 ≤ 2MB · 视频 ≤ 4MB，内容会留在当前设备。</p>
          </div>
        </div>

      <div class="bg-preview" :class="{ 'bg-preview--default': currentBackground.type === 'default' }">
        <img
          v-if="currentBackground.type === 'image' && currentBackground.dataUrl"
          class="bg-preview__asset"
          :src="currentBackground.dataUrl"
          :alt="currentBackground.fileName ?? '自定义背景预览'"
        />
        <video
          v-else-if="currentBackground.type === 'video' && currentBackground.dataUrl"
          ref="previewVideoRef"
          class="bg-preview__asset"
          :src="currentBackground.dataUrl"
          :muted="!(previewOwnsAudio && currentBackground.muted === false)"
          loop
          playsinline
          autoplay
          preload="metadata"
        />
        <div v-else class="bg-preview__empty">
          <span>默认氛围背景</span>
        </div>
        <span class="bg-preview__badge">{{ backgroundTypeLabel }}</span>
      </div>

      <div class="bg-actions">
        <button class="bg-btn" type="button" :disabled="backgroundBusy" @click="pickImageBackground">
          导入图片
        </button>
        <button class="bg-btn" type="button" :disabled="backgroundBusy" @click="pickVideoBackground">
          导入视频
        </button>
        <button class="bg-btn" type="button" :disabled="backgroundBusy" @click="setGradientBackground">
          渐变
        </button>
        <button class="bg-btn bg-btn--ghost" type="button" :disabled="backgroundBusy" @click="resetBackgroundMedia">
          回到默认
        </button>
      </div>

      <div
        v-if="currentBackground.type === 'video'"
        class="toggle-row"
        role="switch"
        :aria-checked="backgroundHasSound"
        tabindex="0"
        @click="toggleBackgroundSound"
        @keydown.enter="toggleBackgroundSound"
        @keydown.space.prevent="toggleBackgroundSound"
      >
        <div class="toggle-info">
          <span class="toggle-label">视频原声</span>
          <span class="toggle-desc">{{ backgroundHasSound ? '正在播放声音' : '已静音播放' }}</span>
        </div>
        <button type="button" class="switch" :class="{ on: backgroundHasSound }">
          <span class="switch-knob"></span>
        </button>
      </div>

      <div class="slider-group" v-if="currentBackground.type === 'video'" style="margin-top: 14px">
        <label class="slider-label">
          <span>视频播放速度</span>
          <span class="slider-value">{{ bgVideoRate }}×</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.25"
          class="slider-input"
          :value="bgVideoRate"
          @input="onBgVideoRate"
        />
        <div class="slider-hints">
          <span>慢 0.5×</span>
          <span>快 2×</span>
        </div>
      </div>

      <div
        v-if="currentBackground.type === 'video'"
        class="toggle-row"
        role="switch"
        :aria-checked="previewFollowsGlobal"
        tabindex="0"
        @click="togglePreviewFollowsGlobal"
        @keydown.enter="togglePreviewFollowsGlobal"
        @keydown.space.prevent="togglePreviewFollowsGlobal"
      >
        <div class="toggle-info">
          <span class="toggle-label">预览与全局实时同步</span>
          <span class="toggle-desc">{{ previewFollowsGlobal ? '预览跟随全局播放进度（同帧）' : '预览独立播放' }}</span>
        </div>
        <button type="button" class="switch" :class="{ on: previewFollowsGlobal }">
          <span class="switch-knob"></span>
        </button>
      </div>

      <div class="bg-presets">
        <h3 class="preset-title">预设场景</h3>
        <div class="preset-grid">
          <button
            v-for="s in presetScenes"
            :key="s.value"
            class="preset-btn"
            :class="{ 'preset-btn--active': currentBackground.type === 'preset' && currentBackground.presetScene === s.value }"
            type="button"
            :disabled="backgroundBusy"
            @click="selectPresetScene(s.value)"
          >
            <span class="preset-btn__dot" :style="{ background: s.color }" />
            <span class="preset-btn__label">{{ s.label }}</span>
          </button>
        </div>
      </div>

      <div v-if="currentBackground.type === 'gradient'" class="bg-gradient-edit">
        <h3 class="preset-title">渐变编辑</h3>
        <GradientEditor :model-value="currentGradient" @update:model-value="onGradientEdit" />
      </div>

      <p class="bg-summary">{{ backgroundSummary }}</p>
      <p class="bg-meta">{{ backgroundMeta }}</p>
      <p v-if="backgroundAppliedMessage" class="bg-success">{{ backgroundAppliedMessage }}</p>
      <p v-if="backgroundError" class="bg-error">{{ backgroundError }}</p>

      <input
        ref="imageInputRef"
        class="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        @change="onBackgroundFileChange($event, 'image')"
      />
      <input
        ref="videoInputRef"
        class="sr-only"
        type="file"
        accept="video/mp4,video/webm"
        @change="onBackgroundFileChange($event, 'video')"
      />
    </div>


      <!-- 房间背景（宪法第二条超级自定义 · 每个房间可单独设背景 / 跟随全局 / 多房间选同一项即天然分组） -->
      <div class="sub-group" :class="sectionClass('roombg')" :data-section="'roombg'">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('roombg')" @keydown.enter="toggleSection('roombg')" @keydown.space.prevent="toggleSection('roombg')">
          <span class="sub-group__chevron">{{ openSections.roombg ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">房间背景</h3>
            <p class="sub-desc">为每个房间单独指定背景，或统一跟随全局；多房间选同一项即天然「分组」。与主题色正交。</p>
          </div>
        </div>

        <div class="roombg-body">
          <div class="roombg-room-select">
            <label class="rm-detail-label">选择房间</label>
            <select class="roombg-select" v-model="selectedRoomId">
              <option v-for="r in roomList" :key="r.id" :value="r.id">{{ r.icon }} {{ r.name }}</option>
            </select>
          </div>

          <div class="seg-row">
            <span class="seg-label">背景模式</span>
            <div class="seg">
              <button
                v-for="m in roomBgModeOptions"
                :key="m.value"
                type="button"
                :class="['seg-btn', { active: roomBgMode === m.value }]"
                @click="setRoomBgMode(m.value)"
              >{{ m.label }}</button>
            </div>
          </div>

          <p v-if="roomBgMode === 'global'" class="sub-desc">该房间当前跟随全局背景（与其他房间共享同一背景）。切到其它模式可单独指定。</p>

          <div v-else-if="roomBgMode === 'preset'" class="bg-presets">
            <div class="preset-grid">
              <button
                v-for="s in presetScenes"
                :key="s.value"
                class="preset-btn"
                :class="{ 'preset-btn--active': roomCurrentBg && roomCurrentBg.type === 'preset' && roomCurrentBg.presetScene === s.value }"
                type="button"
                :disabled="roomBgBusy"
                @click="setRoomPreset(s.value)"
              >
                <span class="preset-btn__dot" :style="{ background: s.color }" />
                <span class="preset-btn__label">{{ s.label }}</span>
              </button>
            </div>
          </div>

          <div v-else-if="roomBgMode === 'gradient'" class="bg-gradient-edit">
            <GradientEditor :model-value="roomGradient" @update:model-value="onRoomGradientEdit" />
          </div>

          <div v-else-if="roomBgMode === 'image'" class="roombg-image">
            <div class="bg-preview" :class="{ 'bg-preview--default': !(roomCurrentBg && roomCurrentBg.type === 'image' && roomCurrentBg.dataUrl) }">
              <img v-if="roomCurrentBg && roomCurrentBg.type === 'image' && roomCurrentBg.dataUrl" class="bg-preview__asset" :src="roomCurrentBg.dataUrl" :alt="roomCurrentBg.fileName ?? '房间背景预览'" />
              <div v-else class="bg-preview__empty"><span>尚未导入图片</span></div>
            </div>
            <div class="bg-actions">
              <button class="bg-btn" type="button" :disabled="roomBgBusy" @click="pickRoomImage">导入图片</button>
            </div>
            <input ref="roomImageInputRef" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" @change="onRoomImageChange" />
          </div>

          <p v-if="roomBgMessage" class="bg-success">{{ roomBgMessage }}</p>
          <p v-if="roomBgError" class="bg-error">{{ roomBgError }}</p>
        </div>
      </div>

      <!-- 氛围主题（原右下角常驻浮层：迁至此处与幕僚阁两入口） -->
      <div class="sub-group" :class="{ 'is-collapsed': !openSections.aura }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('aura')" @keydown.enter="toggleSection('aura')" @keydown.space.prevent="toggleSection('aura')">
          <span class="sub-group__chevron">{{ openSections.aura ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">氛围主题</h3>
            <p class="sub-desc">星图 / 呼吸球 / 流体壁纸等多元氛围，本地保存。</p>
          </div>
        </div>

        <AuraThemePicker />
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.taxonomy }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('taxonomy')" @keydown.enter="toggleSection('taxonomy')" @keydown.space.prevent="toggleSection('taxonomy')">
          <span class="sub-group__chevron">{{ openSections.taxonomy ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">侧栏分类</h3>
            <p class="sub-desc">切换导航树聚合维度，或自建分组拖拽归并。</p>
          </div>
        </div>

        <div class="tax-body">
          <div class="tax-schemes">
            <button
              v-for="t in TAXONOMY_ORDER"
              :key="t"
              type="button"
              class="seg-btn"
              :class="{ active: selectedTaxonomy === t }"
              @click="setTaxonomy(t)"
            >{{ TAXONOMY_LABELS[t] }}</button>
          </div>

          <div v-if="selectedTaxonomy === 'custom'" class="tax-groups">
            <div
              v-for="(g, i) in customGroups"
              :key="g.id"
              class="tax-group-row"
              :class="{ 'is-drop-target': groupDragOver === i && groupDragFrom !== i }"
              draggable="true"
              @dragstart="onGroupDragStart(i, $event)"
              @dragover="onGroupDragOver(i, $event)"
              @drop="onGroupDrop(i, $event)"
              @dragend="onGroupDragEnd"
            >
              <span class="tax-grip" title="拖动排序" aria-label="拖动排序">⠿</span>
              <input
                class="tax-group-input"
                :value="g.name"
                @change="renameCustomGroup(g.id, ($event.target as HTMLInputElement).value)"
              />
              <span class="tax-group-count">{{ g.roomIds.length }}</span>
              <button type="button" class="tax-group-del" title="删除分组" @click="deleteGroup(g.id)">×</button>
            </div>
            <p v-if="customGroups.length === 0" class="sub-desc">尚无自定义分组，点击下方新建。按住左侧 ⠿ 上下拖动可调整分组顺序。</p>
            <button type="button" class="tax-group-add" @click="createCustomGroup()">＋ 新建分组</button>
          </div>
          <p v-else class="sub-desc">当前为预设体系；选「自定义」后可新建/改名/删除分组，并在侧栏长按拖动房间归入。</p>
        </div>
      </div>

      <!-- 房间设置（聚合面板：所有房间的显隐 / 自定义 / 钉入归属集中至此一处，与「房间管理器」路由同源） -->
      <div class="sub-group" :class="{ 'is-collapsed': !openSections.rooms }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('rooms')" @keydown.enter="toggleSection('rooms')" @keydown.space.prevent="toggleSection('rooms')">
          <span class="sub-group__chevron">{{ openSections.rooms ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">房间设置</h3>
            <p class="sub-desc">集中管理每个房间在导航中的显隐、名称/图标/颜色与归入院中领域，归纳于一处。</p>
          </div>
        </div>

        <RoomSettingsPanel />
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.operation }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('operation')" @keydown.enter="toggleSection('operation')" @keydown.space.prevent="toggleSection('operation')">
          <span class="sub-group__chevron">{{ openSections.operation ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">三级操作模式</h3>
            <p class="sub-desc">决定幕僚顾问主动动作与自动化流程如何被执行：静默自动 / 确认后执行 / 仅建议。</p>
          </div>
        </div>

        <div class="opmode-grid">
          <button
            v-for="opt in OPERATION_MODE_OPTIONS"
            :key="opt.value"
            type="button"
            class="opmode-option"
            :class="{ 'opmode-option--active': configRef.operationMode === opt.value }"
            @click="setOperationMode(opt.value)"
          >
            <span class="opmode-option__icon">{{ opt.icon }}</span>
            <span class="opmode-option__label">{{ opt.label }}</span>
            <span class="opmode-option__desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.gesture }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('gesture')" @keydown.enter="toggleSection('gesture')" @keydown.space.prevent="toggleSection('gesture')">
          <span class="sub-group__chevron">{{ openSections.gesture ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">手势映射</h3>
            <p class="sub-desc">为不同手势指定对应动作，修改后立即生效，不重启，不唠叨。</p>
          </div>
        </div>
        <GestureConfigEditor
          :bindings="configRef.gestures.bindings"
          @change="updateGestureBinding"
        />
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.anim }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('anim')" @keydown.enter="toggleSection('anim')" @keydown.space.prevent="toggleSection('anim')">
          <span class="sub-group__chevron">{{ openSections.anim ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">界面动画</h3>
            <p class="sub-desc">控制房间切换动画的时长，适应你的心流节奏。</p>
          </div>
        </div>

      <div class="slider-group">
        <label class="slider-label">
          <span>切换动画时长</span>
          <span class="slider-value">{{ localTransitionDuration }}ms</span>
        </label>
        <input
          type="range"
          min="50"
          max="1000"
          step="50"
          class="slider-input"
          v-model.number="localTransitionDuration"
          @change="applyTransitionDuration"
        />
        <div class="slider-hints">
          <span>快 (50ms)</span>
          <span>慢 (1000ms)</span>
        </div>
      </div>
    </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.visual }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('visual')" @keydown.enter="toggleSection('visual')" @keydown.space.prevent="toggleSection('visual')">
          <span class="sub-group__chevron">{{ openSections.visual ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">视觉强度</h3>
            <p class="sub-desc">微调环境氛围、粒子画布与自定义背景的呈现强度。</p>
          </div>
        </div>

      <!-- 琉璃通透度：净透琉璃材质主控，统管全部玻璃面（对话框/状态面板/流星标签/侧栏/浮岛） -->
      <div class="slider-group">
        <label class="slider-label">
          <span>琉璃通透度</span>
          <span class="slider-value">{{ glassClearAlpha }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="slider-input"
          :value="glassClearAlpha"
          @input="onAlpha(setGlassClearAlpha, $event)"
        />
        <div class="slider-hints">
          <span>透</span>
          <span>实</span>
        </div>
      </div>
      <p class="field-desc seg-desc">统管镜我对话框、状态面板、流星标签、侧边栏与悬浮浮岛的玻璃透明度（与幕僚球同源材质）；各面旧滑块降级为其叠加倍率。</p>

      <div class="slider-group">
        <label class="slider-label">
          <span>粒子画布强度</span>
          <span class="slider-value">{{ canvasAlpha }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="slider-input"
          :value="canvasAlpha"
          @input="onAlpha(setCanvasAlpha, $event)"
        />
        <div class="slider-hints">
          <span>透出背景</span>
          <span>满强度</span>
        </div>
      </div>

      <div class="slider-group">
        <label class="slider-label">
          <span>环境辉光</span>
          <span class="slider-value">{{ ambientGlowAlpha }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="slider-input"
          :value="ambientGlowAlpha"
          @input="onAlpha(setAmbientGlowAlpha, $event)"
        />
        <div class="slider-hints">
          <span>暗</span>
          <span>亮</span>
        </div>
      </div>

      <div class="slider-group">
        <label class="slider-label">
          <span>环境颗粒</span>
          <span class="slider-value">{{ ambientGrainAlpha }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="slider-input"
          :value="ambientGrainAlpha"
          @input="onAlpha(setAmbientGrainAlpha, $event)"
        />
        <div class="slider-hints">
          <span>无</span>
          <span>明显</span>
        </div>
      </div>

      <div class="slider-group">
        <label class="slider-label">
          <span>漂浮微尘</span>
          <span class="slider-value">{{ ambientDustAlpha }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="slider-input"
          :value="ambientDustAlpha"
          @input="onAlpha(setAmbientDustAlpha, $event)"
        />
        <div class="slider-hints">
          <span>无</span>
          <span>浓郁</span>
        </div>
      </div>

      <div class="slider-group">
        <label class="slider-label">
          <span>背景强度</span>
          <span class="slider-value">{{ appBgAlpha }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          class="slider-input"
          :value="appBgAlpha"
          @input="onAlpha(setAppBgAlpha, $event)"
        />
        <div class="slider-hints">
          <span>隐去</span>
          <span>实底</span>
        </div>
      </div>

      <!-- 对话框形态 + 结晶风格（宪法第二条超级自定义 · 多选择可切换，保留全部选项） -->
      <div class="seg-row">
        <span class="seg-label">对话框形态</span>
        <div class="seg">
          <button
            v-for="opt in dialogueShapeOptions"
            :key="opt.value"
            type="button"
            :class="['seg-btn', { active: dialogueShape === opt.value }]"
            @click="setDialogueShape(opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>
      <p class="field-desc seg-desc">镜我对话气泡外形，告别方盒：对话泡 / 有机斑团 / 弧顶卡 / 极简胶囊。</p>

      <div class="seg-row">
        <span class="seg-label">结晶风格</span>
        <div class="seg">
          <button
            v-for="opt in crystalStyleOptions"
            :key="opt.value"
            type="button"
            :class="['seg-btn', { active: crystalStyle === opt.value }]"
            @click="setCrystalStyle(opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>
      <p class="field-desc seg-desc">专注结晶渲染形态：真实切面宝石 / 玻璃光球 / 极简线晶 / 极光棱镜。</p>
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.chrome }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('chrome')" @keydown.enter="toggleSection('chrome')" @keydown.space.prevent="toggleSection('chrome')">
          <span class="sub-group__chevron">{{ openSections.chrome ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">界面显隐</h3>
            <p class="sub-desc">开启后，侧边栏与悬浮按钮（星盘、画布控制、笔记板）在桌面与移动端均会在静止数秒后自动隐藏，移动鼠标或触摸时再现，更专注。</p>
          </div>
        </div>
        <div
          class="toggle-row"
          role="switch"
          :aria-checked="autoHideChrome"
          tabindex="0"
          @click="toggleAutoHide"
          @keydown.enter="toggleAutoHide"
          @keydown.space.prevent="toggleAutoHide"
        >
          <div class="toggle-info">
            <span class="toggle-label">自动隐藏侧边栏与悬浮按钮</span>
            <span class="toggle-desc">默认开启 · 关闭后界面元素常驻显示</span>
          </div>
          <button type="button" class="switch" :class="{ on: autoHideChrome }" :aria-checked="autoHideChrome">
            <span class="switch-knob"></span>
          </button>
        </div>

        <div class="slider-group" style="margin-top: 16px">
          <label class="slider-label">
            <span>空闲隐藏时长</span>
            <span class="slider-value">{{ (autoHideDelay / 1000).toFixed(1) }}s</span>
          </label>
          <input
            type="range"
            min="1000"
            max="10000"
            step="500"
            class="slider-input"
            :value="autoHideDelay"
            @input="onAutoHideDelay"
          />
          <div class="slider-hints">
            <span>快 1.0s</span>
            <span>慢 10.0s</span>
          </div>
        </div>
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.sidebar }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('sidebar')" @keydown.enter="toggleSection('sidebar')" @keydown.space.prevent="toggleSection('sidebar')">
          <span class="sub-group__chevron">{{ openSections.sidebar ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">侧边栏</h3>
            <p class="sub-desc">自定义导航侧栏的宽度、背景质感、默认状态与密度。</p>
          </div>
        </div>

        <div class="seg-row">
          <span class="seg-label">宽度</span>
          <div class="seg">
            <button
              v-for="w in sidebarWidthOptions"
              :key="w"
              type="button"
              :class="['seg-btn', { active: sidebarWidth === w }]"
              @click="setSidebarWidth(w)"
            >{{ w }}</button>
          </div>
        </div>

        <div
          class="toggle-row"
          role="switch"
          :aria-checked="sidebarBgMode === 'glass'"
          tabindex="0"
          @click="toggleSidebarBgMode"
          @keydown.enter="toggleSidebarBgMode"
          @keydown.space.prevent="toggleSidebarBgMode"
        >
          <div class="toggle-info">
            <span class="toggle-label">毛玻璃通透背景</span>
            <span class="toggle-desc">关闭为独立深色实底；开启后侧栏变透明，露出全局背景</span>
          </div>
          <button type="button" class="switch" :class="{ on: sidebarBgMode === 'glass' }">
            <span class="switch-knob"></span>
          </button>
        </div>

        <div class="slider-group" v-if="sidebarBgMode === 'glass'" style="margin-top: 14px">
          <label class="slider-label">
            <span>叠加倍率</span>
            <span class="slider-value">{{ sidebarGlass }}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            class="slider-input"
            :value="sidebarGlass"
            @input="onSidebarGlass"
          />
          <div class="slider-hints">
            <span>淡</span>
            <span>浓</span>
          </div>
        </div>

        <div
          class="toggle-row"
          role="switch"
          :aria-checked="sidebarDefaultCollapsed"
          tabindex="0"
          @click="toggleSidebarDefaultCollapsed"
          @keydown.enter="toggleSidebarDefaultCollapsed"
          @keydown.space.prevent="toggleSidebarDefaultCollapsed"
        >
          <div class="toggle-info">
            <span class="toggle-label">启动即进入沉浸</span>
            <span class="toggle-desc">开启后桌面端启动默认收起侧栏（自动隐藏）；关闭则启动即展开</span>
          </div>
          <button type="button" class="switch" :class="{ on: sidebarDefaultCollapsed }">
            <span class="switch-knob"></span>
          </button>
        </div>

        <div class="seg-row">
          <span class="seg-label">密度</span>
          <div class="seg">
            <button
              v-for="d in sidebarDensityOptions"
              :key="d.value"
              type="button"
              :class="['seg-btn', { active: sidebarDensity === d.value }]"
              @click="setSidebarDensity(d.value)"
            >{{ d.label }}</button>
          </div>
        </div>
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.edgebar }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('edgebar')" @keydown.enter="toggleSection('edgebar')" @keydown.space.prevent="toggleSection('edgebar')">
          <span class="sub-group__chevron">{{ openSections.edgebar ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">悬浮浮岛通透度</h3>
            <p class="sub-desc">底部悬浮双浮岛的玻璃通透度，受全局「琉璃通透度」统管。</p>
          </div>
        </div>
        <div class="slider-group">
          <label class="slider-label">
            <span>浮岛不透明度</span>
            <span class="slider-value">{{ edgeBarAlpha }}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            class="slider-input"
            :value="edgeBarAlpha"
            @input="onEdgeBarAlpha"
          />
          <div class="slider-hints">
            <span>透明</span>
            <span>实底</span>
          </div>
        </div>

        <div class="edge-bar-preview" aria-hidden="true">
          <div class="edge-bar-preview__scene">
            <div
              class="edge-bar-preview__bar edge-bar-preview__bar--top"
              :style="{ background: 'rgba(var(--bg-primary-rgb), ' + (edgeBarAlpha / 100) + ')' }"
            >
              <span class="edge-bar-preview__tag">左浮岛</span>
            </div>
            <div class="edge-bar-preview__content">
              <span>示例内容 · 背景从这里透出</span>
            </div>
            <div
              class="edge-bar-preview__bar edge-bar-preview__bar--bottom"
              :style="{ background: 'rgba(var(--bg-primary-rgb), ' + (edgeBarAlpha / 100) + ')' }"
            >
              <span class="edge-bar-preview__tag">右浮岛</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sub-group" :class="{ 'is-collapsed': !openSections.astrolabe }">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('astrolabe')" @keydown.enter="toggleSection('astrolabe')" @keydown.space.prevent="toggleSection('astrolabe')">
          <span class="sub-group__chevron">{{ openSections.astrolabe ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">星图主题</h3>
            <p class="sub-desc">自定义天星盘的背景配色与搜索栏造型，仅作用于星图，本地保存。</p>
          </div>
        </div>

        <!-- 背景星图方案 -->
        <div class="theme-grid">
          <button
            v-for="s in astrolabeSchemes"
            :key="s.value"
            type="button"
            class="theme-chip"
            :class="{ 'theme-chip--active': astrolabeTheme.scheme === s.value }"
            :style="{ '--chip-accent': s.color }"
            @click="setAstrolabeScheme(s.value)"
          >
            <span class="theme-chip__dot" :style="{ background: s.color }" />
            <span class="theme-chip__label">{{ s.label }}</span>
          </button>
        </div>

        <!-- 搜索栏造型 -->
        <div class="seg-row">
          <span class="seg-label">搜索栏造型</span>
          <div class="seg">
            <button
              v-for="st in astrolabeSearchStyles"
              :key="st.value"
              type="button"
              :class="['seg-btn', { active: astrolabeTheme.search === st.value }]"
              @click="setAstrolabeSearchStyle(st.value)"
            >{{ st.label }}</button>
          </div>
        </div>

        <div class="astrolabe-theme-reset">
          <button class="bg-btn bg-btn--ghost" type="button" @click="resetAstrolabeTheme">恢复默认</button>
        </div>
      </div>

      <!-- 应用图标（自定义房间图标 + 电脑端 exe 图标向导） -->
      <div class="sub-group" :class="{ 'is-collapsed': !openSections.appicon }" :data-section="'appicon'">
        <div class="sub-group__head" role="button" tabindex="0" @click="toggleSection('appicon')" @keydown.enter="toggleSection('appicon')" @keydown.space.prevent="toggleSection('appicon')">
          <span class="sub-group__chevron">{{ openSections.appicon ? '▾' : '▸' }}</span>
          <div class="sub-group__heading">
            <h3 class="sub-title">应用图标</h3>
            <p class="sub-desc">自定义 app 品牌图标（侧栏徽标 / favicon）与房间图标；电脑端窗口图标为构建期资源，见向导。</p>
          </div>
        </div>

        <div class="rm-detail-field">
          <label class="rm-detail-label">应用品牌图标（app 自身 logo）</label>
          <IconPicker :model-value="appBrandIcon" label="心流工坊" @change="onAppBrandIconChange" />
        </div>

        <div class="rm-detail-field">
          <label class="rm-detail-label">电脑端图标（窗口 / 任务栏 / 桌面快捷方式）</label>
          <DesktopIconWizard />
        </div>
      </div>

      <!-- 数据整理（data:cleanup · 仅宪法显式启用后出现入口） -->
      <DataCleanupPanel />

      <!-- 同步中心（INCR-251 补挂载孤儿组件：多端同步 · 冲突协调 · 快照备份） -->
      <SyncCenterPanel />

      <!-- A/B 测试（开发者工具，自包含，INCR-178） -->
      <ABTestPanel />

      <!-- 语言设置（INCR-259 补挂载孤儿组件：界面语言 · 翻译状态） -->
      <LanguageSettingsPanel />
    </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useConfig } from '../resonance/bridges/config'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useAppearance } from '../modules/customization/useAppearance'
import { useBackgroundPreviewAudio, useBackgroundVideoSync, useVideoRateGuard } from '../modules/background'
import { useRoomStyle } from '../modules/customization/useRoomStyle'
import { getAllRooms } from '../engine/room-graph'
import GradientEditor from '../components/GradientEditor.vue'
import type { GradientConfig, PresetScene } from '../types'
import { useAstrolabeTheme, ASTROLABE_SCHEMES, ASTROLABE_SEARCH_STYLES } from '../modules/astrolabe/useAstrolabeTheme'
import GestureConfigEditor from '../components/GestureConfigEditor.vue'
import DataCleanupPanel from '../components/DataCleanupPanel.vue'
import SyncCenterPanel from '../components/SyncCenterPanel.vue'
import ABTestPanel from '../components/ABTestPanel.vue'
import AuraThemePicker from '../modules/aura/AuraThemePicker.vue'
import RoomSettingsPanel from '../components/RoomSettingsPanel.vue'
import LanguageSettingsPanel from '../components/LanguageSettingsPanel.vue'
import IconPicker from '../components/IconPicker.vue'
import DesktopIconWizard from '../components/DesktopIconWizard.vue'
import RoomHeader from '../components/RoomHeader.vue'
import { useConfigStore } from '../stores/config'
import { useRoomTaxonomy } from '../modules/room-taxonomy'
import type { GestureAction } from '../modules/gesture/contracts'
import type { GestureType } from '../modules/gesture/types'

const { entranceRef, entranceClass } = useViewEntrance()
const configBridge = useConfig()
const { config: configRef } = configBridge

// 应用图标：品牌图标经 pinia config store 持久化，与侧栏品牌徽标/ favicon 同源实时联动
const configStore = useConfigStore()
const appBrandIcon = computed(() => configStore.config.appBrandIcon ?? null)
function onAppBrandIconChange(v: string | null) {
  configStore.updateAppBrandIcon(v)
}

// ---- 背景音频互斥路由：进入殿堂设置时，全局背景让出声音，改由预览出声 ----
const { previewOwnsAudio, setPreviewOwnsAudio } = useBackgroundPreviewAudio()
// ---- 预览与全局背景视频实时同步（同帧进度 + 播放速度） ----
const { previewFollowsGlobal, setPreviewFollows, setPreviewActive, bindPreview, unbindPreview } = useBackgroundVideoSync()
const previewVideoRef = ref<HTMLVideoElement | null>(null)
onMounted(() => {
  setPreviewOwnsAudio(true)
  bindPreview(() => previewVideoRef.value)
  // 设置页在前台时，若预览独立播放则暂停全局背景视频（藏在背后无需解码），消除双路软解卡顿
  setPreviewActive(true)
  // 入口即应用已持久化的播放速度到预览（全局视频由 HomeBackgroundMedia 同步）
  applyPreviewRate()
  // 设置分组导航锚点滚动高亮：进入视口的分组同步点亮左栏
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const k = (e.target as HTMLElement).dataset.section
            if (k) activeKey.value = k
          }
        }
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    )
    document.querySelectorAll('[data-section]').forEach((n) => io!.observe(n))
  }
})
onUnmounted(() => {
  setPreviewOwnsAudio(false)
  setPreviewActive(false)
  unbindPreview()
  io?.disconnect()
  io = null
})

// ---- 子分组折叠（可收缩展开，减少滚动查找） ----
// 默认仅展开首个分组：原默认展开 7 个分区，功能增多后初始即超长单页、需大量滚屏。
// 改为「一眼扫到全部分组标题 → 按需展开」，其余分组由左栏 TOC 点击（onNavClick）展开并平滑定位。
const openSections = reactive<Record<string, boolean>>({
  bg: true,
  roombg: false,
  aura: false,
  operation: false,
  gesture: false,
  anim: false,
  visual: false,
  chrome: false,
  sidebar: false,
  edgebar: false,
  astrolabe: false,
  taxonomy: false,
  rooms: false,
  appicon: false,
})
function toggleSection(key: string) {
  openSections[key] = !openSections[key]
}

// ---- 设置分组导航锚点 + 搜索过滤（② 自适应：两栏导航 + 顶部过滤）----
// navItems 顺序须与模板中 sub-group 出现顺序一致，保证滚动高亮与点击跳转索引对齐。
const NAV_ITEMS = [
  { key: 'bg', label: '背景介质' },
  { key: 'roombg', label: '房间背景' },
  { key: 'aura', label: '氛围主题' },
  { key: 'taxonomy', label: '侧栏分类' },
  { key: 'rooms', label: '房间设置' },
  { key: 'operation', label: '三级操作模式' },
  { key: 'gesture', label: '手势映射' },
  { key: 'anim', label: '界面动画' },
  { key: 'visual', label: '视觉强度' },
  { key: 'chrome', label: '界面显隐' },
  { key: 'sidebar', label: '侧边栏' },
  { key: 'edgebar', label: '上下边栏' },
  { key: 'astrolabe', label: '星图主题' },
  { key: 'appicon', label: '应用图标' },
] as const
const navItems = NAV_ITEMS

const sectionFilter = ref('')
const filterActive = computed(() => sectionFilter.value.trim().length > 0)
function matchSection(key: string): boolean {
  const kw = sectionFilter.value.trim()
  if (!kw) return true
  const item = NAV_ITEMS.find((n) => n.key === key)
  return item ? item.label.includes(kw) : false
}
// 折叠态 + 搜索过滤态合并：搜索时只显示匹配分组且自动展开，非匹配隐藏
function sectionClass(key: string) {
  const hidden = filterActive.value && !matchSection(key)
  const collapsed = filterActive.value ? hidden : !openSections[key]
  return { 'is-collapsed': collapsed, 'is-hidden': hidden }
}

const activeKey = ref<string>('bg')
function onNavClick(key: string) {
  openSections[key] = true
  activeKey.value = key
  const el = document.querySelector(`[data-section="${key}"]`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let io: IntersectionObserver | null = null

// ---- 侧栏分类体系（room-taxonomy）：切换聚合维度 + 自定义分组 CRUD ----
const taxonomy = useRoomTaxonomy()
const {
  selectedTaxonomy,
  customGroups,
  TAXONOMY_ORDER,
  TAXONOMY_LABELS,
  setTaxonomy,
  renameCustomGroup,
  createCustomGroup,
  deleteCustomGroup,
  reorderCustomGroups,
} = taxonomy

// 删除自定义分组（仅解除归属，房间保留）
function deleteGroup(id: string) {
  if (window.confirm('删除该分组？组内房间将回到「未分组」（不会删除房间）。')) {
    deleteCustomGroup(id)
  }
}

// ---- 自定义分组拖拽排序（设置→侧栏分类→自定义）----
// 用户诉求：设置里的自定义分组之前只能改名/删/建，不能调顺序 → 加上下拖动排序。
// customGroups 是 room-taxonomy 的模块级 ref 数组，splice 后 deep watch 自动持久化，
// 侧栏自定义视图按此数组顺序渲染分组，故调序即同步侧栏分组先后。
const groupDragFrom = ref(-1)
const groupDragOver = ref(-1)
function onGroupDragStart(i: number, e: DragEvent) {
  const t = e.target as HTMLElement | null
  // 从输入框/删除按钮起拖时取消（避免误拖文本、误触删除按钮）
  if (t && t.closest('input, button')) { e.preventDefault(); return }
  groupDragFrom.value = i
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', String(i)) } catch { /* noop */ }
  }
  ;(e.currentTarget as HTMLElement).classList.add('is-dragging')
}
function onGroupDragOver(i: number, e: DragEvent) {
  if (groupDragFrom.value < 0) return
  e.preventDefault() // 允许 drop
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  if (groupDragOver.value !== i) groupDragOver.value = i
}
function onGroupDragEnd(e: DragEvent) {
  ;(e.currentTarget as HTMLElement)?.classList?.remove('is-dragging')
  groupDragFrom.value = -1
  groupDragOver.value = -1
}
function onGroupDrop(i: number, e: DragEvent) {
  e.preventDefault()
  const from = groupDragFrom.value
  // 顺序调整交给 room-taxonomy.reorderCustomGroups（splice + deep watch 持久化），
  // 不在组件里裸改数组，便于单测断言且保证侧栏「自定义」视图同步顺序。
  if (from >= 0 && from !== i) reorderCustomGroups(from, i)
  ;(e.currentTarget as HTMLElement)?.classList?.remove('is-dragging')
  groupDragFrom.value = -1
  groupDragOver.value = -1
}

// ---- 三级操作模式 ----
const OPERATION_MODE_OPTIONS: { value: 'silent' | 'confirm' | 'suggest'; icon: string; label: string; desc: string }[] = [
  { value: 'silent', icon: '🤫', label: '静默执行', desc: '系统安静自动完成，不打扰' },
  { value: 'confirm', icon: '🖐️', label: '执行前确认', desc: '自动动作先待确认，点头才执行' },
  { value: 'suggest', icon: '💡', label: '仅建议', desc: '只提示建议，从不自动执行' },
]
function setOperationMode(mode: 'silent' | 'confirm' | 'suggest') {
  configBridge.updateOperationMode(mode)
}

// ---- 背景设置 ----
const imageInputRef = ref<HTMLInputElement | null>(null)
const videoInputRef = ref<HTMLInputElement | null>(null)
const backgroundError = ref('')
const backgroundBusy = ref(false)
const backgroundAppliedMessage = ref('')

const IMAGE_MAX_BYTES = configRef.display.uploadImageMaxBytes
const VIDEO_MAX_BYTES = configRef.display.uploadVideoMaxBytes

const currentBackground = computed(() => configRef.background)

const presetSceneLabels: Record<string, string> = {
  'forest-dawn': '晨曦森林',
  'coast-starlight': '星空海岸',
  'autumn-courtyard': '秋日庭院',
  'rainy-window': '雨窗',
  'mountain-cloud': '山间云海',
  'snowy-night': '雪夜',
}

const presetScenes = computed(() => [
  { value: 'forest-dawn' as const, label: '晨曦森林', color: '#2a6b2a' },
  { value: 'coast-starlight' as const, label: '星空海岸', color: '#4a3a8a' },
  { value: 'autumn-courtyard' as const, label: '秋日庭院', color: '#8a5a20' },
  { value: 'rainy-window' as const, label: '雨窗', color: '#4a5a7a' },
  { value: 'mountain-cloud' as const, label: '山间云海', color: '#5a6a8a' },
  { value: 'snowy-night' as const, label: '雪夜', color: '#3a4a7a' },
])

const backgroundSummary = computed(() => {
  const background = configRef.background
  if (background.type === 'default') {
    return '当前正在使用默认背景。'
  }
  if (background.type === 'preset' && background.presetScene && background.presetScene !== 'none') {
    const scene = presetSceneLabels[background.presetScene] ?? background.presetScene
    return `当前使用：预设场景 · ${scene}`
  }
  const typeLabel = background.type === 'video' ? '视频背景' : '图片背景'
  return `当前使用：${typeLabel} · ${background.fileName ?? '未命名文件'}`
})

const backgroundTypeLabel = computed(() => {
  switch (currentBackground.value.type) {
    case 'image': return '图片'
    case 'video': return '视频'
    case 'preset': return '场景'
    case 'gradient': return '渐变'
    default: return '默认'
  }
})

const backgroundMeta = computed(() => {
  if (backgroundBusy.value) return '正在处理文件并写入本地配置，请稍候。'
  if (currentBackground.value.type === 'default') return '建议优先使用低体积图片或短视频，以获得更稳定的背景表现。'
  const updatedAt = currentBackground.value.updatedAt
  if (!updatedAt) return '已导入自定义背景。'
  return `最近导入：${new Date(updatedAt).toLocaleString()}`
})

// 视频背景是否保留原声（muted 为 false 时播放声音）
const backgroundHasSound = computed(() => currentBackground.value.muted === false)

function toggleBackgroundSound() {
  const bg = currentBackground.value
  if (bg.type !== 'video') return
  // 当前有原声（muted===false）→ 用户想静音；当前静音 → 想开原声
  const willMute = bg.muted === false
  configBridge.updateBackgroundMedia({
    ...bg,
    muted: willMute,
  })
  backgroundAppliedMessage.value = willMute ? '视频已设为静音播放。' : '视频已开启原声。'
  window.setTimeout(() => { backgroundAppliedMessage.value = '' }, 1600)
}

function selectPresetScene(scene: typeof presetScenes.value[number]['value']) {
  configBridge.setPresetScene(scene)
  backgroundAppliedMessage.value = `已切换至「${presetSceneLabels[scene] ?? scene}」`
  window.setTimeout(() => { backgroundAppliedMessage.value = '' }, 1600)
}

function pickImageBackground() { imageInputRef.value?.click() }
function pickVideoBackground() { videoInputRef.value?.click() }

function resetBackgroundMedia() {
  configBridge.resetBackgroundMedia()
  backgroundError.value = ''
  backgroundAppliedMessage.value = '已经回到默认背景。'
  window.setTimeout(() => { backgroundAppliedMessage.value = '' }, 1500)
}


// 全局渐变背景：宪法第二条超级自定义 · 纯本地、无外部资源
const DEFAULT_GRADIENT: GradientConfig = { angle: 160, stops: [{ color: '#1a1208', at: 0 }, { color: '#0a0a0f', at: 100 }] }

const currentGradient = computed<GradientConfig>(
  () => currentBackground.value.gradient ?? DEFAULT_GRADIENT,
)

function onGradientEdit(g: GradientConfig) {
  configBridge.updateBackgroundMedia({ ...currentBackground.value, type: 'gradient', gradient: g })
}

function setGradientBackground() {
  configBridge.updateBackgroundMedia({ ...currentBackground.value, type: 'gradient', gradient: currentGradient.value })
  backgroundAppliedMessage.value = '已切换至渐变背景。'
  window.setTimeout(() => { backgroundAppliedMessage.value = '' }, 1600)
}

async function onBackgroundFileChange(event: Event, kind: 'image' | 'video') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  backgroundError.value = ''
  const isValidType = kind === 'image' ? file.type.startsWith('image/') : file.type.startsWith('video/')
  if (!isValidType) {
    backgroundError.value = kind === 'image' ? '这里只接收图片文件。' : '这里只接收视频文件。'
    return
  }
  const maxBytes = kind === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES
  if (file.size > maxBytes) {
    backgroundError.value = kind === 'image' ? '图片超过 2MB，可以换一张更轻一些的。' : '视频超过 4MB，可以换一个更短或更轻的。'
    return
  }
  backgroundBusy.value = true
  try {
    const dataUrl = await readFileAsDataUrl(file)
    configBridge.updateBackgroundMedia({
      type: kind,
      presetScene: 'none',
      dataUrl,
      mimeType: file.type,
      fileName: file.name,
      updatedAt: new Date().toISOString(),
      muted: true,
    })
    backgroundAppliedMessage.value = kind === 'image' ? '新的图片背景已经落下。' : '新的视频背景已经落下。'
    window.setTimeout(() => { backgroundAppliedMessage.value = '' }, 1600)
  } catch {
    backgroundError.value = '导入没有完成，可以换个文件再试。'
  } finally {
    backgroundBusy.value = false
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('FileReader 读取结果不是字符串'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}


// ---- 房间背景（宪法第二条超级自定义 · 每房间可单独设背景 / 跟随全局 / 多房间选同一项即天然分组） ----
const roomStyle = useRoomStyle()
// 仅隐藏「设置页房间自定义列表」的房间；与 engine/room-graph.ts 的 DEDUPED_ROOM_IDS 两套装
// （后者管侧栏导航可见性）。两者分工独立，新增需双处隐藏的房间时两处都要改。
const EXCLUDED_ROOM_IDS = ['home', 'home-space', 'settings']
const roomList = computed(() => getAllRooms().filter((r) => !EXCLUDED_ROOM_IDS.includes(r.id)))
const selectedRoomId = ref<string>(roomList.value[0]?.id ?? '')
watch(roomList, () => {
  if (!roomList.value.some((r) => r.id === selectedRoomId.value)) {
    selectedRoomId.value = roomList.value[0]?.id ?? ''
  }
})

const roomBgModeOptions = [
  { value: 'global', label: '跟随全局' },
  { value: 'preset', label: '场景' },
  { value: 'gradient', label: '渐变' },
  { value: 'image', label: '图片' },
] as const

const roomCurrentBg = computed(() => roomStyle.roomBackground(selectedRoomId.value))
const roomBgMode = computed<typeof roomBgModeOptions[number]['value']>(() => {
  const bg = roomCurrentBg.value
  if (!bg) return 'global'
  if (bg.type === 'preset') return 'preset'
  if (bg.type === 'gradient') return 'gradient'
  if (bg.type === 'image' || bg.type === 'video') return 'image'
  return 'global'
})

const roomGradient = computed<GradientConfig>(
  () => (roomBgMode.value === 'gradient' && roomCurrentBg.value?.gradient ? roomCurrentBg.value.gradient : DEFAULT_GRADIENT),
)

const roomBgMessage = ref('')
const roomBgError = ref('')
const roomBgBusy = ref(false)
let roomBgMessageTimer: number | undefined
function scheduleRoomBgMessageClear() {
  if (roomBgMessageTimer) window.clearTimeout(roomBgMessageTimer)
  roomBgMessageTimer = window.setTimeout(() => { roomBgMessage.value = '' }, 1600)
}

function setRoomBgMode(mode: typeof roomBgModeOptions[number]['value']) {
  const id = selectedRoomId.value
  roomBgError.value = ''
  if (mode === 'global') {
    roomStyle.clearRoomBackground(id)
    roomBgMessage.value = '该房间已设为跟随全局背景。'
  } else if (mode === 'preset') {
    roomStyle.setRoomBackground(id, {
      type: 'preset',
      presetScene: 'forest-dawn',
      dataUrl: null,
      mimeType: null,
      fileName: null,
      updatedAt: null,
    })
    roomBgMessage.value = '已为该房间指定场景背景。'
  } else if (mode === 'gradient') {
    roomStyle.setRoomBackground(id, {
      type: 'gradient',
      presetScene: 'none',
      dataUrl: null,
      mimeType: null,
      fileName: null,
      updatedAt: null,
      gradient: { angle: 160, stops: [{ color: '#1a1208', at: 0 }, { color: '#0a0a0f', at: 100 }] },
    })
    roomBgMessage.value = '已为该房间指定渐变背景。'
  } else if (mode === 'image') {
    pickRoomImage()
    return
  }
  scheduleRoomBgMessageClear()
}

function setRoomPreset(scene: PresetScene) {
  roomStyle.setRoomBackground(selectedRoomId.value, {
    type: 'preset',
    presetScene: scene,
    dataUrl: null,
    mimeType: null,
    fileName: null,
    updatedAt: null,
  })
  roomBgMessage.value = '已为该房间指定场景背景。'
  scheduleRoomBgMessageClear()
}

function onRoomGradientEdit(g: GradientConfig) {
  roomStyle.setRoomBackground(selectedRoomId.value, {
    type: 'gradient',
    presetScene: 'none',
    dataUrl: null,
    mimeType: null,
    fileName: null,
    updatedAt: null,
    gradient: g,
  })
}

const roomImageInputRef = ref<HTMLInputElement | null>(null)
function pickRoomImage() {
  roomImageInputRef.value?.click()
}
async function onRoomImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  roomBgError.value = ''
  if (!file.type.startsWith('image/')) {
    roomBgError.value = '这里只接收图片文件。'
    return
  }
  if (file.size > IMAGE_MAX_BYTES) {
    roomBgError.value = '图片超过 2MB，可以换一张更轻一些的。'
    return
  }
  roomBgBusy.value = true
  try {
    const dataUrl = await readFileAsDataUrl(file)
    roomStyle.setRoomBackground(selectedRoomId.value, {
      type: 'image',
      presetScene: 'none',
      dataUrl,
      mimeType: file.type,
      fileName: file.name,
      updatedAt: new Date().toISOString(),
      muted: true,
    })
    roomBgMessage.value = '该房间的图片背景已经落下。'
    scheduleRoomBgMessageClear()
  } catch {
    roomBgError.value = '导入没有完成，可以换个文件再试。'
  } finally {
    roomBgBusy.value = false
  }
}

// ---- 手势映射 ----
function updateGestureBinding(gesture: GestureType, action: GestureAction) {
  configBridge.updateGestureBinding(gesture, action)
}

// ---- 动画设置 ----
const localTransitionDuration = ref(configRef.transitionDuration)

function applyTransitionDuration() {
  configBridge.updateTransitionDuration(localTransitionDuration.value)
}

// ---- 视觉强度（超级自定义 · 宪法第二条） ----
const {
  canvasAlpha,
  ambientGlowAlpha,
  ambientGrainAlpha,
  ambientDustAlpha,
  appBgAlpha,
  glassClearAlpha,
  autoHideChrome,
  autoHideDelay,
  sidebarWidth,
  sidebarGlass,
  sidebarBgMode,
  sidebarDefaultCollapsed,
  sidebarDensity,
  edgeBarAlpha,
  bgVideoRate,
  dialogueShape,
  crystalStyle,
  setCanvasAlpha,
  setAmbientGlowAlpha,
  setAmbientGrainAlpha,
  setAmbientDustAlpha,
  setAppBgAlpha,
  setGlassClearAlpha,
  setAutoHideChrome,
  setAutoHideDelay,
  setSidebarWidth,
  setSidebarGlass,
  setSidebarBgMode,
  setSidebarDefaultCollapsed,
  setSidebarDensity,
  setEdgeBarAlpha,
  setBgVideoRate,
  setDialogueShape,
  setCrystalStyle,
} = useAppearance()

// ---- 对话框形态 / 结晶风格可选项（宪法第二条超级自定义 · 全部保留、设置可切换） ----
const dialogueShapeOptions = [
  { value: 'bubble', label: '对话泡' },
  { value: 'blob', label: '有机斑团' },
  { value: 'arc', label: '弧顶卡' },
  { value: 'capsule', label: '极简胶囊' },
]
const crystalStyleOptions = [
  { value: 'facet', label: '切面宝石' },
  { value: 'glass', label: '玻璃光球' },
  { value: 'line', label: '极简线晶' },
  { value: 'prism', label: '极光棱镜' },
  { value: 'translucent', label: '通透水晶' },
  { value: 'motif', label: '图标形象' },
  { value: 'pixel', label: '像素角色' },
]

// 背景视频播放速度实时应用到设置页预览。
// 此前仅 HomeBackgroundMedia 内的全局视频消费 bgVideoRate，设置页预览 <video> 无绑定，
// 且独立播放时全局被暂停，导致拖动速度滑块毫无可见效果（「控不住」）。
// 此处补全预览这一路：滑块变化立即生效；预览元素挂载时也写入当前速率。
// 健壮性：部分浏览器在缓冲停顿 / seek / loop 续播后会把 playbackRate 静默复位为 1，
// 于是「拖到多少只坚持一会又恢复正常」。故在 play/playing/canplay/loadeddata/seeked
// 时再次强制写入，确保速度始终等于滑块设定值。
function applyPreviewRate() {
  const v = previewVideoRef.value
  if (v && v.playbackRate !== bgVideoRate.value) {
    try { v.playbackRate = bgVideoRate.value } catch { /* 个别环境不支持 playbackRate 写入，忽略 */ }
  }
}
watch(bgVideoRate, applyPreviewRate)
// 预览视频挂上倍速守卫（对抗 loop 续播/缓冲后浏览器静默复位 playbackRate，已抽为共享 composable）
useVideoRateGuard(previewVideoRef, bgVideoRate)

// 界面自动隐藏开关
function toggleAutoHide() {
  setAutoHideChrome(!autoHideChrome.value)
}

// 空闲隐藏时长（滑块实时写入）
function onAutoHideDelay(e: Event) {
  setAutoHideDelay(+(e.target as HTMLInputElement).value)
}

// 侧边栏自定义选项
const sidebarWidthOptions = [180, 220, 260, 300]
const sidebarDensityOptions = [
  { value: 'compact', label: '紧凑' },
  { value: 'standard', label: '标准' },
  { value: 'relaxed', label: '宽松' },
]

// 侧栏背景实底 / 毛玻璃切换
function toggleSidebarBgMode() {
  setSidebarBgMode(sidebarBgMode.value === 'glass' ? 'solid' : 'glass')
}

// 侧栏通透强度（滑块实时写入）
function onSidebarGlass(e: Event) {
  setSidebarGlass(+(e.target as HTMLInputElement).value)
}

// 上下边栏透明度（与侧边栏同级 · 滑块实时写入）
function onEdgeBarAlpha(e: Event) {
  setEdgeBarAlpha(+(e.target as HTMLInputElement).value)
}

// 背景视频播放速度（滑块实时写入，作用于全局背景视频）
function onBgVideoRate(e: Event) {
  setBgVideoRate(+(e.target as HTMLInputElement).value)
}

// 预览与全局背景视频实时同步开关
function togglePreviewFollowsGlobal() {
  setPreviewFollows(!previewFollowsGlobal.value)
}

// 侧栏启动默认折叠切换
function toggleSidebarDefaultCollapsed() {
  setSidebarDefaultCollapsed(!sidebarDefaultCollapsed.value)
}

// 通用强度滑块处理器：range 输入实时写入对应 CSS 变量 + 持久化
function onAlpha(setter: (v: number) => void, e: Event) {
  setter(+(e.target as HTMLInputElement).value)
}

// ---- 星图主题换肤器（宪法第2条「超级自定义」：用户自选背景星图 × 搜索栏造型，本地保存） ----
// 与 Astrolabe.vue 共享同一模块级单例，设置页写入、星图实时读取。
const {
  theme: astrolabeTheme,
  setScheme: setAstrolabeScheme,
  setSearchStyle: setAstrolabeSearchStyle,
  resetTheme: resetAstrolabeTheme,
} = useAstrolabeTheme()
const astrolabeSchemes = ASTROLABE_SCHEMES
const astrolabeSearchStyles = ASTROLABE_SEARCH_STYLES
</script>

<style scoped>
/* =============================================
   CSS Variables — Control Panel Theme
   Room color: var(--text-muted-alt)
   ============================================= */
.settings {
  --st-accent: var(--text-muted-alt);
  --st-accent-rgb: 138, 138, 138;
  --st-bg: #0a0a0a;

  position: relative;
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  background: transparent;
  min-height: 100vh;
  overflow: visible;
}

/* =============================================
   Ambient Background Layer
   ============================================= */
.settings-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ambient-grid {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%238a8a8a' stroke-width='0.5' fill='none'/%3E%3Ccircle cx='30' cy='30' r='2' fill='%238a8a8a' opacity='0.4'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%238a8a8a' opacity='0.25'/%3E%3Ccircle cx='60' cy='0' r='1.5' fill='%238a8a8a' opacity='0.25'/%3E%3Ccircle cx='0' cy='60' r='1.5' fill='%238a8a8a' opacity='0.25'/%3E%3Ccircle cx='60' cy='60' r='1.5' fill='%238a8a8a' opacity='0.25'/%3E%3C/svg%3E");
  background-size: 60px 60px;
}

.ambient-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse at center, rgba(138, 138, 138, 0.06) 0%, transparent 70%);
  animation: ambientPulse 6s ease-in-out infinite alternate;
}

@keyframes ambientPulse {
  0% { opacity: 0.5; transform: translateX(-50%) scale(1); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.08); }
}

/* =============================================
   Header — Ornament + Kicker
   ============================================= */
.settings-room-header {
  position: relative;
  z-index: 1;
  margin-bottom: 40px;
  text-align: center;
}
.settings-room-header :deep(.rh-main) {
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.settings-room-header :deep(.rh-titles) {
  align-items: center;
  gap: 0;
}

.settings-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ornament-line {
  display: block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(138, 138, 138, 0.4), transparent);
}

.ornament-diamond {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-muted-alt);
  opacity: 0.7;
  animation: ornamentSpin 8s linear infinite;
}

@keyframes ornamentSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.settings-room-header :deep(.rh-kicker) {
  font-size: 10px;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: rgba(138, 138, 138, 0.5);
  margin: 0 0 10px;
  font-weight: 400;
}

.settings-room-header :deep(.rh-title) {
  font-size: 22px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.settings-room-header :deep(.rh-subtitle) {
  font-size: 13px;
  color: var(--text-muted, var(--text-muted));
  margin-top: 6px;
}

/* =============================================
   Sections
   ============================================= */
.settings-section {
  position: relative;
  z-index: 1;
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid rgba(138, 138, 138, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(2px);
  transition: border-color 0.3s, box-shadow 0.3s;
}

.settings-section:hover {
  border-color: rgba(138, 138, 138, 0.18);
  box-shadow: 0 0 30px rgba(138, 138, 138, 0.03);
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0 0 4px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-muted, var(--text-muted));
  margin: 0 0 16px;
  line-height: 1.6;
}

/* ---- 两栏布局：左栏分组导航 + 右栏内容（② 自适应）---- */
.settings-layout {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}
.settings-nav {
  flex: 0 0 220px;
  position: sticky;
  top: 24px;
  align-self: flex-start;
  padding: 14px 12px;
  border: 1px solid rgba(138, 138, 138, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
}
.settings-nav__title {
  font-size: 12px;
  color: var(--text-muted, #8a8a8a);
  margin: 0 0 10px;
  letter-spacing: 0.08em;
}
.settings-nav__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.settings-nav__item {
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--text-secondary, #b8b0a8);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, color 0.15s;
}
.settings-nav__item:hover {
  background: rgba(138, 138, 138, 0.08);
}
.settings-nav__item.is-active {
  background: rgba(138, 138, 138, 0.16);
  color: var(--text-primary, #e8e0d8);
  border-color: rgba(138, 138, 138, 0.22);
}
.settings-content {
  flex: 1;
  min-width: 0;
}
.settings-filter {
  position: sticky;
  top: 0;
  z-index: 5;
  margin-bottom: 18px;
}
.settings-filter__input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 14px;
  font-size: 13px;
  border-radius: 12px;
  border: 1px solid rgba(138, 138, 138, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e0d8);
  outline: none;
  transition: border-color 0.15s;
}
.settings-filter__input:focus {
  border-color: rgba(138, 138, 138, 0.32);
}
.settings-filter__input::placeholder {
  color: var(--text-muted, #8a8a8a);
}
.sub-group.is-hidden {
  display: none;
}

/* ---- 超级自定义子分组 ---- */

/* ---- 侧栏分类体系（room-taxonomy） ---- */
.tax-body {
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tax-schemes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tax-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tax-group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px;
  border-radius: 10px;
  cursor: default;
  transition: background var(--transition), box-shadow var(--transition), opacity var(--transition);
}
/* 拖拽手柄：独立抓取点，按住 ⠿ 上下拖动改分组顺序；与输入框/删除按钮解耦 */
.tax-grip {
  flex: 0 0 auto;
  width: 16px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 1px 0 -2px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  opacity: 0.4;
  font-size: 12px;
  line-height: 1;
  border-radius: 6px;
  cursor: grab;
  transition: opacity var(--transition), color var(--transition);
}
.tax-grip:hover {
  opacity: 0.95;
  color: var(--accent);
}
.tax-group-row.is-dragging {
  opacity: 0.55;
  outline: 1px solid var(--accent);
  outline-offset: -2px;
}
/* 拖拽落点：插入位置提示（虚线描边 + 轻微高亮） */
.tax-group-row.is-drop-target {
  outline: 1px dashed var(--accent);
  outline-offset: -2px;
  background: var(--accent-glow);
}
.tax-group-input {
  flex: 1 1 auto;
  min-width: 0;
  background: var(--bg-surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 7px 10px;
  outline: none;
}
.tax-group-input:focus {
  border-color: var(--accent);
}
.tax-group-count {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.6;
  min-width: 18px;
  text-align: center;
}
.tax-group-del {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  transition: all var(--transition);
}
.tax-group-del:hover {
  border-color: rgba(220, 80, 80, 0.5);
  color: #e07070;
}
.tax-group-add {
  align-self: flex-start;
  margin-top: 2px;
  padding: 8px 14px;
  border: 1px dashed rgba(var(--accent-rgb), 0.35);
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 13px;
  transition: all var(--transition);
}
.tax-group-add:hover {
  background: var(--accent-glow);
}
.sub-group {
  padding: 16px 0;
  border-top: 1px solid rgba(138, 138, 138, 0.08);
}
.sub-group:first-of-type {
  border-top: none;
  padding-top: 4px;
}

.sub-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0 0 4px;
}

.sub-desc {
  font-size: 12px;
  color: var(--text-muted, var(--text-muted));
  margin: 0 0 14px;
  line-height: 1.6;
}

/* ---- 子分组折叠（可收缩展开） ---- */
.sub-group__head {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}
.sub-group__head:focus-visible {
  outline: none;
}
.sub-group__head:focus-visible .sub-group__heading {
  box-shadow: 0 0 0 2px var(--accent, rgba(180, 150, 255, 0.5));
  border-radius: 8px;
}
.sub-group__chevron {
  flex: none;
  width: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--accent, #d4a574);
  transition: transform 0.2s ease;
}
.sub-group__heading {
  flex: 1;
  min-width: 0;
}
.sub-group.is-collapsed {
  padding-bottom: 0;
}
.sub-group.is-collapsed .sub-title {
  margin-bottom: 0;
}
.sub-group.is-collapsed .sub-desc {
  margin-bottom: 0;
}
.sub-group.is-collapsed > :not(.sub-group__head) {
  display: none;
}

/* ---- 上下边栏透明度实时预览 ---- */
.edge-bar-preview {
  margin-top: 16px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(138, 138, 138, 0.12);
}
.edge-bar-preview__scene {
  position: relative;
  height: 124px;
  background:
    linear-gradient(135deg, rgba(120, 90, 200, 0.4), rgba(60, 160, 180, 0.4)),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.06) 0 10px, transparent 10px 20px);
}
.edge-bar-preview__bar {
  position: absolute;
  left: 0;
  right: 0;
  height: 26px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--border-light, rgba(138, 138, 138, 0.25));
  backdrop-filter: blur(2px);
  transition: background 0.12s ease;
}
.edge-bar-preview__bar--top {
  top: 0;
}
.edge-bar-preview__bar--bottom {
  bottom: 0;
}
.edge-bar-preview__tag {
  font-size: 11px;
  color: var(--text-primary, #e8e0d8);
  opacity: 0.85;
}
.edge-bar-preview__content {
  position: absolute;
  inset: 26px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-primary, #e8e0d8);
  opacity: 0.7;
}

/* ---- 开关行（界面显隐） ---- */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(138, 138, 138, 0.1);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s;
}
.toggle-row:hover {
  border-color: rgba(138, 138, 138, 0.22);
  background: rgba(138, 138, 138, 0.06);
}
.toggle-row:focus-visible {
  outline: 1px solid rgba(138, 138, 138, 0.4);
  outline-offset: 2px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.toggle-label {
  font-size: 13px;
  color: var(--text-primary, #e8e0d8);
}
.toggle-desc {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  line-height: 1.5;
}

.switch {
  flex-shrink: 0;
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(138, 138, 138, 0.25);
  background: rgba(138, 138, 138, 0.12);
  cursor: pointer;
  padding: 0;
  transition: background 0.25s, border-color 0.25s;
}
.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-bright);
  transition: transform 0.25s ease, background 0.25s ease;
}
.switch.on {
  background: rgba(124, 92, 252, 0.35);
  border-color: rgba(212, 165, 116, 0.5);
}
.switch.on .switch-knob {
  transform: translateX(20px);
  background: var(--accent, #d4a574);
}

/* ---- 背景预览 ---- */
.bg-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(138, 138, 138, 0.08);
  background: linear-gradient(135deg, rgba(138, 138, 138, 0.12), rgba(13, 11, 9, 0.88));
  margin-bottom: 14px;
}

.bg-preview--default {
  background:
    radial-gradient(circle at top, rgba(138, 138, 138, 0.15), transparent 42%),
    linear-gradient(135deg, rgba(20, 17, 14, 0.96), rgba(13, 11, 9, 0.92));
}

.bg-preview__asset {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.92) brightness(0.8);
}

.bg-preview__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--text-secondary, var(--text-secondary));
}

.bg-preview__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(13, 11, 9, 0.72);
  border: 1px solid rgba(138, 138, 138, 0.12);
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
  backdrop-filter: blur(8px);
}

/* ---- 背景操作按钮 ---- */
.bg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.bg-btn {
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid rgba(138, 138, 138, 0.2);
  background: rgba(138, 138, 138, 0.08);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.25s, border-color 0.25s, transform 0.25s;
}

.bg-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(138, 138, 138, 0.15);
  border-color: rgba(138, 138, 138, 0.35);
}

.bg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bg-btn--ghost {
  background: transparent;
  border-color: rgba(138, 138, 138, 0.1);
  color: var(--text-secondary, var(--text-secondary));
}

/* ---- 预设场景 ---- */
.bg-presets {
  margin-bottom: 14px;
}

.preset-title {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary, var(--text-secondary));
  margin: 0 0 10px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(138, 138, 138, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary, var(--text-secondary));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
}

.preset-btn:hover:not(:disabled) {
  background: rgba(138, 138, 138, 0.08);
  border-color: rgba(138, 138, 138, 0.2);
}

.preset-btn--active {
  background: rgba(138, 138, 138, 0.12);
  border-color: rgba(138, 138, 138, 0.3);
  color: var(--text-primary, #e8e0d8);
}

.preset-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preset-btn__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.preset-btn__label {
  white-space: nowrap;
}

/* ---- 星图主题换肤器（超级自定义 · 宪法第二条） ---- */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.theme-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(138, 138, 138, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary, var(--text-secondary));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
}

.theme-chip:hover:not(:disabled) {
  background: rgba(138, 138, 138, 0.08);
  border-color: rgba(138, 138, 138, 0.2);
}

.theme-chip--active {
  background: rgba(var(--chip-accent, 138, 138, 138), 0.14);
  border-color: rgba(var(--chip-accent, 138, 138, 138), 0.5);
  color: var(--text-primary, #e8e0d8);
}

.theme-chip__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(var(--chip-accent, 138, 138, 138), 0.5);
}

.theme-chip__label {
  white-space: nowrap;
}

.astrolabe-theme-reset {
  margin-top: 14px;
}

/* ---- 背景状态信息 ---- */
.bg-summary {
  font-size: 12px;
  color: var(--text-secondary, var(--text-secondary));
  margin: 0 0 2px;
}

.bg-meta {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  margin: 0;
  opacity: 0.7;
}

.bg-success {
  font-size: 12px;
  color: #8ab87a;
  margin: 6px 0 0;
}

.bg-error {
  font-size: 12px;
  color: #c47a6a;
  margin: 6px 0 0;
}


/* ---- 房间背景（每房间单独背景 / 跟随全局） ---- */
.roombg-body {
  padding: 4px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.roombg-room-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rm-detail-label {
  font-size: 13px;
  color: var(--text-secondary, #b8b0a8);
  margin: 0;
}
.roombg-select {
  width: 100%;
  max-width: 320px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(138, 138, 138, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.roombg-select:focus {
  border-color: rgba(138, 138, 138, 0.32);
}

/* ---- 滑块 ---- */
.slider-group {
  margin-top: 4px;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary, var(--text-secondary));
  margin-bottom: 10px;
}

.slider-value {
  font-size: 14px;
  color: var(--text-primary, #e8e0d8);
  font-variant-numeric: tabular-nums;
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(138, 138, 138, 0.15);
  outline: none;
  cursor: pointer;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-muted-alt);
  border: 2px solid rgba(13, 11, 9, 0.8);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 12px rgba(138, 138, 138, 0.4);
}

.slider-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-muted-alt);
  border: 2px solid rgba(13, 11, 9, 0.8);
  cursor: pointer;
}

.slider-hints {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted, var(--text-muted));
  margin-top: 6px;
}

/* ---- 分段选择（侧边栏宽度 / 密度） ---- */
.seg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
}

.seg-label {
  font-size: 13px;
  color: var(--text-secondary, var(--text-secondary));
  flex-shrink: 0;
}

.seg {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.seg-btn {
  min-width: 44px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid rgba(138, 138, 138, 0.18);
  background: rgba(138, 138, 138, 0.06);
  color: var(--text-secondary, var(--text-secondary));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.22s;
}

.seg-btn:hover {
  border-color: rgba(138, 138, 138, 0.32);
  background: rgba(138, 138, 138, 0.12);
}

.seg-btn.active {
  background: rgba(212, 165, 116, 0.22);
  border-color: rgba(212, 165, 116, 0.5);
  color: var(--accent, #d4a574);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* =============================================
   Subtle Control Panel Animations
   ============================================= */
@keyframes sectionFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-section {
  animation: sectionFadeIn 0.5s ease-out both;
}

.settings-section:nth-child(2) {
  animation-delay: 0.1s;
}

.settings-section:nth-child(3) {
  animation-delay: 0.2s;
}

/* =============================================
   Responsive
   ============================================= */
@media (max-width: 900px) {
  .settings-layout {
    flex-direction: column;
  }
  .settings-nav {
    position: static;
    flex: none;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    overflow-x: auto;
  }
  .settings-nav__title {
    display: none;
  }
  .settings-nav__list {
    flex-direction: row;
    gap: 6px;
  }
  .settings-nav__item {
    white-space: nowrap;
  }
  .settings-filter {
    position: static;
  }
}

@media (max-width: 600px) {
  .settings-nav {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .settings {
    padding: 24px 16px 64px;
  }

  .settings-room-header {
    margin-bottom: 28px;
  }

  .settings-room-header :deep(.rh-title) {
    font-size: 20px;
  }

  .settings-section {
    padding: 16px;
    margin-bottom: 28px;
  }

  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .ornament-line {
    width: 28px;
  }
}

/* ---- 三级操作模式 ---- */
.opmode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 4px;
}

.opmode-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(138, 138, 138, 0.12);
  background: rgba(138, 138, 138, 0.05);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
}

.opmode-option:hover {
  border-color: rgba(138, 138, 138, 0.24);
  background: rgba(138, 138, 138, 0.1);
}

.opmode-option--active {
  border-color: var(--accent, #c9a96a);
  background: linear-gradient(135deg, rgba(201, 169, 106, 0.16), rgba(201, 169, 106, 0.05));
  box-shadow: 0 0 0 1px var(--accent, #c9a96a) inset;
}

.opmode-option__icon {
  font-size: 22px;
}

.opmode-option__label {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.opmode-option__desc {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 640px) {
  .opmode-grid {
    grid-template-columns: 1fr;
  }
}
</style>