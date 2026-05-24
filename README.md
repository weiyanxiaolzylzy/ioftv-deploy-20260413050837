# IOFTV 项目交接说明

## 1. 项目概述

IOFTV 是一个面向钢结构构件生产、项目管理与质量检测的大屏可视化系统，当前仓库由三部分组成：

1. Vue 2 前端主应用
2. Express + PostgreSQL 后端接口
3. 独立 IFC 查看器与 IFC 解析链路

当前仓库的主要业务范围：

- 首页大屏展示
- 项目 / IFC / 构件管理
- 构件质检流程与结果展示

当前数据库主路径固定为 PostgreSQL。

## 2. 技术栈

### 前端

- Vue 2
- Vue Router
- Vuex
- Element UI
- ECharts
- Three.js
- web-ifc / web-ifc-viewer

### 后端

- Node.js
- Express
- Multer
- PostgreSQL
- XLSX

### 部署运行

- Nginx
- PM2
- PostgreSQL

当前交付版本的服务器部署方式以 `Xshell + Nginx + PM2 + PostgreSQL` 为准，不再以宝塔或 Docker 作为默认交付路径。

## 3. 仓库结构

```text
.
├── src/                            主前端源码
│   ├── components/                 通用组件
│   ├── router/                     前端路由
│   ├── store/                      Vuex
│   ├── utils/                      工具函数
│   └── views/
│       ├── login/                  登录页
│       ├── indexs/                 首页大屏模块
│       ├── project-ifc/            项目 / IFC / 构件管理
│       ├── secondview/             质检流程与结果页
│       ├── home.vue                首页容器
│       └── home.scss               首页全局样式
├── server/                         后端服务
│   ├── index.js                    后端入口
│   ├── database-entry.js           数据库入口适配
│   ├── database-pg.js              PostgreSQL 数据访问
│   ├── ifc-parser.js               IFC 解析逻辑
│   ├── ifc-parse-worker.js         IFC 子进程解析 worker
│   ├── ifc-parse-cache.js          IFC 解析缓存
│   ├── ifc-sync.js                 IFC 构件同步辅助逻辑
│   ├── qc-workflow.js              质检流程逻辑
│   └── uploads/                    运行时上传目录
├── ifc/                            独立 IFC 查看器构建项目
├── public/                         公共静态资源
├── banzu/                          班组照片
├── 单个构件质检表/                 Excel 模板
├── docs/                           项目文档
├── storage/                        运行时存储目录
├── 部署教程.md                     当前有效部署文档
├── server-permission-baseline.sh   服务器权限基线修复脚本
├── server-reset-clean.sh           服务器清空应用与业务数据脚本
├── package.json                    前端主应用依赖与脚本
└── AGENTS.md                       仓库工作规则
```

## 4. 页面与路由结构

当前主路由在 [src/router/index.js](./src/router/index.js)。

### 登录

- 路径：`/login`
- 文件：`src/views/login/index.vue`

### 首页大屏

- 路径：`/home/index`
- 容器：`src/views/home.vue`
- 主页面：`src/views/indexs/index.vue`

首页大屏下的关键模块主要在：

- `src/views/indexs/center-map.vue`
- `src/views/indexs/left-top.vue`
- `src/views/indexs/left-center.vue`
- `src/views/indexs/left-bottom.vue`
- `src/views/indexs/right-bottom.vue`
- `src/views/indexs/monthly-performance.vue`

### 项目 / IFC 管理

- 路径：`/project-ifc`
- 文件：`src/views/project-ifc/index.vue`

该页面负责：

- 项目新增与编辑
- IFC 文件上传
- IFC 构件同步
- 构件列表与计划联动

### 质检系统

- 路径：`/secondview`
- 文件：`src/views/secondview/index.vue`

相关页面分布在：

- `src/views/secondview/workspace-view.vue`
- `src/views/secondview/results-view.vue`
- `src/views/secondview/defect-statistics-view.vue`
- `src/views/secondview/detected-components-view.vue`

## 5. 后端接口与关键逻辑

后端入口：

- [server/index.js](./server/index.js)

关键能力：

1. 健康检查
   - `GET /health`

2. IFC 上传与解析
   - `POST /api/upload-ifc`
   - `GET /api/upload-ifc-status/:jobId`
   - `POST /api/projects/:id/components/sync-ifc`

