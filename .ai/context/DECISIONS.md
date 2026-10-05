# Registro de decisiones

Una línea por decisión: qué, por qué. Las más nuevas arriba.

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-05 | Reportes se fusiona con el Resumen del admin; el sitio web se edita por pestañas | El resumen era solo 4 tarjetas y la edición del sitio era una página larga sin contexto de qué se editaba |
| 2026-10-05 | Kit por ítem «necesario»/«recomendado» (`kit_items.requerido`, migración 0009) con link de compra a Mundo Parts | Algunos materiales hacen falta para cursar y otros son sugeridos; la tienda socia solo se enlaza (la venta no pasa por el sistema, RF-45/46) |
| 2026-10-05 | Contacto y Preguntas frecuentes con página propia; la home queda como resumen | Pedido del cliente: ordenar el sitio. La home muestra 4 FAQ y una banda hacia `/contacto` |
| 2026-10-05 | Encabezados de seguridad en el middleware y server actions con nombre ASCII | Vercel rechazaba el deploy («Builder returned invalid routes»): la `ñ` de `añadirAlumno` iba al encabezado `x-server-action-name` |
| 2026-10-05 | El PDF de avance no lleva capturas ni precios: una sección por página, con credenciales | Pedido del cliente; es un informe de demo, no una propuesta |
| 2026-10-05 | `dev` manda sobre `feat/unificacion`; la base de homologación se recreó desde las migraciones de `dev` | `feat/unificacion` es un linaje viejo con otro esquema; unificar era reescribir, no mergear. La base de test es de pruebas, así que se vació y se re-aplicó |
| 2026-10-05 | Cuentas de demo fijas: `@demo.example.com` / `demo1234` (solo seeds, que se niegan a correr fuera de development/test) | Fáciles de dictar al cliente; admin = Maxi Gómez |
| 2026-10-05 | Talleres de formato corto (1 jornada, 3 días seguidos, 1–2 semanas) además de cursos | Pedido del cliente; el tipo `taller` ya existía, no hay límite de clases en la base |
| 2026-10-05 | Formularios del curso por filas (no textarea con `\|`) y gráficos SVG propios | Más intuitivo; las server actions siguen recibiendo el mismo texto. Sin librerías de gráficos |
| 2026-10-05 | Sin `alert`/`confirm` del navegador: `ModalButton` y `Confirm` con modal propio | Pedido del cliente; consistencia visual y accesibilidad |
| 2026-10-01 | Tres entornos: desarrollo (Supabase local) → homologación (`test`, Supabase remoto actual) → producción (`main`); ramas `feature/* → dev → test` por merge y `test → main` por PR | Pedido del cliente; homologación es espejo de producción |
| 2026-10-01 | Hosting en GitHub + Vercel; CI en GitHub Actions; migraciones automáticas al mergear a `test`/`main` | Despliegue directo con Next.js y un entorno por rama |
| 2026-10-01 | Registro público desactivado también en `supabase/config.toml` (local) y por migración en la base | Defensa en profundidad; en los proyectos remotos se desactiva en el panel de Auth |
| 2026-10-01 | Proyecto local con `project_id = recoveryparts-dev` | Existía un volumen Docker viejo `recoveryparts` con otro esquema y datos; no se tocó |
| 2026-10-01 | `seed-homologacion.mjs` pasa a `seed-pruebas.mjs` con `ENV_FILE` y se niega a correr si `APP_ENV` no es development/test | Poder sembrar desarrollo y homologación sin riesgo de tocar producción |
| 2026-10-01 | Perfil y rol solo si el usuario fue **invitado** (`invited_at`); migración 0006 reemplaza a la 0005 | El registro público estaba habilitado en Auth y permitía autoasignarse `rol=admin`. La 0005 rechazaba en el INSERT y bloqueaba también las invitaciones legítimas (GoTrue marca `invited_at` después de crear el usuario) |
| 2026-10-01 | Fijar `supabase-js 2.100.0` y `ssr 0.9.0` | Las versiones recientes exigen Node 22; el entorno usa Node 20 |
| 2026-10-01 | Cuentas de prueba en `@homologacion.example.com` | Supabase rechaza el dominio `.test`; `example.com` no recibe mails |
| 2026-10-01 | El alumno **puede descargar** los PDFs (además de la vista previa) | Pedido del cliente; cambia RF-33 (spec v0.6). El acceso sigue validado en el servidor |
| 2026-10-01 | **Sin botón flotante de WhatsApp** (RF-41 cancelado) | No se sabe nada de WhatsApp ni de un bot por ahora. Se mantienen los enlaces «Consultar por WhatsApp» |
| 2026-10-01 | Avisos automáticos **por mail** (RF-38) | Sin canal WhatsApp definido |
| 2026-10-01 | Entrada directa del alumno con un solo curso activo (RF-11) | Confirmado por el cliente; configurable desde el CMS |
| 2026-10-01 | Área pública «**Reparación y Tecnología**» | La academia no presta servicio técnico; la etiqueta «Servicio Técnico» sugería que sí |
| 2026-10-01 | Sin datos mockeados; backend real con Supabase | Pedido del cliente |
| 2026-10-01 | Sin asistencia, pagos, inscripciones ni stock | Los maneja software externo (spec §C) |
| 2026-10-04 | El ZIP del curso (RF-35) incluye **solo los PDFs ya liberados** (manual o fecha cumplida), igual que `material_visible`; si falla la descarga de un archivo responde 502 en vez de entregar un ZIP incompleto | El ZIP usa service role y traía también el material oculto o programado, que el alumno no podía ver | 
| 2026-10-04 | El desertor **sigue ocupando cupo** (la inscripción nunca se borra y cuenta para el cupo). Decidido por el cliente; no filtrar por estado en el trigger de cupo, `cupos_disponibles` ni los reportes | Respuesta a la duda de la auditoría (cupo vs. desertor) | 
| 2026-10-04 | Auditoría fase 3 (UI): `components/campus/ui.tsx` pasa a server y lo interactivo vive en `forms.tsx` (`'use client'`, re-exportado desde ui.tsx); `Field` usa `useId()`; texto sobre naranja en `text-surface` (contraste AA); `color-scheme: dark`; `loading/error/global-error/campus/not-found`, favicon, robots, sitemap, skip-link; `getSettings/getCursos/getHorarios` con `cache()` | IDs duplicados rompían las etiquetas; blanco sobre naranja daba 2,8:1 | 
| 2026-10-04 | Auditoría fase 2: «hoy» siempre en hora de Córdoba (`hoy_ar()` en SQL, `hoyAR()` en `src/lib/fechas.ts`); encuestas exigen curso y validan puntaje 1–5; el N° de clase del desertor se recalcula al cambiar el calendario; el cupo se serializa con lock; horarios/temario/kit se reemplazan en una transacción (`reemplazar_filas_curso`); `guardarClases` no borra clases con material ni acepta estados inválidos | El servidor está en UTC (desde las 21:00 «hoy» era mañana); varias acciones borraban y reinsertaban sin transacción | 
| 2026-10-04 | Auditoría de seguridad, fase 1: migración 0007 (URL http(s) y `storage_path` del propio curso en `materiales`, trigger de integridad, `audit_log` solo firmable por uno mismo, largos en formularios públicos, RPC sin `anon`); `src/lib/validar.ts` para validar URLs/imágenes; CSP + HSTS + Permissions-Policy; baja de cuenta con `ban_duration` | Un profesor/admin podía saltarse las validaciones de las server actions escribiendo por PostgREST (XSS con `javascript:`, lectura de PDFs de otro curso). `signOut(id)` no revocaba nada: espera un JWT |
| 2026-10-01 | Un solo sistema de diseño (tokens en Tailwind, azul/naranja) | Convivían dos (tokens `demo-*` y paleta Stitch) |
