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
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1001,
    // Tauri 要求固定端口：占用即失败而非漂移，否则 tauri.conf.json 的 devUrl
    // 仍指向 1001 而 dev server 静默漂到 1002 → 真机 dev 模式白屏。
    strictPort: true,
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
