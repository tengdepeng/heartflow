<template>
  <div class="anchor-page view-entrance" :class="entranceClass">
    <AnchorCelebration :effect="celebration.activeEffect.value" />

    <div class="anchor-ambient">
      <div class="anchor-glow-left" />
      <div class="anchor-glow-right" />
      <div class="anchor-spotlight" />
      <div class="anchor-desk-glow" />
      <div class="anchor-dust-particles" />
    </div>

    <RoomLayout
      class="anchor-room-header"
      data-enter
      kicker="今日安放台"
      title="逐日心锚"
      :subtitle="`${todayLabel} · ${scalePeriodLabel} ${pendingCount} 个停留中 · 连续锚定 ${currentStreak} 天`"
    >
      <template #ornament>
        <div class="header-ornament">
          <span class="orn-line" />
          <span class="orn-diamond">✦</span>
          <span class="orn-line" />
        </div>
      </template>
      <template #meta>
        <p class="anchor-desc">先把脑子里的悬念放在这里，再看看今天想安放什么。没有完成也没关系，它们只是暂时停留。</p>
        <div class="anchor-overview">
          <article v-for="item in overviewCards" :key="item.label" class="overview-card">
            <span class="ov-label">{{ item.label }}</span>
            <strong class="ov-value">{{ item.value }}</strong>
            <span class="ov-note">{{ item.note }}</span>
          </article>
        </div>
      </template>

    <!-- 跨房间共鸣联动（接收其他房间的光痕，过滤本房回声） -->
    <section v-if="externalFeed.length > 0" data-enter class="cross-room-strip">
      <div class="crs-head">
        <span class="crs-icon">🌗</span>
        <span class="crs-title">其他房间的光痕</span>
        <span class="crs-count">{{ externalFeed.length }}</span>
      </div>
      <ul class="crs-list">
        <li v-for="s in externalFeed" :key="s.room + '-' + s.ts" class="crs-item">
          <span class="crs-room">{{ roomLabel(s.room) }}</span>
          <span class="crs-signal">{{ s.label }}</span>
          <span v-if="s.detail" class="crs-detail">{{ s.detail }}</span>
        </li>
      </ul>
      <p v-if="externalClimate.rooms.length" class="crs-summary">{{ summarizeClimate(externalClimate) }}</p>
    </section>

    <!-- 锚点池 -->
    <div class="anchor-pool" data-enter :class="{ 'has-items': poolItems.length > 0 }">
      <div class="pool-surface">
        <span v-if="poolItems.length === 0" class="pool-hint">把此刻浮着的念头轻轻放进这里…</span>
        <div v-for="a in poolItems" :key="a.id" class="pool-item">
          <span class="pool-dot" :style="{ background: PRIORITY_COLORS[a.priority] }" />
          <span class="pool-text">{{ a.text }}</span>
          <div class="pool-item-actions">
            <button class="pool-item-btn" @click="placePoolItem(a.id, 'must')">必锚</button>
            <button class="pool-item-btn" @click="placePoolItem(a.id, 'can')">可锚</button>
            <button class="pool-item-btn" @click="placePoolItem(a.id, 'float')">浮锚</button>
            <button class="pool-item-btn pool-item-btn--ghost" @click="anchor.remove(a.id)">移除</button>
          </div>
        </div>
      </div>
      <div class="pool-actions" v-if="poolItems.length > 0">
        <button class="pool-btn must" @click="anchorAll('must')">都放到必锚</button>
        <button class="pool-btn can" @click="anchorAll('can')">都放到可锚</button>
        <button class="pool-btn float" @click="anchorAll('float')">都放到浮锚</button>
      </div>
    </div>

    <!-- 快速输入 -->
    <div class="anchor-input-row">
      <input v-model="newText" class="anchor-input" placeholder="想记下一件什么…" @keyup.enter="captureToPool" />
      <button class="btn-add" @click="captureToPool">入池</button>
    </div>

    <div class="anchor-quickbar">
      <button v-for="preset in quickPresets" :key="preset" class="quick-pill" @click="newText = preset">{{ preset }}</button>
    </div>

    <!-- 尺度切换 -->
    <div class="scale-tabs">
      <button v-for="s in scales" :key="s.key" :class="['scale-tab', 'hf-press', { active: scale === s.key }]" @click="scale = s.key">{{ s.label }}</button>
      <button
        :class="['scale-tab', 'hf-press', { active: showReview }]"
        @click="showReview = !showReview"
      >📊 回顾</button>
      <button
        :class="['scale-tab', 'hf-press', { active: batchMode }]"
        @click="toggleBatchMode()"
      >📋 批量</button>
    </div>

    <!-- ===== 回顾面板 ===== -->
    <section v-if="showReview" data-enter class="review-panel">
      <div class="review-header">
        <h3 class="section-label">锚点回顾</h3>
        <div class="review-period-tabs">
          <button
            v-for="p in reviewPeriods"
            :key="p.key"
            :class="['review-period-btn', { active: reviewPeriod === p.key }]"
            @click="reviewPeriod = p.key"
          >{{ p.icon }} {{ p.label }}</button>
        </div>
      </div>

      <div class="review-body" v-if="reviewData.totalAnchors > 0">
        <!-- 概览卡片 -->
        <div class="review-stats">
          <div class="review-stat-card">
            <span class="rs-label">总锚点</span>
            <strong class="rs-value">{{ reviewData.totalAnchors }}</strong>
          </div>
          <div class="review-stat-card">
            <span class="rs-label">已完成</span>
            <strong class="rs-value">{{ reviewData.completedCount }}</strong>
          </div>
          <div class="review-stat-card">
            <span class="rs-label">完成率</span>
            <strong class="rs-value rs-value--accent">{{ reviewData.completionRate }}%</strong>
          </div>
          <div class="review-stat-card">
            <span class="rs-label">漂移</span>
            <strong class="rs-value">{{ reviewData.totalDrifts }} 次</strong>
          </div>
          <div class="review-stat-card">
            <span class="rs-label">日均</span>
            <strong class="rs-value">{{ reviewData.avgDailyAnchors }}</strong>
          </div>
          <div class="review-stat-card">
            <span class="rs-label">连续</span>
            <strong class="rs-value">{{ anchorReview.getStreakStats(anchor.anchors ? anchor.anchors.value : []).currentStreak }} 天</strong>
          </div>
        </div>

        <!-- 优先级完成率 -->
        <div class="review-priority-rates">
          <div class="rpr-item">
            <span class="rpr-dot" style="background: #f0c040"></span>
            <span class="rpr-label">必锚</span>
            <div class="rpr-bar-track">
              <div class="rpr-bar-fill" :style="{ width: reviewData.mustCompletionRate + '%', background: '#f0c040' }"></div>
            </div>
            <span class="rpr-value">{{ reviewData.mustCompletionRate }}%</span>
          </div>
          <div class="rpr-item">
            <span class="rpr-dot" style="background: #80b8d0"></span>
            <span class="rpr-label">可锚</span>
            <div class="rpr-bar-track">
              <div class="rpr-bar-fill" :style="{ width: reviewData.canCompletionRate + '%', background: '#80b8d0' }"></div>
            </div>
            <span class="rpr-value">{{ reviewData.canCompletionRate }}%</span>
          </div>
          <div class="rpr-item">
            <span class="rpr-dot" style="background: rgba(255,255,255,0.3)"></span>
            <span class="rpr-label">浮锚</span>
            <div class="rpr-bar-track">
              <div class="rpr-bar-fill" :style="{ width: reviewData.floatCompletionRate + '%', background: 'rgba(255,255,255,0.3)' }"></div>
            </div>
            <span class="rpr-value">{{ reviewData.floatCompletionRate }}%</span>
          </div>
        </div>

        <!-- 优先分布 & 最高产日 -->
        <div class="review-subgrid">
          <div class="review-subcard">
            <span class="rsc-label">优先级分布</span>
            <div class="rsc-donut">
              <span class="rsc-donut-item">🔴 {{ reviewData.priorityDistribution.must }}</span>
              <span class="rsc-donut-item">🔵 {{ reviewData.priorityDistribution.can }}</span>
              <span class="rsc-donut-item">⚪ {{ reviewData.priorityDistribution.float }}</span>
            </div>
          </div>
          <div class="review-subcard" v-if="reviewData.mostProductiveDay.date">
            <span class="rsc-label">最高产日</span>
            <div class="rsc-highlight">
              <strong class="rsc-highlight-date">{{ reviewData.mostProductiveDay.date }}</strong>
              <span class="rsc-highlight-count">{{ reviewData.mostProductiveDay.count }} 个锚点</span>
            </div>
          </div>
          <div class="review-subcard">
            <span class="rsc-label">完成时间</span>
          <div class="rsc-donut">
            <span class="rsc-donut-item">平均 {{ reviewData.avgCompletionTime }} 分钟</span>
            <span class="rsc-donut-item">最快 {{ reviewData.fastestCompletion }} 分钟</span>
          </div>
        </div>
      </div>

      <!-- 标签趋势 · 近7天 -->
      <div class="review-visual" v-if="tagTrend.length > 0" data-enter>
        <span class="rsc-label">标签趋势 · 近7天</span>
        <div class="tt-list">
          <div v-for="t in tagTrend" :key="t.tag" class="tt-row">
            <span class="tt-tag">#{{ t.tag }}</span>
            <div class="tt-track"><div class="tt-fill" :style="{ width: (t.count / tagTrendMax * 100) + '%' }" /></div>
            <span class="tt-count">{{ t.count }}</span>
          </div>
        </div>
      </div>

      <!-- 时间图景 · 热力图 -->
      <div class="review-visual" v-if="heatCells.length > 0" data-enter>
        <span class="rsc-label">时间图景 · {{ scalePeriodLabel }}锚点密度</span>
        <div class="heat-grid" :class="{ 'heat-grid--year': scale === 'year' }">
          <div
            v-for="c in heatCells"
            :key="c.key"
            class="heat-cell"
            :style="heatStyle(c.count)"
            :title="`${c.label}：${c.count} 个锚点`"
          >
            <span v-if="c.count > 0" class="heat-count">{{ c.count }}</span>
            <span class="heat-label">{{ c.label }}</span>
          </div>
        </div>
      </div>

      <!-- 改进建议 -->
        <div class="review-suggestions" v-if="reviewData.suggestions.length > 0">
          <span class="rs-label">改进建议</span>
          <ul class="rs-list">
            <li v-for="(s, i) in reviewData.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>
      </div>

      <EmptyState v-else icon="📊" :title="(reviewPeriods.find(p => p.key === reviewPeriod)?.label ?? '') + '暂无锚点数据'" :glow="false" cta-label="" />
    </section>

    <!-- ===== 批量管理工具栏 ===== -->
    <div v-if="batchMode" data-enter class="batch-toolbar">
      <div class="batch-header">
        <span class="batch-title">批量操作</span>
        <span class="batch-count" v-if="selectedCount > 0">已选 {{ selectedCount }} 项</span>
        <span class="batch-count batch-count--empty" v-else>点击锚点进行选择</span>
        <button class="batch-select-all" @click="anchorBatch.selectAll(anchor.anchors ? anchor.anchors.value : [], { pendingOnly: scale === 'day' ? undefined : undefined })">全选</button>
        <button class="batch-close" @click="toggleBatchMode()">&times;</button>
      </div>

      <div class="batch-actions" v-if="selectedCount > 0">
        <button
          v-for="(label, op) in BATCH_OPERATION_LABELS"
          :key="op"
          class="batch-action-btn"
          :class="{ 'batch-action-btn--danger': op === 'delete' }"
          @click="executeBatch(op as BatchOperationType)"
        >
          <span class="ba-icon">{{ BATCH_OPERATION_ICONS[op as BatchOperationType] }}</span>
          {{ label }}
        </button>
      </div>

      <!-- 批量标签输入 -->
      <div class="batch-inputs" v-if="selectedCount > 0">
        <input
          v-model="batchTagInput"
          class="batch-input"
          placeholder="标签名（用于添加/移除标签）"
        />
        <input
          v-model="batchCategoryInput"
          class="batch-input"
          placeholder="分类名（用于设置分类）"
        />
      </div>

      <!-- 删除确认 -->
      <div v-if="batchConfirmDelete" class="batch-confirm">
        <span class="batch-confirm-text">⚠️ 确定要删除 {{ selectedCount }} 个锚点吗？此操作不可撤销。</span>
        <button class="batch-confirm-btn" @click="executeBatch('delete')">确认删除</button>
        <button class="batch-cancel-btn" @click="batchConfirmDelete = false">取消</button>
      </div>

      <!-- 操作结果 -->
      <div v-if="batchResult" class="batch-result" :class="{ 'batch-result--error': batchResult.failureCount > 0 }">
        <span v-if="batchResult.success">✅ 操作成功，共处理 {{ batchResult.successCount }} 个锚点</span>
        <span v-else>⚠️ 部分操作失败：成功 {{ batchResult.successCount }}，失败 {{ batchResult.failureCount }}</span>
        <ul v-if="batchResult.errors.length > 0" class="batch-result-errors">
          <li v-for="(e, i) in batchResult.errors.slice(0, 3)" :key="i">{{ e }}</li>
        </ul>
      </div>
    </div>

    <!-- 年度统计 -->
    <section data-enter class="year-stats" v-if="scale === 'year'">
      <div class="section-label">年度统计</div>
      <div class="year-stats-grid">
        <div class="year-stat-card">
          <span class="year-stat-label">总锚点数</span>
          <strong class="year-stat-value">{{ yearStats.total }}</strong>
        </div>
        <div class="year-stat-card">
          <span class="year-stat-label">已完成</span>
          <strong class="year-stat-value">{{ yearStats.done }}</strong>
        </div>
        <div class="year-stat-card">
          <span class="year-stat-label">完成率</span>
          <strong class="year-stat-value">{{ yearStats.rate }}</strong>
        </div>
      </div>
    </section>

    <!-- 光丝串联 -->
    <section data-enter v-if="scale === 'year' && lightThreadDoneAnchors.length >= 2" class="light-thread-section">
      <div class="section-label">光丝串联 · 已连接 {{ lightThreadDoneAnchors.length }} 个锚点</div>
      <div class="light-thread-container">
        <AnchorLightThread :anchors="scopedAnchors" :width="600" :height="120" />
      </div>
    </section>

    <!-- 待完成 -->
    <section data-enter class="anchor-section" v-if="pending.length > 0">
      <div class="section-label">{{ scaleSectionLabel }}</div>
      <div class="anchor-list">
        <template v-if="scale === 'day'">
          <TransitionGroup name="anchor-drift">
            <div v-for="a in pending" :key="a.id" class="anchor-card hf-press hf-lift" :class="`prio-${a.priority}`">
              <span v-if="batchMode" class="batch-checkbox" @click.stop="anchorBatch.toggleSelection(a.id)">
                <span class="batch-checkbox-mark" v-if="anchorBatch.selection.value.selectedIds.has(a.id)">✓</span>
              </span>
              <span class="anchor-priority-dot" :style="{ background: PRIORITY_COLORS[a.priority] }" />
              <div class="anchor-main" role="button" tabindex="0" :aria-label="'展开或收起 ' + a.text + ' 的关联事项'" :aria-expanded="anchorRelatedOpen(a.id)" @click.stop="toggleRelated(a.id)" @keydown.enter.prevent="toggleRelated(a.id)" @keydown.space.prevent="toggleRelated(a.id)">
                <span class="anchor-text">{{ a.text }}</span>
                <div class="anchor-meta-row">
                  <span class="anchor-priority-label">{{ priorityLabel(a.priority) }}</span>
                  <span class="anchor-drift-badge" v-if="a.driftCount > 0" :title="`已漂移${a.driftCount}次`">自动漂移 {{ a.driftCount }} 次</span>
                </div>
              </div>
              <div class="anchor-actions">
                <button class="anchor-action anchor-action--done" @click.stop="onMarkDone(a.id)">完成</button>
                <button class="anchor-action anchor-action--secondary" @click.stop="anchor.postponeToTomorrow(a.id)">推迟</button>
                <button class="anchor-action anchor-action--secondary" @click.stop="anchor.returnToPool(a.id)">放回池子</button>
                <button class="anchor-action anchor-action--journal" @click.stop="toggleJournal(a.id)">手札</button>
              </div>
              <button class="anchor-del" @click.stop="anchor.remove(a.id)">×</button>
            </div>
          </TransitionGroup>
        </template>
        <template v-else>
          <div v-for="group in groupedPending" :key="group.date" class="anchor-group">
            <div class="anchor-group-title">{{ formatGroupTitle(group.date) }}</div>
            <TransitionGroup name="anchor-drift">
              <div v-for="a in group.items" :key="a.id" class="anchor-card hf-press hf-lift" :class="`prio-${a.priority}`">
                <span v-if="batchMode" class="batch-checkbox" @click.stop="anchorBatch.toggleSelection(a.id)">
                  <span class="batch-checkbox-mark" v-if="anchorBatch.selection.value.selectedIds.has(a.id)">✓</span>
                </span>
                <span class="anchor-priority-dot" :style="{ background: PRIORITY_COLORS[a.priority] }" />
              <div class="anchor-main" role="button" tabindex="0" :aria-label="'展开或收起 ' + a.text + ' 的关联事项'" :aria-expanded="anchorRelatedOpen(a.id)" @click.stop="toggleRelated(a.id)" @keydown.enter.prevent="toggleRelated(a.id)" @keydown.space.prevent="toggleRelated(a.id)">
                <span class="anchor-text">{{ a.text }}</span>
                <div class="anchor-meta-row">
                  <span class="anchor-priority-label">{{ priorityLabel(a.priority) }}</span>
                  <span v-if="a.dueTime" class="anchor-target-time">{{ a.dueTime }}</span>
                  <span class="anchor-drift-badge" v-if="a.driftCount > 0" :title="`已漂移${a.driftCount}次`">自动漂移 {{ a.driftCount }} 次</span>
                </div>
              </div>
              <div class="anchor-actions">
                <button class="anchor-action anchor-action--done" @click.stop="onMarkDone(a.id)">完成</button>
                <button class="anchor-action anchor-action--secondary" @click.stop="anchor.postponeToTomorrow(a.id)">推迟</button>
                <button class="anchor-action anchor-action--secondary" @click.stop="anchor.returnToPool(a.id)">放回池子</button>
                <button class="anchor-action anchor-action--journal" @click.stop="toggleJournal(a.id)">手札</button>
              </div>
                <button class="anchor-del" @click.stop="anchor.remove(a.id)">×</button>
              </div>
            </TransitionGroup>
          </div>
        </template>
      </div>
    </section>

    <!-- 已完成 -->
    <section class="anchor-section done-section" v-if="done.length > 0">
      <div class="section-label">{{ scaleDoneLabel }} · {{ done.length }}</div>
      <div class="anchor-list">
        <template v-if="scale === 'day'">
          <div v-for="a in done" :key="a.id" class="anchor-card done-card hf-press hf-lift">
            <span v-if="batchMode" class="batch-checkbox" @click.stop="anchorBatch.toggleSelection(a.id)">
              <span class="batch-checkbox-mark" v-if="anchorBatch.selection.value.selectedIds.has(a.id)">✓</span>
            </span>
            <span class="anchor-done-mark">⚓</span>
            <div class="anchor-main" role="button" tabindex="0" :aria-label="'展开或收起 ' + a.text + ' 的关联事项'" :aria-expanded="anchorRelatedOpen(a.id)" @click.stop="toggleRelated(a.id)" @keydown.enter.prevent="toggleRelated(a.id)" @keydown.space.prevent="toggleRelated(a.id)">
              <span class="anchor-text done-text">{{ a.text }}</span>
              <div class="anchor-meta-row">
                <span class="anchor-done-time">{{ doneTime(a.doneAt) }} 已锚定</span>
              </div>
            </div>
            <div class="anchor-actions">
              <button class="anchor-action anchor-action--secondary" @click="anchor.markUndone(a.id)">恢复</button>
              <button class="anchor-action anchor-action--secondary" @click="anchor.returnToPool(a.id)">放回池子</button>
              <button class="anchor-action anchor-action--journal" @click.stop="toggleJournal(a.id)">手札</button>
            </div>
            <button class="anchor-del" @click.stop="anchor.remove(a.id)">×</button>
          </div>
        </template>
        <template v-else>
          <div v-for="group in groupedDone" :key="group.date" class="anchor-group">
            <div class="anchor-group-title">{{ formatGroupTitle(group.date) }}</div>
            <div v-for="a in group.items" :key="a.id" class="anchor-card done-card hf-press hf-lift">
              <span v-if="batchMode" class="batch-checkbox" @click.stop="anchorBatch.toggleSelection(a.id)">
                <span class="batch-checkbox-mark" v-if="anchorBatch.selection.value.selectedIds.has(a.id)">✓</span>
              </span>
              <span class="anchor-done-mark">⚓</span>
            <div class="anchor-main" role="button" tabindex="0" :aria-label="'展开或收起 ' + a.text + ' 的关联事项'" :aria-expanded="anchorRelatedOpen(a.id)" @click.stop="toggleRelated(a.id)" @keydown.enter.prevent="toggleRelated(a.id)" @keydown.space.prevent="toggleRelated(a.id)">
              <span class="anchor-text done-text">{{ a.text }}</span>
              <div class="anchor-meta-row">
                <span class="anchor-done-time">{{ groupedDoneTimeLabel(a.doneAt) }}</span>
                <span v-if="a.dueTime" class="anchor-done-due">原定 {{ a.dueTime }}</span>
              </div>
            </div>
            <div class="anchor-actions">
              <button class="anchor-action anchor-action--secondary" @click="anchor.markUndone(a.id)">恢复</button>
              <button class="anchor-action anchor-action--secondary" @click="anchor.returnToPool(a.id)">放回池子</button>
              <button class="anchor-action anchor-action--journal" @click.stop="toggleJournal(a.id)">手札</button>
            </div>
              <button class="anchor-del" @click.stop="anchor.remove(a.id)">×</button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- 手札日记 -->
    <div v-if="selectedJournalAnchorId" class="journal-section">
      <div class="journal-header">
        <span class="journal-label">手札</span>
        <span class="journal-anchor-text">{{ activeJournalAnchorText }}</span>
        <button class="journal-close" @click="selectedJournalAnchorId = null">&times;</button>
      </div>
      <textarea v-model="journalDraft" class="journal-textarea" placeholder="写下与这个锚点相关的思绪…" rows="4"></textarea>
      <div class="journal-actions">
        <button class="journal-save-btn" @click="saveJournal">保存手札</button>
        <span v-if="journalSavedHint" class="journal-saved-hint">{{ journalSavedHint }}</span>
      </div>
    </div>

    <!-- 关联心锚 · 聚类可视化（P18-4） -->
    <section v-if="relatedAnchors.length > 0" data-enter class="related-section">
      <div class="section-label">关联心锚 · 与「{{ relatedAnchorText }}」</div>
      <div class="related-list">
        <div v-for="r in relatedAnchors" :key="r.anchor.id" class="related-card" :class="`prio-${r.anchor.priority}`">
          <span class="anchor-priority-dot" :style="{ background: PRIORITY_COLORS[r.anchor.priority] }" />
          <span class="related-text">{{ r.anchor.text }}</span>
          <span class="related-reason">{{ r.reason }}</span>
        </div>
      </div>
    </section>

    <!-- 空状态 -->
    <EmptyState v-if="scopedAnchors.length === 0" icon="⚓" :title="scalePeriodLabel + '还没有锚点'" hint="可以先在这里放下一件事，再决定何时安放" :glow="true" cta-label="" />

    <!-- 心愿锚 -->
    <WishAnchorPanel />

    <!-- 照片日记（传入有心锚的日期，用于日期强绑定与快速跳转） -->
    <PhotoDiaryPanel :anchor-dates="anchorDatesWithItems" @send-to-journal="onSendPhotoToJournal" />

    <!-- 智能提醒 -->
    <SmartReminderPanel :anchors="anchor.allAnchors.value" />

    <!-- 日历导出 -->
    <CalendarExportPanel :anchors="anchor.allAnchors.value" />

    <!-- 时间流 · 尺度视图（INCR-01 逐日心锚时间流） -->
    <AnchorTimeScalePanel :anchors="anchor.allAnchors.value" />

    <!-- 手札档案 · 日记/复盘/洞见/感恩 + 光丝连接 + 年尺度摘要（anchor/anchor-journal 引擎，INCR-273 补挂载孤儿组件，薄委托化：宿主注入锚点） -->
    <AnchorJournalPanel :anchors="anchor.allAnchors.value" />

    <!-- ============================================================ -->
    <!-- 手札回溯（INCR-378 补挂载孤儿引擎 anchor-journals 查询纯函数 + anchor-journal-templates：那年今日/心情分布/组合检索/书写脚手架，薄委托） -->
    <!-- ============================================================ -->
    <AnchorJournalRetroPanel :journals="journals" />

    <!-- 光丝串联（INCR-412 补挂载孤儿引擎 anchor-threads：锚点间光丝 · 锚点↔留光阁联动 · 完成推进预览 · 锚点池倒入预览，薄委托） -->
    <AnchorThreadsPanel :anchors="anchor.allAnchors.value" />

    <!-- 时令元数据（INCR-256 补挂载孤儿组件：时辰·节气·季节·天气采集） -->
    <ZeitgeistPanel />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAnchor, useAnchorReview, useAnchorBatch, REVIEW_PERIOD_META, BATCH_OPERATION_LABELS, BATCH_OPERATION_ICONS } from '../modules/anchor'
