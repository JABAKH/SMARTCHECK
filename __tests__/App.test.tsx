import React from 'react';
import {Alert, Text} from 'react-native';
import renderer, {act} from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}) => <>{children}</>,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}) => <>{children}</>,
    Screen: ({children}) => <>{children}</>,
  }),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../src/hooks/useAvisos', () => ({
  useAvisos: () => ({avisos: [], cargando: false}),
}));

jest.mock('../src/hooks/useEventos', () => ({
  useEventos: () => ({eventos: [], cargando: false}),
}));

jest.mock('../src/hooks/useAsistencias', () => ({
  useAsistencias: () => ({asistencias: [], cargando: false, error: null}),
}));

jest.mock('../src/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    session: null,
    user: null,
    perfil: null,
    cargando: false,
  })),
}));

import App from '../App';
import CheckadorScreen from '../src/screens/CheckadorScreen';
import {useAuth} from '../src/hooks/useAuth';

jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({data: {user: {id: 'user-1'}}, error: null}),
      signOut: jest.fn().mockResolvedValue({error: null}),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({data: [], error: null})),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({error: null})),
    })),
  },
  isSupabaseReady: () => true,
}));

jest.mock('../src/services/biometria', () => ({
  verificarBiometria: jest.fn().mockResolvedValue(true),
}));

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderiza la aplicación principal sin bloquearse', () => {
    let tree;
    expect(() => {
      tree = renderer.create(<App />);
    }).not.toThrow();
    tree.unmount();
  });

  it('pide iniciar sesion antes de mostrar las opciones biometricas', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<CheckadorScreen />);
    });

    const texts = tree.root.findAllByType(Text).map(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join(' ') : children;
    });

    expect(texts.some(value => String(value).toLowerCase().includes('iniciar sesion'))).toBe(true);
    expect(texts.some(value => String(value).toLowerCase().includes('huella digital'))).toBe(false);
    tree.unmount();
  });

  it('muestra un único registro que valida huella y captura el rostro automáticamente', async () => {
    useAuth.mockReturnValue({
      session: {user: {id: 'user-1'}},
      user: {id: 'user-1'},
      perfil: {nombre: 'Pedro', apellido: 'Ramirez'},
      cargando: false,
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<CheckadorScreen />);
    });

    const texts = tree.root.findAllByType(Text).map(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join(' ') : children;
    });

    expect(texts.some(value => String(value).includes('Pedro Ramirez'))).toBe(true);
    expect(texts.some(value => String(value).toLowerCase().includes('regístrate'))).toBe(true);
    expect(texts.some(value => String(value).toLowerCase().includes('huella'))).toBe(true);
    expect(texts.some(value => String(value).toLowerCase().includes('cámara frontal'))).toBe(true);
    tree.unmount();
  });

  it('envía a los administradores al panel de avisos y eventos', async () => {
    useAuth.mockReturnValue({
      session: {user: {id: 'admin-1'}},
      user: {id: 'admin-1'},
      perfil: {id: 'admin-1', nombre: 'Ana', apellido: 'Admin', rol: 'admin'},
      cargando: false,
      esAdmin: true,
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<CheckadorScreen />);
    });

    const texts = tree.root.findAllByType(Text).map(node => String(node.props.children));
    expect(texts.some(value => value.includes('Panel de Administración'))).toBe(true);
    tree.unmount();
  });
});
