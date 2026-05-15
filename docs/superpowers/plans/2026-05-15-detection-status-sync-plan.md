# Detection Status Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“项目构件管理”中的班组/人员/检测日期/构件状态作为唯一主数据源，并同步到主页面、钢结构尺寸检测系统和导出报表，当前阶段采用“单次检测直接覆盖最终状态”；同时将“今日检测计划”也纳入数据库主数据，不再依赖前端临时拼装。

**Architecture:** 以 PostgreSQL `components` 表作为构件主状态表，主页面、检测系统、报表导出统一从后端接口读取；“今日检测计划”以 `components.plan_date + status + team/person fields` 为当前阶段主来源；检测系统在提交结果时直接回写构件最终状态，并写入一张最小检测结果表供结果页和导出使用。前端保留 `localStorage` 仅用于界面预设和临时 UI 状态，不再保存业务真数据。

**Tech Stack:** Vue 2, Express, PostgreSQL, web-ifc, html2canvas, jsPDF

---

## File Map

**Modify**
- `server/index.js`
- `server/database-pg.js`
- `src/views/project-ifc/index.vue`
- `src/views/indexs/left-top.vue`
- `src/views/indexs/left-bottom.vue`
- `src/views/indexs/right-bottom.vue`
- `src/views/indexs/right-top.vue`
- `src/views/indexs/right-center.vue`
- `src/views/indexs/monthly-performance.vue`
- `src/views/secondview/workspace-view.vue`
- `src/views/secondview/results-view.vue`

**Create**
- `server/migrations-or-init additions in database-pg.js for component_inspection_results`

## Database Allocation

### Current Phase Tables

- `projects`
  - 项目主表
  - 存项目名称、地区、IFC 文件地址、激活状态、项目级缓存统计
- `components`
  - 构件主表，也是当前业务真值表
  - 存 IFC 标识、构件编号、构件基础属性、班组信息、三类人员、检测计划日期、当前状态
  - 当前“今日检测计划”直接由这张表筛 `plan_date`
- `project_statistics`
  - 项目首页汇总缓存
  - 存构件总数、待检数、检测中、合格、不合格、合格率、班组数
- `groups`
  - 班组主数据
  - 存班组名称、头像等基础信息
- `star`
  - 标兵班组展示位
  - 当前可保留单行缓存，也可由排名接口实时推导
- `rankings`
  - 排名缓存表
  - 当前可继续兼容保留，但推荐逐步退化为展示缓存，真实口径以 `components` 汇总为准
- `settings`
  - 系统设置
  - 存全局阈值、展示参数、默认配置等
- `component_inspection_results`
  - 检测结果表
  - 存每个构件最新一次检测结论、问题摘要、导出所需状态

### Recommended Current Data Ownership

- `components`
  - `component_mark`
  - `team_id`
  - `team_name`
  - `team_leader`
  - `self_inspector`
  - `quality_inspector`
  - `quality_manager`
  - `plan_date`
  - `status`
  - IFC 已提取基础字段
- `component_inspection_results`
  - `project_id`
  - `component_id`
  - `component_mark`
  - `result_status`
  - `issue_count`
  - `issue_summary`
  - `export_ready`
  - 结果页/报表需要的理论值、实测值、偏差值快照
- `project_statistics`
  - 主页面概览缓存，不作为人工编辑源

### Future Optional Tables

- `component_status_history`
  - 后续如果要记录状态流转历史再加
- `component_inspection_records`
  - 后续如果要保留多次检测记录再加
- `component_attachments`
  - 后续保存报告、图片、点云结果附件再加
- `export_logs`
  - 后续需要审计导出记录再加

---

### Task 1: 固化构件状态口径

**Files:**
- Modify: `server/index.js`
- Modify: `src/views/project-ifc/index.vue`

- [ ] 统一 `components.status` 可用值为：`待检测`、`检测中`、`合格`、`不合格`
- [ ] 将项目构件管理页中的状态选项由旧的 `已完成` 统一替换为 `合格`
- [ ] 保证批量指派、单构件保存、IFC 同步后都不会把状态重置回旧值
- [ ] 验证项目构件管理页刷新后，状态仍从数据库读取，不依赖 `localStorage`

