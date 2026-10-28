import type { XastElement, XastText } from 'svgo'
import type { IconMeta } from './meta.ts'

export type IconNode = XastElement

export type AttrValue = { type: 'static'; value: string } | { type: 'prop'; name: string }

export type IconStyle = Pick<IconMeta, 'mode' | 'colorProps' | 'defaults'>

export const COLOR_ATTRIBUTES = new Set([
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
  'color',
])

const ROOT_SKIPPED_ATTRIBUTES = new Set(['width', 'height', 'xmlns:xlink', 'version'])

export function isColorValue(value: string): boolean {
  const lower = value.trim().toLowerCase()
  return !(
    lower === 'none' ||
    lower === 'transparent' ||
    lower === 'currentcolor' ||
    lower === 'inherit' ||
    lower.startsWith('url(')
  )
}

export function normalizeColor(value: string): string {
  const lower = value.trim().toLowerCase()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(lower)
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : lower
}

export function collectColors(root: IconNode): string[] {
  const colors = new Set<string>()
  const visit = (node: XastElement) => {
    for (const [name, value] of Object.entries(node.attributes)) {
      if (COLOR_ATTRIBUTES.has(name) && isColorValue(value)) colors.add(normalizeColor(value))
    }
    node.children.forEach((child) => child.type === 'element' && visit(child))
  }
  visit(root)
  return [...colors]
}

export function viewBoxOf(root: IconNode): { width: number; height: number } {
  const parts = (root.attributes.viewBox ?? '').split(/[\s,]+/).map(Number)
  const width = parts[2] ?? 0
  const height = parts[3] ?? 0
  return { width, height }
}

export function aspectRatio(root: IconNode): number {
  const { width, height } = viewBoxOf(root)
  return width > 0 && height > 0 ? Math.round((width / height) * 10000) / 10000 : 1
}

export function iconAttributes(
  node: IconNode,
  style: Pick<IconStyle, 'mode' | 'colorProps'>,
  isRoot: boolean
): [string, AttrValue][] {
  const propByColor = new Map(style.colorProps.map((prop) => [normalizeColor(prop.value), prop]))
  const attributes: [string, AttrValue][] = []

  for (const [name, value] of Object.entries(node.attributes)) {
    if (isRoot && ROOT_SKIPPED_ATTRIBUTES.has(name)) continue
    if (COLOR_ATTRIBUTES.has(name) && isColorValue(value)) {
      if (style.mode === 'mono') {
        attributes.push([name, { type: 'static', value: 'currentColor' }])
        continue
      }
      const prop = propByColor.get(normalizeColor(value))
      if (prop) {
        attributes.push([name, { type: 'prop', name: prop.name }])
        continue
      }
    }
    attributes.push([name, { type: 'static', value }])
  }

  if (isRoot && style.mode === 'mono' && !('fill' in node.attributes)) {
    attributes.push(['fill', { type: 'static', value: 'currentColor' }])
  }
  return attributes
}

export function renderableChildren(node: IconNode): (XastElement | XastText)[] {
  return node.children.filter(
    (child): child is XastElement | XastText =>
      (child.type === 'element' && child.name !== 'title') ||
      (child.type === 'text' && child.value.trim() !== '')
  )
}

export interface RenderOptions {
  size?: number | string
  color?: string
  colorValues?: Record<string, string>
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

export function renderSvgMarkup(root: IconNode, style: IconStyle, options: RenderOptions = {}) {
  const size = options.size ?? style.defaults.size
  const color = options.color ?? style.defaults.color
  const ratio = aspectRatio(root)
  const propDefaults = new Map(style.colorProps.map((prop) => [prop.name, prop.value]))

  const resolve = (value: AttrValue) =>
    value.type === 'static'
      ? value.value
      : (options.colorValues?.[value.name] ?? propDefaults.get(value.name) ?? 'currentColor')

  const renderNode = (node: XastElement, isRoot: boolean): string => {
    const attributes = iconAttributes(node, style, isRoot).map(
      ([name, value]) => `${name}="${escapeAttribute(resolve(value))}"`
    )
    if (isRoot) {
      const height = typeof size === 'number' ? `${size}` : size
      const width = typeof size === 'number' ? `${size * ratio}` : ratio === 1 ? size : undefined
      if (width) attributes.push(`width="${escapeAttribute(width)}"`)
      attributes.push(`height="${escapeAttribute(height)}"`)
      if (color) attributes.push(`color="${escapeAttribute(color)}"`)
    }
    const children = renderableChildren(node)
      .map((child) =>
        child.type === 'element' ? renderNode(child, false) : escapeText(child.value)
      )
      .join('')
    return `<${node.name} ${attributes.join(' ')}>${children}</${node.name}>`
  }

  return renderNode(root, true)
}
