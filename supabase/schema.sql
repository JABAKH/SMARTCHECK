-- ============================================================
-- SMARTCHECK — Esquema de base de datos
-- Supabase / PostgreSQL
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: perfiles
-- Extiende auth.users de Supabase con datos del negocio.
-- Se crea automáticamente al registrar un usuario.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  apellido      TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  rol           TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: pantallas
-- Representa cada TV/monitor registrado en el sistema.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pantallas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,                        -- Ej: "Pantalla Lobby", "Aula 301"
  ubicacion     TEXT,                                 -- Descripción física del lugar
  token         TEXT NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT, -- Token de vinculación
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: avisos
-- Mensajes/anuncios que se muestran en las pantallas TV.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.avisos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo        TEXT NOT NULL,
  contenido     TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'urgente', 'evento', 'general')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_inicio  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_fin     TIMESTAMPTZ,                          -- NULL = sin expiración
  pantalla_id   UUID REFERENCES public.pantallas(id) ON DELETE SET NULL, -- NULL = todas las pantallas
  creado_por    UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: eventos
-- Eventos próximos que se muestran en la pantalla TV.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eventos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  lugar         TEXT,
  fecha_inicio  TIMESTAMPTZ NOT NULL,
  fecha_fin     TIMESTAMPTZ,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  pantalla_id   UUID REFERENCES public.pantallas(id) ON DELETE SET NULL,
  creado_por    UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: multimedia
-- Imágenes y videos para el carrusel de la pantalla TV.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.multimedia (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo          TEXT NOT NULL CHECK (tipo IN ('imagen', 'video')),
  url           TEXT NOT NULL,                        -- URL en Supabase Storage
  titulo        TEXT,
  duracion_seg  INTEGER NOT NULL DEFAULT 10,          -- Segundos que se muestra en carrusel
  orden         INTEGER NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  pantalla_id   UUID REFERENCES public.pantallas(id) ON DELETE SET NULL,
  creado_por    UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: asistencias
-- Registros de check-in generados desde la app móvil.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asistencias (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  pantalla_id     UUID REFERENCES public.pantallas(id) ON DELETE SET NULL,
  metodo_auth     TEXT NOT NULL CHECK (metodo_auth IN ('huella', 'rostro', 'pin')),
  timestamp_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitud         DOUBLE PRECISION,                   -- Geolocalización opcional
  longitud        DOUBLE PRECISION,
  exitoso         BOOLEAN NOT NULL DEFAULT TRUE,
  foto_url        TEXT,                              -- URL o data URL de la fotografía facial
  nombre_display  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para mejorar rendimiento en consultas frecuentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_avisos_activo        ON public.avisos(activo, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_avisos_pantalla      ON public.avisos(pantalla_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha        ON public.eventos(fecha_inicio, activo);
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario  ON public.asistencias(usuario_id, timestamp_check);
CREATE INDEX IF NOT EXISTS idx_asistencias_pantalla ON public.asistencias(pantalla_id, timestamp_check);
CREATE INDEX IF NOT EXISTS idx_multimedia_orden     ON public.multimedia(pantalla_id, orden, activo);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trg_perfiles_updated_at   ON public.perfiles;
DROP TRIGGER IF EXISTS trg_pantallas_updated_at  ON public.pantallas;
DROP TRIGGER IF EXISTS trg_avisos_updated_at     ON public.avisos;
DROP TRIGGER IF EXISTS trg_eventos_updated_at    ON public.eventos;
DROP TRIGGER IF EXISTS trg_multimedia_updated_at ON public.multimedia;

CREATE TRIGGER trg_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pantallas_updated_at
  BEFORE UPDATE ON public.pantallas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_avisos_updated_at
  BEFORE UPDATE ON public.avisos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_multimedia_updated_at
  BEFORE UPDATE ON public.multimedia
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrar usuario
-- Se dispara cuando Supabase Auth crea un nuevo usuario.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.perfiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantallas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multimedia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- ── perfiles ──────────────────────────────────────────────
-- Cada usuario ve y edita solo su propio perfil.
-- Los admins ven todos los perfiles.
DROP POLICY IF EXISTS "perfiles: usuario ve el suyo"   ON public.perfiles;
DROP POLICY IF EXISTS "perfiles: usuario edita el suyo" ON public.perfiles;

CREATE POLICY "perfiles: usuario ve el suyo"
  ON public.perfiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.rol = 'admin'
  ));

CREATE POLICY "perfiles: usuario edita el suyo"
  ON public.perfiles FOR UPDATE
  USING (auth.uid() = id);

-- ── pantallas ─────────────────────────────────────────────
-- Cualquier usuario autenticado puede leer pantallas.
-- Solo admins pueden crear/editar/eliminar.
DROP POLICY IF EXISTS "pantallas: lectura autenticados"  ON public.pantallas;
DROP POLICY IF EXISTS "pantallas: escritura solo admins" ON public.pantallas;

CREATE POLICY "pantallas: lectura autenticados"
  ON public.pantallas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pantallas: escritura solo admins"
  ON public.pantallas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  ));

