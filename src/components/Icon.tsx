import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowsLeftRightIcon } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import { BasketIcon } from 'phosphor-react-native/src/icons/Basket';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { ButterflyIcon } from 'phosphor-react-native/src/icons/Butterfly';
import { CalendarCheckIcon } from 'phosphor-react-native/src/icons/CalendarCheck';
import { CalendarDotsIcon } from 'phosphor-react-native/src/icons/CalendarDots';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { ChartLineIcon } from 'phosphor-react-native/src/icons/ChartLine';
import { ChartPieIcon } from 'phosphor-react-native/src/icons/ChartPie';
import { ChatCircleDotsIcon } from 'phosphor-react-native/src/icons/ChatCircleDots';
import { ChatsCircleIcon } from 'phosphor-react-native/src/icons/ChatsCircle';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CheckSquareIcon } from 'phosphor-react-native/src/icons/CheckSquare';
import { ChecksIcon } from 'phosphor-react-native/src/icons/Checks';
import { CherriesIcon } from 'phosphor-react-native/src/icons/Cherries';
import { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { ClockCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ClockCounterClockwise';
import { CloudIcon } from 'phosphor-react-native/src/icons/Cloud';
import { CloudArrowDownIcon } from 'phosphor-react-native/src/icons/CloudArrowDown';
import { CloudArrowUpIcon } from 'phosphor-react-native/src/icons/CloudArrowUp';
import { CloudCheckIcon } from 'phosphor-react-native/src/icons/CloudCheck';
import { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { DeviceMobileIcon } from 'phosphor-react-native/src/icons/DeviceMobile';
import { DropIcon } from 'phosphor-react-native/src/icons/Drop';
import { EnvelopeIcon } from 'phosphor-react-native/src/icons/Envelope';
import { ExportIcon } from 'phosphor-react-native/src/icons/Export';
import { FileIcon } from 'phosphor-react-native/src/icons/File';
import { FileArrowUpIcon } from 'phosphor-react-native/src/icons/FileArrowUp';
import { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
import { FireIcon } from 'phosphor-react-native/src/icons/Fire';
import { FlowerIcon } from 'phosphor-react-native/src/icons/Flower';
import { ForkKnifeIcon } from 'phosphor-react-native/src/icons/ForkKnife';
import { GlobeIcon } from 'phosphor-react-native/src/icons/Globe';
import { HandPointingIcon } from 'phosphor-react-native/src/icons/HandPointing';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { LightbulbIcon } from 'phosphor-react-native/src/icons/Lightbulb';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { OrangeSliceIcon } from 'phosphor-react-native/src/icons/OrangeSlice';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlantIcon } from 'phosphor-react-native/src/icons/Plant';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { PlusCircleIcon } from 'phosphor-react-native/src/icons/PlusCircle';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { RainbowIcon } from 'phosphor-react-native/src/icons/Rainbow';
import { RocketLaunchIcon } from 'phosphor-react-native/src/icons/RocketLaunch';
import { ScalesIcon } from 'phosphor-react-native/src/icons/Scales';
import { ShootingStarIcon } from 'phosphor-react-native/src/icons/ShootingStar';
import { ShoppingCartIcon } from 'phosphor-react-native/src/icons/ShoppingCart';
import { SignInIcon } from 'phosphor-react-native/src/icons/SignIn';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SmileyIcon } from 'phosphor-react-native/src/icons/Smiley';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { TrendDownIcon } from 'phosphor-react-native/src/icons/TrendDown';
import { TrendUpIcon } from 'phosphor-react-native/src/icons/TrendUp';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import { UserPlusIcon } from 'phosphor-react-native/src/icons/UserPlus';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WrenchIcon } from 'phosphor-react-native/src/icons/Wrench';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';

/*
 * NutriMy's icons: Phosphor, mostly in the duotone weight — rounded shapes with
 * a soft fill in the icon's own colour, friendlier than plain outlines. Each
 * icon is imported on its own so the bundle carries only these.
 *
 * Names follow the Ionicons ones the app used before (`-outline` = duotone,
 * no suffix = filled), so call sites read the same. Small glyphs such as
 * chevrons and ✕ use the bold weight to stay crisp.
 */
const ICONS = {
  add: [PlusIcon, 'bold'],
  'add-circle': [PlusCircleIcon, 'fill'],
  'add-circle-outline': [PlusCircleIcon, 'duotone'],
  'alert-circle-outline': [WarningCircleIcon, 'duotone'],
  'arrow-back': [ArrowLeftIcon, 'bold'],
  'arrow-forward': [ArrowRightIcon, 'bold'],
  'bar-chart': [ChartBarIcon, 'fill'],
  'bar-chart-outline': [ChartBarIcon, 'duotone'],
  'basket-outline': [BasketIcon, 'duotone'],
  'bulb-outline': [LightbulbIcon, 'duotone'],
  butterfly: [ButterflyIcon, 'fill'],
  'cafe-outline': [CoffeeIcon, 'duotone'],
  'calendar-outline': [CalendarDotsIcon, 'duotone'],
  'cart-outline': [ShoppingCartIcon, 'duotone'],
  'chart-line': [ChartLineIcon, 'duotone'],
  'chatbubble-ellipses-outline': [ChatCircleDotsIcon, 'duotone'],
  'chatbubbles-outline': [ChatsCircleIcon, 'duotone'],
  checkbox: [CheckSquareIcon, 'fill'],
  'checkbox-outline': [CheckSquareIcon, 'duotone'],
  checkmark: [CheckIcon, 'bold'],
  'checkmark-circle': [CheckCircleIcon, 'fill'],
  'checkmark-circle-outline': [CheckCircleIcon, 'duotone'],
  'checkmark-done': [ChecksIcon, 'bold'],
  cherries: [CherriesIcon, 'fill'],
  'chevron-back': [CaretLeftIcon, 'bold'],
  'chevron-down': [CaretDownIcon, 'bold'],
  'chevron-forward': [CaretRightIcon, 'bold'],
  'chevron-up': [CaretUpIcon, 'bold'],
  close: [XIcon, 'bold'],
  'close-circle': [XCircleIcon, 'fill'],
  'cloud-done': [CloudCheckIcon, 'fill'],
  'cloud-done-outline': [CloudCheckIcon, 'duotone'],
  'cloud-download-outline': [CloudArrowDownIcon, 'duotone'],
  'cloud-offline-outline': [CloudSlashIcon, 'duotone'],
  'cloud-outline': [CloudIcon, 'duotone'],
  'cloud-upload-outline': [CloudArrowUpIcon, 'duotone'],
  'construct-outline': [WrenchIcon, 'duotone'],
  'create-outline': [PencilSimpleIcon, 'duotone'],
  'document-attach-outline': [FileArrowUpIcon, 'duotone'],
  'document-outline': [FileIcon, 'duotone'],
  'document-text': [FileTextIcon, 'fill'],
  'document-text-outline': [FileTextIcon, 'duotone'],
  drop: [DropIcon, 'fill'],
  'ellipse-outline': [CircleIcon, 'duotone'],
  flame: [FireIcon, 'fill'],
  'flame-outline': [FireIcon, 'duotone'],
  flower: [FlowerIcon, 'fill'],
  'globe-outline': [GlobeIcon, 'duotone'],
  'hand-left-outline': [HandPointingIcon, 'duotone'],
  'happy-outline': [SmileyIcon, 'duotone'],
  'help-circle-outline': [QuestionIcon, 'duotone'],
  history: [ClockCounterClockwiseIcon, 'duotone'],
  leaf: [LeafIcon, 'fill'],
  'leaf-outline': [LeafIcon, 'duotone'],
  'lock-closed-outline': [LockIcon, 'duotone'],
  'log-in-outline': [SignInIcon, 'duotone'],
  'log-out-outline': [SignOutIcon, 'duotone'],
  'mail-outline': [EnvelopeIcon, 'duotone'],
  'moon-outline': [MoonIcon, 'duotone'],
  notifications: [BellIcon, 'fill'],
  'notifications-outline': [BellIcon, 'duotone'],
  'nutrition-outline': [OrangeSliceIcon, 'duotone'],
  pencil: [PencilSimpleIcon, 'bold'],
  'person-add-outline': [UserPlusIcon, 'duotone'],
  'person-circle-outline': [UserCircleIcon, 'duotone'],
  'person-outline': [UserIcon, 'duotone'],
  'phone-portrait-outline': [DeviceMobileIcon, 'duotone'],
  'pie-chart': [ChartPieIcon, 'fill'],
  plant: [PlantIcon, 'fill'],
  rainbow: [RainbowIcon, 'bold'],
  'refresh-outline': [ArrowClockwiseIcon, 'bold'],
  remove: [MinusIcon, 'bold'],
  'restaurant-outline': [ForkKnifeIcon, 'duotone'],
  rocket: [RocketLaunchIcon, 'fill'],
  'rocket-outline': [RocketLaunchIcon, 'duotone'],
  scales: [ScalesIcon, 'duotone'],
  search: [MagnifyingGlassIcon, 'bold'],
  'share-outline': [ExportIcon, 'duotone'],
  'shooting-star': [ShootingStarIcon, 'fill'],
  sparkles: [SparkleIcon, 'fill'],
  'sparkles-outline': [SparkleIcon, 'duotone'],
  'sunny-outline': [SunIcon, 'duotone'],
  'swap-horizontal-outline': [ArrowsLeftRightIcon, 'bold'],
  'time-outline': [ClockIcon, 'duotone'],
  'today-outline': [CalendarCheckIcon, 'duotone'],
  'trash-outline': [TrashIcon, 'duotone'],
  'trend-down': [TrendDownIcon, 'bold'],
  'trend-up': [TrendUpIcon, 'bold'],
} satisfies Record<string, [PhosphorIcon, IconWeight]>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color,
  weight,
  style,
}: {
  name: IconName;
  size?: number;
  /** Plain colours only; navigators pass them typed as ColorValue. */
  color?: ColorValue;
  /** Overrides the icon's usual weight, e.g. `fill` for an active tab. */
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
}) {
  const [Component, defaultWeight] = ICONS[name];
  return (
    <Component
      size={size}
      color={color as string | undefined}
      weight={weight ?? defaultWeight}
      duotoneOpacity={0.22}
      style={style}
    />
  );
}
