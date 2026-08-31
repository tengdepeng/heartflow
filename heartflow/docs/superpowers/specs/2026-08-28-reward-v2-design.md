# 记账功能 V2 设计文档：预算/账户/导出/导入/明细强化

## 背景
记账功能（Reward/劳酬）原有核心能力：收支记录录入 → 月度趋势/类别分布/预算优化/财务预测/周期性收支/财务目标。本次为全维度扩充：多账户 + 预算预警 + 明细标签归档 + 月结单导出 + 官方账单导入，一次性全套实现。

## 设计原则
1. 向后兼容：现有记录的结构兼容（新增字段都是可选，缺省值合法）；现有分析面板默认全账户聚合，无需改动
2. 数据背书复用：对既有「零引用引擎」（milestones.ts / budget-optimizer.ts / useFinanceFilter）直接做 UI 消费，不重复写逻辑
3. 薄委托层：UI 组件只负责展示与事件转发，业务逻辑（纯函数/组合式函数）放 modules/reward，沿用项目已验证的架构
4. 一步一个闸门：每个模块都过四道闸门（vue-tsc / vitest / madge / room-mount）

---

## 1. 数据模型：多账户与转账
### 1.1 现有记录扩展示例
```ts
// src/modules/reward/reward-list.ts  (RewardRecord 定义就地扩展, 不迁移)
// → 原 RewardRecord 基础上增加：
export interface RewardRecord {
  // ... 原有字段保持不变 ...

  /** 归属账户 id，缺省「现金」 */
  account?: string
  /** 导入/转账配对的业务单号，去重用 */
  bizId?: string
  /** 标签列表，用于多维度筛选 */
  tags?: string[]
  /** 是否归档（隐藏到筛选后，仍计入聚合） */
  archived?: boolean
}
```

### 1.2 新增账户/转账持久化
```ts
// src/modules/reward/accounts.ts
export interface Account {
  id: string // 小写 slug，如 "alipay"
  name: string // 显示名，如 "支付宝"
  type: 'cash' | 'bank' | 'savings' | 'alipay' | 'wechat' | 'other'
  icon?: string
  initialBalance: number
  note?: string
}

export interface Transfer {
  id: string
  from: string // 转出账户 id
  to: string   // 转入账户 id
  amount: number
  at: string // ISO 日期
  note?: string
}

// 存储键沿用既有 REWARD_STORAGE_KEYS(见 milestones.ts/reward-bridge.ts)
// 新增 ACCOUNTS / TRANSFERS 两个成员，统一放 REWARD_STORAGE_KEYS
const ACCOUNTS_KEY = REWARD_STORAGE_KEYS.ACCOUNTS
const TRANSFERS_KEY = REWARD_STORAGE_KEYS.TRANSFERS
```

### 1.3 核心能力
- `balance(accountId)`: 计算当前账户余额 = `initialBalance` + Σ该账户收入 − Σ该账户支出 + (Σ转入 − Σ转出)
- `create/update/delete`: 账户管理
- `useAllAccounts`: 响应式读取账户清单，供下拉筛选用

---

## 2. 预算预警面板
### 2.1 数据源
复用 `modules/reward/milestones.ts` 中 `budgets` 持久化与 `budget-optimizer.ts` `computeBudgetVsActual` 对比能力。

### 2.2 UI 能力（BudgetAlertPanel.vue）
- 新增 / 修改 月度/类别预算（金额 + 预警阈值百分比，默认 80%）
- 按预算展示：目标进度条（绿色→黄色→红色，低于 80%/80%-100%/>100%）
- 超支提示：诊断（超支金额，是否主要因单类高频消费）+ 温和建议
- 支持切换口径：「仅支出」vs「支出含转账净流动」（默认为「仅支出」）

### 2.3 挂载：`Reward.vue` → 预算优化区块前，自动刷新当月份

---

## 3. 记账明细强化
### 3.1 标签与归档
- `RewardRecord` 增 `tags[]` / `archived` 字段
- 时间线（记录时间线）每笔卡片：右下角放标签 chip（小浅灰块，点击即筛选该标签）
- 新增「显示归档」复选框，默认隐藏归档记录，点击可查看；「归档」按钮在卡片，点击切换状态不删记录

