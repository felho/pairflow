# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    lsof \
    procps \
    tmux \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@10.8.1 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
COPY ui/package.json ui/pnpm-lock.yaml ./ui/

RUN pnpm install --frozen-lockfile \
  && pnpm --dir ui install --frozen-lockfile

FROM base AS build

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/ui/node_modules ./ui/node_modules
COPY . .

RUN pnpm build

FROM base AS dev

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/ui/node_modules ./ui/node_modules
COPY . .

CMD ["bash"]

FROM build AS ci

RUN pnpm lint \
  && pnpm typecheck \
  && pnpm test

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /workspace/dist ./dist
COPY --from=build /workspace/scripts ./scripts

ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["--help"]
