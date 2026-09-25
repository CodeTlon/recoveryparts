# Estado para retomar — Recovery Parts

Última sesión: 2026-06-26. Todo compila (`npx tsc --noEmit` → 0) y renderiza (home 200).

## Para arrancar
```
npm run dev   # http://localhost:3000
```

## Hecho en esta sesión
- **Precios** unificados: $25.000 inscripción + 3 cuotas de $65.000 sin interés (config, /cursos, /curso, FAQ, pricing).
- **Dirección**: presencial en La Rioja 345, X5022 Córdoba (config `business.address` + footers + FAQ).
- **Campus**: sin notas → asistencia + evaluación final (panel profe). Material solo PDF (panel alumno).
- **Galería egresados** (home, sección `#egresados`):
  - 12 retratos descargados en `public/images/egresado-1..12.jpg` (600×600, de pravatar — caras random).
  - Layout = **bento grid que tesela exacto** (2 destacadas 2×2 + 8 simples = 4×4, sin huecos).
  - Usa 10 de las 12. Mujeres = SOLO #5 y #6 (verificado). Nombres asignados por género.
  - Nombres/especialidades son inventados para la demo → cambiar por reales.
- **Hero home** (en `src/app/page.tsx`, no usa `Hero.tsx`): simplificado (sin franja de stats), overlay más opaco para legibilidad, doble CTA (Ver Cursos + WhatsApp).

## Pendiente / a revisar
- Verificar visualmente galería + hero en el navegador (no pude: extensión Chrome desconectada).
- `public/images/egresados.jpg` (foto grupal) quedó sin uso → borrar o reusar.
- `egresado-11.jpg` y `egresado-12.jpg` descargadas pero no usadas (repuesto).
- Métodos de pago en FAQ (efectivo 15% off, GoCuotas, etc.) → confirmar cuáles aplican.
- Guion del Loom en `GUION-LOOM.md`.