### Task 2: 项目构件管理作为唯一主数据源

**Files:**
- Modify: `src/views/project-ifc/index.vue`
- Modify: `server/index.js`

- [ ] 保证以下字段全部从项目构件管理写入数据库：
  - `team_id`
  - `team_name`
  - `team_leader`
  - `self_inspector`
  - `quality_inspector`
  - `quality_manager`
  - `plan_date`
  - `status`
- [ ] 清理项目构件管理中对 `cm_projects` 的业务依赖，保留仅界面预设类 `localStorage`
- [ ] 验证批量指派后，重新打开页面仍显示数据库中的最新值

### Task 2.5: 今日检测计划入库收口

**Files:**
- Modify: `server/index.js`
- Modify: `src/views/indexs/right-top.vue`
- Modify: `src/views/project-ifc/index.vue`

- [ ] 明确“今日检测计划”来源为 `components.plan_date`
- [ ] 今日计划接口统一从数据库筛选 `plan_date = 今天`
- [ ] 今日计划中的班组、人员、状态全部以 `components` 当前值为准
- [ ] 如果项目构件管理修改了检测日期或状态，主页面今日计划刷新后立即同步
- [ ] 去掉今日计划对前端本地项目缓存的依赖

### Task 3: 主页面改为只读数据库汇总

**Files:**
- Modify: `src/views/indexs/left-top.vue`
- Modify: `src/views/indexs/left-bottom.vue`
- Modify: `src/views/indexs/right-bottom.vue`
- Modify: `src/views/indexs/right-top.vue`
- Modify: `src/views/indexs/right-center.vue`
- Modify: `src/views/indexs/monthly-performance.vue`
- Modify: `server/index.js`

- [ ] 检测总览统一读取 `/api/projects/:id/statistics-summary`
- [ ] 今日检测计划统一读取 `/api/today-plan`
- [ ] 生产绩效榜统一读取 `/api/ranking`
- [ ] 标兵班组统一读取 `/api/star`
- [ ] 去掉这些页面对 `cm_projects` 本地业务数据的兜底依赖
- [ ] 验证项目构件管理修改班组/状态后，主页面刷新即可同步

### Task 4: 绩效榜按合格率稳定计算

**Files:**
- Modify: `server/index.js`

- [ ] 固定口径：
  - 合格率 = `合格 / (合格 + 不合格)`
  - `待检测`、`检测中` 不进入分母
- [ ] 固定排序：
  - 先按合格率降序
  - 再按已检测数降序
  - 再按班组名称正序
- [ ] 标兵班组取排名第一班组
- [ ] 返回字段至少包含：
  - `groupId`
  - `groupName`
  - `qualifiedRate`
  - `qualifiedCount`
  - `unqualifiedCount`
  - `reviewedCount`
  - `componentCount`
  - `teamLeader`
  - `qualityInspector`
  - `qualityManager`

### Task 5: 检测系统结果表落库

**Files:**
- Modify: `server/database-pg.js`
- Modify: `server/index.js`

- [ ] 新增最小检测结果表 `component_inspection_results`
- [ ] 字段建议：
  - `id`
  - `project_id`
  - `component_id`
  - `component_mark`
  - `result_status`
  - `issue_count`
  - `issue_summary`
  - `export_ready`
  - `created_at`
  - `updated_at`
- [ ] 增加读写接口：
  - 保存检测结果
  - 按构件查询最新检测结果
- [ ] 保持当前阶段只保留“最新一次结果”

### Task 5.5: 检测结果与构件主表协同

**Files:**
- Modify: `server/index.js`
- Modify: `server/database-pg.js`

- [ ] 保存检测结果时同步更新 `components.status`
- [ ] 如结果页需要高频读取，允许把部分结果摘要回写到 `components` 冗余字段
- [ ] 保证首页统计、今日计划、绩效榜只依赖主表状态，不直接扫结果明细表

### Task 6: 检测系统回写最终状态

