import { AccessoryWidgetBackground, Image, ZStack } from '@expo/ui/swift-ui';
import { widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Lock Screen shortcut: the app's leaf in a circle, opening NutriMy on Oggi.
 * The body runs in the widget extension's own runtime and sees nothing outside it.
 */
const LauncherWidget = () => {
  'widget';
  return (
    <ZStack modifiers={[widgetURL('nutrime://oggi')]}>
      <AccessoryWidgetBackground />
      <Image systemName="leaf.fill" size={24} />
    </ZStack>
  );
};

const widget = createWidget('LauncherWidget', LauncherWidget);

/**
 * The widget has no data, but WidgetKit draws nothing until it has a timeline
 * entry, so the app writes an empty one on launch.
 */
export function useLauncherWidget() {
  useEffect(() => {
    if (Platform.OS === 'ios') widget.updateSnapshot({});
  }, []);
}
