'use client'

import {
  renderSvgMarkup,
  type IconNode,
  type IconStyle,
  type RenderOptions,
} from '@icon-studio/core/render'
import { cn } from '@/lib/cn'

interface SvgPreviewProps {
  root: IconNode
  iconStyle: IconStyle
  options?: RenderOptions
  className?: string
}

export function SvgPreview({ root, iconStyle, options, className }: SvgPreviewProps) {
  return (
    <span
      className={cn('inline-flex items-center justify-center [&>svg]:block', className)}
      dangerouslySetInnerHTML={{ __html: renderSvgMarkup(root, iconStyle, options) }}
    />
  )
}
