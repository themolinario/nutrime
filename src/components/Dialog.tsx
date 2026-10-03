import * as Haptics from 'expo-haptics';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';

import { closeDialog, useDialogStore, type Dialog, type DialogButton } from '../lib/dialog';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Icon } from './Icon';
import { Muted, Title } from './ui';

function Choice({ button, main, onPress }: { button: DialogButton; main: boolean; onPress: () => void }) {
  const tone =
    button.style === 'destructive'
      ? styles.destructive
      : button.style === 'cancel'
        ? styles.cancel
        : main
          ? styles.main
          : styles.secondary;
  const label =
    button.style === 'destructive'
      ? styles.destructiveText
      : button.style === 'cancel'
        ? styles.cancelText
        : main
          ? styles.mainText
          : styles.secondaryText;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.choice, tone, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={button.text}
      testID={`dialog-button-${button.text}`}
    >
      <Text style={[styles.choiceText, label]}>{button.text}</Text>
    </Pressable>
  );
}

/** Actions first, the way out last: the main action sits closest to the message. */
function ordered(buttons: DialogButton[]) {
  const actions = buttons.filter((b) => b.style !== 'cancel');
  const cancel = buttons.filter((b) => b.style === 'cancel');
  const main = [...actions].reverse().find((b) => b.style !== 'destructive');
  return { list: [...actions, ...cancel], main };
}

function Card({ dialog }: { dialog: Dialog }) {
  const { list, main } = ordered(dialog.buttons);
  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  const cancelable = dialog.options.cancelable ?? true;
  const dismiss = () => {
    if (cancelable) closeDialog(dialog.id, cancel);
  };
  const destructive = dialog.buttons.some((b) => b.style === 'destructive');
  const icon = dialog.options.icon ?? (destructive ? 'alert-circle-outline' : undefined);

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Chiudi" />
        <Animated.View
          entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
          style={styles.card}
          accessibilityViewIsModal
          testID="dialog"
        >
          {icon ? (
            <View style={[styles.icon, destructive && styles.iconDanger]}>
              <Icon name={icon} size={24} color={destructive ? colors.danger : colors.green} />
            </View>
          ) : null}
          <Title style={styles.title}>{dialog.title}</Title>
          {dialog.message ? <Muted style={styles.message}>{dialog.message}</Muted> : null}
          <View style={styles.choices}>
            {list.map((button) => (
              <Choice
                key={button.text}
                button={button}
                main={button === main}
                onPress={() => closeDialog(dialog.id, button)}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Shows the app's dialogs one at a time, above everything. Mounted once, in the root layout. */
export function DialogHost() {
  const dialog = useDialogStore((s) => s.queue[0]);
  return dialog ? <Card key={dialog.id} dialog={dialog} /> : null;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(20, 30, 24, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.bg,
    ...shadow.raised,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenSoft,
    marginBottom: spacing.md,
  },
  iconDanger: { backgroundColor: colors.terracottaSoft },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: spacing.sm, fontSize: 14, lineHeight: 20 },
  choices: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
  choice: {
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.8 },
  choiceText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  main: { backgroundColor: colors.green },
  mainText: { color: colors.white },
  secondary: { backgroundColor: colors.surface, borderColor: colors.greenBorder },
  secondaryText: { color: colors.green },
  destructive: { backgroundColor: colors.danger },
  destructiveText: { color: colors.white },
  cancel: { backgroundColor: 'transparent' },
  cancelText: { color: colors.textMuted },
});
