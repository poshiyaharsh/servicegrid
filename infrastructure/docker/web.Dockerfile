FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ui/ ./packages/ui/
COPY apps/web/ ./apps/web/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @servicegrid/ui build
RUN pnpm --filter @servicegrid/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@servicegrid/web", "start"]
