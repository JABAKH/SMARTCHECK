import {supabase, isSupabaseReady} from './supabase';

export async function registrarAsistencia({
  pantallaId = null,
  metodoAuth,
  fotoUrl = null,
  nombreDisplay = null,
  latitud = null,
  longitud = null,
}) {
  if (!isSupabaseReady()) throw new Error('Supabase no esta disponible en este momento.');

  const {data: authData, error: authError} = await supabase.auth.getUser();
  if (authError || !authData?.user) throw new Error('Usuario no autenticado');

  const {data, error} = await supabase
    .from('asistencias')
    .insert({
      usuario_id: authData.user.id,
      pantalla_id: pantallaId,
      metodo_auth: metodoAuth,
      latitud,
      longitud,
      exitoso: true,
      foto_url: fotoUrl,
      nombre_display: nombreDisplay,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAsistenciasRecientes(pantallaId = null, limite = 10) {
  if (!isSupabaseReady()) return [];

  // Esta vista solo publica los campos que necesita la pantalla general.
  let query = supabase
    .from('asistencias_tv')
    .select('id, pantalla_id, metodo_auth, timestamp_check, foto_url, nombre, apellido')
    .order('timestamp_check', {ascending: false})
    .limit(limite);

  if (pantallaId) query = query.eq('pantalla_id', pantallaId);

  const result = await query;
  if (!result.error) return result.data ?? [];

  // Compatibilidad mientras se aplica la actualizacion SQL incluida.
  let legacyQuery = supabase
    .from('asistencias')
    .select('id, pantalla_id, metodo_auth, timestamp_check, exitoso, perfiles(nombre, apellido)')
    .eq('exitoso', true)
    .order('timestamp_check', {ascending: false})
    .limit(limite);

  if (pantallaId) legacyQuery = legacyQuery.eq('pantalla_id', pantallaId);
  const legacy = await legacyQuery;
  if (legacy.error) throw result.error;
  return legacy.data ?? [];
}

export async function getHistorialAsistencias(limite = 20) {
  if (!isSupabaseReady()) return [];

  const {data, error} = await supabase
    .from('asistencias')
    .select('id, metodo_auth, timestamp_check, exitoso, foto_url')
    .order('timestamp_check', {ascending: false})
    .limit(limite);

  if (error) throw error;
  return data ?? [];
}

export function suscribirAsistencias(callback) {
  if (!isSupabaseReady()) return {unsubscribe: () => {}};

  return supabase
    .channel('asistencias-realtime')
    .on(
      'postgres_changes',
      {event: 'INSERT', schema: 'public', table: 'asistencias'},
      payload => callback(payload),
    )
    .subscribe();
}
