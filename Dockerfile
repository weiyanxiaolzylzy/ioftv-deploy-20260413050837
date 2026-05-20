ARG NODE_IMAGE=swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:18-bullseye

FROM ${NODE_IMAGE} AS builder

WORKDIR /app

COPY package*.json ./
COPY babel.config.js ./
COPY vue.config.js ./
RUN npm install --legacy-peer-deps

COPY public ./public
COPY src ./src
COPY ifc ./ifc
COPY banzu ./banzu
COPY 单个构件质检表 ./单个构件质检表
COPY server ./server
COPY beijin2.jpg ./

RUN npm run build

FROM ${NODE_IMAGE} AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8890
ENV DB_CLIENT=postgres

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/ifc ./ifc
COPY --from=builder /app/banzu ./banzu
COPY --from=builder /app/单个构件质检表 ./单个构件质检表

RUN mkdir -p /app/server/uploads/ifc /app/public/static/js/wasm

EXPOSE 8890

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 CMD node -e "fetch('http://127.0.0.1:8890/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
