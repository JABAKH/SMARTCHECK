import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useAvisos} from '../hooks/useAvisos';
import {useEventos} from '../hooks/useEventos';
import {useAsistencias} from '../hooks/useAsistencias';
import {getServerTimeOffset} from '../services/supabase';

const COLORS = {
  ink: '#06101c',
  panel: '#0c1b2c',
  panelSoft: '#10243a',
  white: '#f8fafc',
  muted: '#9fb0c5',
  cyan: '#36d6c5',
  blue: '#55a8ff',
  green: '#4ade80',
};
const SAN_LUIS_TIME_ZONE = 'America/Hermosillo';

const formatTime = date =>
  date.toLocaleTimeString('es-MX', {
    timeZone: SAN_LUIS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const formatSeconds = date =>
  date.toLocaleTimeString('es-MX', {timeZone: SAN_LUIS_TIME_ZONE, second: '2-digit'});

const formatDate = date =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: SAN_LUIS_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

const formatCheckTime = iso =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: SAN_LUIS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const formatCheckDate = iso =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: SAN_LUIS_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));

const formatEventDate = iso =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: SAN_LUIS_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const getPersonName = asistencia => {
  if (!asistencia) return '';
  if (asistencia.nombre) {
    return `${asistencia.nombre} ${asistencia.apellido ?? ''}`.trim();
  }
  if (asistencia.perfiles) {
    return `${asistencia.perfiles.nombre} ${asistencia.perfiles.apellido ?? ''}`.trim();
  }
  return 'Colaborador';
};

function Avatar({asistencia, large = false}) {
  const name = getPersonName(asistencia);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      {asistencia?.foto_url ? (
        <Image source={{uri: asistencia.foto_url}} style={styles.avatarImage} resizeMode="cover" />
      ) : (
        <Text style={[styles.avatarInitials, large && styles.avatarInitialsLarge]}>
          {initials || 'SC'}
        </Text>
      )}
    </View>
  );
}

function EmptyArrival({loading, error}) {
  return (
    <View style={styles.emptyArrival}>
      {loading ? <ActivityIndicator size="large" color={COLORS.cyan} /> : null}
      <Text style={styles.emptyArrivalTitle}>
        {loading ? 'Sincronizando accesos' : 'Esperando el siguiente acceso'}
      </Text>
      <Text style={styles.emptyArrivalBody}>
        {error
          ? 'No se pudo leer el registro de asistencias. Revisa la configuracion de Supabase.'
          : 'Cuando un colaborador registre su entrada, su foto y sus datos apareceran aqui.'}
      </Text>
    </View>
  );
}

