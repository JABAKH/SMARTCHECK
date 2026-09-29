import { supabase, isSupabaseReady } from './supabase';

/**
 * Obtiene los avisos activos y vigentes.
 * @param {string|null} pantallaId - UUID de la pantalla. Si es null, trae avisos globales.
 */
export async function getAvisos(pantallaId = null) {
  if (!isSupabaseReady()) {
    return [];
  }

  let query = supabase
    .from('avisos')
    .select('id, titulo, contenido, tipo, fecha_inicio, fecha_fin')
    .eq('activo', true)
    .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
    .order('fecha_inicio', { ascending: false });

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
 * Suscripción en tiempo real a cambios en la tabla avisos.
 * @param {function} callback - Se llama con el payload cada vez que hay un cambio.
 * @returns Canal de Supabase Realtime (llamar .unsubscribe() para limpiar).
 */
export function suscribirAvisos(callback) {
  if (!isSupabaseReady()) {
    return { unsubscribe: () => {} };
  }

  return supabase
    .channel('avisos-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'avisos' },
      payload => callback(payload),
    )
    .subscribe();
}
