FROM node:22-bookworm-slim AS build

ARG PNPM_VERSION=9.15.9

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web ./apps/web
COPY packages ./packages

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @docsi/web build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY infra/nginx.default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
