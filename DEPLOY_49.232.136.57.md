# 部署教程 — 49.232.136.57

> 服务器 IP：`49.232.136.57`
> 部署路径：`/opt/ioftv/`
> 修订日期：`2026-04-27`

---

## 系统架构

```
浏览器 → http://49.232.136.57:8080
│
├── /              → Vue 大屏前端         (Nginx 读取 /opt/ioftv/dist)
├── /api/*         → Express API          (PM2 管理，端口 8890)
├── /uploads/*     → 上传文件             (Nginx / Node 共用 /opt/ioftv/server/uploads)
├── /ifc/*         → IFC BIM 查看器       (Nginx 读取 /opt/ioftv/ifc/dist)
├── /wasm/*        → IFC WASM 文件        (Nginx 读取 /opt/ioftv/public/static/js/wasm)
└── /pyapi/*       → Python IFC 服务      (systemd 管理，端口 8765)
```

**实际运行方式是：Nginx 负责静态资源和反向代理，Node 只处理 `/api`，Python 只处理 `/pyapi`。**

---

## 上传包说明

本地已经整理好的部署目录是：

```text
d:\Roaming\ioftv-deploy-20260413050837\上传\
```

这个目录现在已经是**可直接上传到 `/opt/ioftv/`** 的结构，包含：

```text
上传/
├── app.py
├── ifc_service.py
├── requirements_pip.txt
├── dist/
├── ifc/
│   └── dist/
├── public/
│   └── static/js/wasm/
├── server/
├── 单个构件质检表/
└── uploads/
```

说明：

- `dist/` 已补齐为主前端运行目录。
- `ifc/dist/` 已补齐为 IFC 查看器运行目录。
- `public/static/js/wasm/` 已补齐，和 [server/index.js](/d:/Roaming/ioftv-deploy-20260413050837/server/index.js:83) 的实际读取路径一致。
- `app.py`、`ifc_service.py`、`requirements_pip.txt` 已放进上传包，不需要再单独手传。

---

## 第一步：安装运行环境

SSH 登录服务器后执行：

```bash
apt update
apt install -y curl nginx python3 python3-pip python3-venv

# 安装 Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 PM2
npm install -g pm2

# 验证
node -v
npm -v
pm2 --version
python3 --version
pip3 --version
nginx -v
```

---

## 第二步：创建部署目录和 Python 虚拟环境

```bash
mkdir -p /opt/ioftv
cd /opt
python3 -m venv ioftv-venv
source /opt/ioftv-venv/bin/activate
```

---

## 第三步：上传项目文件

### 方式一：SCP 上传

在本地 PowerShell 执行：

```powershell
cd d:\Roaming\ioftv-deploy-20260413050837

# 先确保服务器目录存在
ssh root@49.232.136.57 "mkdir -p /opt/ioftv"

# 上传 上传/ 目录里的所有内容，而不是上传整个 上传 目录
scp -r .\上传\* root@49.232.136.57:/opt/ioftv/
```

### 方式二：宝塔面板上传

1. 登录宝塔：`http://49.232.136.57:8888`
2. 进入 `/opt/ioftv/`
3. 把本地 `上传/` 目录里的**所有内容**上传进去

> 关键点：服务器上最终应当是 `/opt/ioftv/dist`、`/opt/ioftv/ifc/dist`、`/opt/ioftv/server`，而不是 `/opt/ioftv/上传/...`。

---

## 第四步：安装 Python 依赖

```bash
source /opt/ioftv-venv/bin/activate
pip install -r /opt/ioftv/requirements_pip.txt

# 可选验证
python3 -c "import ifcopenshell; print('ifcopenshell OK')"
python3 -c "import fastapi; print('fastapi OK')"
```

---

## 第五步：检查 Node 后端依赖

上传包里已经带了 `server/node_modules`，通常不需要重新安装。

只有在依赖缺失时才执行：

```bash
cd /opt/ioftv/server
npm install
```

---

## 第六步：启动服务

### 6.1 启动 Node.js（PM2）

```bash
cd /opt/ioftv/server
pm2 delete ioftv 2>/dev/null || true
pm2 start npm --name ioftv -- start
pm2 save
pm2 startup
```

验证：

```bash
curl http://localhost:8890/health
```

预期返回包含：

```json
{"status":"ok","service":"ioftv-api","port":8890}
```

### 6.2 启动 Python（systemd，推荐）

创建 systemd 服务文件：

