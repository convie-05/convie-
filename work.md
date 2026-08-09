# Convie记账本 - 开发工作文档

## 项目状态

### ✅ 已完成

| 模块 | 文件 | 说明 |
|------|------|------|
| 产品文档 | `CLAUDE.md` | 完整的产品定义、技术栈、分类体系、架构决策、开发规则 |
| 项目配置 | `package.json` | 依赖配置（npm），脚本，electron-builder 配置 |
| 项目配置 | `electron.vite.config.ts` | Vite + Electron 构建配置 |
| 项目配置 | `tsconfig.json` + `tsconfig.node.json` | TypeScript 严格模式配置 |
| 数据库层 | `src/main/database.ts` | SQLite 初始化（sql.js），建表，种子数据（9个一级+41个二级分类） |
| 主进程 | `src/main/index.ts` | Electron 窗口创建，生命周期管理 |
| IPC 通信 | `src/main/ipc-handlers.ts` | 所有 IPC 通道（分类CRUD / 支出CRUD / 统计查询 / 导出） |
| 预加载 | `src/preload/index.ts` | contextBridge 安全桥接 |
| 渲染入口 | `src/renderer/index.html` + `main.tsx` | HTML 入口，React 根挂载 |
| 全局样式 | `src/renderer/src/styles/global.css` | 全局 CSS 样式 |
| 根组件 | `src/renderer/src/App.tsx` | 路由配置 + Ant Design 主题 |
| 布局组件 | `src/renderer/src/components/Layout/AppLayout.tsx` | 侧边栏导航布局 |
| 类型定义 | `src/renderer/src/types/` | expense、category、stats 类型 |
| 状态管理 | `src/renderer/src/stores/` | expenseStore、categoryStore、uiStore（Zustand） |
| 工具函数 | `src/renderer/src/utils/` | format（金额/日期格式化）、constants |
| 4个页面 | `src/renderer/src/pages/` | DashboardPage、RecordsPage、StatisticsPage、SettingsPage |
| 依赖安装 | `node_modules/` | 所有依赖已安装（npm） |

### ✅ 已完成（2026-08-09）

| 模块 | 文件 | 说明 |
|------|------|------|
| 编译验证 | `out/` | `npm run build:renderer` 编译通过，无错误 |
| 代码规范 | `.eslintrc.cjs` | ESLint 规则配置（TypeScript + React） |
| 代码规范 | `.prettierrc` | 代码格式化配置 |
| 应用图标 | `resources/icon.ico` | Windows 应用图标（32x32 渐变色） |
| 应用图标 | `resources/icon.icns` | macOS 应用图标（占位） |
| 运行测试 | `npm run dev` | Electron 应用正常启动，开发服务器运行中 |
| 用户文档 | `README.md` | 用户使用说明（安装、功能、操作指南） |
| Bug 修复 | `src/renderer/src/pages/SettingsPage.tsx` | 修复字面 `\n` 导致的编译错误 |

## 技术决策历史

| 决策 | 选择 | 原因 |
|------|------|------|
| 桌面框架 | **Electron** | 生态最大，开发门槛最低，生产验证充分 |
| 前端框架 | **React 18 + TypeScript** | 类型安全，生态丰富 |
| 构建工具 | **Vite + electron-vite** | 快速热更新 |
| UI 组件库 | **Ant Design** | 组件丰富，中文支持好 |
| 图表库 | **ECharts** | 国内最流行的图表库 |
| 数据库 | **sql.js**（替代 better-sqlite3） | 纯 JS/WASM，无需 C++ 编译环境 |
| 包管理器 | **npm**（替代 pnpm） | 避免 Windows 文件锁定问题 |
| 状态管理 | **Zustand** | 轻量(1KB)，无模板代码 |
| 打包工具 | **electron-builder** | Electron 标准打包方案 |

## 分类体系

- **一级分类（9个）**：餐饮饮食、交通出行、居住生活、购物消费、娱乐休闲、医疗健康、人情社交、教育提升、其他
- **二级分类（41个）**：详见 `src/main/database.ts` 中的 seedCategories()
- **规则**：系统预设不可删除（可隐藏），用户新增可自由管理；每笔支出必须选二级分类

## 架构说明

```
React 组件 → Zustand Store → IPC (preload bridge) → Main 进程 → SQLite (sql.js)
```

- 安全性：contextIsolation=true, nodeIntegration=false
- 数据库位置：Windows `%APPDATA%/ConvieLedger/convie_ledger.db`
- 数据库：每次写操作后自动保存到文件（`saveDatabase()`）

## 下一步任务（按优先级排序）

### 优先级 1：验证安装并启动 ✅

- [x] 验证关键依赖存在（全部 10 个关键包 OK）
- [x] 重新安装依赖（淘宝镜像加速）
- [x] 编译渲染进程（`npm run build:renderer` 通过）
- [x] 启动完整应用（`npm run dev` Electron 正常启动）

### 优先级 2：补齐缺失文件 ✅

- [x] 创建 `.eslintrc.cjs` — ESLint 规则配置
- [x] 创建 `.prettierrc` — 代码格式化配置
- [x] 创建 `README.md` — 用户使用说明
- [x] 创建 `resources/icon.ico` 和 `resources/icon.icns` — 应用图标

### 优先级 3：功能测试与修复

- [ ] 启动应用后，测试「新增支出」完整流程
- [ ] 测试支出列表展示、编辑、删除
- [ ] 测试 Dashboard 概览页图表
- [ ] 测试统计报表页年度趋势
- [ ] 测试分类管理（增/删/改）
- [ ] 测试 CSV 导出功能

### 优先级 4：打包发布

- [ ] 配置 electron-builder 完整打包
- [ ] 生成 Windows .exe 安装包（`npm run build`）
- [ ] 生成 Mac .dmg 安装包

## 注意事项

1. **不要修改 CLAUDE.md** — 那是产品文档，除非用户要求
2. **用户非技术人员** — 遇到任何技术问题，需列2-3方案由用户选择
3. **所有代码/注释用中文** — 面向用户友好
4. **所有 IPC 通道需有类型定义** — 不能使用 `any`