import type { Anchor, ReviewPeriod, BatchOperationType } from '../modules/anchor'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../modules/anchor/types'
import { useAnchorJournals } from '../modules/anchor/anchor-journals'
import AnchorLightThread from '../components/AnchorLightThread.vue'
import AnchorCelebration from '../components/AnchorCelebration.vue'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomResonance, ROOM_LABELS, aggregateClimate } from '../modules/room-resonance'
import type { RoomKey } from '../modules/room-resonance'
import { useCelebration } from '../modules/anchor/celebration'
import { useAnchorClustering } from '../modules/anchor/anchor-cluster'
import WishAnchorPanel from '../components/WishAnchorPanel.vue'
import PhotoDiaryPanel from '../components/PhotoDiaryPanel.vue'
import { usePhotoDiary, todayKey } from '../modules/anchor/photo-diary'
import SmartReminderPanel from '../components/SmartReminderPanel.vue'
import CalendarExportPanel from '../components/CalendarExportPanel.vue'
import AnchorTimeScalePanel from '../components/AnchorTimeScalePanel.vue'
import AnchorJournalPanel from '../components/AnchorJournalPanel.vue'
import AnchorJournalRetroPanel from '../components/AnchorJournalRetroPanel.vue'
import AnchorThreadsPanel from '../components/AnchorThreadsPanel.vue'
import ZeitgeistPanel from '../components/ZeitgeistPanel.vue'

