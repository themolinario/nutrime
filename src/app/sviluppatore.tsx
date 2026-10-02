import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Card, Display, Heading, Muted, Overline } from '../components/ui';
import { DEVELOPER } from '../config/app';
import { contactDeveloper, type ContactTopic } from '../lib/developer';
import { colors, fonts, radius, spacing } from '../theme';
import { Icon, type IconName } from '../components/Icon';

const SERVICES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'phone-portrait-outline',
    title: 'App per iPhone e Android',
    text: 'Come NutriMy: dal documento di partenza a un’app curata, con widget, notifiche e backup.',
  },
  {
    icon: 'globe-outline',
    title: 'Siti e web app',
    text: 'Gestionali, prenotazioni, classifiche, aree riservate: su misura e veloci.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Automazioni e intelligenza artificiale',
    text: 'Leggere PDF e documenti, generare report, togliere lavoro ripetitivo.',
  },
];

const CONTACTS: {
  topic: ContactTopic;
  icon: IconName;
  title: string;
  text: string;
}[] = [
  {
    topic: 'change',
    icon: 'construct-outline',
    title: 'Chiedi una modifica',
    text: 'Qualcosa di NutriMy che vorresti diverso',
  },
  {
    topic: 'idea',
    icon: 'bulb-outline',
    title: 'Proponi un’idea',
    text: 'Una funzione nuova da aggiungere all’app',
  },
  {
    topic: 'project',
    icon: 'rocket-outline',
    title: 'Commissiona un progetto',
    text: 'Un’app, un sito o un’automazione tutta tua',
  },
];

export default function DeveloperScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.greenDeep, colors.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: spacing.lg }]}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Chiudi"
            testID="developer-close"
          >
            <Icon name="close" size={20} color={colors.white} />
          </Pressable>
          <Overline style={styles.heroOverline}>Lo sviluppatore</Overline>
          <Display style={styles.heroTitle}>Hai un’idea?{'\n'}La costruiamo.</Display>
          <Body style={styles.heroBody}>
            Sono {DEVELOPER.name} e ho creato NutriMy. Progetto e sviluppo app, siti e automazioni
            su misura, dall’idea alla pubblicazione.
          </Body>
        </LinearGradient>

        <View style={styles.content}>
          <Overline style={styles.sectionTitle}>Scrivimi per</Overline>
          <View style={styles.contacts}>
            {CONTACTS.map((contact) => (
              <Pressable
                key={contact.topic}
                onPress={() => void contactDeveloper(contact.topic)}
                style={({ pressed }) => [pressed && styles.pressed]}
                testID={`developer-${contact.topic}`}
              >
                <Card style={styles.contact}>
                  <View style={styles.contactIcon}>
                    <Icon name={contact.icon} size={19} color={colors.green} />
                  </View>
                  <View style={styles.contactText}>
                    <Heading>{contact.title}</Heading>
                    <Muted>{contact.text}</Muted>
                  </View>
                  <Icon name="mail-outline" size={18} color={colors.green} />
                </Card>
              </Pressable>
            ))}
          </View>

          <Overline style={styles.sectionTitle}>Cosa faccio</Overline>
          <Card style={styles.services}>
            {SERVICES.map((service, index) => (
              <View key={service.title}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.service}>
                  <Icon name={service.icon} size={20} color={colors.terracotta} />
                  <View style={styles.contactText}>
                    <Heading>{service.title}</Heading>
                    <Muted style={styles.serviceText}>{service.text}</Muted>
                  </View>
                </View>
              </View>
            ))}
          </Card>

          <Card style={styles.promise}>
            <Icon name="chatbubbles-outline" size={18} color={colors.green} />
            <Body style={styles.promiseText}>
              Rispondo io, di persona, a ogni messaggio. Scrivimi anche solo per un consiglio!
            </Body>
          </Card>

          <Muted style={styles.email}>{DEVELOPER.email}</Muted>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  close: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverline: { color: '#BFDCCB', marginTop: spacing.sm },
  heroTitle: { color: colors.white, fontSize: 34, lineHeight: 40, marginTop: spacing.xs },
  heroBody: { color: '#DCEBE2', marginTop: spacing.md, lineHeight: 22 },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { marginTop: spacing.sm, marginLeft: spacing.xs },
  contacts: { gap: spacing.sm },
  pressed: { opacity: 0.8 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: { flex: 1, gap: 2 },
  services: { paddingHorizontal: spacing.lg },
  service: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  serviceText: { lineHeight: 19 },
  divider: { height: 1, backgroundColor: colors.border },
  promise: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.greenSoft,
    borderColor: colors.greenBorder,
  },
  promiseText: { flex: 1, fontFamily: fonts.bodyMedium, color: colors.greenDeep },
  email: { textAlign: 'center', marginTop: spacing.sm },
});
