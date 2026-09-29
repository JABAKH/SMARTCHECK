# SMARTCHECK — Pantalla Inteligente (Smart Display)

## Descripción del Proyecto

**SMARTCHECK** es una aplicación de pantalla inteligente desarrollada en **React Native** orientada a desplegarse en pantallas de TV o monitores institucionales. Su propósito es mostrar información en tiempo real (reloj, fecha, avisos, eventos), tableros de avisos dinámicos y contenido multimedia, con soporte para **autenticación remota mediante sensores biométricos** (huella dactilar / reconocimiento facial) desde dispositivos móviles, funcionando como un sistema de **checador inteligente en la nube**.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────┐
│                  SMARTCHECK (TV/Display)             │
│  React Native — pantalla principal                   │
│  • Reloj en tiempo real                              │
│  • Tablero de avisos                                 │
│  • Próximos eventos                                  │
│  • Reproducción multimedia                           │
└──────────────────┬──────────────────────────────────┘
                   │ WebSocket / REST API
          ┌────────▼────────┐
          │   Backend/Nube  │
          │  (Firebase /    │
          │   Supabase /    │
          │   API propia)   │
          └────────┬────────┘
                   │
     ┌─────────────▼──────────────┐
     │  App Móvil (Checador)      │
     │  • Autenticación biométrica│
     │    (Huella / Rostro)       │
     │  • Registro de asistencia  │
     │  • Gestión remota de       │
     │    contenido en pantalla   │
     └────────────────────────────┘
```

---

## Estado Actual del Proyecto

| Módulo | Estado |
|---|---|
| Pantalla principal de TV con reloj en tiempo real | ✅ Implementado |
| Tablero de avisos dinámicos | ✅ Implementado |
| Próximos eventos en pantalla | ✅ Implementado |
| Asistencias recientes en tiempo real | ✅ Implementado |
| Diseño responsivo y consistente para TV, móvil y panel admin | ✅ Implementado |
| App móvil independiente para checador | ✅ Implementado |
| Pantalla de verificación biométrica con huella | ✅ Implementado |
| Orientación vertical en el celular | ✅ Implementado |
| Separación visual entre TV y checador | ✅ Implementado |
| Pantalla de login con correo y contraseña | ✅ Implementado |
| Registro de asistencia en Supabase | ✅ Implementado |
| Uso de autenticación por sesión y roles | ✅ Implementado |
| Panel de administración de avisos y eventos | ✅ Implementado |
| Reproducción multimedia en pantalla | 🔲 Pendiente |
| Validación nativa de biometría y captura facial automática en Android | ✅ Implementado y validado en dispositivo físico |


### Estado verificado en código y dispositivos (2026-09-28)

Se revisó la implementación actual del proyecto y este conjunto de módulos ya está funcionando en la app:

- La TV, el checador móvil y el panel de administración comparten una interfaz responsiva de consola HUD: fondo oscuro, telemetría cian, acciones ámbar y estados legibles en pantallas compactas o 16:9.
- La TV presenta el último acceso y la lista del día en tiempo real, con la hora de San Luis Río Colorado (`America/Hermosillo`).
- El usuario regular solo ve “Regístrate”: primero confirma la biometría y luego la cámara frontal captura automáticamente la foto cuando ML Kit detecta su rostro.
- La foto se corrige antes de enviarse, se guarda con el acceso y aparece en la TV. Los accesos de rol `admin` quedan excluidos de esa pantalla.
- El administrador entra a un panel separado con CRUD de avisos y eventos, selector nativo de fecha/hora y cierre de sesión. Los avisos y eventos se reflejan en la TV por Realtime.

- `App.js` separa los flujos: si corre en TV, abre `TVScreen`; si corre en móvil, abre la app de checador.
- `TVScreen` usa un dashboard 16:9 validado en un emulador Android TV 1920x1080 y destaca el último acceso con foto, nombre, hora, fecha y método.
- `CheckadorScreen` dirige a administradores al panel de gestión. Para usuarios muestra un único botón “Regístrate”: valida biometría, detecta el rostro con ML Kit y toma la selfie automáticamente.
- `FaceCaptureActivity` usa CameraX + ML Kit en Android para capturar una selfie al detectar un rostro; no envía biometría a servicios externos.
- La vista `asistencias_tv` excluye administradores y las tablas de avisos/eventos se publican por Realtime mediante la migración adicional.
- `MainActivity.kt` selecciona orientación horizontal para TV y vertical para teléfono según el tipo real de dispositivo.
- `AppNavigator` mantiene la navegación principal con rutas `TV`, `Checador` y `Admin`.
- `useAuth`, `useAsistencias`, `services/asistencias.js` y `supabase` están conectados a la lógica real del sistema.
- La app ya fue validada con pruebas unitarias y también con lanzamiento en Android.

> La prioridad inmediata ahora es dejar el flujo de checador 100% estable con validación real de hardware, y luego integrar multimedia/automatización de contenido en la pantalla TV.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework principal | React Native 0.76.7 |
| Lenguaje | JavaScript (JSX) |
| Plataforma objetivo | Android (TV / Tablet / Emulador) |
| Build system | Gradle + Android SDK |
| Biometría (planeado) | `react-native-biometrics` |
| Backend/Nube | Supabase |
| Tiempo real | Supabase Realtime (WebSockets) |
| Multimedia (planeado) | `react-native-video` |

---

## Requisitos del Entorno

### Software necesario

- **Node.js** v18 o superior
- **npm** v9 o superior
- **React Native CLI** (no Expo)
- **Android Studio** con Android SDK instalado
- **Java JDK 17** (recomendado para React Native 0.76)
- **Android SDK** con las siguientes versiones:
  - `compileSdkVersion`: 35
  - `targetSdkVersion`: 34
  - `minSdkVersion`: 24
  - `buildToolsVersion`: 35.0.0
  - `NDK`: 27.1.12297006

### Variables de entorno requeridas (Windows)

Asegúrate de tener configuradas las siguientes variables en tu sistema:

```powershell
# Verificar que existen
echo $env:ANDROID_HOME
echo $env:JAVA_HOME
```

Si no están configuradas, agrégalas en las variables de entorno del sistema:

```
ANDROID_HOME = C:\Users\<TuUsuario>\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Java\jdk-17
```

Y agrega al `PATH`:
```
%ANDROID_HOME%\emulator
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

