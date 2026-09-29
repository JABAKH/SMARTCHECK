import { supabase, isSupabaseReady } from './supabase';

/**
 * Obtiene los eventos activos próximos (desde ahora en adelante).
 * @param {string|null} pantallaId - UUID de la pantalla.
 */
export async function getEventos(pantallaId = null) {
  if (!isSupabaseReady()) {
    return [];
  }

  let query = supabase
    .from('eventos')
    .select('id, nombre, descripcion, lugar, fecha_inicio, fecha_fin')
    .eq('activo', true)
    .gte('fecha_inicio', new Date().toISOString())
    .order('fecha_inicio', { ascending: true })
    .limit(5);

  if (pantallaId) {
    query = query.or(`pantalla_id.eq.${pantallaId},pantalla_id.is.null`);
  } else {
    query = query.is('pantalla_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Suscripción en tiempo real a cambios en la tabla eventos.
 */
export function suscribirEventos(callback) {
  if (!isSupabaseReady()) {
    return { unsubscribe: () => {} };
  }

  return supabase
    .channel('eventos-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'eventos' },
      payload => callback(payload),
    )
    .subscribe();
}
