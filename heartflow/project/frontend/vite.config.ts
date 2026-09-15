/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. 基础端口 1001；被占用时自动顺延（1002 → 1003 → …），不再硬失败。
  //    Tauri 链路走 scripts/tauri-dev.mjs + find-port.mjs 先行探测，再用 --port 显式传入并回写 devUrl，
  //    所以关掉 strictPort 不影响 tauri dev。需要改起点时用 VITE_DEV_PORT。
  server: {
    port: Number(process.env.VITE_DEV_PORT) || 1001,
    strictPort: false,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching the backend directory
      ignored: ["**/project/backend/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,js}"],
    testTimeout: 15000,
    // 274 个测试文件，forks 池每文件孵化新进程 + 重导整模块图，轻文件累积开销巨大。
    // 改用 threads 持久线程池（Vitest 4 起 pool 选项提升到顶层），消除每文件进程孵化开销，
    // 显著压缩全量墙钟时间。注意：Vitest 4 已移除 test.poolOptions，maxThreads/minThreads 须置于顶层。
    pool: "threads",
    maxThreads: 16,
    minThreads: 4,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/__tests__/**",
        "src/types/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 45,
        lines: 50,
      },
    },
  },
}));