---

## Instalación

```powershell
# 1. Clonar el repositorio
git clone https://github.com/JABAKH/SMARTCHECK.git
cd smartcheck

# 2. Instalar dependencias
npm install
```

---

## Cómo Correr el Proyecto (Emulador Android)

### Paso 1 — Crear un AVD (Android Virtual Device) tipo TV

1. Abre **Android Studio**
2. Ve a **Device Manager** (ícono de teléfono en la barra lateral)
3. Haz clic en **Create Device**
4. En la categoría **TV**, selecciona **Android TV (1080p)** o **Android TV (720p)**
5. Selecciona una imagen del sistema (recomendado: **API 34, x86_64**)
6. Finaliza y guarda el AVD

> Si prefieres emular en un teléfono/tablet normal, selecciona cualquier dispositivo de la categoría **Phone** o **Tablet**.

### Paso 2 — Iniciar el emulador

Desde Android Studio: abre **Device Manager** y presiona el botón ▶ del AVD creado.

O desde PowerShell:

```powershell
# Listar AVDs disponibles
emulator -list-avds

# Iniciar un AVD específico
emulator -avd <nombre_del_avd>
```

### Paso 3 — Verificar que el dispositivo está conectado

```powershell
adb devices
# Debe aparecer algo como: emulator-5554   device
```

### Paso 4 — Iniciar Metro Bundler (en una terminal separada)

```powershell
npm start
```

### Paso 5 — Compilar y lanzar la app en el emulador

```powershell
npm run android
# equivalente a: react-native run-android
```

La primera compilación puede tardar varios minutos. Las siguientes serán más rápidas gracias al caché de Gradle.

---

## Estructura del Proyecto

```
smartcheck/
├── android/                  # Proyecto nativo Android
│   ├── app/                  # Módulo principal de la app
│   ├── build.gradle          # Configuración de build (SDK versions)
│   └── gradle.properties     # Propiedades de Gradle
├── src/
│   ├── components/           # Componentes reutilizables de UI
│   ├── hooks/
│   │   ├── useAvisos.js      # Hook: carga y suscripción en tiempo real de avisos
│   │   ├── useEventos.js     # Hook: carga y suscripción en tiempo real de eventos
│   │   ├── useAsistencias.js # Hook: asistencias recientes en tiempo real (TV)
│   │   └── useAuth.js        # Hook: sesión activa, perfil y rol del usuario
│   ├── navigation/
│   │   └── AppNavigator.js   # Navegación principal (TV / Checador / Admin)
│   ├── screens/
│   │   ├── TVScreen.js       # Pantalla principal para monitor/TV
│   │   ├── CheckadorScreen.js# App móvil: login + check-in + historial
│   │   └── AdminScreen.js    # Panel de administración (solo admins)
│   └── services/
│       ├── supabase.js       # Inicialización del cliente Supabase
│       ├── avisos.js         # Queries y Realtime de avisos
│       ├── eventos.js        # Queries y Realtime de eventos
│       └── asistencias.js    # Registro e historial de check-ins
├── supabase/
│   └── schema.sql            # Esquema completo de la base de datos
├── __tests__/                # Tests unitarios
├── App.js                    # Componente raíz — monta AppNavigator
├── index.js                  # Punto de entrada de la app
├── app.json                  # Nombre y configuración de la app
├── package.json              # Dependencias y scripts npm
├── babel.config.js           # Configuración de Babel
├── metro.config.js           # Configuración del bundler Metro
└── PROYECTO.md               # Este archivo
```


