import React, {useState, useEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {supabase, isSupabaseReady} from '../services/supabase';
import {useAuth} from '../hooks/useAuth';

const formatDate = iso =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

/**
 * AdminScreen — Panel de administración.
 * Permite crear/eliminar avisos y eventos. Solo accesible para admins.
 */
export default function AdminScreen() {
  const {session, perfil, cargando, esAdmin} = useAuth();

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Debes iniciar sesión desde la pantalla Checador primero.
        </Text>
      </View>
    );
  }

  if (!esAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          ⛔ Acceso restringido a administradores.
        </Text>
      </View>
    );
  }

  return <AdminPanel perfil={perfil} />;
}

/* ─────────────────────────────────────────────────────────────
   AdminPanel — Panel principal del administrador
───────────────────────────────────────────────────────────── */
function AdminPanel({perfil}) {
  const [tab, setTab] = useState('avisos'); // 'avisos' | 'eventos'
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function cerrarSesion() {
    try {
      setCerrandoSesion(true);
      const {error} = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      Alert.alert('No se pudo cerrar sesión', err.message);
    } finally {
      setCerrandoSesion(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SMARTCHECK · ADMINISTRACIÓN</Text>
            <Text style={styles.headerTitle}>Panel de Administración</Text>
            <Text style={styles.headerSub}>{perfil?.nombre} {perfil?.apellido}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            style={styles.signOutButton}
            onPress={cerrarSesion}
            disabled={cerrandoSesion}>
            {cerrandoSesion ? <ActivityIndicator size="small" color="#fecaca" /> : <Text style={styles.signOutText}>Salir</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'avisos' && styles.tabActive]}
          onPress={() => setTab('avisos')}>
          <Text style={[styles.tabText, tab === 'avisos' && styles.tabTextActive]}>
            📢 Avisos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'eventos' && styles.tabActive]}
          onPress={() => setTab('eventos')}>
          <Text style={[styles.tabText, tab === 'eventos' && styles.tabTextActive]}>
            📅 Eventos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido del tab activo */}
      {tab === 'avisos' ? (
        <AvisosTab perfilId={perfil?.id} />
      ) : (
        <EventosTab perfilId={perfil?.id} />
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   AvisosTab — Crear y listar avisos
───────────────────────────────────────────────────────────── */
function AvisosTab({perfilId}) {
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Formulario nuevo aviso
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState('info');
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const TIPOS = ['info', 'urgente', 'evento', 'general'];
  const TIPO_COLOR = {urgente: '#ef4444', info: '#2dd4bf', evento: '#a78bfa', general: '#94a3b8'};

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);
      const {data, error} = await supabase
        .from('avisos')
        .select('id, titulo, contenido, tipo, activo, fecha_inicio')
        .order('fecha_inicio', {ascending: false})
        .limit(30);
      if (error) throw error;
      setAvisos(data ?? []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
    }
  }

  function limpiarFormulario() {
    setTitulo('');
    setContenido('');
    setTipo('info');
    setEditandoId(null);
  }

  async function guardarAviso() {
    if (!titulo.trim() || !contenido.trim()) {
      Alert.alert('Faltan datos', 'Completa título y contenido.');
      return;
    }
    if (!isSupabaseReady()) {
      Alert.alert('Servicio no disponible', 'Supabase no está disponible en este momento.');
      return;
    }
    if (!perfilId) {
      Alert.alert('Error', 'No se pudo obtener el perfil del administrador.');
      return;
    }
    try {
      setGuardando(true);
      const valores = {
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        tipo,
      };
      const {error} = editandoId
        ? await supabase.from('avisos').update(valores).eq('id', editandoId)
        : await supabase.from('avisos').insert({...valores, creado_por: perfilId});
      if (error) throw error;
      limpiarFormulario();
      cargar();
    } catch (err) {
      Alert.alert('Error al guardar', err.message);
    } finally {
      setGuardando(false);
    }
  }

  function editarAviso(aviso) {
    setEditandoId(aviso.id);
    setTitulo(aviso.titulo);
    setContenido(aviso.contenido);
    setTipo(aviso.tipo);
  }

  async function toggleAviso(aviso) {
    if (!isSupabaseReady()) {
      Alert.alert('Servicio no disponible', 'Supabase no está disponible en este momento.');
      return;
    }
    const {error} = await supabase
      .from('avisos')
      .update({activo: !aviso.activo})
      .eq('id', aviso.id);
    if (!error) cargar();
  }

  async function eliminarAviso(id) {
    if (!isSupabaseReady()) {
      Alert.alert('Servicio no disponible', 'Supabase no está disponible en este momento.');
      return;
    }
    Alert.alert('Eliminar aviso', '¿Estás seguro?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const {error} = await supabase.from('avisos').delete().eq('id', id);
          if (!error) cargar();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Formulario nuevo aviso */}
      <Text style={styles.formTitle}>{editandoId ? 'Editar aviso' : 'Nuevo aviso'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Título"
        placeholderTextColor="#475569"
        value={titulo}
        onChangeText={setTitulo}
      />
      <TextInput
        style={[styles.input, {minHeight: 80, textAlignVertical: 'top'}]}
        placeholder="Contenido"
        placeholderTextColor="#475569"
        value={contenido}
        onChangeText={setContenido}
        multiline
      />

      {/* Selector de tipo */}
      <View style={styles.tiposRow}>
        {TIPOS.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTipo(t)}
            style={[
              styles.tipoBtn,
              {borderColor: TIPO_COLOR[t]},
              tipo === t && {backgroundColor: TIPO_COLOR[t] + '33'},
            ]}>
            <Text style={[styles.tipoBtnText, {color: TIPO_COLOR[t]}]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary]}
        onPress={guardarAviso}
        disabled={guardando}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{editandoId ? 'Guardar cambios' : 'Publicar aviso'}</Text>
        )}
      </TouchableOpacity>
      {editandoId ? (
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={limpiarFormulario}>
          <Text style={styles.btnText}>Cancelar edición</Text>
        </TouchableOpacity>
      ) : null}

      {/* Lista de avisos */}
      <Text style={[styles.formTitle, {marginTop: 24}]}>Avisos existentes</Text>
      {cargando ? (
        <ActivityIndicator color="#2dd4bf" />
      ) : avisos.length === 0 ? (
        <Text style={styles.emptyText}>Sin avisos</Text>
      ) : (
        avisos.map(a => (
          <View key={a.id} style={[styles.listCard, {borderColor: TIPO_COLOR[a.tipo] ?? '#94a3b8'}]}>
            <View style={{flex: 1}}>
              <Text style={styles.listCardTitle}>{a.titulo}</Text>
              <Text style={styles.listCardSub} numberOfLines={2}>{a.contenido}</Text>
              <Text style={[styles.badge, {color: TIPO_COLOR[a.tipo]}]}>
                {a.tipo.toUpperCase()} {a.activo ? '• ACTIVO' : '• INACTIVO'}
              </Text>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity onPress={() => editarAviso(a)} style={styles.actionBtn}>
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleAviso(a)}
                style={styles.actionBtn}>
                <Text style={{fontSize: 18}}>{a.activo ? '🔴' : '🟢'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => eliminarAviso(a.id)}
                style={styles.actionBtn}>
                <Text style={{fontSize: 18}}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────────
   EventosTab — Crear y listar eventos
───────────────────────────────────────────────────────────── */
function EventosTab({perfilId}) {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Formulario nuevo evento
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [fechaInicio, setFechaInicio] = useState(null);
  const [selectorFecha, setSelectorFecha] = useState(null); // 'fecha' | 'hora' | null
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      setCargando(true);
      const {data, error} = await supabase
        .from('eventos')
        .select('id, nombre, descripcion, lugar, fecha_inicio, activo')
        .order('fecha_inicio', {ascending: true})
        .limit(30);
      if (error) throw error;
      setEventos(data ?? []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCargando(false);
    }
  }

  function limpiarFormulario() {
    setNombre('');
    setDescripcion('');
    setLugar('');
    setFechaInicio(null);
    setSelectorFecha(null);
    setEditandoId(null);
  }

  async function guardarEvento() {
    if (!nombre.trim() || !fechaInicio) {
      Alert.alert('Faltan datos', 'Completa nombre y fecha de inicio (YYYY-MM-DD HH:MM).');
      return;
    }
    if (!perfilId) {
      Alert.alert('Error', 'No se pudo obtener el perfil del administrador.');
      return;
    }
    const fecha = new Date(fechaInicio);
    if (isNaN(fecha.getTime())) {
      Alert.alert('Fecha inválida', 'Usa el formato: 2026-12-25 09:00');
      return;
    }
    try {
      setGuardando(true);
      const valores = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        lugar: lugar.trim() || null,
        fecha_inicio: fechaInicio.toISOString(),
      };
      const {error} = editandoId
        ? await supabase.from('eventos').update(valores).eq('id', editandoId)
        : await supabase.from('eventos').insert({...valores, creado_por: perfilId});
      if (error) throw error;
      limpiarFormulario();
      cargar();
    } catch (err) {
      Alert.alert('Error al guardar', err.message);
    } finally {
      setGuardando(false);
    }
  }

  function editarEvento(evento) {
    setEditandoId(evento.id);
    setNombre(evento.nombre);
    setDescripcion(evento.descripcion || '');
    setLugar(evento.lugar || '');
    setFechaInicio(new Date(evento.fecha_inicio));
  }

  async function toggleEvento(evento) {
    const {error} = await supabase.from('eventos').update({activo: !evento.activo}).eq('id', evento.id);
    if (error) Alert.alert('Error', error.message);
    else cargar();
  }

  async function eliminarEvento(id) {
    Alert.alert('Eliminar evento', '¿Estás seguro?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const {error} = await supabase.from('eventos').delete().eq('id', id);
          if (!error) cargar();
        },
      },
    ]);
  }

  function actualizarFecha(_event, fechaSeleccionada) {
    const modo = selectorFecha;
    setSelectorFecha(null);
    if (!fechaSeleccionada) return;

    const nuevaFecha = new Date(fechaInicio ?? new Date());
    if (modo === 'fecha') {
      nuevaFecha.setFullYear(
        fechaSeleccionada.getFullYear(),
        fechaSeleccionada.getMonth(),
        fechaSeleccionada.getDate(),
      );
      setFechaInicio(nuevaFecha);
      // Android muestra primero el calendario y después la hora.
      setTimeout(() => setSelectorFecha('hora'), 0);
      return;
    }
    nuevaFecha.setHours(fechaSeleccionada.getHours(), fechaSeleccionada.getMinutes(), 0, 0);
    setFechaInicio(nuevaFecha);
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Formulario nuevo evento */}
      <Text style={styles.formTitle}>{editandoId ? 'Editar evento' : 'Nuevo evento'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre del evento"
        placeholderTextColor="#475569"
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Lugar (opcional)"
        placeholderTextColor="#475569"
        value={lugar}
        onChangeText={setLugar}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Seleccionar fecha y hora de inicio"
        style={styles.datePickerButton}
        onPress={() => setSelectorFecha('fecha')}>
        <View>
          <Text style={styles.fieldLabel}>FECHA Y HORA DE INICIO</Text>
          <Text style={[styles.datePickerText, !fechaInicio && styles.datePickerPlaceholder]}>
            {fechaInicio ? formatDate(fechaInicio.toISOString()) : 'Seleccionar fecha y hora'}
          </Text>
        </View>
        <Text style={styles.calendarIcon}>▣</Text>
      </TouchableOpacity>
      {selectorFecha ? (
        <DateTimePicker
          value={fechaInicio ?? new Date()}
          mode={selectorFecha === 'fecha' ? 'date' : 'time'}
          display="default"
          is24Hour
          onChange={actualizarFecha}
        />
      ) : null}
      <TextInput
        style={[styles.input, {minHeight: 60, textAlignVertical: 'top'}]}
        placeholder="Descripción (opcional)"
        placeholderTextColor="#475569"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      <TouchableOpacity
        style={[styles.btn, styles.btnPrimary]}
        onPress={guardarEvento}
        disabled={guardando}>
        {guardando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{editandoId ? 'Guardar cambios' : 'Crear evento'}</Text>
        )}
      </TouchableOpacity>
      {editandoId ? (
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={limpiarFormulario}>
          <Text style={styles.btnText}>Cancelar edición</Text>
        </TouchableOpacity>
      ) : null}

      {/* Lista de eventos */}
      <Text style={[styles.formTitle, {marginTop: 24}]}>Eventos registrados</Text>
      {cargando ? (
        <ActivityIndicator color="#a78bfa" />
      ) : eventos.length === 0 ? (
        <Text style={styles.emptyText}>Sin eventos</Text>
      ) : (
        eventos.map(e => (
          <View key={e.id} style={[styles.listCard, {borderColor: '#a78bfa'}]}>
            <View style={{flex: 1}}>
              <Text style={styles.listCardTitle}>{e.nombre}</Text>
              {e.lugar ? (
                <Text style={styles.listCardSub}>📍 {e.lugar}</Text>
              ) : null}
              <Text style={styles.listCardSub}>
                🕐 {formatDate(e.fecha_inicio)}
              </Text>
              <Text style={[styles.badge, {color: e.activo ? '#4ade80' : '#f87171'}]}>
                {e.activo ? 'ACTIVO' : 'INACTIVO'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => editarEvento(e)} style={styles.actionBtn}>
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleEvento(e)} style={styles.actionBtn}>
              <Text style={styles.actionText}>{e.activo ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => eliminarEvento(e.id)}
              style={styles.actionBtn}>
              <Text style={{fontSize: 18}}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  centered: {
    flex: 1,
    backgroundColor: '#08111f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  eyebrow: {
    color: '#2dd4bf',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 25,
    fontWeight: '800',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  signOutButton: {
    minWidth: 62,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: 'rgba(127, 29, 29, 0.22)',
  },
  signOutText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2dd4bf',
  },
  tabText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#2dd4bf',
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 60,
  },
  formTitle: {
    color: '#67e8f9',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  datePickerButton: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  datePickerText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerPlaceholder: {
    color: '#64748b',
    fontWeight: '400',
  },
  calendarIcon: {
    color: '#2dd4bf',
    fontSize: 22,
    marginLeft: 12,
  },
  tiposRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  tipoBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tipoBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#0e7490',
  },
  btnSecondary: {
    backgroundColor: '#475569',
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listCardTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  listCardSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  listActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  actionText: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center',
  },
});
