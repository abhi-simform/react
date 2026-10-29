# A.8: the admin console as a static SPA behind nginx. `vite.config.ts` turns on TanStack Start's SPA mode, so the
# build emits `dist/client` (hashed assets + `_shell.html`) and NO Node runtime is needed in production: the access
# token lives in browser memory, pages render in the browser only.
#
#   docker build -t shopsphere-admin --build-arg VITE_API_URL=https://api.example.com/api/v1 .
#   docker run --rm -p 3000:8080 shopsphere-admin
#
# VITE_* values are BUILD arguments: Vite inlines them into the JavaScript. One image per API origin.
# The API's CORS_ORIGINS must contain the URL this image is served from, and the API's cookies must be
# usable from it (see README: COOKIE_SAMESITE / COOKIE_DOMAIN for a different-site deployment).

# ---- 1. build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_API_URL=http://localhost:4000/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- 2. runtime: unprivileged nginx (uid 101, port 8080) + static files ----
FROM nginxinc/nginx-unprivileged:1.29-alpine-slim
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
