# 贡献指南

感谢你考虑为心流工坊贡献代码、想法或反馈！这个项目因社区而变得更好，我们欢迎任何形式的贡献。

---

## 行为准则

本项目采用 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。我们希望所有参与者都能够：

- 保持友善与尊重
- 接纳建设性批评
- 关注对社区最有利的事情
- 对其他贡献者保持同理心

不可接受的行为包括但不限于：人身攻击、骚扰性言论、发布他人隐私信息等。

---

## 如何报告问题

如果你发现了 Bug、有功能建议或想讨论某个设计决策，请通过 GitHub Issues 提交。

### Issue 模板引导

请尽可能提供以下信息：

**Bug 报告：**
- 问题描述（发生了什么 vs 期望行为）
- 复现步骤（越详细越好）
- 运行环境（操作系统、浏览器版本、Node.js 版本）
- 截图或日志（如有）

**功能建议：**
- 你的使用场景
- 你期望的解决方案
- 是否有类似功能的参考

---

## 如何提交 PR

### 工作流程

1. **Fork 本仓库** — 点击 GitHub 页面右上角的 Fork 按钮
2. **创建特性分支** — 从 `main` 分支创建，命名建议：
   - `feat/xxx` — 新功能
   - `fix/xxx` — Bug 修复
   - `refactor/xxx` — 重构
   - `docs/xxx` — 文档更新
3. **提交代码** — 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
4. **确保测试通过** — 提交前运行 `npm test`，确保所有测试通过
5. **发起 Pull Request** — 描述你的改动内容和动机

### Commit 信息规范

```
<type>: <简短描述>

<可选详细描述>
```

类型参考：`feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `style`

---

## 开发环境设置

### 前置依赖

- Node.js >= 18
- pnpm 或 npm
- Git
- （可选）Rust 工具链 — 用于 Tauri 桌面端开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-org/heartflow.git
cd heartflow

# 进入前端目录
cd project/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

---

## 代码规范

### TypeScript

- 启用 `strict` 模式
- 禁止使用 `any` 类型（如有必要，使用 `unknown` 替代）
- 函数和复杂类型必须有明确的类型注解
- 优先使用 `interface` 而非 `type` 定义对象类型

### Vue 3

- 使用 Composition API（`<script setup>` 语法）
- 组件命名使用 PascalCase
- 模板使用 kebab-case 调用组件
- 避免在组件中直接操作存储（使用 composable 或 store 代理）

### Pinia Store

- 每个 Store 文件一个独立功能
- Store 命名使用 `useXxxStore` 模式
- State 优先使用强类型接口
- Getter 仅用于派生状态，复杂逻辑放在 Action 中

### 测试

- 遵循 **TDD** 原则（先写测试，后写实现）
- 测试文件与被测文件同目录，命名 `*.test.ts`
- 使用 `describe` / `it` / `expect` 组织测试用例
- 确保测试独立可重复运行，不依赖外部状态

### 代码风格

- 缩进使用 2 个空格
- 行尾使用 LF
- 文件末尾保留一个空行
- 使用 `ESLint` 和 `Prettier`（配置见项目根目录）

---

## 测试要求

在提交代码前，请确保：

1. **所有已有测试通过**：`npm test`
2. **新功能包含对应测试**：新模块或新函数必须附带单元测试
3. **测试覆盖率不应下降**：核心逻辑的测试覆盖率目标为 80%+

---

## 其他

- 如有重大改动，请先提交 Issue 进行讨论
- 大型重构建议分多个 PR 提交，便于 review
- 欢迎提交文档改进、拼写修正等小改动

再次感谢你的贡献！