const { entranceClass } = useViewEntrance()

const anchor = useAnchor()
const anchorReview = useAnchorReview()
const anchorBatch = useAnchorBatch()
const celebration = useCelebration()
const clustering = useAnchorClustering()
onMounted(() => { anchor.load(); anchor.driftPending(); emitAnchorResonanceSignal() })

// ---- 完成庆祝（蓝图 P18-4）：用户主动完成锚点时触发本地粒子/光晕，纯反馈不诱导 ----
function onMarkDone(id: string) {
  const a = (anchor.anchors ? anchor.anchors.value : []).find(x => x.id === id)
  anchor.markDone(id)
  if (a) celebration.triggerCelebration(a, anchor.allAnchors.value)
}

// ---- 关联心锚聚类（P18-4）：点击卡片主区→展示同标签/同分类/时间接近的关联簇 ----
const relatedAnchorId = ref<string | null>(null)
const relatedAnchors = computed<{ anchor: Anchor; reason: string }[]>(() => {
  if (!relatedAnchorId.value) return []
  const all = anchor.allAnchors.value
  const base = all.find(a => a.id === relatedAnchorId.value)
  if (!base) return []
  return clustering
    .getRelatedAnchors(base.id, all)
    .slice(0, 6)
    .map(a => ({
      anchor: a,
      reason:
        (base.category && a.category === base.category ? '同分类 ' : '') +
        (base.tags && a.tags && a.tags.some(t => base.tags!.includes(t)) ? '同标签 ' : '') +
        (a.priority === base.priority ? '同优先级' : '') || '时间接近',
    }))
})
function toggleRelated(id: string) {
  relatedAnchorId.value = relatedAnchorId.value === id ? null : id
}
function anchorRelatedOpen(id: string): boolean {
  return relatedAnchorId.value === id
}

