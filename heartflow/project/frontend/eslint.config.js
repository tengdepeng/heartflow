// ESLint 扁平配置（ESLint 9）
// 仅落地「命名规范」防护网（warn 级），不引入会阻塞既有代码的全量规则集。
// .vue 文件暂不扫描（组件命名已 100% PascalCase，合规；如需扫描需引入 vue-eslint-parser）。
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'src-tauri',
      'scripts/benchmark',
      '**/*.vue',
      '**/*.d.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    // 显式注册插件，否则 @typescript-eslint/* 规则无法解析
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        // 接口强制 I 前缀（遗留代码将产生 warn，P2/P3 阶段逐步整改）
        { selector: 'interface', format: ['PascalCase'], custom: { match: true, regex: '^I[A-Z]' } },
        // 类型别名强制 T 前缀
        { selector: 'typeAlias', format: ['PascalCase'], custom: { match: true, regex: '^T[A-Z]' } },
        // 枚举强制 E 前缀
        { selector: 'enum', format: ['PascalCase'], custom: { match: true, regex: '^E[A-Z]' } },
        // 函数 / 变量 / 参数保持 camelCase
        { selector: 'function', format: ['camelCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'parameter', format: ['camelCase'] },
        { selector: 'class', format: ['PascalCase'] },
      ],
    },
  },
)
