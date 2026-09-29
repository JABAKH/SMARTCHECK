import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {supabase, isSupabaseReady} from '../services/supabase';
import {useAuth} from '../hooks/useAuth';
import {verificarBiometria} from '../services/biometria';
import {capturarRostroAutomaticamente} from '../services/capturaFacial';
import AdminScreen from './AdminScreen';

const COLORS = {
  background: '#05080d',
  ink: '#edf5f7',
  muted: '#91a2aa',
  line: '#25404a',
  navy: '#080d13',
  cyan: '#45dce7',
  blue: '#1599c0',
  amber: '#ffad32',
  white: '#f7fbfc',
  success: '#47d790',
  danger: '#ff6571',
};

const formatCheckTime = iso =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const getDisplayName = (perfil, user) => {
  const profileName = `${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`.trim();
  return profileName || user?.email?.split('@')[0] || 'Colaborador';
};

export default function CheckadorScreen() {
  const {session, user, perfil, cargando} = useAuth();

  if (cargando) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingMark}><Text style={styles.loadingMarkText}>S</Text></View>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={styles.loadingText}>Preparando SmartCheck</Text>
      </View>
    );
  }

  if (!session) return <LoginForm />;

  if (perfil?.rol === 'admin') return <AdminScreen />;

  return <ChecadorPanel perfil={perfil} user={user} />;
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contrasena para continuar.');
      return;
    }
    if (!isSupabaseReady()) {
      setError('No hay conexion con el servicio. Intenta de nuevo.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const {error: authError} = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) throw authError;
    } catch (err) {
      const invalidCredentials = /invalid login credentials/i.test(err?.message ?? '');
      setError(
        invalidCredentials
          ? 'El correo o la contrasena no son correctos.'
          : err?.message || 'No se pudo iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginScreen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <KeyboardAvoidingView
        style={styles.loginKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.loginContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.loginBrandRow}>
            <View style={styles.loginLogo}><Text style={styles.loginLogoText}>S</Text></View>
            <Text style={styles.loginBrand}>SMARTCHECK</Text>
          </View>

          <View style={styles.loginCopy}>
            <Text style={styles.loginEyebrow}>ACCESO DE COLABORADORES</Text>
            <Text style={styles.loginTitle}>Bienvenido</Text>
            <Text style={styles.loginSubtitle}>
              Inicia sesion para registrar tu entrada de forma segura.
            </Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.inputLabel}>CORREO ELECTRONICO</Text>
            <TextInput
              style={styles.input}
              placeholder="nombre@empresa.com"
              placeholderTextColor="#9aa8b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />

            <Text style={styles.inputLabel}>CONTRASENA</Text>
            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Tu contrasena"
                placeholderTextColor="#9aa8b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                onPress={() => setShowPassword(value => !value)}
                style={styles.showPasswordButton}>
                <Text style={styles.showPasswordText}>{showPassword ? 'OCULTAR' : 'VER'}</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.loginError}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar sesion</Text>
              )}
            </TouchableOpacity>

            <View style={styles.secureNote}>
              <View style={styles.secureDot} />
              <Text style={styles.secureText}>Conexion protegida y datos cifrados</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChecadorPanel({perfil, user}) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [checking, setChecking] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [success, setSuccess] = useState(null);
  const displayName = getDisplayName(perfil, user);

  React.useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    if (!isSupabaseReady()) {
      setLoadingHistory(false);
      return;
    }

    try {
      setLoadingHistory(true);
      let result = await supabase
        .from('asistencias')
        .select('id, metodo_auth, timestamp_check, exitoso, foto_url')
        .order('timestamp_check', {ascending: false})
        .limit(5);

      if (result.error?.code === '42703') {
        result = await supabase
          .from('asistencias')
          .select('id, metodo_auth, timestamp_check, exitoso')
          .order('timestamp_check', {ascending: false})
          .limit(5);
      }

      if (result.error) throw result.error;
      setHistory(result.data ?? []);
    } catch (err) {
      console.warn('No se pudo cargar el historial:', err?.message || err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function captureAttendancePhoto() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Usar cámara para validar el acceso',
          message:
            'SmartCheck necesita la cámara frontal para tomar la foto que se mostrará en la pantalla de bienvenida.',
          buttonPositive: 'Continuar',
          buttonNegative: 'Cancelar',
        },
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Se requiere permiso de cámara para registrar tu acceso facial.');
      }
    }

    setStepMessage('Busca tu rostro con la cámara frontal');
    return capturarRostroAutomaticamente();
  }

  async function saveAttendance(method, photoUrl) {
    if (!isSupabaseReady()) throw new Error('No hay conexion con el servicio.');

    const {data: authData, error: authError} = await supabase.auth.getUser();
    if (authError || !authData?.user) throw new Error('Tu sesion ya no es valida. Inicia sesion de nuevo.');

    const payload = {
      usuario_id: authData.user.id,
      metodo_auth: method,
      exitoso: true,
      foto_url: photoUrl,
      nombre_display: displayName,
    };
    const {error} = await supabase.from('asistencias').insert(payload);
    if (error) throw error;
  }

  async function handleAttendance() {
    if (checking) return;

    try {
      setChecking(true);
      setSuccess(null);
      setStepMessage('Confirma tu huella en el sensor del teléfono');
      await verificarBiometria({
        promptMessage: 'Confirma tu huella para continuar con el registro.',
        tipo: 'huella',
      });

      const photo = await captureAttendancePhoto();

      if (!photo) {
        setStepMessage('Registro cancelado. No se guardo ninguna asistencia.');
        return;
      }

      setPhotoPreview(photo);
      setStepMessage('Enviando tu acceso a la pantalla');
      await saveAttendance('rostro', photo);

      const checkedAt = new Date().toISOString();
      setSuccess({method: 'rostro', checkedAt});
      setHistory(items => [
        {id: `local-${Date.now()}`, metodo_auth: 'rostro', timestamp_check: checkedAt, exitoso: true, foto_url: photo},
        ...items,
      ].slice(0, 5));
      setStepMessage('Listo. Tu foto ya esta disponible para la TV.');
    } catch (err) {
      const databaseNeedsUpdate = /foto_url|nombre_display|schema cache/i.test(err?.message ?? '');
      Alert.alert(
        'No se registro la asistencia',
        databaseNeedsUpdate
          ? 'Falta aplicar la actualizacion de Supabase incluida en el proyecto.'
          : err?.message || 'Ocurrio un error durante la verificacion.',
      );
      setStepMessage('Puedes volver a intentarlo.');
    } finally {
      setChecking(false);
    }
  }

  async function signOut() {
    if (checking || !isSupabaseReady()) return;
    const {error} = await supabase.auth.signOut();
    if (error) Alert.alert('No se pudo cerrar la sesion', error.message);
  }

  return (
    <SafeAreaView style={styles.appScreen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.appContent} showsVerticalScrollIndicator={false}>
        <View style={styles.appHeader}>
          <View style={styles.compactBrand}>
            <View style={styles.compactLogo}><Text style={styles.compactLogoText}>S</Text></View>
            <Text style={styles.compactBrandText}>SMARTCHECK</Text>
          </View>
          <TouchableOpacity onPress={signOut} disabled={checking} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Cerrar sesion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeEyebrow}>HOLA,</Text>
            <Text style={styles.welcomeName}>{displayName}</Text>
            <Text style={styles.welcomeBody}>Elige como quieres confirmar tu entrada.</Text>
          </View>
          <View style={styles.profileAvatar}>
            {photoPreview ? (
              <Image source={{uri: photoPreview}} style={styles.profilePhoto} />
            ) : (
              <Text style={styles.profileInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        </View>

        <View style={styles.registerCard}>
          <Text style={styles.sectionEyebrow}>REGISTRO DE ACCESO</Text>
          <Text style={styles.sectionTitle}>Registra tu entrada</Text>
          <Text style={styles.sectionBody}>
            Primero validarás tu huella. Después la cámara frontal detectará tu rostro y tomará la foto automáticamente.
          </Text>
          <TouchableOpacity
            style={[styles.registerButton, checking && styles.buttonDisabled]}
            onPress={handleAttendance}
            disabled={checking}
            activeOpacity={0.85}>
            <Text style={styles.registerButtonText}>Regístrate</Text>
          </TouchableOpacity>
        </View>

        {checking || stepMessage ? (
          <View style={styles.progressCard}>
            {checking ? <ActivityIndicator color={COLORS.cyan} style={styles.progressSpinner} /> : <View style={styles.progressDone} />}
            <Text style={styles.progressText}>{stepMessage}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}><Text style={styles.successIconText}>OK</Text></View>
            <View style={styles.successCopy}>
              <Text style={styles.successTitle}>Entrada registrada</Text>
              <Text style={styles.successBody}>{formatCheckTime(success.checkedAt)} / Foto enviada a la TV</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center'},
  loadingMark: {width: 62, height: 62, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cyan, backgroundColor: '#0b1b22', alignItems: 'center', justifyContent: 'center', marginBottom: 24},
  loadingMarkText: {color: COLORS.cyan, fontSize: 32, fontWeight: '900'},
  loadingText: {color: COLORS.muted, fontSize: 14, marginTop: 16, letterSpacing: 1},
  loginScreen: {flex: 1, backgroundColor: COLORS.background},
  loginKeyboard: {flex: 1},
  loginContent: {flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 34, justifyContent: 'center'},
  loginBrandRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 42},
  loginLogo: {width: 44, height: 44, borderRadius: 8, backgroundColor: '#10232c', alignItems: 'center', justifyContent: 'center', marginRight: 12},
  loginLogoText: {color: COLORS.cyan, fontSize: 24, fontWeight: '900'},
  loginBrand: {color: COLORS.white, fontSize: 21, fontWeight: '800', letterSpacing: 2.3},
  loginCopy: {marginBottom: 28},
  loginEyebrow: {color: COLORS.amber, fontSize: 11, fontWeight: '800', letterSpacing: 2.1, marginBottom: 10},
  loginTitle: {color: COLORS.white, fontSize: 39, lineHeight: 45, fontWeight: '800', marginBottom: 9},
  loginSubtitle: {color: COLORS.muted, fontSize: 15, lineHeight: 22, maxWidth: 340},
  loginCard: {backgroundColor: '#0c141b', borderRadius: 12, borderWidth: 1, borderColor: '#1a2a32', padding: 22},
  inputLabel: {color: COLORS.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8},
  input: {height: 54, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, color: COLORS.ink, fontSize: 15, paddingHorizontal: 16, marginBottom: 18, backgroundColor: '#071017'},
  passwordField: {height: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, backgroundColor: '#071017', marginBottom: 4},
  passwordInput: {flex: 1, height: '100%', color: COLORS.ink, fontSize: 15, paddingHorizontal: 16},
  showPasswordButton: {height: '100%', justifyContent: 'center', paddingHorizontal: 15},
  showPasswordText: {color: COLORS.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1},
  loginError: {color: COLORS.danger, fontSize: 13, lineHeight: 18, marginTop: 10},
  loginButton: {height: 56, borderRadius: 6, backgroundColor: COLORS.amber, alignItems: 'center', justifyContent: 'center', marginTop: 18},
  loginButtonText: {color: '#11100b', fontSize: 16, fontWeight: '900', letterSpacing: .4},
  buttonDisabled: {opacity: 0.55},
  secureNote: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16},
  secureDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 7},
  secureText: {color: COLORS.muted, fontSize: 11},
  appScreen: {flex: 1, backgroundColor: COLORS.background},
  appContent: {width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 38},
  appHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24},
  compactBrand: {flexDirection: 'row', alignItems: 'center'},
  compactLogo: {width: 38, height: 38, borderRadius: 7, backgroundColor: '#10232c', alignItems: 'center', justifyContent: 'center', marginRight: 10},
  compactLogoText: {color: COLORS.cyan, fontSize: 20, fontWeight: '900'},
  compactBrandText: {color: COLORS.ink, fontSize: 17, fontWeight: '900', letterSpacing: 1.5},
  signOutButton: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 5, backgroundColor: 'rgba(255, 101, 113, .08)', borderWidth: 1, borderColor: 'rgba(255, 101, 113, .5)'},
  signOutText: {color: '#ffacb3', fontSize: 11, fontWeight: '800'},
  welcomeCard: {backgroundColor: '#0b141c', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 22, flexDirection: 'row', alignItems: 'center', marginBottom: 18, overflow: 'hidden'},
  welcomeCopy: {flex: 1, paddingRight: 12},
  welcomeEyebrow: {color: COLORS.amber, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 5},
  welcomeName: {color: COLORS.white, fontSize: 27, lineHeight: 32, fontWeight: '800', marginBottom: 6},
  welcomeBody: {color: COLORS.muted, fontSize: 13, lineHeight: 19},
  profileAvatar: {width: 72, height: 72, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0d2730', alignItems: 'center', justifyContent: 'center'},
  profilePhoto: {width: '100%', height: '100%'},
  profileInitial: {color: COLORS.cyan, fontSize: 30, fontWeight: '800'},
  successCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(71, 215, 144, .08)', borderRadius: 10, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(71, 215, 144, .45)'},
  successIcon: {width: 43, height: 43, borderRadius: 14, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  successIconText: {color: COLORS.white, fontSize: 12, fontWeight: '900'},
  successCopy: {flex: 1},
  successTitle: {color: '#c5f8db', fontSize: 15, fontWeight: '800'},
  successBody: {color: '#8ddcaf', fontSize: 12, marginTop: 3},
  sectionEyebrow: {color: COLORS.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 6},
  sectionTitle: {color: COLORS.ink, fontSize: 25, lineHeight: 31, fontWeight: '800', marginBottom: 7},
  sectionBody: {color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: 17},
  methodGrid: {flexDirection: 'row', gap: 12},
  methodCard: {flex: 1, minHeight: 210, borderRadius: 21, padding: 16, borderWidth: 1},
  fingerprintCard: {backgroundColor: '#eaf9f7', borderColor: '#bcece5'},
  faceCard: {backgroundColor: '#edf4fe', borderColor: '#c9dcfa'},
  methodIcon: {width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 15},
  fingerprintIcon: {backgroundColor: COLORS.cyan},
  faceIcon: {backgroundColor: COLORS.blue},
  faceCorners: {width: 28, height: 28, borderWidth: 2, borderColor: COLORS.white, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  methodIconText: {color: COLORS.white, fontSize: 14, fontWeight: '900'},
  methodLabel: {color: COLORS.ink, fontSize: 16, fontWeight: '800', marginBottom: 7},
  methodDescription: {color: COLORS.muted, fontSize: 11, lineHeight: 16, flex: 1},
  methodAction: {color: COLORS.blue, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 12},
  registerCard: {backgroundColor: '#0b141c', borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 20},
  registerButton: {height: 62, borderRadius: 6, backgroundColor: COLORS.amber, alignItems: 'center', justifyContent: 'center', marginTop: 4},
  registerButtonText: {color: '#151108', fontSize: 18, fontWeight: '900', letterSpacing: .5},
  progressCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#0b141c', borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginTop: 14},
  progressSpinner: {marginRight: 11},
  progressDone: {width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, marginHorizontal: 5, marginRight: 15},
  progressText: {flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 18},
  historyHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30, marginBottom: 13},
  historyTitle: {color: COLORS.ink, fontSize: 20, fontWeight: '800'},
  refreshText: {color: COLORS.blue, fontSize: 12, fontWeight: '800', paddingVertical: 5},
  historyCard: {backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 15},
  historyLoader: {marginVertical: 28},
  emptyHistory: {color: COLORS.muted, fontSize: 13, textAlign: 'center', marginVertical: 28},
  historyItem: {minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf1f5'},
  historyItemLast: {borderBottomWidth: 0},
  historyStatus: {width: 36, height: 36, borderRadius: 12, backgroundColor: '#e7f8f0', alignItems: 'center', justifyContent: 'center', marginRight: 11},
  historyStatusDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success},
  historyDetails: {flex: 1},
  historyMethod: {color: COLORS.ink, fontSize: 13, fontWeight: '800'},
  historyDate: {color: COLORS.muted, fontSize: 11, marginTop: 3, textTransform: 'capitalize'},
  historyOk: {color: COLORS.success, fontSize: 9, fontWeight: '900', letterSpacing: 0.7},
});
