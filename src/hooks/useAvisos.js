import { useEffect, useState, useCallback } from 'react';
import { getAvisos, suscribirAvisos } from '../services/avisos';

/**
 * Hook que carga avisos desde Supabase y los mantiene actualizados en tiempo real.
 * @param {string|null} pantallaId
 */
export function useAvisos(pantallaId = null) {
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await getAvisos(pantallaId);
      setAvisos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [pantallaId]);

  useEffect(() => {
    cargar();

    // Suscripción en tiempo real: recarga al detectar cualquier cambio
    const canal = suscribirAvisos(() => cargar());

    return () => {
      canal.unsubscribe();
    };
  }, [cargar]);

  return { avisos, cargando, error, recargar: cargar };
}