-- ── avisos ────────────────────────────────────────────────
-- Lectura pública (la pantalla TV puede leer sin login).
-- Escritura solo admins.
DROP POLICY IF EXISTS "avisos: lectura publica"       ON public.avisos;
DROP POLICY IF EXISTS "avisos: escritura solo admins" ON public.avisos;

CREATE POLICY "avisos: lectura publica"
  ON public.avisos FOR SELECT
  USING (activo = TRUE AND (fecha_fin IS NULL OR fecha_fin > NOW()));

CREATE POLICY "avisos: escritura solo admins"
  ON public.avisos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  ));

-- ── eventos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "eventos: lectura publica"       ON public.eventos;
DROP POLICY IF EXISTS "eventos: escritura solo admins" ON public.eventos;

CREATE POLICY "eventos: lectura publica"
  ON public.eventos FOR SELECT
  USING (activo = TRUE);

CREATE POLICY "eventos: escritura solo admins"
  ON public.eventos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  ));

-- ── multimedia ────────────────────────────────────────────
DROP POLICY IF EXISTS "multimedia: lectura publica"       ON public.multimedia;
DROP POLICY IF EXISTS "multimedia: escritura solo admins" ON public.multimedia;

CREATE POLICY "multimedia: lectura publica"
  ON public.multimedia FOR SELECT
  USING (activo = TRUE);

CREATE POLICY "multimedia: escritura solo admins"
  ON public.multimedia FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  ));

-- ── asistencias ───────────────────────────────────────────
-- Cada usuario ve solo sus propias asistencias.
-- Admins ven todas.
DROP POLICY IF EXISTS "asistencias: usuario ve las suyas"    ON public.asistencias;
DROP POLICY IF EXISTS "asistencias: usuario inserta la suya" ON public.asistencias;

CREATE POLICY "asistencias: usuario ve las suyas"
  ON public.asistencias FOR SELECT
  USING (usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  ));

CREATE POLICY "asistencias: usuario inserta la suya"
  ON public.asistencias FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================

-- Aviso de ejemplo (requiere que exista al menos un admin)
-- INSERT INTO public.avisos (titulo, contenido, tipo, creado_por)
-- VALUES ('Bienvenida', 'Sistema SMARTCHECK activo.', 'info', '<uuid-del-admin>');

-- ============================================================
-- ENDURECIMIENTO RLS Y VISTA PUBLICA PARA TV
-- ============================================================
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
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'admin' AND activo = TRUE
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP POLICY IF EXISTS "perfiles: usuario ve el suyo" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles: usuario edita el suyo" ON public.perfiles;
CREATE POLICY "perfiles: usuario ve el suyo"
  ON public.perfiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.is_admin()));
CREATE POLICY "perfiles: usuario edita el suyo"
  ON public.perfiles FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "pantallas: lectura autenticados" ON public.pantallas;
DROP POLICY IF EXISTS "pantallas: escritura solo admins" ON public.pantallas;
CREATE POLICY "pantallas: lectura autenticados"
  ON public.pantallas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "pantallas: escritura solo admins"
  ON public.pantallas FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "avisos: lectura publica" ON public.avisos;
DROP POLICY IF EXISTS "avisos: escritura solo admins" ON public.avisos;
CREATE POLICY "avisos: lectura publica"
  ON public.avisos FOR SELECT TO anon, authenticated
  USING (activo = TRUE AND fecha_inicio <= NOW() AND (fecha_fin IS NULL OR fecha_fin > NOW()));
CREATE POLICY "avisos: escritura solo admins"
  ON public.avisos FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "eventos: lectura publica" ON public.eventos;
DROP POLICY IF EXISTS "eventos: escritura solo admins" ON public.eventos;
CREATE POLICY "eventos: lectura publica"
  ON public.eventos FOR SELECT TO anon, authenticated
  USING (activo = TRUE AND fecha_inicio >= NOW() - INTERVAL '1 day');
CREATE POLICY "eventos: escritura solo admins"
  ON public.eventos FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "multimedia: lectura publica" ON public.multimedia;
DROP POLICY IF EXISTS "multimedia: escritura solo admins" ON public.multimedia;
CREATE POLICY "multimedia: lectura publica"
  ON public.multimedia FOR SELECT TO anon, authenticated USING (activo = TRUE);
CREATE POLICY "multimedia: escritura solo admins"
  ON public.multimedia FOR ALL TO authenticated
  USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "asistencias: usuario ve las suyas" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias: usuario inserta la suya" ON public.asistencias;
CREATE POLICY "asistencias: usuario ve las suyas"
  ON public.asistencias FOR SELECT TO authenticated
  USING (usuario_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));
CREATE POLICY "asistencias: usuario inserta la suya"
  ON public.asistencias FOR INSERT TO authenticated
  WITH CHECK (usuario_id = (SELECT auth.uid()) AND exitoso = TRUE);

DROP POLICY IF EXISTS "asistencias: admin elimina" ON public.asistencias;
CREATE POLICY "asistencias: admin elimina"
  ON public.asistencias FOR DELETE TO authenticated
  USING ((SELECT private.is_admin()));

REVOKE ALL ON TABLE public.asistencias FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.asistencias TO authenticated;

CREATE OR REPLACE VIEW public.asistencias_tv
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
REVOKE SELECT ON public.asistencias FROM anon;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

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
