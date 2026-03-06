FROM node:22-bookworm-slim

ARG PNPM_VERSION=9.15.9

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice tesseract-ocr poppler-utils ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @docsi/api build

ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
ENV SQLITE_PATH=/data/docsi.db

VOLUME ["/data"]
EXPOSE 3333

CMD ["pnpm", "--filter", "@docsi/api", "start"]
