import {NativeModules, Platform} from 'react-native';

/**
 * Abre la cámara frontal nativa de Android. ML Kit detecta un rostro y captura
 * una selfie automáticamente; la promesa devuelve una data URI JPEG.
 */
export async function capturarRostroAutomaticamente() {
  if (Platform.OS !== 'android') {
    throw new Error('La captura facial automática está disponible en Android.');
  }

  if (!NativeModules.FaceCapture?.capture) {
    throw new Error('El módulo de cámara no está disponible. Actualiza la aplicación Android.');
  }

  return NativeModules.FaceCapture.capture();
}
