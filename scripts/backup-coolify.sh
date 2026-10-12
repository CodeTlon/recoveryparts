#!/usr/bin/env bash
# Backup de un recurso de Recovery Parts en Coolify (base + PDFs/imágenes). Se corre en el VPS.
# Uso:  UUID=<uuid-del-recurso> [REMOTE=r2:backups/recoveryparts] ./backup-coolify.sh   (típico: cron diario)
# Deja en $DEST: rp-<uuid>-db-<fecha>.dump (pg_dump -Fc) y rp-<uuid>-storage-<fecha>.tar.gz; borra los de más de $DIAS días.
set -euo pipefail
: "${UUID:?Falta UUID (el del recurso en Coolify)}"
DEST="${DEST:-$HOME/backups}"
DIAS="${DIAS:-14}"
FECHA="$(date +%F-%H%M)"
mkdir -p "$DEST"

DB="$(docker ps --format '{{.Names}}' | grep "^db-$UUID" | head -n1)"
[ -n "$DB" ] || { echo "No encontré el contenedor db-$UUID (¿recurso detenido?)" >&2; exit 1; }

# Base: escribe a un temporal y recién al terminar lo renombra, así un corte no deja un dump a medias con nombre válido.
docker exec "$DB" pg_dump -U "${POSTGRES_USER:-postgres}" -Fc "${POSTGRES_DB:-recoveryparts}" > "$DEST/.rp-db.tmp"
mv "$DEST/.rp-db.tmp" "$DEST/rp-$UUID-db-$FECHA.dump"

# Archivos (PDFs de materiales e imágenes del sitio): volumen <uuid>_storage.
docker run --rm -v "${UUID}_storage":/data:ro -v "$DEST":/out alpine \
  tar czf "/out/.rp-storage.tmp" -C /data .
mv "$DEST/.rp-storage.tmp" "$DEST/rp-$UUID-storage-$FECHA.tar.gz"

# Copia fuera del VPS (opcional): REMOTE=<remoto-rclone>:<bucket>/<carpeta>, p. ej. r2:backups/recoveryparts.
# La retención remota la define la regla de ciclo de vida del bucket (no hace falta permiso de borrado).
if [ -n "${REMOTE:-}" ]; then
  rclone copy "$DEST" "$REMOTE" --include "rp-$UUID-*-$FECHA.*"
  echo "Subido a $REMOTE"
fi

find "$DEST" -maxdepth 1 -name "rp-$UUID-*" -mtime "+$DIAS" -delete
echo "OK $(date +%F-%H:%M) → $DEST"; ls -lh "$DEST" | tail -n 4
