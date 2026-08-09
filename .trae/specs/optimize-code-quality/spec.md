# 代码质量优化 Spec

## Why
代码审查发现多个类型安全、错误处理和代码整洁度问题，影响项目可维护性和运行时稳定性。需要在功能测试前修复这些问题。

## What Changes
- 消除 `any` 类型，为所有 IPC 函数和 Store 添加明确类型定义
- 提取共享类型（ExpenseFilter）到 types 目录，避免重复定义
- 修复 RecordsPage 中未检查空值直接访问 `expense.category_id` 的风险
- 删除未使用的 `getAppDataPath` 函数和 `l2` 变量
- 优化 seedCategories 数据库插入性能（批量插入替代逐条插入）
- 统一 StatisticsPage 中未使用的导入

## Impact
- Affected specs: 无（纯代码质量优化）
- Affected code: `src/main/ipc-handlers.ts`, `src/preload/index.ts`, `src/main/utils.ts`, `src/main/database.ts`, `src/renderer/src/pages/RecordsPage.tsx`, `src/renderer/src/pages/StatisticsPage.tsx`, `src/renderer/src/stores/expenseStore.ts`, `src/renderer/src/types/`

## ADDED Requirements

### Requirement: 共享筛选类型定义
系统 SHALL 在 `src/renderer/src/types/` 中定义 `ExpenseFilter` 接口，供 IPC 处理器、preload 桥接和 Store 共同使用，确保类型一致性。

#### Scenario: 筛选类型在多个模块中一致使用
- **WHEN** IPC 处理器 `expenses:list` 接收筛选参数
- **THEN** 参数类型为 `ExpenseFilter`，不再使用 `any`
- **AND** preload 桥接和 expenseStore 使用相同的类型定义

## MODIFIED Requirements

### Requirement: IPC 处理器类型安全
**原状态**: 多个函数使用 `any[]` 和 `any` 类型
**修改后**: 所有辅助函数（queryAll, queryOne, execute）和 IPC 处理器使用具体类型，`any` 仅限 sql.js 内部边界

#### Scenario: 查询函数返回明确类型
- **WHEN** 调用 `queryAll` 或 `queryOne`
- **THEN** 返回类型为 `Record<string, unknown>[]` 或 `Record<string, unknown> | undefined`
- **AND** `execute` 的参数类型为 `(string | number | null)[]`

### Requirement: 数据库种子数据性能
**原状态**: 41 条二级分类逐条 INSERT，每次查询 last_insert_rowid
**修改后**: 一级分类插入后，使用 `db.exec` 直接获取 last_insert_rowid，二级分类批量构建 SQL 一次性执行

#### Scenario: 种子数据写入
- **WHEN** 首次初始化数据库
- **THEN** 分类种子数据写入使用批量 SQL，减少 `db.exec` 调用次数

### Requirement: 移除未使用代码
**原状态**: `getAppDataPath` 函数未被任何模块引用；RecordsPage 中有未使用的 `l2` 变量
**修改后**: 删除 `getAppDataPath`，删除 RecordsPage 中未使用的 `l2` 赋值

#### Scenario: 清理死代码
- **WHEN** 编译项目
- **THEN** 无未使用变量/函数的 TypeScript 警告

### Requirement: 空值安全检查
**原状态**: `loadExpenseForEdit` 中 `expense` 可能为 undefined 时被访问属性
**修改后**: 在 `if (expense)` 块内访问 `expense.category_id`，逻辑已正确，但需确保 `expense` 为 undefined 时提供用户反馈

#### Scenario: 编辑不存在的支出
- **WHEN** 尝试编辑不存在的支出记录
- **THEN** 显示错误提示而不是静默失败