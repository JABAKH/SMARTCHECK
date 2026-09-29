import { useEffect, useState, useCallback } from 'react';
import { getEventos, suscribirEventos } from '../services/eventos';

/**
 * Hook que carga eventos próximos desde Supabase y los mantiene actualizados en tiempo real.
 * @param {string|null} pantallaId
 */
export function useEventos(pantallaId = null) {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await getEventos(pantallaId);
      setEventos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [pantallaId]);

  useEffect(() => {
    cargar();

    const canal = suscribirEventos(() => cargar());

    return () => {
      canal.unsubscribe();
    };
  }, [cargar]);

  return { eventos, cargando, error, recargar: cargar };
}
