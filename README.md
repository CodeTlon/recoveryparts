# CodeTlon Demo Template (Nivel 0)

Template para demos visuales de clientes. Sin backend, sin lógica. Solo UI.

## Uso rápido

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Cómo personalizar

**Solo hay un archivo que tocar:** `src/lib/demo-config.ts`

Ahí configurás:
- `business` — nombre, teléfono, email, dirección, WhatsApp
- `brand` — colores HEX y Google Font
- `images` — paths locales (en `public/images/`) o URLs de Picsum
- `sections` — `true`/`false` por sección para mostrar u ocultar
- `content` — servicios, testimonios, FAQ, precios, equipo, stats

## Secciones disponibles

| Key | Nombre | Típico para |
|---|---|---|
| `hero` | Hero | Todos |
| `about` | Nosotros | Todos |
| `services` | Servicios | Todos |
| `gallery` | Galería | Peluquerías, tatuajes, restaurantes |
| `pricing` | Precios | Gimnasios, software, suscripciones |
| `testimonials` | Testimonios | Todos |
| `faq` | Preguntas frecuentes | Clínicas, estudios |
| `contact` | Contacto | Todos |
| `team` | Equipo | Agencias, estudios, clínicas |
| `schedule` | Turnero | Peluquerías, clínicas, masajes |
| `stats` | Métricas | Empresas con track record |
| `cta` | Call to Action | Todos |

## Imágenes

Si no tenés imágenes del cliente, usá URLs de Picsum:
```ts
hero: "https://picsum.photos/1920/1080?random=1",
gallery: [
  "https://picsum.photos/800/600?random=2",
  "https://picsum.photos/800/600?random=3",
]
```

---

*CodeTlon Demo Template v1.0*

## Licencia

Este template (y cualquier proyecto generado a partir de él) es software propietario de
CodeTlon o del cliente correspondiente. Incluye `LICENSE` (all-rights-reserved) y
`"license": "UNLICENSED"` en `package.json` por defecto — actualizar el titular del copyright
al entregar el proyecto a un cliente.