---

## Tareas Pendientes

### 🏗️ Infraestructura y Arquitectura
- [x] Definir y configurar el servicio de backend — **Supabase** ✅
- [x] Crear la estructura de carpetas del proyecto (`src/screens`, `src/components`, `src/services`, `src/hooks`) ✅
- [x] Configurar navegación con `react-navigation` para múltiples pantallas ✅
- [x] Definir el modelo de datos (avisos, eventos, usuarios, registros de asistencia) — verificado en `supabase/schema.sql` ✅
- [x] Configurar autenticación de usuarios en Supabase Auth para login con email/contraseña y roles de perfil ✅
- [x] Separar la experiencia de TV y la experiencia del checador en dos flujos visuales distintos ✅

### 📺 Pantalla TV (Display)
- [x] Reemplazar avisos y eventos estáticos por datos dinámicos desde Supabase ✅
- [x] Implementar actualización en tiempo real con Supabase Realtime ✅
- [x] Mostrar lista de asistencias registradas en tiempo real ✅
- [x] Diseñar la pantalla para aprovechar mejor el espacio en resoluciones grandes ✅
- [ ] Agregar carrusel de imágenes/videos con `react-native-video`
- [x] Agregar animaciones de transición entre secciones (contenido dinámico) ✅ (entrada destacada)
- [x] Adaptar el layout para resolución 1080p o Android TV real ✅ (validado en emulador 1920x1080)
- [ ] Mostrar código QR o identificador de la pantalla para vinculación remota

### 📱 App Móvil Checador
- [x] Implementar pantalla de login con usuario y contraseña ✅
- [x] Implementar flujo de verificación biométrica por huella como primer paso ✅
- [x] Enviar registro de asistencia a la nube al autenticarse correctamente ✅
- [x] Mostrar historial de asistencias del usuario autenticado ✅
- [x] Mantener la vista del dispositivo en orientación vertical para celuar ✅
- [x] Integrar validación real de biometría nativa en hardware Android ✅ (`react-native-biometrics`)
- [x] Integrar reconocimiento facial como método de autenticación alternativo ✅ (biometría del sistema + cámara frontal)
- [x] Mejorar la experiencia de auditoría y estados de error en la pantalla del checador ✅
- [ ] Vincular la app móvil con una pantalla TV específica (por ID o QR)

### ☁️ Backend / Nube
- [x] Proyecto de Supabase creado y credenciales obtenidas ✅
- [x] Esquema SQL creado (`supabase/schema.sql`) con tablas, índices, triggers y RLS ✅
- [x] Ejecutar `supabase/schema.sql` en el proyecto Supabase activo
- [x] Aplicar las migraciones de asistencia/TV y filtro de administradores al proyecto activo
- [x] Configurar autenticación de usuarios en Supabase Auth para login con email/contraseña y roles de perfil ✅
- [x] Verificar políticas RLS con usuarios de prueba (admin y usuario normal)
- [ ] Crear Edge Functions para registrar asistencias
- [ ] Configurar notificaciones push para alertas a administradores

### 🔐 Seguridad y Roles
- [x] Definir roles: `admin` y `usuario` ✅ (en schema.sql + useAuth)
- [x] Proteger rutas y operaciones según el rol del usuario autenticado ✅ (AdminScreen)
- [x] Implementar cierre de sesión y revocación de tokens ✅

### 🖥️ Panel de Administración
- [x] Formulario para crear, editar y eliminar avisos ✅
- [x] Formulario para crear, editar y eliminar eventos ✅
- [ ] Gestión de usuarios registrados (alta, baja, roles)
- [ ] Visualización de reportes de asistencia por fecha y usuario
- [ ] Subida de imágenes/videos para el carrusel multimedia

