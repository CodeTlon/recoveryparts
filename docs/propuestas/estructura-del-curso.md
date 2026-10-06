# Estructura del curso: módulos → clases → material

> **Incorporada:** mergeada a `main` el 2026-10-06 (PR #11) y migraciones 0012–0014 aplicadas en homologación/demo. Requisito RF-58 de la especificación (v0.12). Este documento explica el modelo, cómo se carga un curso y qué queda pendiente en la demo.

## El problema

Un curso tenía tres listas sueltas: los **módulos** del temario público (con viñetas escritas a mano), el **plan de clases** (N° y título) y el **material** (asociado a un N° de clase). No había forma de decir «el módulo 1 tiene estas dos clases», el temario se escribía dos veces y, como el material estaba atado a la *posición* de la clase, reordenar el plan lo cambiaba de clase sin aviso.

## El modelo

```
Curso
├── Módulo 1 · Fundamentos
│   ├── Clase «Introducción» (teórica)     → Apunte.pdf, Video (link)
│   └── Clase «Diagnóstico» (práctica)     → (sin material)
├── Módulo 2 · Reemplazo de módulos
│   └── …
└── Material general (sin clase)
```

- **Curso:** módulos que contienen clases en orden. **No hay clases sin módulo ni módulos sin clases**, y las clases de un módulo van juntas. Lo controla la base (no solo la pantalla).
- **Taller:** no lleva módulos; solo una lista de clases.
- **Clase:** título libre (lo eligen ellos: «Clase alfa», «A», «1.1»…) y tipo **teórica** o **práctica**. Una clase puede no tener material.
- **Material:** pertenece a una clase o es «general». **Sigue a su clase**: si la clase cambia de lugar o de módulo, el material va con ella. Si se borra la clase, el material queda como general (se avisa antes).
- La estructura es **del curso** y la comparten todas sus ediciones. La editan el admin y el profesor de una edición activa del curso.

## Orden flexible en cada edición

El orden del curso es el previsto. En el calendario de **su** edición, el profesor puede:
- **Adelantar** una clase: ponerle una fecha anterior a la de otras. Pasa a ser la próxima en esa fecha.
- **Saltearla:** estado «Salteada». No se dicta, no es la próxima clase y no cuenta para el N° de clase de deserción (RF-55).

Ninguna de las dos manda mail (el profesor lo avisa en clase). Las otras ediciones no cambian. El aviso por mail de suspendidas y reprogramadas (RF-38) sigue igual.

## Liberación del material: siempre manual (RF-32, cambió en v0.12)

El alumno ve un material **solo cuando el profesor lo libera** en su edición («Liberar ahora»). La fecha de la clase ya no libera nada. Motivo: con el orden flexible, la fecha deja de decir qué se dio; la responsabilidad queda en el profesor.

## Qué ve cada uno

| Quién | Ve |
|---|---|
| Visitante (sitio) | Solo los **títulos de los módulos**. Nunca clases ni material. Los talleres no muestran temario. |
| Alumno | Los títulos de **todos los módulos**; de las clases, solo las ya dictadas, las que tienen material liberado y la **próxima** (título y tipo, sin su material). Un módulo que no empezó muestra «Próximamente». |
| Profesor | La estructura completa del curso que dicta, el material agrupado por módulo y clase con su estado en su edición, y el calendario con adelantar/saltear. |
| Admin | Todo, en la pestaña «Estructura» del curso: editor + árbol Módulo → Clase → Material que marca las clases sin material. |

## Cómo se carga un curso

1. Campus › Cursos y talleres › el curso › pestaña **Estructura**.
2. «Agregar módulo», ponerle título y agregarle sus clases (título y teórica/práctica). Con ↑/↓ se reordena; con «Mover a…» una clase pasa a otro módulo.
3. Guardar. Si algo no cumple la regla (módulo vacío, clase sin módulo), la pantalla avisa cuál.
4. El material lo sube el profesor desde su edición, eligiendo la clase en un selector agrupado por módulo, y lo libera con «Liberar ahora».
5. En cada edición, el calendario (pestaña de la edición) asigna fecha y estado a cada clase.

## Pendiente en la demo (homologación)

Los cursos que ya estaban cargados quedaron con sus clases en **«Sin módulo»** (las viñetas viejas se borraron; los títulos de módulo se conservaron). Hasta que se guarden siguen funcionando, pero hay que:
1. Entrar a cada curso › «Estructura», repartir las clases en los módulos (teórica/práctica) y quitar los módulos vacíos.
2. En cada edición, liberar a mano el material que el alumno tiene que ver: lo que antes se veía porque «llegó su fecha» ahora queda oculto.

## Base de datos (resumen técnico)

- **0012:** estado de clase `salteada`.
- **0013:** `plan_clases.modulo_id` y `plan_clases.tipo`; `materiales.plan_clase_id` y `clases.plan_clase_id` (el material y el calendario apuntan a la clase por id); `guardar_estructura` (guarda módulos y clases de una vez, upsert por id); `temario_alumno`.
- **0014:** se borran `modulos_curso.items`, `materiales.clase_numero` y `clases.numero`; la regla de estructura pasa a constraint trigger diferido; `modulos_publicos` solo expone títulos de módulos de cursos; `material_visible` devuelve solo lo liberado a mano.

Más detalle en `docs/ARQUITECTURA.md` (Estructura del curso) y `.ai/context/DECISIONS.md`.

## Cómo probarlo en local

```bash
npm run db:reset
```
y después, desde Git Bash, el seed (desde cmd/PowerShell `npm run seed:dev` no anda):
```bash
ENV_FILE=.env.development node scripts/seed-pruebas.mjs --confirmo-no-produccion
```
«Reparación de Celulares» queda con 4 módulos, clases prácticas sin material y, en su primera edición, una clase salteada y otra adelantada. Cuentas: `admin@demo.example.com`, `profe1@demo.example.com`, `alumno1@demo.example.com` (contraseña `demo1234`).