### 3.2 筛选与排序分页
复用 `finance-analysis.ts` 已有的 `useFinanceFilter`，增强现有筛选区：
- 现有「收支类型/类别」筛选 + 新增「标签筛选」「账户筛选」「归档显示开关」
- 排序下拉：按金额升/降、按时间升/降（默认按时间降，新记账在前）
- 分页控件：每页 n 条（n 可配置，默认 20），显示总条数
- 「清空筛选」一键恢复默认

---

## 4. 月结单与导出
### 4.1 MonthlyStatementPanel.vue
- 年月选择器 + 一键刷新：选好月份展示
  - 总览：收入/支出/净结余/总笔数
  - 类别 TOP5：饼状/条形占位，只做文字排名+占比（未来可升级图表）
  - 账户分布：分账户展示收支金额与占比
  - 预算达成：各预算类别进度与超额状态
- 导出按钮：
  - Markdown 导出：生成精简结构化 md 文本，Blob 下载，可直接复制到笔记
  - CSV 导出：所有当月记录导出为逗号分隔文本，Excel/Numbers/Numbers 可打开
- 挂载：周期性收支面板下方，有记录时显示

---

## 5. 支付宝/微信 CSV 数据导入
### 5.1 设计思想
- 可扩展 CSV 列映射抽象：「第三方映射」→ `mapRow(rawRow: any): ImportRow | null` → 归一化后追加
- 内置：支付宝官方账单 CSV 映射、微信支付账单 CSV 映射，支持扩展第三方

### 5.2 ImportPanel.vue 交互流程
1. 用户选择 CSV 文件（浏览器 `input[type=file]` + 可选拖拽）
2. 读取前几行自动识别来源（支付宝/微信/未知），提示用户确认
3. 解析全量 → 做去重（`bizId` 存在跳过；无 bizId 按 `at+type+amount+note` 哈希去重）→ 预览前 10 条，展示总数、冲突、错误
4. 用户点击「确认导入」→ 批量追加，导入后刷新时间线与面板

### 5.3 数据归属
解析出的记录自动归属到名称为「支付宝」/「微信」的账户 → 如果账户不存在，自动创建并设置初始余额为 `0`。

### 5.4 容错
- CSV 列缺失 → 整行跳过，并提示错误位置
- 金额无法解析 → 整行跳过
- 日期格式不标准 → 尝试多种格式 fallback；仍失败则跳过

---

## 6. 实施顺序与验收
|阶段|任务|产出文件|依赖|闸门|
|---|---|---|---|---|
|1|数据模型升级|`types.ts`(扩展示例) + `accounts.ts`|无|vue-tsc + vitest 单测 + madge + room-mount|
|2|多账户管理 UI|`AccountManagerPanel.vue` + 挂载到 Reward|`accounts.ts`|同上|
|3|预算预警|`BudgetAlertPanel.vue` + 引擎 `budget-alert.ts`|`milestones.ts` + `budget-optimizer.ts`|同上|
|4|明细强化|增强 `Reward.vue` 筛选区 + 时间线卡片增标签归档|`useFinanceFilter`|同上|
|5|月结单+导出|`MonthlyStatementPanel.vue` + `statement.ts`|records/accounts|同上|
|6|数据导入|`ImportPanel.vue` + `importer.ts` + 内置 `alipay/wechat` 映射|records|同上|
|最终|回归|浏览器手动验证全流程 + 所有原记账测试不回归|全|全闸门|

---

## 7. 约束与边界
- 不改变原 `RewardRecord` 必需字段，所有新增字段可选，缺省满足现有功能
- 现有分析（周期性/财务预测/类别分布）默认全账户聚合，**不改动原有分析逻辑**
- 导出仅做客户端 Blob 下载，不上传到任何服务端
- CSV 导入只在客户端解析，不上传，完全隐私安全
- 现有测试（Reward.test.ts、模块单测）不回归
