# Tasks

- [x] Task 1: 提取共享 ExpenseFilter 类型定义
  - [x] 在 `src/renderer/src/types/` 中新建 `filter.ts`，定义 `ExpenseFilter` 接口
  - [x] 从 `types/index.ts` 导出新类型
  - [x] 在 `src/preload/index.ts` 的 `expenses:list` 中使用 `ExpenseFilter` 替代 `any`
  - 验证：编译通过，无类型错误

- [x] Task 2: 修复 IPC 处理器中的 `any` 类型
  - [x] 修改 `queryAll` 返回类型为 `Record<string, unknown>[]`
  - [x] 修改 `queryOne` 返回类型为 `Record<string, unknown> | undefined`
  - [x] 修改 `execute` 参数类型为 `(string | number | null)[]`
  - [x] 修改 `expenses:list` 的 filter 参数类型为 `ExpenseFilter`
  - [x] 修改 `expenses:update` 的 data 参数类型为 `UpdateExpenseData`
  - [x] 修改 `categories:update` 的 params 类型为 `SqlParam[]`
  - [x] 修改 `categories:getTree` 中的 tree 和 map 类型（新增 CategoryNode 接口）
  - 验证：编译通过，`npm run build:renderer` 无错误

- [x] Task 3: 修复 expenseStore 中的类型问题
  - [x] 移除本地 `ExpenseFilter` 接口定义，改为从 types 导入
  - 验证：编译通过

- [x] Task 4: 删除未使用的代码
  - [x] 删除 `src/main/utils.ts` 中的 `getAppDataPath` 函数
  - [x] 删除 `src/renderer/src/pages/RecordsPage.tsx` 第 49 行未使用的 `l2` 变量赋值
  - 验证：编译通过，无未使用变量警告

- [x] Task 5: 优化 seedCategories 批量插入
  - [x] 修改 `src/main/database.ts` 中的 `seedCategories` 函数
  - [x] 一级分类批量构建 SQL（使用 `;` 分隔多条 INSERT）
  - [x] 使用 `db.exec` 执行后通过 `SELECT MIN(id)` 推算 ID 范围
  - [x] 二级分类批量构建 SQL 一次性执行
  - 验证：编译通过

- [x] Task 6: 加强 RecordsPage 错误处理
  - [x] 在 `loadExpenseForEdit` 中，当 `expense` 为 undefined 时显示 `message.warning` 并关闭弹窗
  - 验证：编译通过

- [x] Task 7: 清理 StatisticsPage 未使用导入
  - [x] 移除 `StatisticsPage.tsx` 中未使用的 `MonthlySummary` 类型导入
  - 验证：编译通过，无未使用导入警告

# Task Dependencies
- Task 2 依赖 Task 1（需要 ExpenseFilter 类型）
- Task 3 依赖 Task 1（需要 ExpenseFilter 类型）
- Task 4、5、6、7 互相独立，可并行执行