import { useEffect, useState } from 'react';
import { supabase, isSupabaseReady } from '../services/supabase';

/**
 * Hook que expone la sesión activa del usuario y escucha cambios de auth en tiempo real.
 * @returns {{ session, user, cargando, esAdmin }}
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!isSupabaseReady()) {
      setCargando(false);
      return;
    }

    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) cargarPerfil(s.user.id);
      else setCargando(false);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) cargarPerfil(s.user.id);
      else {
        setPerfil(null);
        setCargando(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function cargarPerfil(userId) {
    try {
      if (!isSupabaseReady()) return;
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, apellido, email, rol')
        .eq('id', userId)
        .single();
      if (!error) setPerfil(data);
    } catch (_) {
      // Perfil no cargado, se ignora
    } finally {
      setCargando(false);
    }
  }

  return {
    session,
    user: session?.user ?? null,
    perfil,
    cargando,
    esAdmin: perfil?.rol === 'admin',
  };
}
