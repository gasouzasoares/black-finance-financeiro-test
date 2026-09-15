FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig*.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm build

FROM build AS production-deps
RUN pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/dist ./dist
COPY --chown=node:node package.json ./
USER node
CMD ["node", "dist/apps/api/src/main.js"]

FROM caddy:2.10-alpine AS web
COPY --from=build /workspace/apps/web/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