3. 项目与构件管理
   - 项目 CRUD
   - 构件批量更新 / 删除 / 同步

4. 质检相关接口
   - 构件质检记录
   - 返修 / 出库 / 统计

### IFC 解析链路

当前 IFC 处理流程：

1. 前端上传 IFC 到 `server/uploads/ifc`
2. 后端创建解析任务
3. 子进程 `server/ifc-parse-worker.js` 调用 `server/ifc-parser.js`
4. 解析结果写入内存任务状态和缓存文件
5. 前端轮询解析状态
6. 项目页面调用 `sync-ifc` 将 IFC 构件写入 PostgreSQL

### 本次已明确修复的 IFC 风险点

1. `ifc-parse-worker.js` 里 IPC 回传结果后立即退出，导致父进程偶发拿不到解析结果  
   当前已经改为等待 `process.send` 回调后退出。

2. 服务器部署时 `uploads/ifc`、`public/static/js/wasm`、`dist` 等目录的权限归属不稳定  
   当前通过 `server-permission-baseline.sh` 固化检查与修复。

## 6. 本地开发方式

### 安装依赖

```bash
npm install
```

### 启动前端

```bash
npm run serve
```

### 启动后端

```bash
npm run server:dev
```

默认地址：

- 前端：`http://localhost:8080`
- 后端：`http://127.0.0.1:8890`

### 健康检查

```bash
curl http://127.0.0.1:8890/health
```

## 7. 构建说明

### 主前端构建

```bash
npm run build
```

产物目录：

- `dist/`

### IFC 查看器构建

```bash
cd ifc
npm install
npm run build
cd ..
```

产物目录：

- `ifc/dist/`

## 8. 当前服务器部署方式

当前交付版本有效部署方式：

- `Xshell`
- `Nginx`
- `PM2`
- `PostgreSQL`

有效部署文档：

- [部署教程.md](./部署教程.md)

不再作为当前默认交接路径的方式：

- 宝塔面板点击式部署
- Docker 作为当前交付主路径

### 当前常用部署目录

```text
/www/wwwroot/ioftv
```

### 后端监听端口

```text
8890
```

### 常用访问地址

- 局域网：`http://192.168.60.10`
- Tailscale：`http://100.104.212.6`

## 9. 服务器目录权限基线

当前服务器最容易反复出问题的点不是代码，而是“用户权限化石”：

- `root` 曾经启动过 PM2
- `www-data` 曾经拥有过上传目录
- 实际运行用户又是 `dell`

推荐在服务器每次部署完成后执行：

```bash
bash server-permission-baseline.sh
```

目标状态：

- `server/`、`server/uploads/`、`storage/` 可由 PM2 运行用户写入
- `dist/`、`ifc/dist/` 可被 `www-data` 正常读取
- `public/static/js/wasm/` 至少运行用户可写、`www-data` 可读

## 10. 交接重点提醒

### 1. 不要混用本地开发和服务器部署

本地调代码优先：

- `npm run serve`
- `npm run server:dev`

不要一上来就按服务器问题处理。

### 2. IFC 问题优先检查 4 件事

1. `/uploads/ifc/...` 文件是否真实存在
2. `/wasm/web-ifc.wasm` 是否能正常下载
3. `sync-ifc` 是否返回成功
4. `server/uploads` 与 `public/static/js/wasm` 权限是否正确

### 3. PM2 和 root 残留要警惕

如果出现：

- `pm2 status` 显示异常
- 杀掉 node 进程又自动起来
- 8890 被未知 node 占用

优先排查是否有 `root` 侧 PM2 残留。

### 4. 当前工作区存在很多临时文件

提交代码前不要直接：

```bash
git add .
```

应只提交明确需要交接的代码、脚本和文档。

## 11. 本次交接产物

本次交接重点已经体现在以下文件：

- [README.md](./README.md)
- [部署教程.md](./部署教程.md)
- [server-permission-baseline.sh](./server-permission-baseline.sh)
- [server-reset-clean.sh](./server-reset-clean.sh)

如果接手人先读这 4 个文件，再读：

- [AGENTS.md](./AGENTS.md)
- [docs/project-context.md](./docs/project-context.md)

基本就能快速接手当前项目。
