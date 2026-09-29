-- Un administrador puede depurar los accesos de una fecha desde la app.
-- La app calcula el intervalo del día en America/Hermosillo y esta política
-- evita que cualquier usuario regular pueda borrar registros.

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.asistencias FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.asistencias TO authenticated;

DROP POLICY IF EXISTS "asistencias: admin elimina" ON public.asistencias;
CREATE POLICY "asistencias: admin elimina"
  ON public.asistencias FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));
