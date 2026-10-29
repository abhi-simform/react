# 14.3: the storefront is a static SPA (react-router `ssr: false`), so the runtime image holds NO Node and no
# node_modules: just nginx and the files of build/client. The scaffold's Dockerfile (kept in git history) was for an
# SSR server: three Node stages ending in `npm run start` (react-router-serve), ~200 MB, a Node process per container.
#
#   docker build -t shopsphere-frontend \
#     --build-arg VITE_API_URL=https://api.example.com/api/v1 \
#     --build-arg VITE_SITE_URL=https://shop.example.com .
#   docker run --rm -p 5173:8080 shopsphere-frontend
#
# VITE_* values are BUILD arguments, not runtime variables: Vite inlines them into the JavaScript while it builds
# (and build-headers.mjs derives the CSP from them). One image per API origin; to change it, rebuild.

# ---- 1. build: install exactly what package-lock.json says, compile, emit build/client ----
FROM node:24-alpine AS build
WORKDIR /app
# Copy the manifests FIRST: this layer (and the slow `npm ci`) is reused until a dependency changes.
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_API_URL=http://localhost:4000/api/v1
ARG VITE_SITE_URL=http://localhost:5173
ARG VITE_SENTRY_DSN=
ARG VITE_RELEASE=
ARG VITE_ENVIRONMENT=production
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_RELEASE=$VITE_RELEASE \
    VITE_ENVIRONMENT=$VITE_ENVIRONMENT
# Source-map upload (14.6) is a BuildKit secret, never an ARG (args are visible in `docker history`):
#   docker build --secret id=sentry_token,env=SENTRY_AUTH_TOKEN --build-arg SENTRY_ORG=... --build-arg SENTRY_PROJECT=...
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
RUN --mount=type=secret,id=sentry_token \
    if [ -f /run/secrets/sentry_token ]; then export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_token)"; fi; \
    SENTRY_ORG=$SENTRY_ORG SENTRY_PROJECT=$SENTRY_PROJECT npm run build

# ---- 2. runtime: nginx (unprivileged: uid 101, port 8080, can bind without root) + static files ----
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/nginx-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/build/client /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
