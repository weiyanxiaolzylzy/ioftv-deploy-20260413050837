# IOFTV Project Context

## Overview

This project is a steel-structure visualization and quality-inspection system.

It contains three main parts:

- Big-screen home page
- Project component / IFC management
- Steel QC workflow and result pages

The current repository is primarily a Vue 2 frontend plus an Express backend, with PostgreSQL as the active database.

## High-Priority Workflow Rule

Do not mix local development workflow with server deployment workflow.

### Local Development

Local development is the default way to edit and debug this project.

Use:

- `npm run serve` for the frontend
- `npm run server:dev` for the backend

This means:

- frontend and backend run separately
- local debugging does not require Docker
- local code edits should first be verified in this mode

### Server Deployment

Docker is only used for server deployment and acceptance-style server testing.

Use Docker on the server for:

- packaging the app
- running the deployed service
- connecting the deployed app to the server PostgreSQL

Do not assume Docker is the normal local development path.

## Current Stack

### Frontend

- Vue 2
- Vue CLI
- Vue Router
- Vuex
- Element UI
- ECharts
- Three.js
- Web-IFC related packages

Main frontend entry areas:

- `src/views/indexs`
- `src/views/project-ifc`
- `src/views/secondview`

### Backend

- Express
- CORS
- Multer
- XLSX
- PostgreSQL access through server-side DB wrapper modules

Main backend entry:

- `server/index.js`

### Database

Active database:

- PostgreSQL

Expected local defaults used by scripts:

- host: `localhost` or `127.0.0.1`
- port: `5432`
- database: `postgres`
- user: `postgres`

## Main Functional Areas

### 1. Big-Screen Home

Location:

- `src/views/indexs`

Purpose:

- visual overview
- production status display
- model-related overview widgets
- performance ranking
- team-related display

Important notes:

- this page is sensitive to visual regressions
- its IFC-related behavior should not be changed casually
- team data and ranking displays are expected to align with backend / database data

### 2. Project IFC / Component Management

Location:

- `src/views/project-ifc`

Purpose:

- import and manage project component data
- work with IFC-derived component records
- assign team / personnel related information
- manage detection plans

Important notes:

- component data accuracy is important
- database-backed component records are treated as the source for project management views
- changes here can affect downstream QC pages and visual summaries

### 3. Steel QC System

Location:

- `src/views/secondview`

Purpose:

- parameter input
- workspace / detection flow
- results and report presentation
- QC template use and export

Important notes:

- result-page templates are business-facing output
- exported content should preserve expected project and personnel fields
- the right-side model display has been customized for demo and comparison use

## Important Directories

### Source

- `src/`: main frontend source
- `server/`: backend source
- `ifc/`: standalone IFC viewer related project

### Assets and Data

- `public/`: static public assets
- `banzu/`: team photos
- `单个构件质检表/`: QC Excel templates
- `storage/`: local storage-related project data if present

### Deployment

- `Dockerfile`
- `docker-compose.yml`
- `部署.md`
- `.env.production`
- `.env.server.example`

## Local Development Instructions

### Install

At project root:

```bash
npm install
```

### Start frontend

```bash
npm run serve
```

### Start backend

```bash
npm run server:dev
```

### Default local addresses

- frontend: usually `http://localhost:8080` or the port printed by Vue CLI
- backend: `http://127.0.0.1:8890`

### Local development principles

- use this mode first when changing UI or backend logic
- inspect local logs before touching deployment files
- only move to Docker/server workflow when the issue is deployment-specific

## Server Deployment Instructions

Server deployment uses Docker.

Current deployment intent:

- build image on server
- run app on port `8890`
- connect app to server PostgreSQL

Typical server files:

- `/opt/ioftv/Dockerfile`
- `/opt/ioftv/docker-compose.yml`

Server access examples that have been used:

- LAN: `http://192.168.60.10:8890`
- Tailscale: `http://100.104.212.6:8890`

### Deployment guidance

- prefer LAN access for demos and acceptance
- Tailscale access can be slower, especially for large frontend chunks
- when remote chunk loading times out, verify whether the issue is network path rather than missing files

## Known Operational Notes

### Large frontend chunks

Some IFC- and secondview-related chunks are large.

Implications:

- server may be healthy while remote browser access still times out
- Tailscale or weak links can cause `ChunkLoadError`
- LAN access is preferred for demos

### Static assets

Static asset paths must be checked carefully in production builds.

Examples:

- fonts under `public/`
- IFC wasm assets
- team photo assets under `banzu/`

### Compression

Backend static compression is relevant for deployment performance.

If deployed pages are slow over remote links, check whether the current server build includes response compression.

## Editing Guidelines For Future Work

When changing code in this repository:

1. First identify whether the target is local dev behavior or server deployment behavior.
2. If the issue is reproducible locally, fix it locally first.
3. Only touch Docker files when the issue is specific to the deployed server environment.
4. Avoid mixing deployment fixes into ordinary feature work unless necessary.
5. Preserve business-facing behavior unless the user explicitly requests changes.

## Recommended Read Order For Codex

1. `AGENTS.md`
2. `docs/project-context.md`
3. task-specific files such as:
   - `部署.md`
   - `server/index.js`
   - relevant files under `src/views/...`
