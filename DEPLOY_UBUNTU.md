# Ubuntu 服务器部署教程 — 钢结构检测系统

## 服务架构

| 服务 | 端口 | 技术栈 | 说明 |
|------|------|--------|------|
| Nginx | 80/443 | Nginx | 前端静态托管 + API 反向代理 |
| Express API | 8890 | Node.js | 业务 API 后端 |
| IFC 查看器 | 5173 | Vite/React | IFC 模型独立查看器 |
| PLY 点云后端 | 8000 | FastAPI/Python | PLY 文件解析与处理 |

---

## 第一步：服务器环境准备

### 1.1 更新系统并安装基础依赖

```bash
# 连接服务器
ssh root@你的服务器IP

# 更新系统
apt update && apt upgrade -y

# 安装基础工具
apt install -y curl wget git unzip vim htop
```

### 1.2 安装 Node.js（前端构建 + Express 后端）

```bash
# 安装 Node.js 18 LTS（推荐）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证
node -v   # 应显示 v18.x.x
npm -v

# 安装 PM2（进程管理器）
npm install -g pm2
```

### 1.3 安装 Python（PLY 点云后端）

```bash
# Python3 通常已预装，检查版本
python3 --version

# 安装 pip 和虚拟环境
apt install -y python3-pip python3-venv

# 安装依赖
pip3 install fastapi uvicorn python-multipart numpy
```

### 1.4 安装 Nginx

```bash
apt install -y nginx

# 启动并设置开机自启
systemctl start nginx
systemctl enable nginx
```

### 1.5 安装防火墙（如有需要）

```bash
apt install -y ufw
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 8890  # API（可选，仅内部使用）
ufw enable
```

---

## 第二步：在本地打包项目

### 2.1 创建生产环境配置文件

在项目根目录新建 `.env.production`：

```env
NODE_ENV = production
VUE_APP_URL_ENV = production
# ⚠️ 请将"你的服务器IP"替换为实际服务器地址
VUE_APP_BASE_API = http://你的服务器IP:8890
VUE_APP_IFC_URL = http://你的服务器IP:5173
```

### 2.2 构建前端

```bash
npm install
npm run build
```

构建完成后会生成 `dist/` 目录。

### 2.3 打包整个项目

```bash
tar -czvf ioftv-deploy.tar.gz \
  dist/ \
  server/ \
  ifc/ \
  PlyCloudWeb/ \
  package.json \
  package-lock.json \
  .env.production
```

### 2.4 上传到服务器

```bash
scp ioftv-deploy.tar.gz root@你的服务器IP:/opt/
```

---

## 第三步：服务器配置

### 3.1 解压项目

```bash
ssh root@你的服务器IP
cd /opt
tar -xzvf ioftv-deploy.tar.gz
```

### 3.2 配置 Nginx

```bash
# 创建 nginx 配置文件
cat > /etc/nginx/sites-available/ioftv << 'EOF'
server {
    listen 80;
    server_name _;

    # Vue 前端静态文件
    root /opt/dist;
    index index.html;

    # SPA 路由支持（Vue Router history 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理 → Express 后端
    location /api {
        proxy_pass http://127.0.0.1:8890;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # IFC 静态文件代理（iframe 嵌入用）
    location /ifc/ {
        proxy_pass http://127.0.0.1:5173/;
        proxy_set_header Host $host;
    }

    # PLY 点云后端代理
    location /ply-uploads {
        rewrite ^/ply-uploads(.*)$ $1 break;
        proxy_pass http://127.0.0.1:8000;
    }

    location /api/ply {
        proxy_pass http://127.0.0.1:8000/api/ply;
        proxy_set_header Host $host;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/ioftv /etc/nginx/sites-enabled/ioftv

# 移除默认站点
rm -f /etc/nginx/sites-enabled/default

# 测试并重载
nginx -t && systemctl reload nginx
```

### 3.3 启动 API 后端（Express，端口 8890）

