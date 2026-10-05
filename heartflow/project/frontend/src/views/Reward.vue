<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance rw">
    <!-- 氛围背景层：珍宝殿堂 -->
    <div data-enter class="rw-ambient" aria-hidden="true">
      <div class="rw-glow rw-glow--top"></div>
      <div class="rw-glow rw-glow--bottom"></div>
      <div class="rw-scales-svg" aria-hidden="true">
        <svg viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="1" opacity="0.04">
            <line x1="200" y1="160" x2="200" y2="340" />
            <path d="M160,340 L240,340 L230,360 L170,360 Z" />
            <rect x="190" y="360" width="20" height="20" rx="3" />
            <line x1="100" y1="180" x2="300" y2="180" />
            <circle cx="200" cy="175" r="6" />
            <path d="M100,180 Q80,240 80,300 Q80,310 100,310 L140,310 Q160,310 160,300 Q160,240 140,180" fill="none" />
            <line x1="100" y1="310" x2="100" y2="340" />
            <line x1="140" y1="310" x2="140" y2="340" />
            <line x1="100" y1="340" x2="140" y2="340" />
            <path d="M260,180 Q240,240 240,300 Q240,310 260,310 L300,310 Q320,310 320,300 Q320,240 300,180" fill="none" />
            <line x1="260" y1="310" x2="260" y2="340" />
            <line x1="300" y1="310" x2="300" y2="340" />
            <line x1="260" y1="340" x2="300" y2="340" />
          </g>
          <g stroke="currentColor" stroke-width="0.6" opacity="0.025">
            <line x1="120" y1="180" x2="120" y2="210" />
            <line x1="140" y1="180" x2="140" y2="210" />
            <line x1="260" y1="180" x2="260" y2="210" />
            <line x1="280" y1="180" x2="280" y2="210" />
          </g>
          <g opacity="0.03">
            <circle cx="120" cy="280" r="6" fill="currentColor" />
            <circle cx="140" cy="290" r="5" fill="currentColor" />
            <circle cx="260" cy="285" r="7" fill="currentColor" />
            <circle cx="280" cy="275" r="5" fill="currentColor" />
            <circle cx="130" cy="300" r="4" fill="currentColor" />
            <circle cx="270" cy="300" r="4" fill="currentColor" />
          </g>
          <g opacity="0.015">
            <line x1="200" y1="160" x2="200" y2="100" />
            <line x1="200" y1="160" x2="170" y2="120" />
            <line x1="200" y1="160" x2="230" y2="120" />
            <line x1="200" y1="160" x2="150" y2="140" />
            <line x1="200" y1="160" x2="250" y2="140" />
          </g>
        </svg>
      </div>
      <div class="rw-coin rw-c-1"></div>
      <div class="rw-coin rw-c-2"></div>
      <div class="rw-coin rw-c-3"></div>
      <div class="rw-coin rw-c-4"></div>
      <div class="rw-coin rw-c-5"></div>
      <div class="rw-coin rw-c-6"></div>
    </div>

    <RoomLayout title="劳酬" kicker="工作的价值回报" data-enter>

    <!-- 光质天平 SVG（含粒子光效） -->
    <section data-enter class="rw-balance">
      <div class="rw-balance-anvil">
        <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-anvil-svg">
          <defs>
            <radialGradient id="rw-glow-gold" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#e8c060" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#e8c060" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="rw-glow-red" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#c08080" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#c08080" stop-opacity="0" />
            </radialGradient>
          </defs>

          <!-- 收入方光晕 -->
          <circle cx="60" cy="80" r="30" fill="url(#rw-glow-gold)" :opacity="0.3 + incomeRatio * 0.5" />

          <!-- 支出方光晕 -->
          <circle cx="240" cy="80" r="30" fill="url(#rw-glow-red)" :opacity="0.3 + expenseRatio * 0.5" />

          <!-- 中心光晕 -->
          <circle cx="150" cy="100" r="25" fill="url(#rw-glow-gold)" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
          </circle>

          <!-- 天平主体 -->
          <g :transform="`rotate(${tiltAngle}, 150, 100)`">
            <line x1="50" y1="100" x2="250" y2="100" stroke="currentColor" stroke-width="2" opacity="0.3" />
            <circle cx="150" cy="100" r="5" fill="currentColor" opacity="0.3" />
            <line x1="150" y1="100" x2="150" y2="160" stroke="currentColor" stroke-width="2" opacity="0.3" />
            <g :opacity="0.3 + incomeRatio * 0.5">
              <path d="M50,80 L70,80 L65,100 L55,100 Z" fill="currentColor" />
              <circle cx="60" cy="75" r="4" fill="#e8c060" opacity="0.5" />
            </g>
            <g :opacity="0.3 + expenseRatio * 0.5">
              <path d="M230,80 L250,80 L245,100 L235,100 Z" fill="currentColor" />
              <circle cx="240" cy="75" r="4" fill="#c08080" opacity="0.5" />
            </g>

            <!-- 收入方粒子 -->
            <g v-if="records.length > 0" class="rw-particle-group rw-pg-income">
              <circle class="rw-particle rw-p-1" cx="55" cy="65" r="2" fill="#e8c060" />
              <circle class="rw-particle rw-p-2" cx="65" cy="60" r="1.5" fill="#f0d080" />
              <circle class="rw-particle rw-p-3" cx="50" cy="55" r="1.5" fill="#e8c060" />
              <circle class="rw-particle rw-p-4" cx="60" cy="50" r="1" fill="#f0e0a0" />
              <circle class="rw-particle rw-p-5" cx="70" cy="45" r="1.2" fill="#e8c060" />
            </g>

            <!-- 支出方粒子 -->
            <g v-if="records.length > 0" class="rw-particle-group rw-pg-expense">
              <circle class="rw-particle rw-p-6" cx="235" cy="65" r="2" fill="#c08080" />
              <circle class="rw-particle rw-p-7" cx="245" cy="60" r="1.5" fill="#d0a0a0" />
              <circle class="rw-particle rw-p-8" cx="230" cy="55" r="1.5" fill="#c08080" />
              <circle class="rw-particle rw-p-9" cx="240" cy="50" r="1" fill="#d0b0b0" />
              <circle class="rw-particle rw-p-10" cx="250" cy="45" r="1.2" fill="#c08080" />
            </g>
          </g>

          <!-- 中心发光核心 -->
          <circle cx="150" cy="100" r="3" fill="#e8c060" opacity="0.8">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
            <animate attributeName="r" values="2.5;3.5;2.5" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="150" cy="100" r="8" fill="#e8c060" opacity="0.15">
            <animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    </section>

    <!-- 统计概览 -->
    <section data-enter class="rw-stats">
      <div class="rw-stat">
        <span class="rw-stat-value">{{ records.length }}</span>
        <span class="rw-stat-label">记录数</span>
      </div>
      <div class="rw-stat">
        <span class="rw-stat-value">{{ thisMonthIncome }}</span>
        <span class="rw-stat-label">本月收入</span>
      </div>
      <div class="rw-stat">
        <span class="rw-stat-value">{{ thisMonthExpense }}</span>
        <span class="rw-stat-label">本月支出</span>
      </div>
      <div class="rw-stat">
        <span class="rw-stat-value rw-stat-value--net" :class="netBalanceClass">{{ netBalance }}</span>
        <span class="rw-stat-label">净结余</span>
      </div>
    </section>

    <!-- 工作生涯总结 -->
    <section data-enter class="rw-career-section" v-if="records.length">
      <h3 class="rw-section-label">📋 工作生涯总结</h3>
      <div class="rw-career-summary">
        <div class="rw-career-row">
          <span class="rw-career-label">生涯总览</span>
          <span class="rw-career-value">共 {{ records.length }} 条记录 · 收入 {{ careerStats.totalIncome }} · 支出 {{ careerStats.totalExpense }}</span>
        </div>
        <div class="rw-career-row">
          <span class="rw-career-label">收支比</span>
          <span class="rw-career-value" :class="careerStats.ratioClass">{{ careerStats.ratio }} : 1</span>
        </div>
        <div class="rw-career-row">
          <span class="rw-career-label">日均收入</span>
          <span class="rw-career-value">¥{{ careerStats.avgDailyIncome }}</span>
        </div>
        <div class="rw-career-row">
          <span class="rw-career-label">工作天数</span>
          <span class="rw-career-value">{{ careerStats.workDays }} 天</span>
        </div>
      </div>
    </section>

    <!-- 类别分布 -->
    <section data-enter class="rw-cat-section" v-if="records.length">
      <h3 class="rw-section-label">📊 类别分布</h3>
      <div class="rw-cat-grid">
        <div v-for="c in categoryStats" :key="c.label" class="rw-cat-card">
          <span class="rw-cat-icon">{{ c.icon }}</span>
          <span class="rw-cat-label">{{ c.label }}</span>
          <span class="rw-cat-value">{{ c.total }}</span>
          <div class="rw-cat-bar">
            <div class="rw-cat-bar-fill" :style="{ width: c.percent + '%', background: c.color }"></div>
          </div>
          <span class="rw-cat-count">{{ c.count }}次</span>
        </div>
      </div>
    </section>

    <!-- 月度趋势 -->
    <section data-enter class="rw-trend-section" v-if="records.length">
      <h3 class="rw-section-label">📈 月度趋势</h3>
      <div class="rw-trend-tabs">
        <button
          :class="['rw-trend-tab', 'hf-press', { active: trendType === 'income' }]"
          @click="trendType = 'income'"
        >收入</button>
        <button
          :class="['rw-trend-tab', 'hf-press', { active: trendType === 'expense' }]"
          @click="trendType = 'expense'"
        >支出</button>
        <button
          :class="['rw-trend-tab', 'hf-press', { active: trendType === 'net' }]"
          @click="trendType = 'net'"
        >净结余</button>
      </div>
      <div class="rw-trend-chart">
        <div class="rw-trend-bars">
          <div
            v-for="item in trendData"
            :key="item.month"
            class="rw-trend-bar-wrap"
            :title="`${item.month}: ${item.value}`"
          >
            <div
              class="rw-trend-bar"
              :style="{
                height: trendMax > 0 ? (item.raw / trendMax) * 100 + '%' : '0%',
                background: item.color,
              }"
            />
            <span class="rw-trend-label">{{ item.month.slice(5) }}月</span>
            <span class="rw-trend-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 周期性收支分析（INCR：日/周/月/季/年收支节奏 + 收支对比） -->
    <PeriodicRewardPanel :records="adaptedRecords" />

    <!-- 财务分析（INCR-394 补挂载孤儿组件 FinanceAnalysisPanel：useFinanceFilter 筛选+预设 / usePeriodicAnalysis 周期 / useChartData 图表双 tab，收支记录 筛选·周期·图表看透每一笔） -->
    <FinanceAnalysisPanel :records="records" />

    <!-- 多账户与转账（记账 v2） -->
    <AccountManagerPanel :records="records" @change="accounts.load()" />

    <!-- 周期/重复记账（INCR-22）房租/工资/订阅自动出账 -->
    <RecurringPanel
      :rules="recurringRules"
      :accounts="accountList"
      @create:rule="onCreateRule"
      @update:rule="onUpdateRule"
      @remove:rule="onRemoveRule"
      @apply:rule="onApplyRule"
      @skip:rule="onSkipRule"
    />

    <!-- 预算预警（记账 v2） -->
    <BudgetAlertPanel :records="records" :transfers="transfers" />

    <!-- 预算进阶（INCR-28：总/年度预算 + 日均动态 + 滚动结余） -->
    <BudgetPanel :records="records" :transfers="transfers" />

    <!-- 记账明细（记账 v2）标签/归档/筛选/排序/分页 -->
    <RecordManagerPanel :records="records" @update:records="saveRecords" />

    <!-- 月结单（记账 v2）月度汇总 + Markdown/CSV 导出 -->
    <MonthlyStatementPanel :records="records" />

    <!-- 数据导入（记账 v2）支付宝/微信 CSV -->
    <ImportPanel @import:records="onImportRecords" />

    <!-- 自定义分类（INCR-23）增删改 / 命名 / 配色 / 图标 / 多级层级 -->
    <CustomCategoryPanel
      :categories="customCategories"
      @create="onCreateCategory"
      @update="onUpdateCategory"
      @remove="onRemoveCategory"
    />

    <!-- 自然语言快速记账（INCR-24）一段话智能解析 → 一键入账 -->
    <QuickEntryPanel
      :categories="customCategories"
      :accounts="accountList"
      @commit="onQuickCommit"
    />

    <!-- 借贷/往来（INCR-25）借出借入记录 + 还款/收债状态 + 应收应付净额 -->
    <LoanPanel
      :records="loanRecords"
      :accounts="accountList"
      @create="onLoanCreate"
      @settle="onLoanSettle"
      @remove="onLoanRemove"
    />

    <!-- 信用卡/负债（INCR-26）额度 + 已用/可用 + 还款计划 + 到期提醒 -->
    <CreditCardPanel
      :records="creditCards"
      @create="onCardCreate"
      @repay="onCardRepay"
      @plan="onCardPlan"
      @remove="onCardRemove"
    />

    <!-- 资产负债净资产（INCR-27）资产 − 负债 = 净资产 · 仪表盘 + 趋势 -->
    <NetAssetPanel
      :accounts="accountList"
      :records="records"
      :transfers="transfers"
      :cards="creditCards"
    />

    <!-- 报表可视化（INCR-29）同比环比 + 分类占比/趋势/排行榜 + 年度热力图 -->
    <ReportVisualPanel :records="records" />

    <!-- 存钱计划（INCR-30）攒钱 / 52周挑战 / 心愿 + 每笔存款记录 -->
    <SavingPlanPanel />

    <!-- 每日记账提醒（INCR-30）今日状态 + 连续打卡 + 本月活跃 + 提醒开关 -->
    <HabitReminderPanel :records="records" @focus-form="focusRecordForm" />

    <!-- 日历跨天补账（INCR-30）逐日回填 / 跨天补记 -->
    <BackfillCalendarPanel :records="records" @update:records="saveRecords" />

    <!-- 数据导出（INCR-30）Excel(.xls) / CSV -->
    <ExportPanel :records="records" :accounts="accountList" />

    <!-- 隐私锁（INCR-31 数据安全：主密码守护 + 会话锁定） -->
    <PrivacyLockPanel />

    <!-- 数据加密（INCR-31 数据安全：账本加密备份/恢复） -->
    <EncryptionPanel :records="records" @update:records="saveRecords" />

    <!-- 多币种/汇率（INCR-31 数据扩展：基准币 + 汇率换算） -->
    <CurrencyPanel />

    <!-- 投资持仓收益（INCR-31 数据扩展：市值盈亏/收益率） -->
    <InvestmentPanel />

    <!-- 添加记录 -->
    <section class="rw-form-section">
      <h3 class="rw-section-label">{{ editingRecord ? '✏ 编辑记录' : '➕ 新记录' }}</h3>
      <div class="rw-form">
        <div class="rw-form-row">
          <div class="rw-type-group">
            <button
              :class="['rw-type-btn', 'hf-press', { active: formType === 'income' }]"
              @click="formType = 'income'"
            >📥 收入</button>
            <button
              :class="['rw-type-btn', 'hf-press', { active: formType === 'expense' }]"
              @click="formType = 'expense'"
            >📤 支出</button>
          </div>
          <input v-model.number="formAmount" type="number" min="0" step="0.01" placeholder="数值" class="rw-input rw-input--num" />
        </div>
        <div class="rw-form-row">
          <select v-model="formCategory" class="rw-input rw-select">
            <option value="" disabled>选择类别</option>
            <option v-for="c in formCategories" :key="c.value" :value="c.value">{{ c.icon }} {{ c.label }}</option>
          </select>
        </div>
        <div class="rw-form-row">
          <input v-model="formDesc" placeholder="备注（如：月度项目奖金）" class="rw-input" :maxlength="displayCfg.noteMaxLength" />
        </div>
        <div class="rw-form-row">
          <input v-model="formDate" type="date" class="rw-input rw-input--date" :title="'记账日期（留空记今天：' + todayForHint + '）'" />
          <span class="rw-date-hint">留空记为今天</span>
        </div>
        <div class="rw-form-row rw-form-actions">
          <button v-if="editingRecord" class="rw-btn rw-btn--cancel" @click="cancelEdit">取消</button>
          <button class="rw-btn rw-btn--primary" @click="saveRecord" :disabled="!formValid">
            {{ editingRecord ? '更新' : '记录' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 搜索与筛选 -->
    <div class="rw-filter-bar" v-if="records.length">
      <div class="rw-search-box">
        <input
          v-model="searchQuery"
          class="rw-search-input"
          placeholder="搜索备注、类别或金额…"
        />
      </div>
      <select v-model="filterType" class="rw-filter-select">
        <option value="">全部类型</option>
        <option value="income">收入</option>
        <option value="expense">支出</option>
      </select>
      <select v-model="filterCategory" class="rw-filter-select">
        <option value="">全部类别</option>
        <optgroup label="收入">
          <option v-for="c in filterIncomeOptions" :key="c.value" :value="c.value">{{ c.icon }} {{ c.label }}</option>
        </optgroup>
        <optgroup label="支出">
          <option v-for="c in filterExpenseOptions" :key="c.value" :value="c.value">{{ c.icon }} {{ c.label }}</option>
        </optgroup>
      </select>
    </div>

    <!-- 记录时间线 -->
    <section class="rw-timeline-section" v-if="filteredRecords.length">
      <h3 class="rw-section-label">
        📜 记录时间线
        <span class="rw-timeline-count">{{ filteredRecords.length }} 条</span>
      </h3>
      <div class="rw-timeline">
        <div v-for="r in filteredRecords" :key="r.id" class="rw-timeline-item">
          <div class="rw-timeline-icon" :class="'rw-tl-' + r.type">{{ r.type === 'income' ? '📥' : '📤' }}</div>
          <div class="rw-timeline-card">
            <div class="rw-timeline-header">
              <span class="rw-timeline-cat">{{ categoryLabel(r.category) }}</span>
              <span class="rw-timeline-amount" :class="'rw-tl-amt--' + r.type">{{ r.type === 'income' ? '+' : '-' }}{{ r.amount }}</span>
              <span class="rw-timeline-date">{{ fmt(r.at) }}</span>
            </div>
            <p class="rw-timeline-desc" v-if="r.description">{{ r.description }}</p>
            <div class="rw-timeline-actions">
              <button class="rw-timeline-btn" @click="editRecord(r)">✏</button>
              <button class="rw-timeline-btn rw-timeline-btn--del" @click="deleteRecord(r.id)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 预算优化面板 -->
    <section data-enter class="rw-budget-section" v-if="records.length && budgetReport">
      <h3 class="rw-section-label">📊 预算优化</h3>
      <div class="rw-budget-panel">
        <div class="rw-budget-header">
          <span class="rw-budget-score">综合评分: {{ budgetReport.overallScore }}</span>
          <span class="rw-budget-rate">执行率: {{ Math.round(budgetReport.executionRate * 100) }}%</span>
        </div>
        <p class="rw-budget-summary">{{ budgetReport.summary }}</p>

        <div class="rw-budget-allocations" v-if="budgetReport.allocations.length">
          <h4 class="rw-budget-subtitle">预算分配建议</h4>
          <div class="rw-alloc-grid">
            <div v-for="a in budgetReport.allocations" :key="a.category" class="rw-alloc-card">
              <span class="rw-alloc-label">{{ a.label }}</span>
              <span class="rw-alloc-amount">预算: &yen;{{ a.suggestedAmount }}</span>
              <span class="rw-alloc-spent">上月: &yen;{{ a.lastMonthSpent }}</span>
              <span class="rw-alloc-adj" :class="'rw-alloc-' + a.adjustment">{{ a.reason }}</span>
            </div>
          </div>
        </div>

        <div class="rw-budget-alerts" v-if="budgetReport.alerts.length">
          <h4 class="rw-budget-subtitle">超支预警</h4>
          <div v-for="alert in budgetReport.alerts" :key="alert.id" class="rw-alert-card" :class="'rw-alert-' + alert.severity">
            <span class="rw-alert-label">{{ alert.label }}</span>
            <span class="rw-alert-usage">已用 {{ Math.round(alert.usageRate * 100) }}%</span>
            <span class="rw-alert-suggestion">{{ alert.suggestion }}</span>
          </div>
        </div>

        <div class="rw-savings-strategy" v-if="budgetReport.savingsStrategy">
          <h4 class="rw-budget-subtitle">储蓄策略: {{ budgetReport.savingsStrategy.name }}</h4>
          <p class="rw-savings-desc">{{ budgetReport.savingsStrategy.description }}</p>
          <div class="rw-savings-stats">
            <span>当前储蓄率: {{ Math.round(budgetReport.savingsStrategy.currentRate * 100) }}%</span>
            <span>每月可省: &yen;{{ budgetReport.savingsStrategy.monthlySavable }}</span>
            <span>年度预计: &yen;{{ budgetReport.savingsStrategy.annualProjection }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 财务预测面板 -->
    <section data-enter class="rw-forecast-section" v-if="records.length && financeForecast">
      <h3 class="rw-section-label">🔮 财务预测</h3>
      <div class="rw-forecast-panel">
        <div class="rw-forecast-header">
          <span>预测周期: {{ financeForecast.period.start }} ~ {{ financeForecast.period.end }}</span>
          <span>置信度: {{ Math.round(financeForecast.overallConfidence * 100) }}%</span>
        </div>
        <div class="rw-forecast-trends">
          <span class="rw-forecast-trend">收入趋势: {{ trendLabel(financeForecast.incomeTrend) }}</span>
          <span class="rw-forecast-trend">支出趋势: {{ trendLabel(financeForecast.expenseTrend) }}</span>
        </div>
        <div class="rw-forecast-points">
          <div v-for="dp in financeForecast.dataPoints" :key="dp.month" class="rw-forecast-point">
            <span class="rw-fp-month">{{ dp.month.slice(5) }}月</span>
            <span class="rw-fp-income">收入 &yen;{{ dp.predictedIncome }}</span>
            <span class="rw-fp-expense">支出 &yen;{{ dp.predictedExpense }}</span>
            <span class="rw-fp-net" :class="dp.predictedNet >= 0 ? 'rw-fp-pos' : 'rw-fp-neg'">净 &yen;{{ dp.predictedNet }}</span>
          </div>
        </div>
      </div>

      <div class="rw-health-panel" v-if="financeHealth">
        <h4 class="rw-budget-subtitle">财务健康: {{ healthGradeLabel(financeHealth.grade) }} ({{ financeHealth.overallScore }}分)</h4>
        <div class="rw-health-grid">
          <div v-for="d in financeHealth.details" :key="d.dimension" class="rw-health-card" :class="'rw-health-' + d.status">
            <span class="rw-health-dim">{{ d.dimension }}</span>
            <span class="rw-health-score">{{ d.score }}</span>
            <span class="rw-health-analysis">{{ d.analysis }}</span>
          </div>
        </div>
        <div class="rw-health-findings" v-if="financeHealth.findings.length">
          <h5>关键发现</h5>
          <ul>
            <li v-for="(f, i) in financeHealth.findings" :key="i">{{ f }}</li>
          </ul>
        </div>
        <div class="rw-health-recs" v-if="financeHealth.recommendations.length">
          <h5>改进建议</h5>
          <ul>
            <li v-for="(r, i) in financeHealth.recommendations" :key="i">{{ r }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 财务目标 / 投资 / 健康 / 时间线（reward·finance-goals） -->
    <FinanceGoalsPanel :records="adaptedRecords" />

    <!-- 里程碑（reward·milestones：收入/储蓄率/连续月/品类成就会员，INCR-166） -->
    <RewardMilestonePanel :bridge="rewardBridge.milestones" />

    <!-- 空状态 -->
    <EmptyState
      v-if="!records.length"
      icon="⚖️"
      title="天平静置，尚无记录。"
      hint="衡量的每一次付出与回报，都在这里沉淀"
      :glow="false"
      cta-label=""
    />
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import { useRewardBridge } from '../modules/reward/reward-bridge'
import { useBudgetOptimizer } from '../modules/reward/budget-optimizer'
import { useFinancialForecast } from '../modules/reward/financial-forecast'
import type { RewardRecord as RewardRecordBridge, Budget, RewardStats, IncomeCategory, ExpenseCategory } from '../modules/reward/types'
import { useReward, type RewardRecord } from '../modules/reward/reward-list'
import { useAccounts } from '../modules/reward/accounts'
import FinanceGoalsPanel from '../components/FinanceGoalsPanel.vue'
import RewardMilestonePanel from '../components/RewardMilestonePanel.vue'
import PeriodicRewardPanel from '../components/PeriodicRewardPanel.vue'
import FinanceAnalysisPanel from '../components/FinanceAnalysisPanel.vue'
import AccountManagerPanel from '../components/AccountManagerPanel.vue'
import BudgetAlertPanel from '../components/BudgetAlertPanel.vue'
import BudgetPanel from '../components/BudgetPanel.vue'
import RecordManagerPanel from '../components/RecordManagerPanel.vue'
import MonthlyStatementPanel from '../components/MonthlyStatementPanel.vue'
import ImportPanel from '../components/ImportPanel.vue'
import RecurringPanel from '../components/RecurringPanel.vue'
import CustomCategoryPanel from '../components/CustomCategoryPanel.vue'
import QuickEntryPanel from '../components/QuickEntryPanel.vue'
import LoanPanel from '../components/LoanPanel.vue'
import CreditCardPanel from '../components/CreditCardPanel.vue'
import NetAssetPanel from '../components/NetAssetPanel.vue'
import ReportVisualPanel from '../components/ReportVisualPanel.vue'
import SavingPlanPanel from '../components/SavingPlanPanel.vue'
import HabitReminderPanel from '../components/HabitReminderPanel.vue'
import BackfillCalendarPanel from '../components/BackfillCalendarPanel.vue'
import ExportPanel from '../components/ExportPanel.vue'
import PrivacyLockPanel from '../components/PrivacyLockPanel.vue'
import EncryptionPanel from '../components/EncryptionPanel.vue'
import CurrencyPanel from '../components/CurrencyPanel.vue'
import InvestmentPanel from '../components/InvestmentPanel.vue'
import { dedupe, type ImportRow, type ImportSource } from '../modules/reward/importer'
import { useRecurring, nextOccurrenceAfter, toRecurringDraft, type RecurringRule } from '../modules/reward/recurring'
import { useCustomCategories, categoryOptionsFor, categoryLabelAny, categoryIconAny, categoryColor, type CategoryKind, type CustomCategory } from '../modules/reward/custom-category'
import { quickEntryToRecord, type QuickEntryDraft } from '../modules/reward/nlp-entry'
import { useLoans, type LoanRecord } from '../modules/reward/loan'
import { useCreditCards, type CreditCardRecord } from '../modules/reward/credit-card'
import { getLocalDateKey, getLocalMonthKey } from '../utils/time'
const { entranceRef, entranceClass } = useViewEntrance()
const rewardBridge = useRewardBridge()
const budgetOptimizer = useBudgetOptimizer()
const forecast = useFinancialForecast()
const displayCfg = storage.getConfig().display

const formType = ref<'income' | 'expense'>('income')
const formCategory = ref('')
const formAmount = ref(0)
const formDesc = ref('')
const formDate = ref('')
const editingRecord = ref<RewardRecord | null>(null)
const todayForHint = new Date().toISOString().slice(0, 10)

// 搜索与筛选
const searchQuery = ref('')
const filterType = ref('')
const filterCategory = ref('')
const trendType = ref<'income' | 'expense' | 'net'>('income')

// ---- 自定义分类（INCR-23）：动态分类选项，随用户增删改实时刷新 ----
const customCats = useCustomCategories()
const customCategories = customCats.categories
const formCategories = computed(() => categoryOptionsFor(formType.value))
const filterIncomeOptions = computed(() => categoryOptionsFor('income'))
const filterExpenseOptions = computed(() => categoryOptionsFor('expense'))

function onCreateCategory(data: { name: string; kind: CategoryKind; icon: string; color: string; parentId?: string | null }): void {
  customCats.create(data)
}
function onUpdateCategory(payload: { id: string; patch: Partial<CustomCategory> }): void {
  customCats.update(payload.id, payload.patch)
}
function onRemoveCategory(id: string): void {
  customCats.remove(id)
}

const formValid = computed(() =>
  formCategory.value && formAmount.value > 0
)

const reward = useReward()
const records = reward.records
const accounts = useAccounts()
const transfers = accounts.transfers
const recurring = useRecurring()
const recurringRules = recurring.rules
const loans = useLoans()
const loanRecords = loans.records
const accountList = accounts.accounts

// ---- 周期记账（INCR-22）：建/改/删规则、到期入账或跳过 ----
function onCreateRule(data: Omit<RecurringRule, 'id' | 'nextRunAt'>): void {
  recurring.create(data)
}
function onUpdateRule(payload: { id: string; patch: Partial<RecurringRule> }): void {
  recurring.update(payload.id, payload.patch)
}
function onRemoveRule(id: string): void {
  recurring.remove(id)
}
function onApplyRule(rule: RecurringRule): void {
  const draft = toRecurringDraft(rule, rule.nextRunAt)
  const newRecord: RewardRecord = {
    id: `rec-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: draft.type,
    category: draft.category,
    amount: draft.amount,
    description: draft.description,
    at: new Date(`${draft.at}T12:00:00`).toISOString(),
    account: draft.account,
    bizId: `rec-${rule.id}-${draft.at}`,
  }
  saveRecords([...records.value, newRecord])
  recurring.update(rule.id, { nextRunAt: nextOccurrenceAfter(rule, rule.nextRunAt) })
}
function onSkipRule(rule: RecurringRule): void {
  recurring.update(rule.id, { nextRunAt: nextOccurrenceAfter(rule, rule.nextRunAt) })
}

function saveRecords(list: RewardRecord[]) {
  reward.save(list)
}

// ---- 自然语言快速记账（INCR-24）：草稿 → 一键落库 ----
function onQuickCommit(draft: QuickEntryDraft): void {
  saveRecords([...records.value, quickEntryToRecord(draft)])
}

// ---- 借贷/往来（INCR-25）：借出借入记录 + 还款/收债 ----
function onLoanCreate(data: Omit<LoanRecord, 'id' | 'settlements'>): void {
  loans.create(data)
}
function onLoanSettle(payload: { id: string; amount: number; at: string; note?: string }): void {
  loans.settle(payload.id, payload.amount, payload.at, payload.note)
}
function onLoanRemove(id: string): void {
  loans.remove(id)
}

// ---- 信用卡/负债（INCR-26）：额度 + 还款/还款计划 ----
const creditCardsStore = useCreditCards()
const creditCards = creditCardsStore.records

function onCardCreate(data: Omit<CreditCardRecord, 'id' | 'repayments'>): void {
  creditCardsStore.create(data)
}
function onCardRepay(payload: { id: string; amount: number; at: string; note?: string }): void {
  creditCardsStore.repay(payload.id, payload.amount, payload.at, payload.note)
}
function onCardPlan(payload: { id: string; planMonthly?: number }): void {
  creditCardsStore.updatePlan(payload.id, payload.planMonthly)
}
function onCardRemove(id: string): void {
  creditCardsStore.remove(id)
}

// 导入：去重 → 自动建账户 → 映射为 RewardRecord 持久化
function onImportRecords(rows: ImportRow[], source: ImportSource): void {
  const accName = source === 'alipay' ? '支付宝' : source === 'wechat' ? '微信' : '银联'
  const accType = source === 'alipay' ? 'alipay' : source === 'wechat' ? 'wechat' : 'bank'
  accounts.ensure(accName, accType)
  const fresh = dedupe(records.value, rows)
  if (!fresh.length) return
  const now = Date.now()
  const newRecs: RewardRecord[] = fresh.map((r, i) => ({
    id: `imp-${now}-${i}`,
    type: r.type,
    category: r.category as RewardRecord['category'],
    amount: r.amount,
    description: r.note,
    at: r.at,
    account: accType,
    bizId: r.bizId,
  }))
  reward.save([...records.value, ...newRecs])
}

const totalIncome = computed(() => {
  const sum = records.value.filter(r => r.type === 'income').reduce((a, r) => a + r.amount, 0)
  return sum.toFixed(1)
})
const totalExpense = computed(() => {
  const sum = records.value.filter(r => r.type === 'expense').reduce((a, r) => a + r.amount, 0)
  return sum.toFixed(1)
})
const netBalance = computed(() => {
  const inc = records.value.filter(r => r.type === 'income').reduce((a, r) => a + r.amount, 0)
  const exp = records.value.filter(r => r.type === 'expense').reduce((a, r) => a + r.amount, 0)
  return (inc - exp).toFixed(1)
})
const netBalanceClass = computed(() => {
  const val = parseFloat(netBalance.value)
  if (val > 0) return 'rw-stat-value--pos'
  if (val < 0) return 'rw-stat-value--neg'
  return ''
})

const totalVal = computed(() => parseFloat(totalIncome.value) + parseFloat(totalExpense.value))
const incomeRatio = computed(() => {
  const t = totalVal.value
  return t > 0 ? parseFloat(totalIncome.value) / t : 0.5
})
const expenseRatio = computed(() => {
  const t = totalVal.value
  return t > 0 ? parseFloat(totalExpense.value) / t : 0.5
})
const tiltAngle = computed(() => {
  const diff = incomeRatio.value - expenseRatio.value
  return diff * 15
})

const careerStats = computed(() => {
  const inc = parseFloat(totalIncome.value)
  const exp = parseFloat(totalExpense.value)
  const ratio = exp > 0 ? (inc / exp).toFixed(2) : '∞'
  const ratioClass = parseFloat(ratio as string) >= 1.5 ? 'rw-career-pos' : 'rw-career-neg'
  const uniqueDays = new Set(records.value.map(r => getLocalDateKey(new Date(r.at)))).size
  const avgDaily = uniqueDays > 0 ? (inc / uniqueDays).toFixed(1) : '0'
  return {
    totalIncome: totalIncome.value,
    totalExpense: totalExpense.value,
    ratio,
    ratioClass,
    avgDailyIncome: avgDaily,
    workDays: uniqueDays,
  }
})

const thisMonthIncome = computed(() => {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const sum = records.value.filter(r => r.type === 'income' && r.at.startsWith(ym)).reduce((a, r) => a + r.amount, 0)
  return sum.toFixed(1)
})
const thisMonthExpense = computed(() => {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const sum = records.value.filter(r => r.type === 'expense' && r.at.startsWith(ym)).reduce((a, r) => a + r.amount, 0)
  return sum.toFixed(1)
})

const categoryStats = computed(() => {
  const map = new Map<string, { total: number; count: number; kind: 'income' | 'expense' }>()
  records.value.forEach(r => {
    const entry = map.get(r.category) || { total: 0, count: 0, kind: r.type }
    entry.total += r.amount
    entry.count += 1
    map.set(r.category, entry)
  })
  const maxTotal = Math.max(...Array.from(map.values()).map(v => v.total), 1)
  return Array.from(map.entries())
    .map(([key, val]) => ({
      label: categoryLabelAny(key),
      icon: categoryIconAny(key),
      total: val.total.toFixed(1),
      count: val.count,
      percent: Math.round((val.total / maxTotal) * 100),
      color: categoryColor(val.kind, key),
    }))
    .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
})

// 搜索与筛选计算
const filteredRecords = computed(() => {
  let result = [...records.value]
  // 类型筛选
  if (filterType.value) {
    result = result.filter(r => r.type === filterType.value)
  }
  // 类别筛选
  if (filterCategory.value) {
    result = result.filter(r => r.category === filterCategory.value)
  }
  // 搜索筛选
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      r.description.toLowerCase().includes(q) ||
      categoryLabel(r.category).toLowerCase().includes(q) ||
      String(r.amount).includes(q)
    )
  }
  return result.sort((a, b) => b.at.localeCompare(a.at))
})

// 月度趋势
const trendData = computed(() => {
  const map = new Map<string, { income: number; expense: number }>()
  for (const r of records.value) {
    const m = getLocalMonthKey(r.at)
    const entry = map.get(m) || { income: 0, expense: 0 }
    if (r.type === 'income') entry.income += r.amount
    else entry.expense += r.amount
    map.set(m, entry)
  }
  const months = [...map.keys()].sort().slice(-6)
  return months.map(m => {
    const data = map.get(m)!
    const raw = trendType.value === 'income' ? data.income
      : trendType.value === 'expense' ? data.expense
      : data.income - data.expense
    const prefix = raw >= 0 ? '' : '-'
    const abs = Math.abs(raw)
    const value = abs >= 10000 ? prefix + '¥' + (abs / 10000).toFixed(1) + 'w'
      : prefix + '¥' + abs.toFixed(0)
    const color = trendType.value === 'income' ? '#80c080'
      : trendType.value === 'expense' ? '#c08080'
      : raw >= 0 ? '#80c080' : '#c08080'
    return { month: m, raw: Math.abs(raw), value, color }
  })
})

const trendMax = computed(() => {
  const values = trendData.value.map(t => t.raw)
  return values.length > 0 ? Math.max(...values) : 1
})

// ---- 适配现有 records 为 composable 格式 ----
const adaptedRecords = computed<RewardRecordBridge[]>(() =>
  records.value.map(r => ({
    id: r.id,
    type: r.type,
    category: r.category as IncomeCategory | ExpenseCategory,
    amount: r.amount,
    description: r.description,
    recordedAt: r.at,
    projectId: undefined,
    worklogId: undefined,
  }))
)

// 当记录变化时同步到 rewardBridge
watch(adaptedRecords, (newRecords) => {
  rewardBridge.initialize(newRecords)
}, { immediate: true })

const adaptedStats = computed<RewardStats>(() => {
  const now = new Date()
  const currentMonth = getLocalMonthKey(now)
  const incomeRecords = records.value.filter(r => r.type === 'income')
  const expenseRecords = records.value.filter(r => r.type === 'expense')
  const totalIncome = incomeRecords.reduce((a, r) => a + r.amount, 0)
  const totalExpense = expenseRecords.reduce((a, r) => a + r.amount, 0)
  const monthIncome = incomeRecords.filter(r => getLocalMonthKey(r.at) === currentMonth).reduce((a, r) => a + r.amount, 0)
  const monthExpense = expenseRecords.filter(r => getLocalMonthKey(r.at) === currentMonth).reduce((a, r) => a + r.amount, 0)
  const incomeDistribution: Record<string, number> = {}
  incomeRecords.forEach(r => { incomeDistribution[r.category] = (incomeDistribution[r.category] || 0) + r.amount })
  const expenseDistribution: Record<string, number> = {}
  expenseRecords.forEach(r => { expenseDistribution[r.category] = (expenseDistribution[r.category] || 0) + r.amount })
  const monthlyTrend: { month: string; income: number; expense: number; balance: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = getLocalMonthKey(d)
    const mi = incomeRecords.filter(r => getLocalMonthKey(r.at) === m).reduce((a, r) => a + r.amount, 0)
    const me = expenseRecords.filter(r => getLocalMonthKey(r.at) === m).reduce((a, r) => a + r.amount, 0)
    monthlyTrend.push({ month: m, income: mi, expense: me, balance: mi - me })
  }
  const uniqueDays = new Set(records.value.map(r => getLocalDateKey(new Date(r.at)))).size
  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    recordCount: records.value.length,
    monthIncome,
    monthExpense,
    monthBalance: monthIncome - monthExpense,
    savingsRate: monthIncome > 0 ? Math.round((monthIncome - monthExpense) / monthIncome * 100) : 0,
    incomeDistribution,
    expenseDistribution,
    monthlyTrend,
    career: {
      totalIncome, totalExpense,
      totalBalance: totalIncome - totalExpense,
      workingDays: uniqueDays,
      avgDailyIncome: uniqueDays > 0 ? Math.round(totalIncome / uniqueDays) : 0,
      incomeExpenseRatio: totalExpense > 0 ? Math.round(totalIncome / totalExpense * 100) / 100 : 0,
    },
  }
})

// ---- 预算优化报告 ----
const budgetReport = computed(() => {
  if (adaptedRecords.value.length === 0) return null
  const stats = adaptedStats.value
  const budgets: Budget[] = []
  const totalBudget = stats.totalIncome > 0 ? stats.totalIncome * 0.7 : stats.totalExpense * 1.1
  return budgetOptimizer.generateReport(adaptedRecords.value, stats, budgets, totalBudget)
})

// ---- 财务预测 ----
const financeForecast = computed(() => {
  if (adaptedRecords.value.length < 5) return null
  return forecast.predictFinances(adaptedRecords.value)
})

// ---- 财务健康检查 ----
const financeHealth = computed(() => {
  if (adaptedRecords.value.length < 5) return null
  return forecast.checkFinanceHealth(adaptedRecords.value, adaptedStats.value)
})

// ---- 标签辅助函数 ----
function trendLabel(trend: string) {
  const map: Record<string, string> = { rising: '上升', falling: '下降', stable: '稳定' }
  return map[trend] || trend
}

function healthGradeLabel(grade: string) {
  const map: Record<string, string> = { excellent: '优秀', good: '良好', fair: '一般', poor: '较差' }
  return map[grade] || grade
}

function categoryLabel(cat: string) {
  return categoryLabelAny(cat)
}

function saveRecord() {
  const base = formDate.value ? new Date(`${formDate.value}T12:00:00`) : new Date()
  const now = base.toISOString()
  if (editingRecord.value) {
    const list = records.value.map(r =>
      r.id === editingRecord.value!.id
        ? { ...r, type: formType.value, category: formCategory.value, amount: formAmount.value, description: formDesc.value.trim(), at: now }
        : r
    )
    saveRecords(list)
    cancelEdit()
  } else {
    const newRecord: RewardRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: formType.value,
      category: formCategory.value,
      amount: formAmount.value,
      description: formDesc.value.trim(),
      at: now,
    }
    saveRecords([...records.value, newRecord])
    formCategory.value = ''
    formAmount.value = 0
    formDesc.value = ''
    formDate.value = ''
  }
}

function editRecord(r: RewardRecord) {
  editingRecord.value = r
  formType.value = r.type
  formCategory.value = r.category
  formAmount.value = r.amount
  formDesc.value = r.description
  formDate.value = r.at.slice(0, 10)
}

// 记账提醒面板「现在记一笔」滚动到新增记录表单
function focusRecordForm() {
  entranceRef.value?.querySelector('.rw-form-section')?.scrollIntoView({ behavior: 'smooth' })
}

function cancelEdit() {
  editingRecord.value = null
  formType.value = 'income'
  formCategory.value = ''
  formAmount.value = 0
  formDesc.value = ''
  formDate.value = ''
}

function deleteRecord(id: string) {
  saveRecords(records.value.filter(r => r.id !== id))
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
/* =========================================================
   Treasure Hall / Scales of Value Theme — 劳酬 (Reward)
   Color: #e8c060 | Golden amber
   ========================================================= */
:root { --rw-accent: #e8c060; --rw-bg: #0a0906; }

/* ---- Root ---- */
.rw {
  max-width: 640px; margin: 0 auto;
  background: transparent;
  position: relative; overflow: hidden;
}

/* ---- Ambient ---- */
.rw-ambient {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.rw-glow {
  position: absolute; border-radius: 50%; pointer-events: none;
}
.rw-glow--top {
  top: -10%; left: 50%; transform: translateX(-50%);
  width: 600px; height: 500px;
  background: radial-gradient(ellipse, rgba(232,192,96,0.08) 0%, transparent 70%);
}
.rw-glow--bottom {
  bottom: -10%; right: -10%;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(232,192,96,0.05) 0%, transparent 70%);
}
.rw-scales-svg {
  position: absolute; bottom: 5%; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 400px; height: 70%;
  color: var(--rw-accent); opacity: 0.6;
}
.rw-scales-svg svg { width: 100%; height: 100%; }

/* Floating coin particles */
.rw-coin {
  position: absolute; width: 6px; height: 6px; border-radius: 50%;
  background: var(--rw-accent); opacity: 0;
}
.rw-c-1 { left: 20%; top: 25%; animation: float-coin 13s ease-in-out infinite; }
.rw-c-2 { left: 50%; top: 15%; animation: float-coin 15s ease-in-out infinite 4s; }
.rw-c-3 { left: 75%; top: 30%; animation: float-coin 14s ease-in-out infinite 7s; }
.rw-c-4 { left: 30%; top: 50%; animation: float-coin 12s ease-in-out infinite 2s; }
.rw-c-5 { left: 60%; top: 55%; animation: float-coin 16s ease-in-out infinite 5s; }
.rw-c-6 { left: 85%; top: 40%; animation: float-coin 11s ease-in-out infinite 8s; }
@keyframes float-coin {
  0%, 100% { transform: translateY(0) scale(0) rotate(0deg); opacity: 0; }
  20% { opacity: 0.1; }
  50% { transform: translateY(-90px) scale(1.2) rotate(180deg); opacity: 0.18; }
  70% { opacity: 0.06; }
}

/* ---- Balance ---- */
.rw-balance {
  display: flex; align-items: center; justify-content: center; gap: 20px;
  margin-bottom: 20px; position: relative; z-index: 1;
}
.rw-balance-side {
  text-align: center; padding: 16px 24px;
  background: rgba(232,192,96,0.04); border-radius: 14px;
  border: 1px solid rgba(232,192,96,0.08); flex: 1;
}
.rw-balance-icon { display: block; font-size: 18px; margin-bottom: 4px; }
.rw-balance-value {
  display: block; font-size: 20px; font-weight: 600; color: var(--rw-accent);
}
.rw-balance--right .rw-balance-value { color: rgba(232,192,96,0.6); }
.rw-balance-label { display: block; font-size: 11px; color: rgba(232, 192, 96, 0.55); margin-top: 2px; }
.rw-balance-divider {
  display: flex; align-items: center; justify-content: center;
}
.rw-balance-vs { font-size: 14px; color: rgba(232,192,96,0.2); font-weight: 300; }

/* ---- Stats ---- */
.rw-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-stat {
  text-align: center; padding: 12px 8px;
  background: rgba(232,192,96,0.04); border-radius: 12px;
  border: 1px solid rgba(232,192,96,0.08);
}
.rw-stat-value { display: block; font-size: 18px; font-weight: 600; color: var(--rw-accent); }
.rw-stat-value--pos { color: #80c080; }
.rw-stat-value--neg { color: #c08080; }
.rw-stat-label { display: block; font-size: 11px; color: rgba(232,192,96,0.5); margin-top: 4px; }

/* ---- Section label ---- */
.rw-section-label {
  font-size: 13px; font-weight: 500; color: rgba(232,192,96,0.6);
  letter-spacing: 1px; margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px;
}

/* ---- Category section ---- */
.rw-cat-section {
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-cat-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}
.rw-cat-card {
  padding: 12px; border-radius: 10px;
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.06);
  display: flex; flex-direction: column; gap: 4px;
}
.rw-cat-icon { font-size: 16px; }
.rw-cat-label { font-size: 11px; color: rgba(232,192,96,0.5); }
.rw-cat-value { font-size: 15px; font-weight: 600; color: var(--rw-accent); }
.rw-cat-bar {
  height: 4px; border-radius: 2px; background: rgba(232,192,96,0.06); overflow: hidden;
}
.rw-cat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.rw-cat-count { font-size: 10px; color: rgba(232, 192, 96, 0.5); }

/* ---- Form ---- */
.rw-form-section {
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-form {
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.08);
  border-radius: 14px; padding: 18px;
}
.rw-form-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.rw-form-row:last-child { margin-bottom: 0; }
.rw-input {
  flex: 1; padding: 8px 12px; font-size: 13px; border: 1px solid rgba(232,192,96,0.12);
  border-radius: 8px; background: rgba(232,192,96,0.03); color: rgba(var(--text-primary-rgb), 0.85);
  outline: none; font-family: inherit;
}
.rw-input:focus { border-color: rgba(232,192,96,0.3); }
.rw-input::placeholder { color: rgba(232,192,96,0.2); }
.rw-input--num { width: 80px; flex: none; text-align: center; }
.rw-input--date { flex: none; width: 150px; color-scheme: dark; }
.rw-date-hint { font-size: 11px; color: rgba(232, 192, 96, 0.5); white-space: nowrap; }
.rw-select { appearance: none; cursor: pointer; }
.rw-select option { background: #0a0906; color: rgba(var(--text-primary-rgb), 0.85); }

.rw-type-group {
  display: flex; gap: 4px;
}
.rw-type-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(232,192,96,0.1);
  background: transparent; color: rgba(232,192,96,0.3); font-size: 12px; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
}
.rw-type-btn.active {
  background: rgba(232,192,96,0.12); color: var(--rw-accent); border-color: rgba(232,192,96,0.25);
}
.rw-type-btn:hover { border-color: rgba(232,192,96,0.25); }

.rw-form-actions { justify-content: flex-end; gap: 8px; }
.rw-btn {
  padding: 7px 18px; border-radius: 8px; font-size: 13px; cursor: pointer;
  border: 1px solid transparent; font-family: inherit; transition: all 0.2s;
}
.rw-btn--primary {
  background: rgba(232,192,96,0.15); color: var(--rw-accent); border-color: rgba(232,192,96,0.25);
}
.rw-btn--primary:hover:not(:disabled) { background: rgba(232,192,96,0.25); }
.rw-btn--primary:disabled { opacity: 0.3; cursor: not-allowed; }
.rw-btn--cancel {
  background: transparent; color: rgba(232,192,96,0.4); border-color: rgba(232,192,96,0.1);
}
.rw-btn--cancel:hover { border-color: rgba(232,192,96,0.25); }

/* ---- Timeline ---- */
.rw-timeline-section {
  margin-bottom: 28px; position: relative; z-index: 1;
}
.rw-timeline-count { font-size: 11px; color: rgba(232, 192, 96, 0.5); font-weight: 400; }
.rw-timeline {
  display: flex; flex-direction: column; gap: 10px;
}
.rw-timeline-item {
  display: flex; gap: 12px; align-items: flex-start;
}
.rw-timeline-icon {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; margin-top: 2px;
  border: 1px solid rgba(232,192,96,0.1);
}
.rw-tl-income { background: rgba(128,192,128,0.08); border-color: rgba(128,192,128,0.15); }
.rw-tl-expense { background: rgba(192,128,128,0.08); border-color: rgba(192,128,128,0.15); }
.rw-timeline-card {
  flex: 1; background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.06);
  border-radius: 10px; padding: 10px 14px;
}
.rw-timeline-header {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.rw-timeline-cat { font-size: 11px; font-weight: 500; color: var(--rw-accent); }
.rw-timeline-amount { font-size: 14px; font-weight: 600; }
.rw-tl-amt--income { color: #80c080; }
.rw-tl-amt--expense { color: #c08080; }
.rw-timeline-date {
  margin-left: auto; font-size: 11px; color: rgba(232, 192, 96, 0.5);
}
.rw-timeline-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 4px 0 0; }
.rw-timeline-actions {
  display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end;
}
.rw-timeline-btn {
  width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(232,192,96,0.08);
  background: transparent; color: rgba(232, 192, 96, 0.5); font-size: 11px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.rw-timeline-btn:hover { border-color: rgba(232,192,96,0.25); color: var(--rw-accent); }
.rw-timeline-btn--del:hover { border-color: rgba(200,80,60,0.3); color: #c8503c; }

/* ---- Trend section ---- */
.rw-trend-section {
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-trend-tabs {
  display: flex; gap: 4px; margin-bottom: 12px;
}
.rw-trend-tab {
  padding: 4px 14px; border-radius: 8px; border: 1px solid rgba(232,192,96,0.1);
  background: transparent; color: rgba(232,192,96,0.3); font-size: 12px; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
}
.rw-trend-tab.active {
  background: rgba(232,192,96,0.12); color: var(--rw-accent); border-color: rgba(232,192,96,0.25);
}
.rw-trend-tab:hover { border-color: rgba(232,192,96,0.25); }
.rw-trend-chart {
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.06);
  border-radius: 12px; padding: 16px;
}
.rw-trend-bars {
  display: flex; align-items: flex-end; gap: 8px; height: 120px;
}
.rw-trend-bar-wrap {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end;
}
.rw-trend-bar {
  width: 100%; max-width: 40px; border-radius: 4px 4px 0 0; transition: height 0.4s ease; min-height: 4px;
}
.rw-trend-label { font-size: 10px; color: rgba(232, 192, 96, 0.5); }
.rw-trend-value { font-size: 10px; color: rgba(232,192,96,0.5); }

/* ---- Filter bar ---- */
.rw-filter-bar {
  display: flex; gap: 8px; align-items: center; margin-bottom: 16px; position: relative; z-index: 1; flex-wrap: wrap;
}
.rw-search-box { flex: 1; min-width: 140px; }
.rw-search-input {
  width: 100%; padding: 6px 12px; border: 1px solid rgba(232,192,96,0.1);
  border-radius: 8px; background: rgba(232,192,96,0.03); color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 12px; font-family: inherit; outline: none; box-sizing: border-box;
}
.rw-search-input:focus { border-color: rgba(232,192,96,0.25); }
.rw-search-input::placeholder { color: rgba(232,192,96,0.2); }
.rw-filter-select {
  padding: 6px 10px; border: 1px solid rgba(232,192,96,0.1); border-radius: 8px;
  background: rgba(232,192,96,0.03); color: var(--text-bright); font-size: 12px;
  font-family: inherit; outline: none; cursor: pointer; appearance: none;
}
.rw-filter-select:focus { border-color: rgba(232,192,96,0.25); }
.rw-filter-select option { background: #0a0906; color: rgba(var(--text-primary-rgb), 0.85); }

/* ---- Budget Optimization ---- */
.rw-budget-section {
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-budget-panel {
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.08);
  border-radius: 14px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.rw-budget-header {
  display: flex; justify-content: space-between; align-items: center;
}
.rw-budget-score {
  font-size: 14px; font-weight: 600; color: var(--rw-accent);
}
.rw-budget-rate {
  font-size: 12px; color: rgba(232,192,96,0.5);
}
.rw-budget-summary {
  font-size: 12px; color: rgba(232,192,96,0.5); line-height: 1.6; margin: 0;
}
.rw-budget-subtitle {
  font-size: 12px; font-weight: 500; color: rgba(232,192,96,0.6);
  margin: 0 0 8px 0;
}
.rw-budget-allocations {
  margin-top: 4px;
}
.rw-alloc-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}
.rw-alloc-card {
  padding: 10px; border-radius: 10px;
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.06);
  display: flex; flex-direction: column; gap: 3px;
}
.rw-alloc-label { font-size: 12px; font-weight: 500; color: var(--rw-accent); }
.rw-alloc-amount { font-size: 13px; font-weight: 600; color: #80c080; }
.rw-alloc-spent { font-size: 11px; color: rgba(232,192,96,0.4); }
.rw-alloc-adj { font-size: 10px; line-height: 1.4; }
.rw-alloc-increase { color: #c08080; }
.rw-alloc-decrease { color: #80c080; }
.rw-alloc-maintain { color: rgba(232,192,96,0.5); }

.rw-budget-alerts {
  margin-top: 4px;
}
.rw-alert-card {
  padding: 8px 12px; border-radius: 8px; margin-bottom: 6px;
  display: flex; flex-direction: column; gap: 2px;
  border: 1px solid transparent;
}
.rw-alert-info { background: rgba(128,160,192,0.06); border-color: rgba(128,160,192,0.12); }
.rw-alert-warning { background: rgba(232,192,96,0.06); border-color: rgba(232,192,96,0.15); }
.rw-alert-critical { background: rgba(192,128,128,0.06); border-color: rgba(192,128,128,0.15); }
.rw-alert-label { font-size: 12px; font-weight: 500; color: var(--rw-accent); }
.rw-alert-usage { font-size: 11px; color: rgba(232,192,96,0.5); }
.rw-alert-suggestion { font-size: 11px; color: rgba(232,192,96,0.4); }

.rw-savings-strategy {
  margin-top: 4px;
}
.rw-savings-desc {
  font-size: 12px; color: rgba(232,192,96,0.5); line-height: 1.6; margin: 0 0 8px;
}
.rw-savings-stats {
  display: flex; gap: 16px; flex-wrap: wrap;
  font-size: 11px; color: rgba(232,192,96,0.5);
}

/* ---- Financial Forecast ---- */
.rw-forecast-section {
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-forecast-panel {
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.08);
  border-radius: 14px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.rw-forecast-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: rgba(232,192,96,0.5);
}
.rw-forecast-trends {
  display: flex; gap: 16px;
}
.rw-forecast-trend {
  font-size: 12px; color: rgba(232,192,96,0.5);
  padding: 4px 10px; border-radius: 6px;
  background: rgba(232,192,96,0.04); border: 1px solid rgba(232,192,96,0.08);
}
.rw-forecast-points {
  display: flex; gap: 8px;
}
.rw-forecast-point {
  flex: 1; text-align: center; padding: 10px 6px;
  border-radius: 10px;
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.06);
  display: flex; flex-direction: column; gap: 3px;
}
.rw-fp-month { font-size: 11px; font-weight: 500; color: var(--rw-accent); }
.rw-fp-income { font-size: 11px; color: #80c080; }
.rw-fp-expense { font-size: 11px; color: #c08080; }
.rw-fp-net { font-size: 12px; font-weight: 600; }
.rw-fp-pos { color: #80c080; }
.rw-fp-neg { color: #c08080; }

/* ---- Finance Health ---- */
.rw-health-panel {
  margin-top: 12px;
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.08);
  border-radius: 14px; padding: 16px 18px;
}
.rw-health-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
  margin-top: 8px;
}
.rw-health-card {
  padding: 10px; border-radius: 10px;
  border: 1px solid transparent;
  display: flex; flex-direction: column; gap: 3px;
}
.rw-health-good { background: rgba(128,192,128,0.06); border-color: rgba(128,192,128,0.12); }
.rw-health-warning { background: rgba(232,192,96,0.06); border-color: rgba(232,192,96,0.15); }
.rw-health-danger { background: rgba(192,128,128,0.06); border-color: rgba(192,128,128,0.15); }
.rw-health-dim { font-size: 12px; font-weight: 500; color: var(--rw-accent); }
.rw-health-score { font-size: 18px; font-weight: 600; color: var(--rw-accent); }
.rw-health-analysis { font-size: 10px; color: rgba(232,192,96,0.4); line-height: 1.4; }
.rw-health-findings, .rw-health-recs {
  margin-top: 10px;
}
.rw-health-findings h5, .rw-health-recs h5 {
  font-size: 11px; font-weight: 500; color: rgba(232,192,96,0.5); margin: 0 0 4px;
}
.rw-health-findings ul, .rw-health-recs ul {
  margin: 0; padding-left: 18px;
  font-size: 11px; color: rgba(232,192,96,0.4); line-height: 1.7;
}
.rw-health-findings ul li, .rw-health-recs ul li { margin-bottom: 2px; }


/* ---- Balance SVG ---- */
.rw-balance-anvil {
  display: flex; justify-content: center; align-items: center;
  padding: 12px 0; margin-bottom: 8px; position: relative; z-index: 1;
}
.rw-anvil-svg {
  width: 100%; max-width: 260px; height: auto;
  color: var(--rw-accent);
}

/* ---- Balance particles ---- */
.rw-particle-group {
  opacity: 0.6;
}
.rw-pg-income .rw-particle {
  animation: particle-float-gold 3s ease-in-out infinite;
}
.rw-pg-expense .rw-particle {
  animation: particle-float-red 3.5s ease-in-out infinite;
}
.rw-p-1 { animation-delay: 0s; }
.rw-p-2 { animation-delay: 0.4s; }
.rw-p-3 { animation-delay: 0.8s; }
.rw-p-4 { animation-delay: 1.2s; }
.rw-p-5 { animation-delay: 1.6s; }
.rw-p-6 { animation-delay: 0.2s; }
.rw-p-7 { animation-delay: 0.6s; }
.rw-p-8 { animation-delay: 1.0s; }
.rw-p-9 { animation-delay: 1.4s; }
.rw-p-10 { animation-delay: 1.8s; }

@keyframes particle-float-gold {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
  25% {
    transform: translate(-3px, -8px) scale(1.2);
    opacity: 0.9;
  }
  50% {
    transform: translate(2px, -14px) scale(0.8);
    opacity: 0.4;
  }
  75% {
    transform: translate(-2px, -6px) scale(1.1);
    opacity: 0.7;
  }
}
@keyframes particle-float-red {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
  25% {
    transform: translate(3px, -7px) scale(1.1);
    opacity: 0.8;
  }
  50% {
    transform: translate(-2px, -12px) scale(0.7);
    opacity: 0.3;
  }
  75% {
    transform: translate(2px, -5px) scale(1);
    opacity: 0.6;
  }
}

/* ---- Career section ---- */
.rw-career-section {
  margin-bottom: 24px; position: relative; z-index: 1;
}
.rw-career-summary {
  background: rgba(232,192,96,0.03); border: 1px solid rgba(232,192,96,0.08);
  border-radius: 14px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 10px;
}
.rw-career-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-bottom: 1px solid rgba(232,192,96,0.04);
}
.rw-career-row:last-child { border-bottom: none; }
.rw-career-label {
  font-size: 12px; color: rgba(232,192,96,0.5);
}
.rw-career-value {
  font-size: 13px; font-weight: 600; color: var(--rw-accent);
}
.rw-career-pos { color: #80c080; }
.rw-career-neg { color: #c08080; }

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .rw-balance { gap: 10px; }
  .rw-balance-side { padding: 12px 16px; }
  .rw-stats { grid-template-columns: repeat(2, 1fr); }
  .rw-cat-grid { grid-template-columns: 1fr; }
  .rw-form-row { flex-direction: column; align-items: stretch; }
  .rw-type-group { justify-content: center; }
  .rw-filter-bar { flex-direction: column; align-items: stretch; }
  .rw-filter-select { width: 100%; }
  .rw-trend-bars { height: 100px; }
}
:deep(.room-layout){position:relative;z-index:1}
</style>