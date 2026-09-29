import React from 'react';
import {Platform} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import TVScreen from './src/screens/TVScreen';

/**
 * SMARTCHECK tiene dos experiencias distintas:
 * - Dispositivo móvil: app de checador con flujo biométrico.
 * - Pantalla/TV: app independiente para mostrar avisos, eventos y asistencias.
 *
 * Ambas comparten la misma base de datos, pero cada una se comporta como una app
 * distinta y no se mezclan visualmente ni funcionalmente.
 */
export default function App() {
  if (Platform.isTV) {
    return <TVScreen />;
  }

  return <AppNavigator />;
}
