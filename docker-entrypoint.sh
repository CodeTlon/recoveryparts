#!/bin/sh
set -e
# Sin estas variables la app arrancaría mal (cookies sin firma segura, links de invitación a localhost).
[ "${#SESSION_SECRET}" -ge 32 ] || { echo "Falta SESSION_SECRET (mínimo 32 caracteres)"; exit 1; }
[ -n "$NEXT_PUBLIC_SITE_URL" ] || { echo "Falta NEXT_PUBLIC_SITE_URL"; exit 1; }
# Aplica las migraciones pendientes (idempotente) y arranca el servidor.
node scripts/migrate.mjs
exec node server.js
