import { updateTag } from 'next/cache'

// Las lecturas del sitio público se cachean (src/lib/data.ts) con este tag. Toda server action que cambie algo que
// el sitio muestra (cursos, ediciones, cupos, estructura, CMS, profesores) llama a esto para que el cambio se vea
// al instante; sin invalidar, el caché vence solo a los 60 s.
export const TAG_PUBLICO = 'publico'
export const TTL_PUBLICO = 60
export const invalidarPublico = () => updateTag(TAG_PUBLICO)
