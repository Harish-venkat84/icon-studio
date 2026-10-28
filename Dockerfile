# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/studio/package.json apps/studio/
COPY packages/core/package.json packages/core/
COPY packages/icons/package.json packages/icons/
RUN pnpm install --frozen-lockfile --filter @icon-studio/studio...
COPY packages/core packages/core
COPY apps/studio apps/studio
ENV NEXT_OUTPUT=standalone
# Optional: public host names served through a reverse proxy (baked into the build)
ARG STUDIO_ALLOWED_ORIGINS=
ENV STUDIO_ALLOWED_ORIGINS=$STUDIO_ALLOWED_ORIGINS
RUN pnpm --filter @icon-studio/studio build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3030
ENV HOSTNAME=0.0.0.0
ENV ICONS_STORAGE=github
COPY --from=builder /app/apps/studio/.next/standalone ./
COPY --from=builder /app/apps/studio/.next/static ./apps/studio/.next/static
EXPOSE 3030
CMD ["node", "--env-file=/app/.env", "apps/studio/server.js"]
