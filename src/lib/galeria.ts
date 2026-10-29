// Categorías de la galería (cms_galeria.categoria) y su nombre visible. Módulo común: lo usan el servidor (metadata de
// /galeria) y el componente cliente de la grilla. Un valor exportado desde un archivo 'use client' no se puede leer
// en el servidor (llega como referencia de cliente), por eso vive acá.
export const CATEGORIA_LABEL: Record<string, string> = { todas: 'Todas', aulas: 'Aulas', clases: 'Clases en acción', trabajos: 'Trabajos de alumnos', egresados: 'Egresados', eventos: 'Eventos' }
