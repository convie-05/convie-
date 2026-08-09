# Convie记账本 (Convie's Ledger)

## 项目概述

一款跨平台个人记账桌面应用，记录每一笔人民币支出，采用两级分类体系。

### 产品决策

- **品牌名称**: Convie记账本 — "Convie" = Convenient(便捷) + Vie(法语"生活")
- **标语**: "随手记，轻松管"
- **币种**: 仅支持人民币 (RMB/CNY)
- **存储方式**: 纯本地 SQLite 文件存储，无云端依赖
- **目标平台**: Windows 7+ 和 macOS 10.15+
- **界面语言**: 简体中文
- **配色方案**: 青绿色 (#0D9488) 主色 + 珊瑚橙 (#F56565) 强调色

---

## 开发协作规则

### 技术决策流程

当项目开发过程中遇到技术问题需要决策时，**必须遵循以下流程**：

1. **问题复述**：先确认理解用户遇到的问题，简要复述
2. **方案列举**：提供 2-4 个可行的解决方案，每个方案包含：
   - 方案名称（一句话概括）
   - 具体实现思路
   - 优点（至少 1 条）
   - 缺点/风险（至少 1 条）
3. **推荐标注**：在其中一个方案后标注 **(推荐)**，说明推荐理由
4. **等待决策**：用户选择方案后，严格按照选定方案执行，不擅自混合其他方案

### 禁止事项

- **禁止**遇到技术问题后自行决定方案并直接实施
- **禁止**只提供一个方案，不给用户选择空间
- **禁止**在用户未决策前就开始编码实现

### Git 操作规则

- 任何 Git 操作（add、commit、push、pull、merge、rebase、branch 等）执行前，必须先解释操作目的和影响，经用户同意后方可执行
- `git status`、`git log`、`git diff` 等只读命令无需确认

---

## 技术栈

**✅ 已选定: Electron + React + TypeScript**

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | **Electron** | 打包 Chromium + Node.js，跨 Windows/Mac |
| 前端框架 | **React 18 + TypeScript** | 严格模式，类型安全 |
| 构建工具 | **Vite + electron-vite** | 快速热更新，专为 Electron 优化 |
| 状态管理 | **Zustand** | 轻量级(1KB)，无需模板代码 |
| UI 组件库 | **Ant Design (antd)** | 组件丰富，对中文友好 |
| 图表库 | **ECharts** (echarts-for-react) | 国内最流行的图表库 |
| 数据库 | **SQLite** (sql.js) | 纯 JS/WASM 实现，无需 C++ 编译环境 |
| 打包工具 | **electron-builder** | 生成 .exe / .dmg 安装包 |
| 包管理器 | **npm** | 避免 Windows pnpm 文件锁定问题 |

### 选型理由

**为什么选 Electron？**
1. 生态系统最大最成熟 — 遇到问题容易搜到现成答案
2. 开发门槛最低 — 标准网页开发技术栈
3. 经过大规模生产验证 — VS Code、Slack、Discord 同款技术
4. 调试工具最完善 — 完整的 Chrome DevTools
5. 记账类数据录入应用，Electron 的内存占用完全可以接受

**为什么选 SQLite？**
1. 无需安装配置数据库服务，一个文件搞定
2. 零维护成本 — 对非技术用户极其友好
3. 数据库文件可跨 Windows/Mac 直接使用
4. ACID 事务保证，40+ 年稳定性验证
5. 备份只需复制一个 .db 文件

---

## 分类体系

### 一级分类 → 二级分类

| 一级分类 | 二级分类 |
|---------|---------|
| **1. 餐饮饮食** | 三餐主食、零食饮品、外卖配送、生鲜采购、社交聚餐 |
| **2. 交通出行** | 公共交通、打车租车、燃油充电、车辆维护、长途旅行 |
| **3. 居住生活** | 房租房贷、水电燃气、物业网费、家居用品、维修装修 |
| **4. 购物消费** | 服装鞋帽、美妆护肤、数码电器、日用百货、书籍学习 |
| **5. 娱乐休闲** | 影视会员、游戏充值、运动健身、旅游度假、兴趣爱好 |
| **6. 医疗健康** | 门诊就医、药房购药、体检防疫、保险 |
| **7. 人情社交** | 红包礼金、孝敬父母、约会恋爱、宠物开销 |
| **8. 教育提升** | 学费培训、考试费用、知识付费 |
| **9. 其他** | 银行手续费、捐赠公益、其他支出 |

### 分类管理规则

- 用户可在「设置」中**新增、重命名、删除**分类
- 系统预设分类不可删除（可隐藏），用户新增分类可自由管理
- 每笔支出必须选择**二级分类（叶子分类）**，一级分类仅用于分组和统计

---

## 架构决策

### 数据流向

```
React 组件 → Zustand Store → Service 层 → IPC (preload bridge) → Main 进程 → SQLite
```

### IPC 安全策略

- 所有数据库访问都经过主进程（main process）
- 渲染进程通过 `contextBridge` 与主进程通信
- `contextIsolation: true`（开启上下文隔离）
- `nodeIntegration: false`（禁用 Node.js 集成）
- 所有 IPC 通道使用 TypeScript 类型定义（请求/响应接口）

### 数据库

- **位置**: Windows `%APPDATA%/ConvieLedger/convie_ledger.db` | Mac `~/Library/Application Support/ConvieLedger/convie_ledger.db`
- **Schema**: 两张主表 `categories` + `expenses`，详见 `src/main/database.ts`
- **实现**: 使用 sql.js（SQLite 编译为 WASM），每次写操作后自动 `saveDatabase()` 保存到文件
- **启动时自动建表**，如不存在则创建，并写入预设分类种子数据（9 个一级 + 41 个二级分类）

### 导出功能

- **CSV 格式**: 使用 `csv-stringify` 库
- **Excel 格式**: 使用 `exceljs` 库
- 支持导出全部数据或当前筛选后的子集

---

## 开发规则

### 对 Claude/AI 助手的约束

1. **用户非技术人员**：遇到任何技术问题、决策或错误时：
   - 用通俗语言清晰描述问题（使用中文）
   - 列出 2-3 个可行方案并解释各自的优劣势
   - 让用户决定，不得擅自做技术决策

2. **不得单方面做技术决策**：任何涉及技术选型的问题必须先提供方案解释，由用户选择

3. **引入依赖时必须说明**：
   - 该库的作用和必要性
   - 考虑了哪些替代方案
   - 为什么选择这个

4. **错误处理**：报错时先用通俗语言解释问题，再展示具体技术细节

### 代码质量要求

- TypeScript 严格模式 (`strict: true`)
- 禁止使用 `any` 类型（除非有明确的合理性注释）
- 所有 IPC 通道须有类型定义（request/response 接口）
- 统一使用 ESLint + Prettier 保证代码风格一致（已配置 `.eslintrc.cjs` + `.prettierrc`）

### 提交规范

```
type(scope): description

type: feat | fix | refactor | docs | chore | style | test
scope: main | renderer | db | ui | ci
```

示例: `feat(renderer): add expense list pagination`

---

## 项目结构

```
convie-ledger/
├── package.json                 # 依赖和脚本（electron-builder 配置内置）
├── tsconfig.json                # TypeScript 主配置
├── tsconfig.node.json           # Node 端 TypeScript 配置
├── electron.vite.config.ts      # Vite + Electron 构建配置
├── .eslintrc.cjs                # ESLint 规则
├── .prettierrc                  # 代码格式化配置
├── CLAUDE.md                    # 产品文档（本文件）
├── work.md                      # 开发工作文档
├── README.md                    # 用户使用说明
│
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 应用入口：窗口创建、生命周期
│   │   ├── ipc-handlers.ts      # IPC 处理器（分类 CRUD / 支出 CRUD / 统计 / 导出）
│   │   ├── database.ts          # 数据库初始化、Schema、种子数据（sql.js）
│   │   └── utils.ts             # 主进程工具函数
│   │
│   ├── preload/                 # 预加载脚本（安全桥接）
│   │   └── index.ts             # contextBridge API 暴露
│   │
│   └── renderer/                # React 前端（渲染进程）
│       ├── index.html           # HTML 入口
│       ├── main.tsx             # React 根挂载
│       │
│       └── src/
│           ├── App.tsx          # 根组件（路由 + Ant Design 主题）
│           ├── env.d.ts         # 环境类型声明
│           │
│           ├── components/      # 可复用 UI 组件
│           │   └── Layout/
│           │       └── AppLayout.tsx   # 侧边栏导航布局
│           │
│           ├── pages/           # 路由页面
│           │   ├── DashboardPage.tsx   # 概览：月度统计卡片 + 饼图 + 柱状图
│           │   ├── RecordsPage.tsx     # 支出记录：列表 + 新增/编辑 + 搜索 + CSV 导出
│           │   ├── StatisticsPage.tsx  # 统计报表：年度趋势 + 分类占比
│           │   └── SettingsPage.tsx    # 设置：分类管理（树形增删改）
│           │
│           ├── stores/          # 状态管理 (Zustand)
│           │   ├── expenseStore.ts     # 支出数据状态
│           │   ├── categoryStore.ts    # 分类数据状态
│           │   └── uiStore.ts          # UI 状态（年份/月份/弹窗）
│           │
│           ├── types/           # TypeScript 类型定义
│           │   ├── index.ts
│           │   ├── expense.ts
│           │   ├── category.ts
│           │   └── stats.ts
│           │
│           ├── utils/           # 工具函数
│           │   ├── index.ts
│           │   ├── format.ts    # 金额、日期格式化
│           │   └── constants.ts # 全局常量（月份名称等）
│           │
│           └── styles/          # 全局样式
│               └── global.css
│
├── resources/                   # 构建资源
│   ├── icon.ico                 # Windows 图标
│   └── icon.icns                # Mac 图标
│
└── out/                         # 构建输出（electon-vite 自动生成）
```

---

## 开发与构建

### 环境要求

- Node.js >= 18 LTS
- npm >= 8

### 常用命令

```bash
npm install --legacy-peer-deps   # 安装依赖
npm run dev                      # 开发模式（热更新 + 自动启动 Electron）
npm run build:renderer           # 仅编译渲染进程（验证用途）
npm run build                    # 构建生产安装包（electron-vite + electron-builder）
npm run lint                     # ESLint 代码检查
npm run lint:fix                 # ESLint 自动修复
```

---

## 未来规划 (v2+)

- 云备份/同步（可选开启）
- 暗黑模式（UI 框架已规划 CSS 变量支持）
- 周期性支出 / 模板
- 预算设置与提醒
- 收据拍照附件
- 多币种支持