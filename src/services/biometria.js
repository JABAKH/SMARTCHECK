import ReactNativeBiometrics from 'react-native-biometrics';

// En Android se usa BIOMETRIC_STRONG sin PIN/patrón. El sistema operativo
// presenta el método fuerte configurado por el usuario (rostro o huella) y
// nunca expone los datos biométricos a SmartCheck.
const rnBiometrics = new ReactNativeBiometrics({allowDeviceCredentials: false});

/**
 * Verifica identidad con biometría nativa del dispositivo.
 * Soporta huella dactilar y reconocimiento facial según el hardware disponible.
 */
export async function verificarBiometria({
  promptMessage = 'Confirma tu identidad para registrar la asistencia.',
  tipo = 'biometría',
} = {}) {
  try {
    const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();

    if (!available || error) {
      if (error === 'NoBiometry') {
        throw new Error('Este dispositivo no tiene biometría disponible.');
      }
      if (error === 'BiometryNotEnrolled') {
        throw new Error('No tienes una huella o rostro registrado en este dispositivo.');
      }
      throw new Error('La biometría no está disponible en este dispositivo.');
    }

    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancelar',
      fallbackPromptMessage: 'Usa la biometria configurada',
    });
    if (!success) {
      throw new Error('La autenticación biométrica fue cancelada o falló.');
    }

    return {
      success: true,
      tipo: biometryType || tipo,
    };
  } catch (error) {
    throw new Error(error?.message || 'No se pudo autenticar con biometría.');
  }
}