// ---- 跨房间共鸣联动：逐日心锚发射「焦点」信号（含照片日记）----
const { emitRoomSignal: emitAnchorResonance, crossRoomFeed, summarizeClimate, getSignals } = useRoomResonance()
const diary = usePhotoDiary()
diary.load()

// ---- 跨房间共鸣接收（双向联动收口）：过滤本房回声，只呈现其他房间的光痕 ----
const externalFeed = computed(() => crossRoomFeed.value.filter((s) => s.room !== 'daily-anchor'))
const externalClimate = computed(() => aggregateClimate(getSignals().filter((s) => s.room !== 'daily-anchor')))
function roomLabel(r: RoomKey): string { return ROOM_LABELS[r] ?? r }

const photoTotalCount = computed(() => diary.entries.value.reduce((s, e) => s + e.images.length, 0))
const todayPhotoCount = computed(() => {
  const t = todayKey()
  return diary.entries.value.filter((e) => e.date === t).reduce((s, e) => s + e.images.length, 0)
})

function emitAnchorResonanceSignal() {
  const list = anchor.todayAnchors.value
  const pending = list.filter((a) => !a.done).length
  // 照片日记融入信号：今日有照片显今日张数，否则有历史则显总数（让其他房间感知照片活动）
  const photoPart = todayPhotoCount.value > 0
    ? ` · 今日 ${todayPhotoCount.value} 张照片`
    : photoTotalCount.value > 0
      ? ` · 共 ${photoTotalCount.value} 张照片`
      : ''
  emitAnchorResonance({
    room: 'daily-anchor',
    kind: 'focus',
    label: (pending > 0 ? `待完成 ${pending} 项心锚` : '今日心锚已清空') + photoPart,
    detail: list.length ? `今日共 ${list.length} 项` : (photoTotalCount.value ? `共 ${photoTotalCount.value} 张照片` : undefined),
    ts: Date.now(),
    strength: Math.min(1, pending / 5),
  })
}
// 心锚增减或照片增删均刷新本房共鸣信号（照片在子面板内改，模块级 entries 单例同步）
watch([() => anchor.todayAnchors.value.length, photoTotalCount], emitAnchorResonanceSignal)

// ---- 照片日记的日期强绑定：把「有心锚的日期」下传给面板 ----
const anchorDatesWithItems = computed<string[]>(() =>
  [...new Set(anchor.allAnchors.value.map(a => a.targetDate).filter(Boolean))],
)

const newText = ref('')
type Scale = 'day' | 'week' | 'month' | 'year'
const scale = ref<Scale>('day')
const scales: { key: Scale; label: string }[] = [{ key: 'day', label: '日' }, { key: 'week', label: '周' }, { key: 'month', label: '月' }, { key: 'year', label: '年' }]

// ---- 回顾面板 ----
const showReview = ref(false)
const reviewPeriod = ref<ReviewPeriod>('weekly')
const reviewData = computed(() => {
  const allAnchors = anchor.anchors ? anchor.anchors.value : []
  return anchorReview.generateReview(allAnchors, reviewPeriod.value)
})
const reviewPeriods = Object.values(REVIEW_PERIOD_META)

// ---- 深度可视化收口：标签趋势（近7天）+ 时间热力图 ----
// 两者均消费模块已计算但未可视化的数据，纯前端、零外网。
const tagTrend = computed(() => anchor.getTagTrend().slice(0, 8))
const tagTrendMax = computed(() => Math.max(1, ...tagTrend.value.map(t => t.count)))

const heatCells = computed<{ key: string; label: string; count: number }[]>(() => {
  const dist = anchor.scaleDistribution.value
  const wd = ['日', '一', '二', '三', '四', '五', '六']
  if (scale.value === 'year') {
    const names = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    return dist.monthlyInYear.map(m => ({ key: `m${m.month}`, label: names[m.month], count: m.count }))
  }
  if (scale.value === 'month') {
    return dist.weeklyInMonth.map(w => ({ key: `w${w.week}`, label: `第${w.week}周`, count: w.count }))
  }
  // day / week → 本周每日
  return dist.dailyInWeek.map(d => {
    const dt = parseDateText(d.date)
    const label = dt ? `周${wd[dt.getDay()]}` : d.date.slice(5)
    return { key: d.date, label, count: d.count }
  })
})
const heatMax = computed(() => Math.max(1, ...heatCells.value.map(c => c.count)))
function heatIntensity(count: number): number {
  return Math.min(1, count / heatMax.value)
}
function heatStyle(count: number): Record<string, string> {
  const i = heatIntensity(count)
  const bg = count === 0 ? 'rgba(var(--accent-rgb), 0.05)' : `rgba(var(--accent-rgb), ${(0.14 + i * 0.58).toFixed(3)})`
  const color = i > 0.55 ? '#ffffff' : 'var(--text-secondary)'
  return { background: bg, color }
}

// ---- 批量管理 ----
const batchMode = ref(false)
const batchTagInput = ref('')
const batchCategoryInput = ref('')
const batchConfirmDelete = ref(false)
const batchResult = ref<{ success: boolean; successCount: number; failureCount: number; errors: string[] } | null>(null)

const selectedCount = computed(() => anchorBatch.getSelectionCount())

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) {
    anchorBatch.clearSelection()
    batchResult.value = null
    batchConfirmDelete.value = false
  }
}

function executeBatch(op: BatchOperationType) {
  batchResult.value = null
  batchConfirmDelete.value = false
  const ids = [...anchorBatch.selection.value.selectedIds]
  if (ids.length === 0) return

  const allAnchors = anchor.anchors ? anchor.anchors.value : []
  let result: ReturnType<typeof anchorBatch.batchComplete> | undefined

  switch (op) {
    case 'complete':
      result = anchorBatch.batchComplete(allAnchors, ids, (id) => { anchor.markDone(id); return true })
      break
    case 'postpone':
      result = anchorBatch.batchPostpone(allAnchors, ids, (id) => anchor.postponeToTomorrow(id))
      break
    case 'setPriority':
      result = anchorBatch.batchSetPriority(allAnchors, ids, 'must', (id, pri) => anchor.setPriority(id, pri))
      break
    case 'addTag':
      if (batchTagInput.value.trim()) {
        result = anchorBatch.batchAddTag(allAnchors, ids, batchTagInput.value.trim(), (id, tag) => anchor.addTag(id, tag))
        batchTagInput.value = ''
      }
      break
    case 'removeTag':
      if (batchTagInput.value.trim()) {
        result = anchorBatch.batchRemoveTag(allAnchors, ids, batchTagInput.value.trim(), (id, tag) => anchor.removeTag(id, tag))
        batchTagInput.value = ''
      }
      break
    case 'setCategory':
      if (batchCategoryInput.value.trim()) {
        result = anchorBatch.batchSetCategory(allAnchors, ids, batchCategoryInput.value.trim(), (id, updates) => anchor.update(id, updates))
        batchCategoryInput.value = ''
      }
      break
    case 'moveToPool':
      result = anchorBatch.batchMoveToPool(allAnchors, ids, (id) => anchor.returnToPool(id))
      break
    case 'placeFromPool':
      result = anchorBatch.batchPlaceFromPool(allAnchors, ids, 'can', (id, pri) => anchor.placeFromPool(id, pri))
      break
    case 'delete':
      if (!batchConfirmDelete.value) {
        batchConfirmDelete.value = true
        return
      }
      result = anchorBatch.batchDelete(allAnchors, ids, (id) => anchor.remove(id), 'confirmed')
      batchConfirmDelete.value = false
      break
    case 'duplicate':
      result = anchorBatch.batchDuplicate(allAnchors, ids, (text, pri, extra) => anchor.addRaw(text, pri, extra))
      break
  }

  if (result) {
    batchResult.value = {
      success: result.success,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors,
    }
    anchorBatch.clearSelection()
  }
}

// ---- 手札日记（Journal） ----
const journalStore = useAnchorJournals()
const journals = journalStore.items
journalStore.load()
const selectedJournalAnchorId = ref<string | null>(null)
const journalDraft = ref('')
const journalSavedHint = ref('')

// activeJournal computed removed - unused

const activeJournalAnchorText = computed(() => {
  if (!selectedJournalAnchorId.value) return ''
  const a = scopedAnchors.value.find(an => an.id === selectedJournalAnchorId.value)
  return a ? a.text : ''
})

const relatedAnchorText = computed(() => {
  if (!relatedAnchorId.value) return ''
  const a = anchor.allAnchors.value.find(an => an.id === relatedAnchorId.value)
  return a ? a.text : ''
})

function toggleJournal(anchorId: string) {
  if (selectedJournalAnchorId.value === anchorId) {
    selectedJournalAnchorId.value = null
    return
  }
  selectedJournalAnchorId.value = anchorId
  const existing = journals.value.find(j => j.anchorId === anchorId)
  journalDraft.value = existing ? existing.content : ''
  journalSavedHint.value = ''
}

