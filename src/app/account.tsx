import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Card, Heading, Muted, Title } from '../components/ui';
import { fetchBackup, restoreBackup, uploadBackup } from '../lib/cloud/backup';
import { authErrorMessage, deleteAccount, signOut, useSession } from '../lib/cloud/session';
import { useDietStore } from '../lib/store/useDietStore';
import { colors, spacing } from '../theme';
import { Icon } from '../components/Icon';

function formatWhen(ms: number | null): string {
  if (!ms) return 'mai';
  return new Date(ms).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession((s) => s.session);
  const lastBackupAt = useDietStore((s) => s.lastBackupAt);
  const [busy, setBusy] = useState<string | null>(null);

  const attempt = async (label: string, action: () => Promise<void>, done?: string) => {
    setBusy(label);
    try {
      await action();
      if (done) Alert.alert(done);
    } catch (error) {
      console.warn('NutriMy: operazione account non riuscita', error);
      Alert.alert('Operazione non riuscita', authErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = () =>
    attempt('restore', async () => {
      const backup = await fetchBackup();
      if (!backup) {
        Alert.alert('Nessun backup', 'Nel cloud non c’è ancora nulla per questo account.');
        return;
      }
      await new Promise<void>((resolve) =>
        Alert.alert(
          'Ripristinare il backup?',
          `I dati sul telefono verranno sostituiti con quelli salvati il ${formatWhen(backup.updatedAt.getTime())}.`,
          [
            { text: 'Annulla', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Ripristina',
              style: 'destructive',
              onPress: () => {
                restoreBackup(backup);
                resolve();
              },
            },
          ],
        ),
      );
    });

  const onDelete = () =>
    Alert.alert(
      'Eliminare l’account?',
      'Account e backup online verranno cancellati per sempre. I dati sul telefono restano.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () =>
            void attempt(
              'delete',
              async () => {
                await deleteAccount();
                useDietStore.getState().setLastBackupAt(null);
              },
              'Account eliminato',
            ),
        },
      ],
    );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Title style={styles.headerTitle}>Account e backup</Title>
            <Muted>
              {session
                ? 'I tuoi dati si salvano online a ogni modifica: niente paura di perderli.'
                : 'Crea un account per salvare i dati online e ritrovarli su un altro telefono.'}
            </Muted>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Chiudi"
          >
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {session ? (
          <>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Icon name="person-circle-outline" size={22} color={colors.green} />
                <View style={styles.rowText}>
                  <Heading numberOfLines={1}>{session.user.email ?? 'Account Apple'}</Heading>
                  <Muted>Ultimo backup: {formatWhen(lastBackupAt)}</Muted>
                </View>
                <Icon name="cloud-done-outline" size={20} color={colors.green} />
              </View>
            </Card>

            <View style={styles.actions}>
              {busy ? (
                <ActivityIndicator color={colors.green} style={styles.busy} />
              ) : (
                <>
                  <Button
                    label="Salva adesso"
                    icon="cloud-upload-outline"
                    onPress={() => void attempt('upload', uploadBackup, 'Backup fatto')}
                    testID="account-upload"
                  />
                  <Button
                    label="Ripristina dal cloud"
                    icon="cloud-download-outline"
                    variant="secondary"
                    onPress={() => void onRestore()}
                    testID="account-restore"
                  />
                  <Button
                    label="Esci"
                    icon="log-out-outline"
                    variant="ghost"
                    onPress={() => void attempt('signout', signOut)}
                    testID="account-signout"
                  />
                  <Button
                    label="Elimina account"
                    icon="trash-outline"
                    variant="danger"
                    onPress={onDelete}
                    testID="account-delete"
                  />
                </>
              )}
            </View>
          </>
        ) : (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Icon name="cloud-offline-outline" size={22} color={colors.textMuted} />
              <Body style={styles.rowText}>Non hai ancora fatto l’accesso.</Body>
            </View>
            <Button
              label="Accedi o registrati"
              icon="log-in-outline"
              onPress={() => {
                // Full screen, not stacked inside this sheet.
                router.back();
                router.push('/accesso');
              }}
              testID="account-signin"
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 22 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1 },
  actions: { gap: spacing.sm },
  busy: { height: 50 },
});
