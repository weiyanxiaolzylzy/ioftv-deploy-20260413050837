# AGENTS.md

## First Read

Before making any code changes in this repository, read:

1. `docs/project-context.md`
2. `部署.md` when the task involves server deployment or Docker

## Priority Rules

1. Local development and debugging do not use Docker by default.
2. Docker is only for server deployment, acceptance testing on the server, and production-like packaging.
3. Do not switch local development workflows to Docker unless the user explicitly asks for it.
4. Keep PostgreSQL as the active database path.
5. Be careful not to break the existing main-page IFC display logic unless the user explicitly requests a change there.

## Local Development Defaults

- Frontend dev server: `npm run serve`
- Backend dev server: `npm run server:dev`
- Frontend default URL: `http://localhost:8080` or the Vue CLI port shown in terminal
- Backend default URL: `http://127.0.0.1:8890`

For normal local work:

- run frontend and backend separately
- inspect local logs first
- avoid Docker-specific fixes unless the issue is only happening on the server

## Server Deployment Defaults

- Use Docker only on the deployment server
- Main deployment files:
  - `Dockerfile`
  - `docker-compose.yml`
  - `部署.md`
- Default server app port: `8890`

## Key Directories

- `src/views/indexs`: main big-screen home modules
- `src/views/project-ifc`: project component management
- `src/views/secondview`: steel structure QC system
- `server`: Express backend and API routes
- `public`: shared static assets
- `banzu`: team photos
- `单个构件质检表`: QC Excel templates
- `ifc`: standalone IFC viewer assets

## Known Project Constraints

- Large frontend chunks can timeout over slow remote links such as Tailscale
- Local area network access is preferred for demos
- Static asset paths must be checked carefully in production builds
- Team data, component data, and QC templates are tied to PostgreSQL-backed APIs

## When Editing

- Prefer minimal, targeted changes
- Preserve current behavior unless the user explicitly asks for behavior changes
- If the task touches deployment, confirm whether the target is:
  - local development
  - server Docker deployment
  - both
