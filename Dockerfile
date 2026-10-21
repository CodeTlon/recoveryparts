# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Sin DATABASE_URL en el build: las páginas con datos se renderizan por request.
# La URL pública se incrusta en sitemap, robots y metadatos: tiene que llegar como argumento de build.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# /app/.next/cache existe y es de `app` ANTES de montar el volumen: un volumen nuevo hereda dueño y permisos de la imagen
# (si la carpeta no existiera se crearía como root y la app no podría escribir el caché de imágenes optimizadas).
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/storage /app/.next/cache && chown app:app /data/storage /app /app/.next /app/.next/cache
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