```bash
cat >/etc/systemd/system/ioftv-python.service <<'EOF'
[Unit]
Description=IOFTV Python FastAPI Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/ioftv
ExecStart=/opt/ioftv-venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8765
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
```

加载并启动：

```bash
systemctl daemon-reload
systemctl enable ioftv-python
systemctl restart ioftv-python
systemctl status ioftv-python --no-pager
```

验证：

```bash
curl http://localhost:8765/health
```

预期返回：

```json
{"status":"healthy"}
```

---

## 第七步：配置 Nginx

如果你用宝塔，进入站点配置文件直接替换成下面内容；如果不用宝塔，把它写到 Nginx 的 `server` 配置中即可。

```nginx
server
{
    listen 8080;
    server_name _;

    location / {
        root /opt/ioftv/dist;
        try_files $uri $uri/ /index.html;
    }

    location /ifc/ {
        alias /opt/ioftv/ifc/dist/;
        try_files $uri $uri/ /ifc/index.html;
    }

    location /ifc/assets/ {
        alias /opt/ioftv/ifc/dist/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /ifc/wasm/ {
        alias /opt/ioftv/ifc/dist/wasm/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8890;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /pyapi/ {
        proxy_pass http://127.0.0.1:8765/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads/ {
        alias /opt/ioftv/server/uploads/;
        expires 7d;
    }

    location /wasm/ {
        alias /opt/ioftv/public/static/js/wasm/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /opt/ioftv/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

---

## 第八步：开放端口 8080

需要同时开放：

- 云服务器安全组：TCP `8080`
- 宝塔防火墙：TCP `8080`

---

## 第九步：部署验证

浏览器访问：

```text
http://49.232.136.57:8080
```

服务器上执行：

```bash
curl http://localhost:8890/health
curl http://localhost:8765/health
curl http://localhost:8080/
curl http://localhost:8080/ifc/
curl http://localhost:8080/wasm/web-ifc.wasm
curl http://localhost:8080/pyapi/health
pm2 status
systemctl status ioftv-python --no-pager
```

---

## 服务器目录结构

```text
/opt/ioftv/
├── app.py
├── ifc_service.py
├── requirements_pip.txt
├── dist/
│   ├── index.html
│   ├── people.jpg
│   ├── img/
│   ├── map-geojson/
│   └── static/
├── ifc/
│   ├── dist/
│   │   ├── index.html
│   │   ├── assets/
│   │   ├── wasm/
│   │   └── IFCWorker.js
├── public/
│   └── static/js/wasm/
├── server/
│   ├── index.js
│   ├── package.json
│   ├── node_modules/
│   ├── data.json
│   └── uploads/
├── 单个构件质检表/
└── uploads/
```

---

## 日常维护

```bash
# Node 状态和日志
pm2 status
pm2 logs ioftv
pm2 restart ioftv

# Python 状态和日志
systemctl status ioftv-python --no-pager
journalctl -u ioftv-python -n 100 --no-pager
systemctl restart ioftv-python

# Nginx
nginx -t
systemctl reload nginx
tail -n 50 /var/log/nginx/error.log
```

---

## 更新部署

### 更新前端

上传新 `dist/` 覆盖 `/opt/ioftv/dist/`。

### 更新 IFC 查看器

上传新 `ifc/dist/` 覆盖 `/opt/ioftv/ifc/dist/`。

### 更新 Node 后端

上传新 `server/` 覆盖 `/opt/ioftv/server/`，然后：

```bash
pm2 restart ioftv
```

### 更新 Python 服务

上传新 `app.py`、`ifc_service.py`、`requirements_pip.txt`，然后：

```bash
source /opt/ioftv-venv/bin/activate
pip install -r /opt/ioftv/requirements_pip.txt
systemctl restart ioftv-python
```

---

## 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 页面打不开 | 8080 未开放 | 开放云安全组和宝塔防火墙 |
| `/api/*` 502/404 | Node 未启动或 Nginx 代理错误 | `pm2 status`，检查 `/api/` 代理到 `8890` |
| `/pyapi/*` 502 | Python 未启动 | `systemctl status ioftv-python` |
| IFC 白屏 | `ifc/dist/` 未上传完整 | 检查 `/opt/ioftv/ifc/dist/index.html` 和 `assets/` |
| `/wasm/*` 404 | `public/static/js/wasm/` 不完整 | 检查 `/opt/ioftv/public/static/js/wasm/` |
| Python 启动报依赖错误 | 虚拟环境未安装依赖 | `pip install -r /opt/ioftv/requirements_pip.txt` |