**Files:**
- Modify: `src/views/secondview/workspace-view.vue`
- Modify: `src/views/secondview/results-view.vue`
- Modify: `server/index.js`

- [ ] 检测系统打开构件时，从后端读取该构件的班组、人员、日期、当前状态
- [ ] 检测完成提交时：
  - 全部通过 -> 写入检测结果表，`components.status = 合格`
  - 存在不合格项 -> 写入检测结果表，`components.status = 不合格`
- [ ] 检测完成后触发主页面刷新事件
- [ ] 验证项目构件管理、主页面、结果页三处状态一致

### Task 7: 结果页展示不合格项

**Files:**
- Modify: `src/views/secondview/results-view.vue`
- Modify: `server/index.js`

- [ ] 结果页显示：
  - 理论值
  - 实测值
  - 偏差值
  - 判定结果
  - 不合格项列表
- [ ] 不合格项需要能高亮
- [ ] 页面顶部显示构件编号、班组、检测日期、当前状态
- [ ] 不再只依赖前端临时计算结果

### Task 8: 导出报表读取数据库最终状态

**Files:**
- Modify: `src/views/secondview/results-view.vue`
- Modify: `server/index.js`

- [ ] 导出 PDF 前，先读取该构件最新检测结果
- [ ] 合格时报表显示“合格”
- [ ] 不合格时报表显示“不合格”并附带问题摘要
- [ ] 导出内容中的班组/人员/检测日期从数据库读取，不再只靠本地预设

### Task 9: 增加导出确认弹窗

**Files:**
- Modify: `src/views/secondview/results-view.vue`

- [ ] 点击导出后，先弹出确认框
- [ ] 弹窗内容至少包括：
  - 项目名称
  - 构件编号
  - 班组名称
  - 检测日期
  - 当前状态
  - 不合格项数量
  - 当前模板名称
- [ ] 用户确认后再执行 PDF 导出
- [ ] 如果构件尚未检测完成，导出前给出警告提示

### Task 10: 收口 localStorage 业务数据

**Files:**
- Modify: `src/views/indexs/center-map.vue`
- Modify: `src/views/indexs/left-bottom.vue`
- Modify: `src/views/indexs/right-bottom.vue`
- Modify: `src/views/project-ifc/index.vue`
- Modify: `src/views/secondview/results-view.vue`

- [ ] 保留 `localStorage` 仅用于：
  - 主题
  - 下拉预设
  - 临时选中构件
- [ ] 移除 `cm_projects` 作为主业务数据源的逻辑
- [ ] 保证刷新页面后仍优先从后端恢复项目、构件、状态、检测结果

---

## Verification Checklist

- [ ] 项目构件管理修改班组、人员、检测日期、状态后，刷新仍一致
- [ ] 主页面检测总览、今日计划、绩效榜、标兵班组与项目构件管理一致
- [ ] 检测系统提交“合格”后，数据库状态直接变为 `合格`
- [ ] 检测系统提交“不合格”后，结果页能看到不合格项，数据库状态直接变为 `不合格`
- [ ] 导出前会弹确认框
- [ ] 导出 PDF 内容与数据库最终状态一致

---

## Execution Recommendation

推荐先执行：

1. `Task 1` + `Task 2` + `Task 2.5`
2. `Task 3` + `Task 4`
3. `Task 5` + `Task 5.5` + `Task 6`
4. `Task 7` + `Task 8` + `Task 9`
5. 最后做 `Task 10`

## Optimization Roadmap

### Phase A: 先打通单一数据源

- 项目构件管理写 PostgreSQL
- 主页面全部改读 PostgreSQL
- 今日检测计划从 `components.plan_date` 直接生成

### Phase B: 再打通检测闭环

- 检测系统结果落库
- 结果直接回写构件状态
- 导出报表改为从数据库取最终值

### Phase C: 再做性能优化

- IFC 导入阶段做分批解析和批量入库
- 项目统计做增量刷新，不每次全量重算
- 高频详情查询优先按 `project_id + ifc_element_id` 命中

### Phase D: 再做产品增强

- 导出确认弹窗
- 检测历史记录
- 点云检测结果对接
- 附件和报告留档
