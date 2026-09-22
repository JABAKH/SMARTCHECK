import React, {useEffect, useState} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';

const announcement = 'Examen de programación — Viernes 10:00 AM';
const nextEvent = 'Feria de Tecnología';
const nextEventTime = '10:00 AM';

const formatTime = date =>
  date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const formatDate = date =>
  new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.content}>
        <Text style={styles.brand}>SMARTCHECK</Text>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>AVISO IMPORTANTE</Text>
          <Text style={styles.announcement}>{announcement}</Text>
        </View>

        <View style={styles.eventCard}>
          <Text style={styles.sectionTitle}>PRÓXIMO EVENTO</Text>
          <Text style={styles.eventName}>{nextEvent}</Text>
          <Text style={styles.eventTime}>{nextEventTime}</Text>
        </View>

        <Text style={styles.footer}>Sistema de pantalla inteligente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  time: {
    color: '#f1f5f9',
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 8,
  },
  date: {
    color: '#cbd5e1',
    fontSize: 24,
    marginBottom: 18,
    textTransform: 'capitalize',
  },
  infoCard: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: 'rgba(15, 118, 110, 0.24)',
    borderWidth: 1,
    borderColor: '#2dd4bf',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 28,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#67e8f9',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  announcement: {
    color: '#f8fafc',
    fontSize: 28,
    textAlign: 'center',
    fontWeight: '600',
  },
  eventCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 26,
    marginBottom: 22,
    alignItems: 'center',
  },
  eventName: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  eventTime: {
    color: '#cbd5e1',
    fontSize: 22,
    marginTop: 8,
  },
  footer: {
    color: '#94a3b8',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
});
