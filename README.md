# IOFTV

## Overview

This repository is a steel-structure visualization and quality-inspection project.

Main parts:

- `src/`: Vue 2 frontend
- `server/`: Express backend
- `ifc/`: standalone IFC viewer related assets

The current active backend database path is PostgreSQL.

## Read This First

If you are editing code with Codex, read these files first:

- `AGENTS.md`
- `docs/project-context.md`

Those files define the current project workflow and the separation between local development and server deployment.

## Important Workflow Rule

Do not mix local development with server deployment.

### Local development

Local development is the default workflow for normal coding and debugging.

Use:

```bash
npm install
npm run serve
npm run server:dev
```

Default local addresses:

- frontend: `http://localhost:8080` or the Vue CLI port shown in terminal
- backend: `http://127.0.0.1:8890`

Local development does not require Docker by default.

### Server deployment

Docker is used for deployment on the server.

Use Docker when:

- packaging the app for the server
- running the deployed service on the server
- connecting the deployed app to the server PostgreSQL

Do not switch normal local development to Docker unless explicitly needed.

## Main Directories

```text
.
├── src/                    frontend source
├── server/                 backend source
├── ifc/                    IFC viewer assets / project
├── public/                 shared static assets
├── banzu/                  team photos
├── 单个构件质检表/         QC Excel templates
├── docs/                   project docs
├── Dockerfile              server deployment image
├── docker-compose.yml      server deployment compose file
└── 部署.md                 server deployment steps
```

## Local Development

Install dependencies at project root:

```bash
npm install
```

Start frontend:

```bash
npm run serve
```

Start backend:

```bash
npm run server:dev
```

Backend health check:

```bash
curl http://127.0.0.1:8890/health
```

## Build

Build frontend:

```bash
npm run build
```

Build IFC viewer if needed:

```bash
cd ifc
npm run build
```

## Deployment

Server deployment uses Docker.

Main files:

- `Dockerfile`
- `docker-compose.yml`
- `部署.md`

Typical deployed app port:

- `8890`

Common access examples:

- LAN: `http://192.168.60.10:8890`
- Tailscale: `http://100.104.212.6:8890`

For demos and acceptance:

- prefer LAN access first
- use Tailscale as a remote-access path, not the preferred performance path

Detailed deployment instructions:

- [部署.md](./部署.md)

## IFC Upload Parsing

Large IFC files are handled asynchronously.

Current flow:

- `POST /api/upload-ifc` uploads the file and returns quickly
- backend creates a parse job
- frontend polls `GET /api/upload-ifc-status/:jobId`
- IFC parsing runs in a child process

Related files:

- `server/index.js`
- `server/ifc-parser.js`
- `server/ifc-parse-worker.js`
- `src/views/indexs/center-map.vue`

## Known Notes

- Large frontend chunks can time out on slow remote links
- LAN access is preferred over Tailscale for smoother demos
- Static asset paths must be checked carefully in production builds
- IFC-related pages can be heavy because of 3D assets and model parsing

## Git Notes

This workspace contains generated and temporary files.

Avoid:

```bash
git add .
```

Prefer staging only the files you actually changed.