function saveJournal() {
  if (!selectedJournalAnchorId.value) return
  const idx = journals.value.findIndex(j => j.anchorId === selectedJournalAnchorId.value)
  if (idx >= 0) {
    journals.value[idx].content = journalDraft.value
    journals.value[idx].updatedAt = new Date().toISOString()
  } else {
    journals.value.push({
      anchorId: selectedJournalAnchorId.value,
      content: journalDraft.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  journalStore.save()
  journalSavedHint.value = '已保存'
  setTimeout(() => { journalSavedHint.value = '' }, 2000)
}

// ---- 照片进手札：把某日某张照片写入该日锚点的手札（照片日记 → 手札回流） ----
function onSendPhotoToJournal(payload: { date: string; index: number }) {
  const { date, index } = payload
  const anchorId = anchor.allAnchors.value.find(a => a.targetDate === date)?.id
  if (!anchorId) return // 该日尚无锚点，不强行写入
  const now = new Date().toISOString()
  journals.value.push({
    anchorId,
    content: `📷 照片手札 · ${date} · 第 ${index + 1} 张`,
    photoRef: [{ date, index }],
    createdAt: now,
    updatedAt: now,
  })
  journalStore.save()
}

function sortAnchorsForDisplay(items: Anchor[]): Anchor[] {
  return [...items].sort((a, b) => {
    if (a.targetDate !== b.targetDate) return a.targetDate.localeCompare(b.targetDate)
    return b.createdAt.localeCompare(a.createdAt)
  })
}

// ---- 年尺度视图 ----
const scopedAnchors = computed(() => {
  if (scale.value === 'year') {
    const currentYear = String(new Date().getFullYear())
    // Fallback: filter anchors by current year
    const all = anchor.anchors ? anchor.anchors.value : []
    return sortAnchorsForDisplay(all.filter(a => {
      if ((a.stage ?? 'active') !== 'active' || !a.targetDate) return false
      return a.targetDate.startsWith(currentYear)
    }))
  }
  return (anchor.getAnchorsByScale as (s: string) => Anchor[])(scale.value)
})

const yearStats = computed(() => {
  const total = scopedAnchors.value.length
  const done = scopedAnchors.value.filter(a => a.done).length
  const rate = total > 0 ? `${Math.round((done / total) * 100)}%` : '--'
  return { total, done, rate }
})
const lightThreadDoneAnchors = computed(() => scopedAnchors.value.filter(a => a.done))
const pending = computed(() => scopedAnchors.value.filter(a => !a.done))
const done = computed(() => scopedAnchors.value.filter(a => a.done))
type AnchorGroup = { date: string; items: Anchor[] }
function groupAnchorsByDate(items: Anchor[]): AnchorGroup[] {
  const groups = new Map<string, Anchor[]>()
  items.forEach((item) => {
    const group = groups.get(item.targetDate)
    if (group) group.push(item)
    else groups.set(item.targetDate, [item])
  })
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }))
}
const groupedPending = computed(() => groupAnchorsByDate(pending.value))
const groupedDone = computed(() => groupAnchorsByDate(done.value))

const poolItems = computed(() => anchor.poolAnchors.value)
function captureToPool() {
  if (!newText.value.trim()) return
  anchor.addToPool(newText.value)
  newText.value = ''
}
function anchorAll(priority: Anchor['priority']) { anchor.placeAllFromPool(priority) }
function placePoolItem(id: string, priority: Anchor['priority']) { anchor.placeFromPool(id, priority) }
function priorityLabel(priority: Anchor['priority']) { return PRIORITY_LABELS[priority] }
function parseDateText(dateText: string): Date | null {
  const [year, month, day] = dateText.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}
function startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
function diffDays(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime()
  return Math.round(diff / 86400000)
}
function isSameWeek(date: Date, base: Date): boolean {
  const baseStart = startOfDay(base)
  baseStart.setDate(baseStart.getDate() - baseStart.getDay())
  const nextWeekStart = new Date(baseStart)
  nextWeekStart.setDate(baseStart.getDate() + 7)
  return date >= baseStart && date < nextWeekStart
}
function formatGroupTitle(dateText: string): string {
  const date = parseDateText(dateText)
  if (!date) return dateText
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const dayOffset = diffDays(today, target)
  const w = ['日', '一', '二', '三', '四', '五', '六']
  if (dayOffset === 0) return '今天'
  if (dayOffset === 1) return '明天'
  if (isSameWeek(target, today)) return `本周${w[target.getDay()]}`
  if (target.getFullYear() === today.getFullYear()) return `${target.getMonth() + 1}月${target.getDate()}日·周${w[target.getDay()]}`
  return `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日·周${w[target.getDay()]}`
}

const todayLabel = computed(() => { const d = new Date(); const w = ['日', '一', '二', '三', '四', '五', '六']; return `${d.getMonth() + 1}月${d.getDate()}日·星期${w[d.getDay()]}` })
const pendingCount = computed(() => pending.value.length)
const currentStreak = computed(() => {
  const all = anchor.anchors ? anchor.anchors.value : []
  return anchorReview.getStreakStats(all).currentStreak
})
const quickPresets = ['给妈妈打电话', '整理今天的第一件事', '出门前带上水杯', '把一件暂放的事放回池子']
const scalePeriodLabel = computed(() => scale.value === 'day' ? '今天' : scale.value === 'week' ? '本周' : scale.value === 'month' ? '本月' : '今年')
const scaleSectionLabel = computed(() => scale.value === 'day' ? '停留中的锚点' : `${scalePeriodLabel.value}停留中的锚点`)
const scaleDoneLabel = computed(() => scale.value === 'day' ? '已安放' : `${scalePeriodLabel.value}已安放`)
const overviewCards = computed(() => [
  {
    label: '池中念头',
    value: `${poolItems.value.length} 项`,
    note: poolItems.value[0]?.text ?? '先倒进池子，再决定要不要安放到今天',
  },
  {
    label: `${scalePeriodLabel.value}待锚`,
    value: `${pending.value.length} 项`,
    note: pending.value[0]?.text ?? '现在还很空，可以慢慢放下',
  },
  {
    label: `${scalePeriodLabel.value}已锚定`,
    value: `${done.value.length} 项`,
    note: done.value[0]?.text ?? '安放后会沉进今天的时间线',
  },
])
function doneTime(iso?: string): string { if (!iso) return ''; const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function groupedDoneTimeLabel(iso?: string): string { const time = doneTime(iso); return time ? `${time} 完成` : '已完成' }
</script>

<style scoped>
/* ============================================================
   "逐日心锚" 视觉语言 CSS 变量
   ============================================================ */
:root {
  --anchor-accent: var(--accent);
  --anchor-accent-glow: rgba(var(--accent-rgb), 0.18);
  --anchor-accent-soft: rgba(var(--accent-rgb), 0.06);
  --anchor-must: var(--warning);
  --anchor-must-glow: rgba(240, 192, 64, 0.22);
  --anchor-done: var(--accent-cyan);
  --anchor-done-glow: rgba(90, 184, 160, 0.14);
  --anchor-bg-deep: var(--bg-panel);
  --anchor-text-warm: rgba(240, 232, 224, 0.92);
  --anchor-text-soft: var(--text-secondary);
  --anchor-text-muted: var(--text-secondary);
}

/* ============================================================
   容器 & 氛围层
   一盏温暖的灯照在桌面上的感觉
   ============================================================ */
.anchor-page {
  position: relative;
  max-width: 1040px;
  margin: 0 auto;
  /* 左右/顶部内边距交给 RoomLayout 统一内容区，根仅保留底部浮层避让 */
  padding: 0 0 80px;
  min-height: 100vh;
  /* 桌面木质纹理模拟 — 微妙的暖褐色底 */
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(var(--accent-rgb), 0.03) 0%, transparent 70%),
    radial-gradient(ellipse 120% 80% at 50% 100%, rgba(180, 140, 100, 0.04) 0%, transparent 70%);
}

.anchor-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* 左侧暖光 — 从左上角洒下的柔和光晕 */
.anchor-glow-left {
  position: absolute;
  top: -8%;
  left: -8%;
  width: 45%;
  height: 65%;
  background: radial-gradient(ellipse 60% 50% at 30% 20%, rgba(var(--accent-rgb), 0.07), transparent 65%);
  will-change: transform;
}

/* 右侧冷光 — 微弱的绿色平衡，像水面反射 */
.anchor-glow-right {
  position: absolute;
  bottom: -5%;
  right: -8%;
  width: 45%;
  height: 50%;
  background: radial-gradient(ellipse 60% 50% at 70% 80%, rgba(90, 184, 160, 0.04), transparent 65%);
}

/* 聚光灯效果 — 从上方斜照下来的温暖光锥 */
.anchor-spotlight {
  position: absolute;
  top: -15%;
  left: 5%;
  width: 55%;
  height: 70%;
  background: radial-gradient(ellipse 70% 80% at 30% 10%, rgba(var(--accent-rgb), 0.06) 0%, rgba(var(--accent-rgb), 0.02) 35%, transparent 65%);
  transform: skewX(-4deg);
  filter: blur(8px);
  opacity: 0.8;
  will-change: transform;
}

/* 桌面光晕 — 中心亮、四周暗的径向渐变 */
.anchor-desk-glow {
  position: absolute;
  top: 20%;
  left: 10%;
  width: 80%;
  height: 60%;
  background: radial-gradient(ellipse 50% 40% at 50% 50%, rgba(var(--accent-rgb), 0.05) 0%, rgba(var(--accent-rgb), 0.02) 30%, transparent 65%);
  filter: blur(20px);
}