export default function TVScreen() {
  const [clockOffset, setClockOffset] = React.useState(0);
  const [tick, setTick] = React.useState(0);
  const now = new Date(Date.now() + clockOffset);
  const {width, height} = useWindowDimensions();
  // Android TV 1080p suele reportar 960x540 dp por la densidad del sistema.
  const isWide = width >= 700 && width > height;
  const fade = React.useRef(new Animated.Value(1)).current;
  const {avisos, cargando: loadingNotices} = useAvisos();
  const {eventos, cargando: loadingEvents} = useEventos();
  const {
    asistencias,
    cargando: loadingAttendance,
    error: attendanceError,
  } = useAsistencias(null, 8);
  const latest = asistencias[0] ?? null;

  React.useEffect(() => {
    let active = true;
    getServerTimeOffset().then(offset => {
      if (active) setClockOffset(offset);
    });
    const timer = setInterval(() => setTick(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!latest?.id) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fade, latest?.id]);

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={[styles.content, !isWide && styles.contentNarrow]}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <View>
              <Text style={styles.brand}>SMARTCHECK</Text>
              <Text style={styles.brandCaption}>CONTROL DE ACCESO</Text>
            </View>
          </View>
          <View style={styles.statusBlock}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN LINEA</Text>
            </View>
            <Text style={styles.statusCaption}>Pantalla general</Text>
          </View>
        </View>

        <View style={[styles.dashboard, !isWide && styles.dashboardNarrow]}>
          <View style={[styles.heroColumn, !isWide && styles.heroColumnNarrow]}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.eyebrow}>ACCESO MAS RECIENTE</Text>
                <Text style={styles.sectionHeading}>Bienvenido a la empresa</Text>
              </View>
              <View style={styles.confirmedPill}>
                <Text style={styles.confirmedPillText}>
                  {latest ? 'REGISTRO CONFIRMADO' : 'LISTO PARA RECIBIR'}
                </Text>
              </View>
            </View>

            <Animated.View style={[styles.arrivalCard, {opacity: fade}]}>
              {latest ? (
                <>
                  <View style={styles.photoColumn}>
                    <Avatar asistencia={latest} large />
                    <View style={styles.photoStatus}>
                      <View style={styles.photoStatusDot} />
                      <Text style={styles.photoStatusText}>IDENTIDAD VALIDADA</Text>
                    </View>
                  </View>
                  <View style={styles.personDetails}>
                    <Text style={styles.welcomeLabel}>HOLA,</Text>
                    <Text style={styles.personName} numberOfLines={2} adjustsFontSizeToFit>
                      {getPersonName(latest)}
                    </Text>
                    <Text style={styles.personMessage}>
                      Tu entrada fue registrada correctamente.
                    </Text>
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>HORA</Text>
                        <Text style={styles.detailValue}>{formatCheckTime(latest.timestamp_check)}</Text>
                      </View>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailItemWide}>
                        <Text style={styles.detailLabel}>FECHA</Text>
                        <Text style={styles.detailValueSmall}>{formatCheckDate(latest.timestamp_check)}</Text>
                      </View>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>METODO</Text>
                        <Text style={styles.detailValueSmall}>
                          {latest.metodo_auth === 'rostro' ? 'Rostro' : 'Huella'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <EmptyArrival loading={loadingAttendance} error={attendanceError} />
              )}
            </Animated.View>

            <View style={styles.bottomGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>AVISOS</Text>
                {loadingNotices ? (
                  <ActivityIndicator color={COLORS.cyan} />
                ) : avisos[0] ? (
                  <>
                    <Text style={styles.infoCardTitle} numberOfLines={1}>{avisos[0].titulo}</Text>
                    <Text style={styles.infoCardBody} numberOfLines={2}>{avisos[0].contenido}</Text>
                  </>
                ) : (
                  <Text style={styles.infoCardBody}>No hay avisos activos.</Text>
                )}
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>PROXIMO EVENTO</Text>
                {loadingEvents ? (
                  <ActivityIndicator color={COLORS.blue} />
                ) : eventos[0] ? (
                  <>
                    <Text style={styles.infoCardTitle} numberOfLines={1}>{eventos[0].nombre}</Text>
                    <Text style={styles.infoCardBody} numberOfLines={2}>
                      {formatEventDate(eventos[0].fecha_inicio)}
                      {eventos[0].lugar ? `  /  ${eventos[0].lugar}` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.infoCardBody}>No hay eventos programados.</Text>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.sideColumn, !isWide && styles.sideColumnNarrow]}>
            <View style={styles.clockCard}>
              <Text style={styles.clockLabel}>HORA ACTUAL</Text>
              <View style={styles.clockRow}>
                <Text style={styles.clock} numberOfLines={1} adjustsFontSizeToFit>{formatTime(now)}</Text>
                <Text style={styles.seconds}>{formatSeconds(now)}</Text>
              </View>
              <Text style={styles.date}>{formatDate(now)}</Text>
            </View>
            <View style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>ACCESOS DE HOY</Text>
                <Text style={styles.recentCount}>{asistencias.length}</Text>
              </View>
              <View style={styles.recentList}>
                {asistencias.slice(1, 6).map(item => (
                  <View key={item.id} style={styles.recentItem}>
                    <Avatar asistencia={item} />
                    <View style={styles.recentDetails}>
                      <Text style={styles.recentName} numberOfLines={1}>{getPersonName(item)}</Text>
                      <Text style={styles.recentMethod}>
                        {item.metodo_auth === 'rostro' ? 'Verificacion facial' : 'Huella digital'}
                      </Text>
                    </View>
                    <Text style={styles.recentTime}>{formatCheckTime(item.timestamp_check)}</Text>
                  </View>
                ))}
                {!loadingAttendance && asistencias.length <= 1 ? (
                  <View style={styles.recentEmpty}>
                    <Text style={styles.recentEmptyText}>Los siguientes accesos apareceran aqui.</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SMARTCHECK / ASISTENCIA EN TIEMPO REAL</Text>
          <Text style={styles.footerText}>Sincronizacion automatica</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: COLORS.ink, overflow: 'hidden'},
  glowTop: {position: 'absolute', width: 520, height: 520, borderRadius: 260, backgroundColor: '#0c5772', opacity: 0.18, top: -300, right: -120},
  glowBottom: {position: 'absolute', width: 620, height: 620, borderRadius: 310, backgroundColor: '#123d6b', opacity: 0.18, bottom: -420, left: -180},
  content: {flex: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 10},
  contentNarrow: {paddingHorizontal: 24, paddingTop: 24},
  header: {height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  brandBlock: {flexDirection: 'row', alignItems: 'center'},
  logoMark: {width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.cyan, justifyContent: 'center', alignItems: 'center', marginRight: 11},
  logoText: {color: COLORS.ink, fontSize: 23, fontWeight: '900'},
  brand: {color: COLORS.white, fontSize: 21, fontWeight: '800', letterSpacing: 2.2},
  brandCaption: {color: COLORS.muted, fontSize: 8, fontWeight: '700', letterSpacing: 2.4, marginTop: 2},
  statusBlock: {alignItems: 'flex-end'},
  liveBadge: {flexDirection: 'row', alignItems: 'center'},
  liveDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.green, marginRight: 8},
  liveText: {color: '#b8f7cd', fontSize: 13, fontWeight: '800', letterSpacing: 1.6},
  statusCaption: {color: COLORS.muted, fontSize: 11, marginTop: 4},
  dashboard: {flex: 1, flexDirection: 'row', gap: 14, paddingTop: 12},
  dashboardNarrow: {flexDirection: 'column'},
  heroColumn: {flex: 1.72},
  heroColumnNarrow: {flex: 1},
  sideColumn: {flex: 0.78, gap: 10},
  sideColumnNarrow: {flex: 1, flexDirection: 'row'},
  sectionHeadingRow: {height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  eyebrow: {color: COLORS.cyan, fontSize: 8, fontWeight: '800', letterSpacing: 1.8, marginBottom: 4},
  sectionHeading: {color: COLORS.white, fontSize: 19, fontWeight: '700'},
  confirmedPill: {borderWidth: 1, borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.09)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6},
  confirmedPillText: {color: '#a7f3d0', fontSize: 7, fontWeight: '800', letterSpacing: 1},
  arrivalCard: {flex: 1, minHeight: 250, flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: COLORS.panel, borderWidth: 1, borderColor: 'rgba(85,168,255,0.25)', padding: 16},
  photoColumn: {width: '38%', height: '100%', alignItems: 'center', justifyContent: 'center'},
  avatar: {width: 40, height: 40, borderRadius: 13, backgroundColor: '#173653', borderWidth: 1, borderColor: 'rgba(54,214,197,0.5)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center'},
  avatarLarge: {width: '100%', height: '88%', maxHeight: 260, borderRadius: 18, borderWidth: 2},
  avatarImage: {width: '100%', height: '100%'},
  avatarInitials: {color: COLORS.white, fontSize: 17, fontWeight: '800'},
  avatarInitialsLarge: {fontSize: 72, color: COLORS.cyan},
  photoStatus: {position: 'absolute', bottom: 3, flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(4,15,25,0.92)', paddingHorizontal: 9, paddingVertical: 6},
  photoStatusDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green, marginRight: 7},
  photoStatusText: {color: '#bbf7d0', fontSize: 7, fontWeight: '800', letterSpacing: 0.8},
  personDetails: {flex: 1, paddingLeft: 22, justifyContent: 'center'},
  welcomeLabel: {color: COLORS.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 5},
  personName: {color: COLORS.white, fontSize: 34, lineHeight: 38, fontWeight: '800', marginBottom: 7},
  personMessage: {color: COLORS.muted, fontSize: 11, lineHeight: 16, marginBottom: 14},
  detailsRow: {flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(159,176,197,0.16)', paddingTop: 12},
  detailItem: {flex: 0.75},
  detailItemWide: {flex: 1.25},
  detailDivider: {width: 1, height: 28, backgroundColor: 'rgba(159,176,197,0.18)', marginHorizontal: 10},
  detailLabel: {color: COLORS.muted, fontSize: 7, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4},
  detailValue: {color: COLORS.white, fontSize: 18, fontWeight: '800'},
  detailValueSmall: {color: COLORS.white, fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  emptyArrival: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 70},
  emptyArrivalTitle: {color: COLORS.white, fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center'},
  emptyArrivalBody: {color: COLORS.muted, fontSize: 11, lineHeight: 16, maxWidth: 420, textAlign: 'center', marginTop: 7},
  bottomGrid: {height: 80, flexDirection: 'row', gap: 10, marginTop: 10},
  infoCard: {flex: 1, borderRadius: 14, backgroundColor: 'rgba(16,36,58,0.82)', borderWidth: 1, borderColor: 'rgba(159,176,197,0.14)', paddingHorizontal: 13, paddingVertical: 9},
  infoCardLabel: {color: COLORS.cyan, fontSize: 7, fontWeight: '800', letterSpacing: 1.3, marginBottom: 4},
  infoCardTitle: {color: COLORS.white, fontSize: 12, fontWeight: '700', marginBottom: 3},
  infoCardBody: {color: COLORS.muted, fontSize: 9, lineHeight: 12},
  clockCard: {height: 136, borderRadius: 18, backgroundColor: COLORS.panelSoft, borderWidth: 1, borderColor: 'rgba(54,214,197,0.22)', paddingHorizontal: 16, paddingVertical: 14},
  clockLabel: {color: COLORS.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 2.2},
  clockRow: {flexDirection: 'row', alignItems: 'flex-start', marginTop: 8},
  clock: {color: COLORS.white, fontSize: 42, lineHeight: 48, fontWeight: '800', letterSpacing: -2, flexShrink: 1},
  seconds: {color: COLORS.cyan, fontSize: 13, fontWeight: '700', marginTop: 6, marginLeft: 6},
  date: {color: COLORS.muted, fontSize: 10, lineHeight: 14, textTransform: 'capitalize'},
  recentCard: {flex: 1, borderRadius: 18, backgroundColor: 'rgba(12,27,44,0.92)', borderWidth: 1, borderColor: 'rgba(159,176,197,0.13)', paddingHorizontal: 13, paddingVertical: 12},
  recentHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  recentTitle: {color: COLORS.white, fontSize: 13, fontWeight: '800', letterSpacing: 1.4},
  recentCount: {color: COLORS.cyan, fontSize: 20, fontWeight: '800'},
  recentList: {flex: 1},
  recentItem: {flex: 1, minHeight: 44, maxHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(159,176,197,0.1)'},
  recentDetails: {flex: 1, marginHorizontal: 12},
  recentName: {color: COLORS.white, fontSize: 14, fontWeight: '700'},
  recentMethod: {color: COLORS.muted, fontSize: 10, marginTop: 3},
  recentTime: {color: COLORS.cyan, fontSize: 15, fontWeight: '800'},
  recentEmpty: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20},
  recentEmptyText: {color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: 'center'},
  footer: {height: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'},
  footerText: {color: '#577089', fontSize: 9, fontWeight: '700', letterSpacing: 1.2},
});
