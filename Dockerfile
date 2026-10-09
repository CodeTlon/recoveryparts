# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Sin DATABASE_URL en el build: las páginas con datos se renderizan por request.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/storage && chown app:app /data/storage
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Next empaqueta postgres dentro del servidor; los scripts (migrate, crear-admin) lo necesitan suelto.
COPY --from=deps --chown=app:app /app/node_modules/postgres ./node_modules/postgres
COPY --from=build --chown=app:app /app/db ./db
COPY --from=build --chown=app:app /app/scripts/migrate.mjs /app/scripts/crear-admin.mjs ./scripts/
COPY --chown=app:app docker-entrypoint.sh ./
USER app
VOLUME /data/storage
EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
