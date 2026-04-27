# IOFTV Deploy Project

## Overview

This repository contains three parts:

- `src/`: Vue 2 big-screen frontend
- `server/`: Node.js backend for `/api/*`
- `ifc/`: standalone IFC viewer

Production deployment currently follows this structure:

- Nginx serves `/opt/ioftv/dist`
- Nginx proxies `/api/*` and `/bigscreen/*` to Node on `8890`
- Nginx proxies `/pyapi/*` to Python on `8765`
- Nginx serves `/ifc/*` from `/opt/ioftv/ifc/dist`

## Main Directories

```text
.
├── src/                    Vue frontend source
├── server/                 Node backend source
├── ifc/                    IFC viewer source
├── dist/                   frontend build output
├── 上传/                   prepared deployment package
├── DEPLOY_49.232.136.57.md deployment notes for current server
└── requirements_pip.txt    Python dependency list
```

## Local Development

Install dependencies:

```bash
npm install
cd server && npm install
cd ../ifc && npm install
```

Start the main frontend:

```bash
npm run serve
```

Start the Node backend:

```bash
npm run server:dev
```

Default local ports:

- frontend: `http://localhost:8081`
- node api: `http://127.0.0.1:8890`

Backend health check:

```bash
curl http://127.0.0.1:8890/health
```

## Build

Build the frontend:

```bash
npm run build
```

Build the IFC viewer:

```bash
cd ifc
npm run build
```

## IFC Upload Parsing

Large IFC files previously blocked the main Node process because upload and parse happened in the same request.

Current implementation:

- `POST /api/upload-ifc` uploads the file and returns immediately
- backend creates a parse job
- frontend polls `GET /api/upload-ifc-status/:jobId`
- IFC parsing runs in a child process

Related files:

- `server/index.js`
- `server/ifc-parser.js`
- `server/ifc-parse-worker.js`
- `src/views/indexs/center-map.vue`

This avoids long synchronous parsing from causing `504 Gateway Time-out`.

## Production Deployment

Prepared deployment package:

```text
上传/
```

Typical upload targets:

- `/opt/ioftv/dist/`
- `/opt/ioftv/server/`
- `/opt/ioftv/ifc/dist/`

Server-side service summary:

- Node API: `pm2`
- Python API: `systemd`
- reverse proxy: `nginx`

Detailed deployment steps:

- [DEPLOY_49.232.136.57.md](./DEPLOY_49.232.136.57.md)

## Nginx Notes

Recommended for large IFC uploads:

```nginx
client_max_body_size 500m;

location /api/ {
    proxy_pass http://127.0.0.1:8890;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;
}
```

## Current Known Non-blocking Issues

- some `/uploads/*.png` files may be missing
- websocket connection for real-time detection may fail if the WS relay is not deployed
- IFC parsing still takes time for very large files, but it should no longer block the whole API process

## Git Notes

This workspace contains many generated and temporary files. Avoid using:

```bash
git add .
```

Prefer staging only the files you actually changed.
