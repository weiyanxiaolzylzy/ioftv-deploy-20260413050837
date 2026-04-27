# 部署教程 — 81.70.191.16（宝塔面板）

> 服务器 IP：`81.70.191.16`
> 部署路径：`/www/wwwroot/ioftv/`
> 修订日期：2026-04-27

---

## 系统架构

```
浏览器 → http://81.70.191.16:8080
│
├── /              → Vue 大屏前端         (Express 静态托管 /www/wwwroot/ioftv/dist)
├── /api/*         → Express API          (Express, 端口 8890)
├── /uploads/*     → 上传文件             (Express 静态托管 /www/wwwroot/ioftv/server/uploads)
├── /ifc/*         → IFC BIM 查看器       (Express 静态托管 /www/wwwroot/ioftv/ifc/dist)
├── /wasm/*        → IFC WASM 文件        (Express 静态托管 /www/wwwroot/ioftv/static/js/wasm)
└── /people.jpg    → 标兵头像            (Express 静态托管 /www/wwwroot/ioftv/dist/people.jpg)
```

**所有请求由 Express（Node.js）处理，不需要 Nginx 反向代理。**

---

## 第一步：宝塔面板安装必要软件

登录宝塔面板：`http://81.70.191.16:8888`

### 1.1 安装 Node.js

- 点击左侧「软件商店」→ 搜索「Node.js版本管理器」→ 安装
- 安装完成后，点击「设置」→ 安装 Node.js 18.x LTS

或者直接在服务器 SSH 里执行：

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v
npm -v
```

### 1.2 安装 PM2（进程管理器）

宝塔面板也可以直接安装：

- 点击左侧「软件商店」→ 搜索「PM2管理器」→ 安装

或者 SSH 里执行：

```bash
npm install -g pm2
pm2 --version
```

### 1.3 安装 Node 项目管理器（推荐）

- 点击左侧「软件商店」→ 搜索「Node项目管理器」→ 安装
- 此插件可以直接通过界面管理 Node.js 项目，更方便

---

## 第二步：新建网站

宝塔面板操作：

1. 点击左侧「网站」→ 「添加站点」
2. 填写信息：
   - **域名**：留空（或者填 `81.70.191.16:8080`）
   - **根目录**：手动填写 `/www/wwwroot/ioftv`（不要用默认的，先建好这个目录）
   - **FTP**：不创建
   - **数据库**：不需要
   - **PHP版本**：选择「纯静态」
3. 点击「提交」

> 注意：宝塔默认会创建一个空目录 `ioftv`，这一步就是创建目录的动作。

---

## 第三步：上传文件

### 方法一：宝塔面板上传（推荐）

1. 宝塔面板左侧点击「文件」
2. 进入 `/www/wwwroot/ioftv/` 目录
3. 点击「上传」，把本地的 `上传/` 文件夹里的**所有内容**拖进去上传
4. 上传完成后，目录结构应如下：

```
/www/wwwroot/ioftv/
├── index.html          ← 根目录文件
├── people.jpg
├── 顶.png
├── dist/
├── server/
│   ├── index.js        ← 后端入口
│   ├── package.json
│   ├── node_modules/   ← 已包含，不需要 npm install
│   ├── data.json
│   ├── public/
│   └── uploads/
├── ifc/
└── static/
```

### 方法二：SCP 上传

本地 PowerShell：

```powershell
cd d:\Roaming\ioftv-deploy-20260413050837
scp -r 上传\* root@81.70.191.16:/www/wwwroot/ioftv/
```

---

## 第四步：启动后端服务

### 方法一：使用宝塔「Node项目管理器」插件（推荐）

1. 宝塔面板左侧点击「软件商店」→ 「Node项目管理器」→ 点击「添加项目」
2. 填写：
   - **项目名称**：`ioftv`
   - **项目路径**：`/www/wwwroot/ioftv/server`
   - **启动文件**：`index.js`
   - **端口**：`8890`
   - **运行用户**：`root`
3. 点击「提交」
4. 点击「启动」

### 方法二：SSH 命令行启动

```bash
cd /www/wwwroot/ioftv/server

# 使用 PM2 启动
pm2 delete ioftv 2>/dev/null || true
pm2 start npm --name ioftv -- start

# 保存进程
pm2 save

