-- Actualiza el esquema activo sin borrar datos existentes.
-- Corrige la recursion de RLS y habilita el flujo movil -> TV.

ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS nombre_display TEXT;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND rol = 'admin'
      AND activo = TRUE
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- El rol nunca se toma de user_metadata porque el usuario puede modificarlo.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, apellido, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    'usuario'
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Elimina las politicas anteriores, incluidas las que consultaban perfiles
-- desde una politica de perfiles y provocaban recursion infinita.
DROP POLICY IF EXISTS "perfiles: usuario ve el suyo" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles: usuario edita el suyo" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles: admin ve todos" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles: admin administra" ON public.perfiles;

CREATE POLICY "perfiles: usuario ve el suyo"
  ON public.perfiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "perfiles: admin ve todos"
  ON public.perfiles FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "perfiles: admin administra"
  ON public.perfiles FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "pantallas: lectura autenticados" ON public.pantallas;
DROP POLICY IF EXISTS "pantallas: escritura solo admins" ON public.pantallas;

CREATE POLICY "pantallas: lectura autenticados"
  ON public.pantallas FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "pantallas: escritura solo admins"
  ON public.pantallas FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "avisos: lectura publica" ON public.avisos;
DROP POLICY IF EXISTS "avisos: escritura solo admins" ON public.avisos;

CREATE POLICY "avisos: lectura publica"
  ON public.avisos FOR SELECT TO anon, authenticated
  USING (
    activo = TRUE
    AND fecha_inicio <= NOW()
    AND (fecha_fin IS NULL OR fecha_fin > NOW())
  );

CREATE POLICY "avisos: escritura solo admins"
  ON public.avisos FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "eventos: lectura publica" ON public.eventos;
DROP POLICY IF EXISTS "eventos: escritura solo admins" ON public.eventos;

CREATE POLICY "eventos: lectura publica"
  ON public.eventos FOR SELECT TO anon, authenticated
  USING (activo = TRUE AND fecha_inicio >= NOW() - INTERVAL '1 day');

CREATE POLICY "eventos: escritura solo admins"
  ON public.eventos FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "multimedia: lectura publica" ON public.multimedia;
DROP POLICY IF EXISTS "multimedia: escritura solo admins" ON public.multimedia;

CREATE POLICY "multimedia: lectura publica"
  ON public.multimedia FOR SELECT TO anon, authenticated
  USING (activo = TRUE);

CREATE POLICY "multimedia: escritura solo admins"
  ON public.multimedia FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "asistencias: usuario ve las suyas" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias: usuario inserta la suya" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias: admin ve todas" ON public.asistencias;

CREATE POLICY "asistencias: usuario ve las suyas"
  ON public.asistencias FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = usuario_id);

CREATE POLICY "asistencias: admin ve todas"
  ON public.asistencias FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "asistencias: usuario inserta la suya"
  ON public.asistencias FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = usuario_id AND exitoso = TRUE);

-- La TV no recibe correos, roles ni UUID de usuario. Esta vista publica solo
-- muestra la informacion que se veria fisicamente en la recepcion y conserva
-- los registros durante 24 horas para limitar su exposicion.
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
  AND a.timestamp_check >= NOW() - INTERVAL '24 hours';

REVOKE ALL ON public.asistencias_tv FROM PUBLIC;
GRANT SELECT ON public.asistencias_tv TO anon, authenticated;
REVOKE SELECT ON public.asistencias FROM anon;

-- Postgres Changes requiere que la tabla pertenezca a la publicacion.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
