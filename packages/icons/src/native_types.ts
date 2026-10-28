import type { SvgProps } from 'react-native-svg'

export interface NativeIconProps extends Omit<SvgProps, 'children'> {
  /** Height in px (number) or a percentage string. Width follows the icon's aspect ratio. */
  size?: number | string
  /** Accessibility label. Without it the icon is hidden from screen readers. */
  title?: string
}

/** A bundled PNG for React Native's `<Image source={...} />` (a Metro asset reference). */
export type NativeImageSource = number