```bash
cd /opt/server
npm install --production

# 使用 PM2 启动
pm2 delete ioftv-api 2>/dev/null || true
pm2 start npm --name ioftv-api -- start
pm2 save
pm2 startup
```

### 3.4 启动 IFC 独立查看器（Vite，端口 5173）

```bash
cd /opt/ifc
npm install

pm2 delete ioftv-ifc 2>/dev/null || true
pm2 start npm --name ioftv-ifc -- start dev -- --host 0.0.0.0 --port 5173
pm2 save
```

### 3.5 启动 PLY 点云后端（FastAPI，端口 8000）

```bash
cd /opt/PlyCloudWeb/PlyCloudWeb/backend

# 安装 Python 依赖
pip3 install fastapi uvicorn python-multipart numpy

pm2 delete ioftv-ply 2>/dev/null || true
pm2 start python --name ioftv-ply -- main.py
pm2 save
```

### 3.6 验证所有服务状态

```bash
pm2 status
# 应看到 ioftv-api、ioftv-ifc、ioftv-ply 三个服务均为 online

# 检查端口监听
ss -tlnp | grep -E '80|8890|5173|8000'
```

---

## 第四步：访问验证

在浏览器中打开：

```
http://你的服务器IP
```

应能看到登录页面。输入任意账号登录后进入主大屏。

**各服务健康检查：**
```bash
curl http://localhost:8890/api/projects   # Express API
curl http://localhost:8000/health         # FastAPI 健康检查
curl http://localhost:5173/               # IFC 查看器
```

---

## 第五步：域名 + HTTPS（可选）

### 安装 Certbot SSL 证书

```bash
apt install -y certbot python3-certbot-nginx

# 自动申请并配置 HTTPS
certbot --nginx -d yourdomain.com

# 自动续期测试
certbot renew --dry-run
```

Nginx 配置会自动更新，添加 HTTPS 相关配置。

---

## 日常维护命令

```bash
# 查看所有服务日志
pm2 logs

# 重启所有服务
pm2 restart all

# 查看实时日志（跟随）
pm2 logs --f

# 查看特定服务日志
pm2 logs ioftv-api

# 重启特定服务
pm2 restart ioftv-ply

# 监控资源使用
pm2 monit

# 卸载某个服务
pm2 delete ioftv-ifc
```

---

## 常见问题排查

**1. 前端页面一片空白**
```bash
# 检查 dist 目录是否存在
ls /opt/dist/

# 检查 Nginx 日志
tail -f /var/log/nginx/error.log
```

**2. API 请求报错 502/504**
```bash
# 检查 Express 是否在运行
pm2 status ioftv-api
# 查看日志
pm2 logs ioftv-api --lines 50
```

**3. PLY 上传/加载失败**
```bash
# 检查 FastAPI 是否运行
pm2 status ioftv-ply
pm2 logs ioftv-ply --lines 50

# 检查端口
ss -tlnp | grep 8000
```

**4. PM2 进程消失（服务器重启后）**
```bash
pm2 startup   # 重新生成启动脚本
pm2 save      # 保存当前进程列表
```

---

## 目录结构参考

```
/opt/
└── ioftv/                # 项目部署目录（可自定义）
    ├── dist/              # Vue 前端构建产物 ← Nginx root
    ├── server/            # Express API 后端
    ├── ifc/               # IFC 独立查看器
    └── PlyCloudWeb/       # PLY 点云处理后端
        └── PlyCloudWeb/
            └── backend/
                └── main.py
```

---

## 升级部署

每次代码更新后，重新执行打包上传步骤：

```bash
# 本地重新打包
npm run build
tar -czvf ioftv-deploy-v2.tar.gz dist/ server/ ifc/ PlyCloudWeb/ ...
scp ioftv-deploy-v2.tar.gz root@你的IP:/opt/

# 服务器上
cd /opt
tar -xzvf ioftv-deploy-v2.tar.gz
pm2 restart all
```
