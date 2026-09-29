-- Los administradores gestionan la plataforma: sus sesiones nunca se publican
-- en la pantalla de accesos. Avisos y eventos se publican en tiempo real.

DROP VIEW IF EXISTS public.asistencias_tv;
CREATE VIEW public.asistencias_tv
WITH (security_barrier = TRUE)
AS
SELECT
  a.id,
  a.pantalla_id,
  a.metodo_auth,
  a.timestamp_check,
  a.foto_url,
  COALESCE(
    NULLIF(a.nombre_display, ''),
    NULLIF(TRIM(CONCAT_WS(' ', p.nombre, p.apellido)), ''),
    'Colaborador'
  ) AS nombre,
  ''::TEXT AS apellido
FROM public.asistencias a
JOIN public.perfiles p ON p.id = a.usuario_id
WHERE a.exitoso = TRUE
  AND p.rol <> 'admin'
  AND a.timestamp_check >= NOW() - INTERVAL '24 hours';

REVOKE ALL ON public.asistencias_tv FROM PUBLIC;
GRANT SELECT ON public.asistencias_tv TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
