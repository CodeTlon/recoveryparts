-- Videos cortos en el sitio: el bucket público `sitio` acepta también MP4/WebM (ya comprimidos
-- en el navegador antes de subir) y sube el tope a 25 MB. Las políticas (solo admin) no cambian.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array['image/webp','image/jpeg','image/png','image/avif','video/mp4','video/webm']
where id = 'sitio';
