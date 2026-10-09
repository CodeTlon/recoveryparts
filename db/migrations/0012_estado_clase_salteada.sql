-- 0012 · Clase salteada (RF-55, RF-32).
-- El profesor puede saltear una clase en el calendario de su edición: no se dicta, no es la próxima clase,
-- no cuenta para el N° de clase de deserción y su material no se libera solo.
-- Va en una migración aparte: un valor nuevo de enum no se puede usar en la misma transacción que lo agrega.
alter type estado_clase add value if not exists 'salteada';