/* 微尘粒子效果 — 缓慢飘浮的光点 */
.anchor-dust-particles {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(var(--accent-rgb), 0.08), transparent),
    radial-gradient(1px 1px at 40% 20%, rgba(var(--accent-rgb), 0.06), transparent),
    radial-gradient(1.5px 1.5px at 60% 35%, rgba(var(--accent-rgb), 0.07), transparent),
    radial-gradient(1px 1px at 80% 25%, rgba(var(--accent-rgb), 0.05), transparent),
    radial-gradient(1px 1px at 15% 55%, rgba(var(--accent-rgb), 0.06), transparent),
    radial-gradient(1.5px 1.5px at 50% 50%, rgba(var(--accent-rgb), 0.05), transparent),
    radial-gradient(1px 1px at 70% 60%, rgba(var(--accent-rgb), 0.04), transparent),
    radial-gradient(1px 1px at 30% 70%, rgba(var(--accent-rgb), 0.05), transparent);
  animation: dustFloat 12s ease-in-out infinite;
}

@keyframes dustFloat {
  0%, 100% { opacity: 0.4; transform: translateY(0); }
  25% { opacity: 0.6; transform: translateY(-4px); }
  50% { opacity: 0.3; transform: translateY(-2px); }
  75% { opacity: 0.5; transform: translateY(-6px); }
}

/* ============================================================
   头部 — "安放台" 的仪式感
   ============================================================ */
.anchor-room-header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  /* 移动端关键：列方向下必须 stretch，否则 room-layout__body 不被拉伸、按子项 min-content 撑爆整房（手机端 +69.5px 溢出） */
  align-items: stretch;
  gap: 10px;
  /* 标题背后的柔和光晕 */
}
.anchor-room-header :deep(.rh-main) {
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.anchor-room-header::before {
  content: '';
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  max-width: 480px;
  height: 180px;
  background: radial-gradient(ellipse 50% 60% at 50% 40%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  filter: blur(16px);
}

/* 装饰线 + 菱形 — 更庄重（插槽内容，原类名直接命中） */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
  position: relative;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), rgba(var(--accent-rgb), 0.15), transparent);
  position: relative;
}

.orn-line::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.12), transparent);
  filter: blur(2px);
}

.orn-diamond {
  font-size: 10px;
  color: var(--accent, #d4a574);
  opacity: 0.45;
  text-shadow: 0 0 6px rgba(var(--accent-rgb), 0.2);
  animation: diamondPulse 3s ease-in-out infinite;
}

@keyframes diamondPulse {
  0%, 100% { opacity: 0.45; text-shadow: 0 0 6px rgba(var(--accent-rgb), 0.2); }
  50% { opacity: 0.7; text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.35); }
}

.anchor-room-header :deep(.rh-kicker) {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--text-low);
  position: relative;
  text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.08);
}

.anchor-room-header :deep(.rh-title) {
  font-size: 32px;
  font-weight: 500;
  letter-spacing: 6px;
  color: rgba(240, 232, 224, 0.9);
  font-family: var(--font-heading-zh);
  margin: 0;
  text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.08), 0 2px 4px rgba(0, 0, 0, 0.3);
  position: relative;
}

.anchor-room-header :deep(.rh-title)::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}

.anchor-room-header :deep(.rh-subtitle) {
  font-size: 12px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.anchor-desc {
  max-width: 560px;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(var(--text-primary-rgb), 0.45);
  text-shadow: 0 0 6px rgba(var(--accent-rgb), 0.04);
}

/* ---- 概览卡片 ---- */
.anchor-overview {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.overview-card {
  padding: 18px 16px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.overview-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.08), transparent);
  pointer-events: none;
}

.overview-card:hover {
  background: rgba(55, 48, 40, 0.55);
  border-color: rgba(var(--accent-rgb), 0.18);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 12px rgba(var(--accent-rgb), 0.04);
  transform: translateY(-1px);
}

.ov-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.38);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.ov-value {
  font-size: 22px;
  font-weight: 500;
  color: rgba(240, 232, 224, 0.88);
  letter-spacing: 0.5px;
}

.ov-note {
  font-size: 11px;
  line-height: 1.5;
  color: rgba(var(--text-primary-rgb), 0.28);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============================================================
   锚点池 — 水面微光 & 波光粼粼
   ============================================================ */
.anchor-pool {
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
  border-radius: 16px;
  border: 1px dashed rgba(var(--accent-rgb), 0.08);
  padding: 18px;
  background: rgba(var(--bg-card-rgb), 0.25);
  transition: all 0.4s ease;
  overflow: hidden;
}

/* 水面微光波纹效果 */
.anchor-pool::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      rgba(var(--accent-rgb), 0.01) 1px,
      transparent 3px,
      rgba(var(--accent-rgb), 0.005) 4px,
      transparent 6px
    );
  background-size: 200% 100%;
  animation: waterShimmer 6s linear infinite;
  pointer-events: none;
}

.anchor-pool::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: radial-gradient(ellipse 60% 40% at 30% 50%, rgba(var(--accent-rgb), 0.03) 0%, transparent 60%);
  pointer-events: none;
}

@keyframes waterShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.anchor-pool.has-items {
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.04);
  box-shadow: inset 0 0 20px rgba(var(--accent-rgb), 0.03);
}

.pool-surface {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.pool-hint {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.18);
  font-style: italic;
  text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.04);
}

.pool-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.55);
  font-size: 13px;
  color: var(--text-bright);
  animation: poolFloat 3s ease-in-out infinite;
  flex-wrap: wrap;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.pool-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.06), transparent);
  pointer-events: none;
}

.pool-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 4px currentColor;
}

.pool-text {
  flex-shrink: 0;
}

.pool-item-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: auto;
}

.pool-item-btn {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: rgba(var(--text-primary-rgb), 0.45);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.pool-item-btn:hover {
  background: rgba(55, 48, 40, 0.5);
  color: rgba(var(--text-primary-rgb), 0.75);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.pool-item-btn--ghost {
  color: rgba(var(--text-primary-rgb), 0.28);
}

@keyframes poolFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.pool-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.pool-btn {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid;
  font-family: inherit;
  transition: all 0.25s;
}

.pool-btn.must {
  border-color: rgba(240, 192, 64, 0.3);
  color: var(--warning);
  background: rgba(240, 192, 64, 0.06);
  text-shadow: 0 0 4px rgba(240, 192, 64, 0.08);
}
.pool-btn.must:hover { background: rgba(240, 192, 64, 0.14); border-color: rgba(240, 192, 64, 0.4); }

.pool-btn.can {
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent, #d4a574);
  background: rgba(var(--accent-rgb), 0.06);
  text-shadow: 0 0 4px rgba(var(--accent-rgb), 0.08);
}
.pool-btn.can:hover { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.4); }

.pool-btn.float {
  border-color: rgba(var(--text-primary-rgb), 0.08);
  color: rgba(var(--text-primary-rgb), 0.25);
  background: rgba(var(--bg-card-rgb), 0.3);
}
.pool-btn.float:hover { background: rgba(55, 48, 40, 0.5); border-color: rgba(var(--text-primary-rgb), 0.15); }

/* ============================================================
   输入
   ============================================================ */
.anchor-input-row {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.anchor-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 12px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.anchor-input:focus {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(48, 42, 36, 0.5);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.04), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.anchor-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.btn-add {
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent, #d4a574);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
  text-shadow: 0 0 4px rgba(var(--accent-rgb), 0.06);
}

.btn-add:hover {
  background: rgba(var(--accent-rgb), 0.16);
  border-color: rgba(var(--accent-rgb), 0.35);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.06);
}

/* ============================================================
   快捷预设
   ============================================================ */
.anchor-quickbar {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.quick-pill {
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: rgba(var(--text-primary-rgb), 0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
}

.quick-pill:hover {
  background: rgba(55, 48, 40, 0.5);
  color: var(--text-bright);
  border-color: rgba(var(--accent-rgb), 0.12);
}

/* ============================================================
   尺度切换 — 发光标签
   ============================================================ */
.scale-tabs {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  justify-content: center;
}

.scale-tab {
  padding: 5px 18px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.25);
  font-size: 11px;
  letter-spacing: 0.5px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.scale-tab:hover {
  color: var(--text-medium);
  border-color: rgba(var(--accent-rgb), 0.12);
}

.scale-tab.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent, #d4a574);
  text-shadow: 0 0 6px rgba(var(--accent-rgb), 0.15);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.06), inset 0 0 8px rgba(var(--accent-rgb), 0.04);
}

.scale-tab.active::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), transparent, rgba(var(--accent-rgb), 0.04));
  z-index: -1;
}

/* ============================================================
   锚点列表
   ============================================================ */
.anchor-section {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: var(--text-medium);
  margin-bottom: 14px;
  padding-left: 4px;
}

.anchor-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.anchor-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.anchor-group + .anchor-group {
  margin-top: 10px;
}

.anchor-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 2px;
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.2px;
}

.anchor-group-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.12), rgba(var(--accent-rgb), 0.02));
}

/* ---- 锚点卡片 — 悬浮阴影 & 边缘发光 ---- */
.anchor-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: all 0.25s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

/* 卡片顶部边缘发光 */
.anchor-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 5%;
  right: 5%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.06), transparent);
  pointer-events: none;
}

