import { useEffect, useRef, useState, useCallback } from 'react';
import { getAsistenciasRecientes, suscribirAsistencias } from '../services/asistencias';

/**
 * Hook que carga asistencias recientes y las mantiene actualizadas en tiempo real.
 * Usado principalmente en la pantalla TV para mostrar quién se ha checado.
 * @param {string|null} pantallaId
 * @param {number} limite
 */
export function useAsistencias(pantallaId = null, limite = 10) {
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const primeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    try {
      if (primeraCarga.current) setCargando(true);
      setError(null);
      const data = await getAsistenciasRecientes(pantallaId, limite);
      setAsistencias(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      primeraCarga.current = false;
    }
  }, [pantallaId, limite]);

  useEffect(() => {
    cargar();

    // Suscripción en tiempo real: recarga al detectar nuevas asistencias
    const canal = suscribirAsistencias(() => cargar());
    const polling = setInterval(cargar, 5000);

    return () => {
      clearInterval(polling);
      canal.unsubscribe();
    };
  }, [cargar]);

  return { asistencias, cargando, error, recargar: cargar };
}