### 🧪 Pruebas
- [x] Escribir pruebas unitarias para los componentes principales (`App.js`) ✅ (smoke test de renderizado configurado con Jest)
- [x] Probar el flujo de autenticación biométrica en dispositivo físico
- [x] Probar la sincronización en tiempo real entre app móvil y pantalla TV
- [x] Pruebas de rendimiento visual en emulador Android TV (1080p)

### 📦 Despliegue
- [ ] Generar APK de release para la pantalla TV (`./gradlew assembleRelease`)
- [ ] Generar APK de release para la app móvil checadora
- [ ] Documentar el proceso de instalación en una TV física con Android


---

## Módulos Planeados (Roadmap)

### 1. Datos en tiempo real
- Conectar avisos y eventos a una base de datos en la nube (Firebase Firestore o Supabase)
- Actualización automática de la pantalla sin recargar

### 2. Autenticación biométrica (App Checador)
- App móvil secundaria que usa `react-native-biometrics`
- El usuario se autentica con huella o rostro desde su celular
- El registro se envía a la nube y se refleja en la pantalla TV

### 3. Reproducción multimedia
- Soporte para imágenes y videos en carrusel usando `react-native-video`
- Gestión remota del contenido desde un panel web o app móvil

### 4. Panel de administración
- Interfaz web o móvil para gestionar avisos, eventos y multimedia
- Control de acceso por roles (admin / usuario)

---

## Comandos Útiles

```powershell
# Limpiar caché de Metro
npm start -- --reset-cache

# Limpiar build de Android
cd android
.\gradlew clean
cd ..

# Ver logs del dispositivo/emulador
adb logcat

# Reinstalar la app en el emulador
adb uninstall com.smartcheck
npm run android
```

---

## Solución de Problemas Comunes

| Problema | Solución |
|---|---|
| `SDK location not found` | Crea el archivo `android/local.properties` con `sdk.dir=C\:\\Users\\<TuUsuario>\\AppData\\Local\\Android\\Sdk` |
| `No emulators found` | Verifica que el AVD esté corriendo con `adb devices` |
| `Metro bundler port in use` | Cambia el puerto: `npm start -- --port 8082` |
| `Gradle build failed` | Ejecuta `cd android && .\gradlew clean` y vuelve a intentar |
| `JAVA_HOME not set` | Configura la variable de entorno apuntando a tu JDK 17 |

---

## Configuración de Supabase

El proyecto usa **Supabase** como backend. Las credenciales se deben guardar en un archivo `.env` en la raíz del proyecto (nunca subir este archivo al repositorio).

### Variables de entorno requeridas

Crea el archivo `.env` en la raíz:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<tu-anon-key>
SUPABASE_SECRET_KEY=<tu-service-role-key>        # Solo en backend/Edge Functions
SUPABASE_JWKS_URL=https://<tu-proyecto>.supabase.co/auth/v1/.well-known/jwks.json
```

> ⚠️ **Nunca expongas `SUPABASE_SECRET_KEY` en el cliente móvil.** Esta key solo debe usarse en el servidor o en Edge Functions de Supabase. En la app React Native solo usa `SUPABASE_PUBLISHABLE_KEY` (anon key).

### Instalación del cliente de Supabase

```powershell
npm install @supabase/supabase-js
```

### Inicialización en el proyecto

Crea el archivo `src/services/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Tablas en Supabase

El esquema completo está en [`supabase/schema.sql`](./supabase/schema.sql). Ejecuta ese archivo en el **SQL Editor** de tu proyecto Supabase para crear todas las tablas, índices, triggers y políticas RLS.

| Tabla | Descripción |
|---|---|
| `perfiles` | Extiende `auth.users` con nombre, apellido y rol (`admin` / `usuario`) |
| `pantallas` | TVs/monitores registrados, cada uno con token único de vinculación |
| `avisos` | Anuncios con tipo, fechas de vigencia y pantalla destino |
| `eventos` | Eventos próximos con lugar, fecha de inicio y fin |
| `multimedia` | Imágenes y videos del carrusel con orden y duración por slide |
| `asistencias` | Registros de check-in con método de auth, timestamp y geolocalización opcional |

---

## Equipo

Proyecto desarrollado para la materia de desarrollo móvil — Universidad de Tecnología.
Grupo: `ut-group1090839`
Repositorio: [github.com/JABAKH/SMARTCHECK](https://github.com/JABAKH/SMARTCHECK)