.anchor-card:hover {
  background: rgba(55, 48, 40, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 0 12px rgba(var(--accent-rgb), 0.03);
  border-color: rgba(var(--accent-rgb), 0.12);
}

/* 优先级 — 更醒目的颜色 */
.anchor-card.prio-must {
  border-left: 3px solid rgba(240, 192, 64, 0.4);
  background: linear-gradient(135deg, rgba(240, 192, 64, 0.04) 0%, rgba(var(--bg-card-rgb), 0.35) 60%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 0 20px rgba(240, 192, 64, 0.02);
}

.anchor-card.prio-must:hover {
  border-left-color: rgba(240, 192, 64, 0.6);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 0 16px rgba(240, 192, 64, 0.06);
}

.anchor-card.prio-can {
  border-left: 3px solid rgba(var(--accent-rgb), 0.35);
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.03) 0%, rgba(var(--bg-card-rgb), 0.35) 60%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 0 20px rgba(var(--accent-rgb), 0.02);
}

.anchor-card.prio-can:hover {
  border-left-color: rgba(var(--accent-rgb), 0.55);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 0 16px rgba(var(--accent-rgb), 0.06);
}

.anchor-priority-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.anchor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.anchor-main:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}

.anchor-text {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: rgba(240, 232, 224, 0.92);
}

.anchor-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 16px;
}

.anchor-priority-label {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.42);
  letter-spacing: 0.24px;
}

.anchor-target-time {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.32);
}

.anchor-drift-badge {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.25);
  font-style: italic;
}

/* ---- 动作按钮 ---- */
.anchor-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  align-self: flex-start;
  margin-left: auto;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.anchor-action {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  background: rgba(var(--bg-card-rgb), 0.3);
  color: rgba(var(--text-primary-rgb), 0.38);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.anchor-action:hover {
  background: rgba(55, 48, 40, 0.5);
  color: rgba(var(--text-primary-rgb), 0.68);
  border-color: rgba(var(--accent-rgb), 0.12);
}

.anchor-action--secondary {
  background: transparent;
  border-color: rgba(var(--accent-rgb), 0.04);
  color: var(--text-faint);
  opacity: 0.58;
}

.anchor-action--secondary:hover {
  background: rgba(var(--bg-card-rgb), 0.5);
  color: rgba(var(--text-primary-rgb), 0.6);
  border-color: rgba(var(--accent-rgb), 0.1);
}

.anchor-action--done {
  padding-inline: 11px;
  border-color: rgba(90, 184, 160, 0.22);
  background: rgba(90, 184, 160, 0.1);
  color: var(--accent-cyan);
  text-shadow: 0 0 4px rgba(90, 184, 160, 0.08);
}

.anchor-action--done:hover {
  background: rgba(90, 184, 160, 0.18);
  border-color: rgba(90, 184, 160, 0.34);
  color: #7ad0b8;
  box-shadow: 0 0 10px rgba(90, 184, 160, 0.06);
}

/* ---- 删除 ---- */
.anchor-del {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.anchor-card:hover .anchor-del { opacity: 1; }

.anchor-del:hover {
  background: rgba(255, 107, 107, 0.15);
  color: var(--danger);
}

/* ============================================================
   已完成 — 淡入淡出的光晕
   ============================================================ */
.done-section {
  opacity: 0.5;
}

.done-section .section-label {
  color: var(--text-low);
}

.done-card {
  padding-top: 14px;
  padding-bottom: 14px;
  background: rgba(var(--bg-card-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.03);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.done-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 5%;
  right: 5%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(90, 184, 160, 0.06), transparent);
  pointer-events: none;
}

/* 完成卡片的柔和光晕动画 */
.done-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: radial-gradient(ellipse 40% 50% at 50% 50%, rgba(90, 184, 160, 0.02) 0%, transparent 60%);
  animation: doneGlow 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes doneGlow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.done-card:hover {
  background: rgba(var(--bg-card-rgb), 0.25);
  border-color: rgba(var(--accent-rgb), 0.06);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
}

.done-card .anchor-main { gap: 6px; }
.done-card .anchor-meta-row { gap: 10px; }

.done-card .anchor-action {
  color: rgba(var(--text-primary-rgb), 0.25);
  border-color: rgba(var(--accent-rgb), 0.04);
  background: transparent;
}

.done-card .anchor-action:hover {
  color: var(--text-medium);
  background: var(--card-bg);
}

.anchor-done-mark {
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.45;
  filter: grayscale(0.2);
}

.done-text {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.45;
  text-decoration: line-through;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.done-meta-row { gap: 10px; }

.anchor-done-time {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.25);
}

.anchor-done-due {
  font-size: 10px;
  color: var(--text-faint);
}

/* ============================================================
   辅助动作隐藏/显示
   ============================================================ */
@media (hover: hover) and (pointer: fine) {
  .anchor-card .anchor-action--secondary {
    opacity: 0.08;
    transform: translateX(6px);
    border-color: rgba(var(--accent-rgb), 0.02);
    color: rgba(var(--text-primary-rgb), 0.12);
  }

  .anchor-card:hover .anchor-action--secondary,
  .anchor-card:focus-within .anchor-action--secondary {
    opacity: 1;
    transform: translateX(0);
    background: rgba(var(--bg-card-rgb), 0.5);
    border-color: rgba(var(--accent-rgb), 0.1);
    color: rgba(var(--text-primary-rgb), 0.65);
  }

  .done-card .anchor-action--secondary {
    opacity: 0.14;
    transform: translateX(6px);
    color: rgba(var(--text-primary-rgb), 0.12);
    border-color: rgba(var(--accent-rgb), 0.02);
  }

  .done-card:hover .anchor-action--secondary,
  .done-card:focus-within .anchor-action--secondary {
    opacity: 0.9;
    transform: translateX(0);
    color: var(--text-secondary);
    border-color: rgba(var(--accent-rgb), 0.08);
    background: var(--card-bg);
  }
}

/* ============================================================
   过渡动画
   ============================================================ */
.anchor-drift-enter-active { transition: all 0.4s ease-out; }
.anchor-drift-leave-active { transition: all 0.25s ease-in; }
.anchor-drift-enter-from { opacity: 0; transform: translateX(-16px); }
.anchor-drift-leave-to { opacity: 0; transform: translateX(16px); }
.anchor-drift-move { transition: transform 0.3s ease; }

/* ============================================================
   空状态 — 温暖等待
   ============================================================ */

/* ============================================================
   关联心锚 · 聚类可视化
   ============================================================ */
.related-section {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.related-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.07);
  border-left: 3px solid rgba(var(--accent-rgb), 0.3);
  animation: relatedFadeIn 0.3s ease-out;
  transition: all 0.25s ease;
}

.related-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.14);
  transform: translateX(2px);
}

.related-card.prio-must { border-left-color: rgba(240, 192, 64, 0.4); }
.related-card.prio-can { border-left-color: rgba(var(--accent-rgb), 0.35); }

.related-text {
  flex: 1;
  font-size: 14px;
  color: rgba(240, 232, 224, 0.88);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-reason {
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.4);
  letter-spacing: 0.2px;
  flex-shrink: 0;
}

@keyframes relatedFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   跨房间共鸣联动 · 接收其他房间的光痕
   ============================================================ */
.cross-room-strip {
  position: relative;
  z-index: 1;
  margin: 0 0 20px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06), inset 0 0 18px rgba(var(--accent-rgb), 0.02);
}

.crs-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.crs-icon {
  font-size: 14px;
  opacity: 0.7;
  filter: drop-shadow(0 0 6px rgba(var(--accent-rgb), 0.3));
}

.crs-title {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: var(--text-medium);
}

.crs-count {
  margin-left: auto;
  font-size: 10px;
  color: rgba(var(--text-primary-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.08);
  border-radius: 999px;
  padding: 1px 8px;
}

.crs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.crs-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.4);
  border-left: 2px solid rgba(var(--accent-rgb), 0.3);
  animation: crsFadeIn 0.3s ease-out;
  transition: all 0.25s ease;
}

.crs-item:hover {
  background: rgba(55, 48, 40, 0.5);
  border-left-color: rgba(var(--accent-rgb), 0.5);
  transform: translateX(2px);
}

.crs-room {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--accent, #d4a574);
  letter-spacing: 0.3px;
  text-shadow: 0 0 6px rgba(var(--accent-rgb), 0.12);
}

.crs-signal {
  color: rgba(240, 232, 224, 0.88);
}

.crs-detail {
  margin-left: auto;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40%;
}

.crs-summary {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.08);
  font-size: 11px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.4);
  letter-spacing: 0.2px;
}

@keyframes crsFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   年度统计
   ============================================================ */
.year-stats {
  position: relative;
  z-index: 1;
  margin-bottom: 20px;
}

.year-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.year-stat-card {
  padding: 18px 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

.year-stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.year-stat-card:hover {
  background: rgba(55, 48, 40, 0.55);
  border-color: rgba(var(--accent-rgb), 0.18);
  transform: translateY(-1px);
}

.year-stat-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.38);
  letter-spacing: 0.5px;
}

.year-stat-value {
  font-size: 22px;
  font-weight: 500;
  color: rgba(240, 232, 224, 0.88);
  letter-spacing: 0.5px;
}

/* ============================================================
   手札日记
   ============================================================ */
.journal-section {
  position: relative;
  z-index: 1;
  margin-bottom: 28px;
  padding: 18px 20px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.45);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), inset 0 0 16px rgba(var(--accent-rgb), 0.02);
  animation: journalFadeIn 0.3s ease-out;
}

