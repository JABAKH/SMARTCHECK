import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TVScreen from '../screens/TVScreen';
import CheckadorScreen from '../screens/CheckadorScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();

/**
 * AppNavigator — Configura la navegación principal de la app.
 *
 * Rutas:
 *   • TV        — Pantalla de display (monitor/TV)
 *   • Checador  — App móvil de check-in con autenticación
 *   • Admin     — Panel de administración (solo admins)
 */
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Checador"
        screenOptions={{
          headerStyle: {backgroundColor: '#0f172a'},
          headerTintColor: '#f8fafc',
          headerTitleStyle: {fontWeight: '700', letterSpacing: 1},
          contentStyle: {backgroundColor: '#08111f'},
        }}>
        <Stack.Screen
          name="TV"
          component={TVScreen}
          options={{
            title: 'SMARTCHECK',
            headerShown: false, // La TV no muestra header
          }}
        />
        <Stack.Screen
          name="Checador"
          component={CheckadorScreen}
          options={{title: 'Checador', headerShown: false}}
        />
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{title: 'Administración'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
