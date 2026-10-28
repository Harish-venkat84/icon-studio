import type { ComponentPropsWithRef } from 'react'

export interface IconProps extends Omit<ComponentPropsWithRef<'svg'>, 'children'> {
  /** Height in px (number) or any CSS length. Width follows the icon's aspect ratio. */
  size?: number | string
  /** Accessible label. Without it the icon is aria-hidden. */
  title?: string
}

/** A bundled PNG. Compatible with next/image's StaticImageData, so it can be passed as `src`. */
export interface ImageAsset {
  src: string
  width: number
  height: number
  blurDataURL?: string
  blurWidth?: number
  blurHeight?: number
}