@keyframes journalFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.journal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.journal-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: rgba(var(--accent-rgb), 0.6);
}

.journal-anchor-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-close {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.25);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.journal-close:hover {
  background: rgba(255, 107, 107, 0.15);
  color: var(--danger);
}

.journal-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: rgba(32, 28, 24, 0.5);
  color: var(--text-bright);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.7;
  outline: none;
  resize: vertical;
  transition: all 0.25s;
  min-height: 80px;
}

.journal-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(38, 34, 30, 0.6);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.04);
}

.journal-textarea::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.journal-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.journal-save-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
}

.journal-save-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.35);
  color: var(--accent);
}

.journal-saved-hint {
  font-size: 11px;
  color: rgba(90, 184, 160, 0.6);
  animation: journalHintFade 0.3s ease-out;
}

@keyframes journalHintFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 手札按钮样式 */
.anchor-action--journal {
  color: rgba(var(--accent-rgb), 0.3);
  border-color: rgba(var(--accent-rgb), 0.04);
  background: transparent;
}

.anchor-action--journal:hover {
  color: rgba(var(--accent-rgb), 0.7);
  border-color: rgba(var(--accent-rgb), 0.15);
  background: rgba(var(--accent-rgb), 0.08);
}

/* ============================================================
   响应式
   ============================================================ */

/* ============================================================
   回顾面板
   ============================================================ */
.review-panel {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
  padding: 20px 22px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  animation: reviewFadeIn 0.3s ease-out;
}

@keyframes reviewFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.review-period-tabs {
  display: flex;
  gap: 4px;
}

.review-period-btn {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.35);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
}

.review-period-btn:hover {
  color: var(--text-medium);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.review-period-btn.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent);
}

.review-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.review-stat-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.rs-label {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.rs-value {
  font-size: 20px;
  font-weight: 500;
  color: rgba(240, 232, 224, 0.88);
}

.rs-value--accent {
  color: var(--accent);
}

/* 优先级完成率条 */
.review-priority-rates {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rpr-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rpr-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rpr-label {
  font-size: 11px;
  color: var(--text-secondary);
  width: 36px;
  flex-shrink: 0;
}

.rpr-bar-track {
  flex: 1;
  height: 6px;
  background: rgba(var(--accent-rgb), 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.rpr-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.rpr-value {
  font-size: 11px;
  color: var(--text-low);
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

/* 子网格 */
.review-subgrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.review-subcard {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rsc-label {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  display: block;
}

.rsc-donut {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rsc-donut-item {
  font-size: 12px;
  color: var(--text-secondary);
}

.rsc-highlight {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rsc-highlight-date {
  font-size: 14px;
  color: rgba(240, 232, 224, 0.88);
}

.rsc-highlight-count {
  font-size: 11px;
  color: var(--text-low);
}

/* 改进建议 */
.review-suggestions {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.rs-list {
  margin: 8px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rs-list li {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}


/* ============================================================
   批量管理工具栏
   ============================================================ */
.batch-toolbar {
  position: relative;
  z-index: 2;
  margin-bottom: 16px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.45);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  animation: reviewFadeIn 0.3s ease-out;
}

.batch-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.batch-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-bright);
  letter-spacing: 0.5px;
}

.batch-count {
  font-size: 11px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 2px 10px;
  border-radius: 999px;
}

.batch-count--empty {
  color: var(--text-low);
  background: rgba(var(--accent-rgb), 0.04);
}

.batch-select-all {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-select-all:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}

.batch-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.3);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.batch-close:hover {
  background: rgba(255, 107, 107, 0.15);
  color: var(--danger);
}

.batch-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.batch-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-action-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

.batch-action-btn--danger {
  border-color: rgba(255, 107, 107, 0.15);
  color: rgba(255, 107, 107, 0.6);
}

.batch-action-btn--danger:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
  color: rgba(255, 107, 107, 0.8);
}

.ba-icon {
  font-size: 13px;
  line-height: 1;
}

.batch-inputs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.batch-input {
  flex: 1;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(32, 28, 24, 0.5);
  color: var(--text-bright);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s;
}

.batch-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.04);
}

.batch-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.batch-confirm {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 107, 107, 0.06);
  border: 1px solid rgba(255, 107, 107, 0.15);
  flex-wrap: wrap;
}

.batch-confirm-text {
  font-size: 12px;
  color: rgba(255, 107, 107, 0.7);
}

.batch-confirm-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 107, 107, 0.3);
  background: rgba(255, 107, 107, 0.1);
  color: rgba(255, 107, 107, 0.8);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-confirm-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.batch-cancel-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-cancel-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
}

.batch-result {
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(90, 184, 160, 0.06);
  border: 1px solid rgba(90, 184, 160, 0.15);
  font-size: 12px;
  color: rgba(90, 184, 160, 0.8);
}

.batch-result--error {
  background: rgba(255, 107, 107, 0.04);
  border-color: rgba(255, 107, 107, 0.12);
  color: rgba(255, 107, 107, 0.7);
}

.batch-result-errors {
  margin: 6px 0 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.batch-result-errors li {
  font-size: 11px;
  color: var(--text-low);
}

/* 批量选择复选框 */
.batch-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid rgba(var(--accent-rgb), 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  background: transparent;
}

.batch-checkbox:hover {
  border-color: rgba(var(--accent-rgb), 0.5);
  background: rgba(var(--accent-rgb), 0.06);
}

.batch-checkbox-mark {
  font-size: 12px;
  color: var(--accent);
  font-weight: 700;
  line-height: 1;
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 860px) {
  .anchor-page { padding: 0 0 72px; }
  .anchor-overview { grid-template-columns: 1fr; }
  .anchor-room-header :deep(.rh-title) { font-size: 26px; letter-spacing: 4px; }
}

@media (max-width: 680px) {
  .anchor-card {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 14px 16px 15px;
  }
  .anchor-main { min-width: min(100%, 0); }
  .anchor-actions {
    width: 100%;
    padding-left: 18px;
    justify-content: flex-start;
    gap: 5px;
    margin-left: 0;
    opacity: 0.72;
  }
  .anchor-action { padding: 3px 8px; font-size: 10px; }
  .anchor-action--done { padding-inline: 10px; }
  .anchor-action--secondary { max-width: 72px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .anchor-del { margin-left: auto; opacity: 0.88; }
}

@media (max-width: 480px) {
  .anchor-page { padding: 0 0 72px; }
  .anchor-room-header :deep(.rh-title) { font-size: 22px; letter-spacing: 3px; }
  .anchor-room-header :deep(.rh-kicker) { font-size: 10px; letter-spacing: 2px; }

  .header-ornament { gap: 6px; margin-bottom: 8px; }
  .orn-line { width: 28px; }

  .anchor-desc { font-size: 12px; }

  .anchor-overview { gap: 6px; }
  .anchor-stat-card { padding: 10px; min-height: 56px; }
  .anchor-stat-value { font-size: 18px; }
  .anchor-stat-label { font-size: 9px; }
  .anchor-stat-note { display: none; }

  .anchor-main { gap: 10px; }

  .anchor-input-row { flex-wrap: wrap; gap: 6px; }
  .anchor-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    box-sizing: border-box;
  }
  .anchor-add-btn {
    width: 100%;
    text-align: center;
    padding: 7px 0;
    font-size: 12px;
  }

  .anchor-card {
    padding: 10px 12px;
    gap: 6px;
  }

  .anchor-checkbox {
    width: 16px;
    height: 16px;
  }

  .anchor-text {
    font-size: 13px;
  }

  .anchor-actions {
    gap: 4px;
    padding-left: 0;
  }

  .anchor-action {
    font-size: 9px;
    padding: 2px 6px;
  }

  .anchor-action--done { padding-inline: 8px; }
  .anchor-action--secondary { max-width: 56px; }

  .pool-surface { gap: 6px; }

  .pool-item {
    padding: 8px 10px;
    min-height: 36px;
  }
  .pool-item-text { font-size: 12px; }
  .pool-item-actions { gap: 3px; }
  .pool-item-btn { font-size: 9px; padding: 2px 6px; }

  .hint-text { font-size: 11px; }
}

/* ============================================================
   深度可视化收口 · 标签趋势 + 时间热力图
   ============================================================ */
.review-visual {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  animation: reviewFadeIn 0.3s ease-out;
}

/* ---- 标签趋势（近7天）---- */
.tt-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 6px;
}

.tt-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tt-tag {
  font-size: 12px;
  color: var(--accent, #d4a574);
  width: 88px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 4px rgba(var(--accent-rgb), 0.08);
}

.tt-track {
  flex: 1;
  height: 7px;
  background: rgba(var(--accent-rgb), 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.tt-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.45), var(--accent, #d4a574));
  transition: width 0.6s ease;
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.12);
}

.tt-count {
  font-size: 11px;
  color: var(--text-low);
  width: 24px;
  text-align: right;
  flex-shrink: 0;
}

/* ---- 时间热力图 ---- */
.heat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(46px, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.heat-cell {
  border-radius: 8px;
  min-height: 48px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.heat-cell:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-rgb), 0.28);
}

.heat-count {
  font-size: 13px;
  font-weight: 600;
}

.heat-label {
  font-size: 9px;
  opacity: 0.72;
  letter-spacing: 0.2px;
}

@media (max-width: 480px) {
  .tt-tag { width: 64px; }
  .heat-grid { grid-template-columns: repeat(auto-fit, minmax(38px, 1fr)); gap: 4px; }
  .heat-cell { min-height: 42px; }
}

</style>