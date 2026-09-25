# Guion Loom — Demo Recovery Parts

**Duración objetivo:** 3–4 min · **URL:** http://localhost:3000
**Login (cualquier password entra):** alumno@recoveryparts.com.ar / profe@... / admin@... · pass `demo1234`

> Tip: antes de grabar, abrí las 3 pestañas que vas a usar (`/`, `/cursos`, `/login`) y cerrá notificaciones. Hablá tranquilo, scroll lento.

---

## 0 · Intro (15 s)
> "Hola, te muestro la demo del sitio de **Recovery Parts**, el campus técnico de microelectrónica. Es una demo funcional: web pública + plataforma de alumnos con 3 roles."

## 1 · Home / landing (45 s) — `/`
- Arrancá arriba del todo. **Hero** con foto de fondo y el nombre.
  > "Esta es la portada. Imagen real del taller, llamada a reservar turno y a ver los cursos."
- Scroll lento por las secciones: cursos destacados → **Egresados** (las 3 fotos en grid).
  > "Acá mostramos cursos destacados y la sección de egresados, prueba social con casos reales."
- Mostrá el botón flotante de **WhatsApp** abajo a la derecha.

## 2 · Catálogo de cursos (30 s) — `/cursos`
- Click en "Cursos" del nav.
  > "El catálogo completo: reparación de iPhone, notebooks, PC, cambio de glass, y oficios creativos como neón LED y estampado. **Todos al mismo precio: $25.000 de inscripción + 3 cuotas de $65.000 sin interés.** Clases presenciales en La Rioja 345, Córdoba."
- (Opcional) entrá a un curso → `/curso` para mostrar el plan de estudios y la card de inversión.

## 3 · Login (20 s) — `/login`
- Click en "Acceso alumnos".
  > "El acceso al campus. Pantalla con identidad industrial. Para la demo el login es mock: entra cualquiera, el rol lo define el mail."
- Dejá el mail de **alumno** ya precargado → click **Ingresar**.

## 4 · Campus — vista Alumno (45 s) — `/plataforma`
- > "Este es el portal del alumno: 'Technical Overview'. Material de estudio teórico en PDF —apuntes, esquemáticos, guías de diagnóstico— para descargar, su progreso y la evaluación final del módulo."
- Señalá arriba el switcher **"Vista demo"**.
  > "Y acá está lo bueno: con este switcher salto entre roles sin volver a loguear."

## 5 · Vista Profesor (30 s)
- Click en **Profesor** en el switcher.
  > "Panel docente: sus cursos, en qué clase van, y la tabla de alumnos con la asistencia y el estado de la evaluación final. No manejamos notas numéricas: se controla asistencia y la evaluación final que habilita el certificado."

## 6 · Vista Admin (30 s)
- Click en **Admin** en el switcher.
  > "Y el panel de administración: todos los cursos, profesor asignado, ocupación de cupos y estado —en curso o en inscripción—. Desde acá se gestiona todo."

## 7 · Cierre (15 s)
- Volvé al home (logo).
  > "Eso es Recovery Parts: una web pública lista para captar alumnos y un campus con tres roles, todo conectado. Cualquier ajuste me decís. ¡Gracias!"

---

### Checklist pre-grabación
- [ ] `npm run dev` corriendo (http://localhost:3000 → 200)
- [ ] Zoom del navegador al 100%, ventana limpia
- [ ] Pestañas precargadas: `/`, `/cursos`, `/login`
- [ ] Micrófono ok
