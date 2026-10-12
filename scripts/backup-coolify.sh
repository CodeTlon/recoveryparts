#!/usr/bin/env bash
# Backup de un recurso en Coolify (base Postgres + volumen de archivos). Se corre en el VPS.
#
# Variables obligatorias:  UUID (del recurso en Coolify) · PROJECT (ej. recoveryparts) · ENVIRONMENT (prod | staging | demo)
# Opcionales:
#   REMOTE=b2:<bucket>        destino rclone (si falta, solo copia local)
#   ENV_FILE=/etc/backup/x.env  archivo chmod 600 con RCLONE_CONFIG_B2_ACCESS_KEY_ID, etc. (nunca secretos en el crontab)
#   DEST=~/backups  DIAS=14   carpeta y retención LOCAL; la remota la define la regla de ciclo de vida del bucket
#
# Estructura en el bucket:  <entorno>/<proyecto>/{postgres,files}/<AAAA-MM-DD>/<proyecto>_<entorno>_<tipo>_<AAAAMMDDTHHMMSSZ>.<ext>
# Cada archivo lleva su .sha256. Nunca se sobrescribe nada (el nombre incluye la hora UTC).
set -euo pipefail
: "${UUID:?Falta UUID (el del recurso en Coolify)}"
: "${PROJECT:?Falta PROJECT (ej. recoveryparts)}"
: "${ENVIRONMENT:?Falta ENVIRONMENT (prod | staging | demo)}"
case "$ENVIRONMENT" in prod|staging|demo) ;; *) echo "ENVIRONMENT debe ser prod, staging o demo" >&2; exit 1 ;; esac
if [ -n "${ENV_FILE:-}" ]; then set -a; . "$ENV_FILE"; set +a; fi

DEST="${DEST:-$HOME/backups}"
DIAS="${DIAS:-14}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIA="$(date -u +%F)"
mkdir -p "$DEST"

DB="$(docker ps --format '{{.Names}}' | grep "^db-$UUID" | head -n1)"
[ -n "$DB" ] || { echo "No encontré el contenedor db-$UUID (¿recurso detenido?)" >&2; exit 1; }

DUMP="${PROJECT}_${ENVIRONMENT}_postgres_${TS}.dump"
TARF="${PROJECT}_${ENVIRONMENT}_files_${TS}.tar.gz"

# Se escribe a un temporal y recién al terminar se renombra: un corte no deja un backup a medias con nombre válido.
docker exec "$DB" pg_dump -U "${POSTGRES_USER:-postgres}" -Fc "${POSTGRES_DB:-recoveryparts}" > "$DEST/.tmp-db"
mv "$DEST/.tmp-db" "$DEST/$DUMP"
docker run --rm -v "${UUID}_storage":/data:ro -v "$DEST":/out alpine tar czf /out/.tmp-files -C /data .
mv "$DEST/.tmp-files" "$DEST/$TARF"

# Un dump vacío es un backup roto: mejor fallar fuerte que guardar basura.
[ -s "$DEST/$DUMP" ] || { echo "El dump salió vacío" >&2; rm -f "$DEST/$DUMP"; exit 1; }
( cd "$DEST" && sha256sum "$DUMP" > "$DUMP.sha256" && sha256sum "$TARF" > "$TARF.sha256" )

if [ -n "${REMOTE:-}" ]; then
  BASE="$REMOTE/$ENVIRONMENT/$PROJECT"
  rclone copyto "$DEST/$DUMP"        "$BASE/postgres/$DIA/$DUMP"
  rclone copyto "$DEST/$DUMP.sha256" "$BASE/postgres/$DIA/$DUMP.sha256"
  rclone copyto "$DEST/$TARF"        "$BASE/files/$DIA/$TARF"
  rclone copyto "$DEST/$TARF.sha256" "$BASE/files/$DIA/$TARF.sha256"
  echo "Subido a $BASE"
fi

find "$DEST" -maxdepth 1 -name "${PROJECT}_${ENVIRONMENT}_*" -mtime "+$DIAS" -delete
echo "OK $(date +%F-%H:%M) → $DEST"; ls -lh "$DEST" | tail -n 5
