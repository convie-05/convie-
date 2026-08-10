# Checklist

- [x] ExpenseFilter 类型在 `src/renderer/src/types/filter.ts` 中定义，包含所有筛选字段
- [x] ExpenseFilter 从 `types/index.ts` 正确导出
- [x] `src/preload/index.ts` 中 `expenses:list` 使用 `ExpenseFilter` 类型
- [x] `src/main/ipc-handlers.ts` 中 `queryAll` 返回类型为 `Record<string, unknown>[]`
- [x] `src/main/ipc-handlers.ts` 中 `queryOne` 返回类型为 `Record<string, unknown> | undefined`
- [x] `src/main/ipc-handlers.ts` 中 `execute` 参数类型为 `SqlParam[]`（即 `(string | number | null)[]`）
- [x] `src/main/ipc-handlers.ts` 中 `expenses:list` filter 参数类型为 `ExpenseFilter`
- [x] `src/main/ipc-handlers.ts` 中 `expenses:update` data 参数类型为 `UpdateExpenseData`
- [x] `src/main/ipc-handlers.ts` 中 `categories:update` params 无 `any` 类型
- [x] `src/main/ipc-handlers.ts` 中 `categories:getTree` tree/map 无 `any` 类型
- [x] `src/renderer/src/stores/expenseStore.ts` 中的 `ExpenseFilter` 从 types 导入
- [x] `src/main/utils.ts` 中 `getAppDataPath` 函数已删除
- [x] `src/renderer/src/pages/RecordsPage.tsx` 中未使用的 `l2` 变量已删除
- [x] `src/main/database.ts` 中 `seedCategories` 使用批量 SQL 插入
- [x] `src/renderer/src/pages/RecordsPage.tsx` 中 expense 为空时有错误提示
- [x] `src/renderer/src/pages/StatisticsPage.tsx` 中未使用的 `MonthlySummary` 导入已清理
- [x] `npm run build:renderer` 编译通过，无类型错误和警告