# 开机自启
pm2 startup
```

**验证启动是否成功：**

```bash
pm2 status
# 应看到 ioftv 状态为 online
```

---

## 第五步：配置网站（端口 8080）

宝塔面板操作：

1. 点击左侧「网站」→ 找到刚才创建的站点 → 点击「设置」
2. 点击「配置文件」，清空里面的内容，替换为以下内容：

```nginx
server
{
    listen 8080;
    server_name _;

    # 前端静态文件
    location / {
        root /www/wwwroot/ioftv/dist;
        try_files $uri $uri/ /index.html;
    }

    # IFC 查看器（Vite 构建产物，静态文件）
    location /ifc {
        alias /www/wwwroot/ioftv/ifc/dist;
        index index.html;
        try_files $uri $uri/ /ifc/index.html;
    }

    # IFC 静态资源（Vite assets 目录）
    location ~ ^/ifc/assets/ {
        alias /www/wwwroot/ioftv/ifc/dist/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Node.js 后端 API（端口 8890）
    location /api {
        proxy_pass http://127.0.0.1:8890;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件目录
    location /uploads {
        alias /www/wwwroot/ioftv/server/uploads;
        expires 7d;
    }

    # WASM 文件
    location /wasm {
        alias /www/wwwroot/ioftv/static/js/wasm;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # IFC WASM 文件
    location /ifc/wasm {
        alias /www/wwwroot/ioftv/ifc/dist/wasm;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /www/wwwroot/ioftv/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

3. 点击「保存」

> **关键点**：`location /api` 必须放在 `location /ifc` 之后，否则 `/api/ifc/*` 会被 `/ifc` 规则截断导致 404。

4. 点击「重载配置」或重启 Nginx

---

## 第六步：开放端口 8080

在**云服务器控制台（阿里云/腾讯云）** 的安全组设置中，添加入方向规则：

- 协议：TCP
- 端口：8080
- 来源：0.0.0.0/0

宝塔面板也需要开放：

1. 宝塔面板左侧点击「安全」→ 「防火墙」
2. 添加入站规则：端口 `8080`，协议 `tcp`

---

## 第七步：访问验证

浏览器打开：

```
http://81.70.191.16:8080
```

**各功能健康检查（SSH 里执行）：**

```bash
# PM2 服务状态
pm2 status

# API 接口
curl http://localhost:8890/api/projects
curl http://localhost:8890/api/star

# 前端
curl http://localhost:8890/
curl http://localhost:8080/

# IFC 查看器
curl http://localhost:8080/ifc/

# WASM 文件
curl http://localhost:8080/wasm/web-ifc.wasm
```

---

## 服务器目录结构（部署完成后）

```
/www/wwwroot/ioftv/          ← 新建的项目文件夹
├── index.html              ← 根目录文件
├── people.jpg              ← 标兵头像
├── 顶.png
├── dist/                  ← Vue 大屏前端（Nginx root）
│   ├── index.html
│   ├── people.jpg
│   └── static/
├── server/                ← Express 后端（PM2 管理，端口 8890）
│   ├── index.js           ← 入口文件
│   ├── package.json
│   ├── node_modules/      ← 已上传，不需要 npm install
│   ├── data.json          ← 业务数据
│   ├── public/
│   └── uploads/           ← 上传文件存储
├── ifc/                   ← IFC BIM 查看器（Nginx alias）
│   ├── index.html
│   ├── dist/
│   ├── assets/
│   └── wasm/
└── static/                ← 公共静态资源
    └── js/wasm/
```

---

## 日常维护

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs ioftv

# 重启服务
pm2 restart ioftv

# 服务器重启后自动恢复
pm2 save
pm2 startup
```

---

## 更新部署

### 只更新前端

1. 本地重新构建：`npm run build`
2. 上传 `dist/` 文件夹覆盖到 `/www/wwwroot/ioftv/dist/`
3. 无需重启，Nginx 直接读取新文件

### 更新后端

上传 `server/` 文件夹覆盖到 `/www/wwwroot/ioftv/server/`，然后：

```bash
pm2 restart ioftv
```

---

## 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 页面打不开 | 安全组/防火墙未开放 8080 | 云控制台安全组 + 宝塔防火墙都开放 8080 |
| pm2 status 无进程 | PM2 未启动 | `cd /www/wwwroot/ioftv/server && pm2 start npm -- start` |
| API 返回 404 | Nginx 配置代理规则有问题 | 检查 `/api` location 是否 proxy_pass 到 8890 |
| IFC 白屏 | `ifc/dist/` 未上传 | 确认 `/www/wwwroot/ioftv/ifc/dist/index.html` 存在 |
| WASM 加载失败 | `/wasm` 路径 404 | 确认 `static/js/wasm/web-ifc.wasm` 存在 |

```bash
# 查看详细日志
pm2 logs ioftv --lines 100

# 查看 Nginx 错误日志
tail -n 50 /var/log/nginx/error.log
```
