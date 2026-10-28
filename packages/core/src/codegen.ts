import type { XastElement, XastText } from 'svgo'
import { toComponentName, type IconMeta } from './meta.ts'
import {
  aspectRatio,
  iconAttributes,
  renderableChildren,
  type AttrValue,
  type IconNode,
} from './render.ts'

function jsxAttributeName(name: string): string {
  if (name === 'class') return 'className'
  if (name.startsWith('data-') || name.startsWith('aria-')) return name
  return name.replace(/[-:]([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function styleObject(css: string): string {
  const entries = css
    .split(';')
    .map((declaration) => declaration.split(':'))
    .filter((parts): parts is [string, string] => parts.length === 2 && parts[0]!.trim() !== '')
    .map(([property, value]) => {
      const key = property.trim().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
      return `${key}: ${JSON.stringify(value.trim())}`
    })
  return `{{ ${entries.join(', ')} }}`
}

function jsxAttribute(name: string, value: AttrValue): string {
  const jsxName = jsxAttributeName(name)
  if (value.type === 'prop') return `${jsxName}={${value.name}}`
  if (name === 'style') return `${jsxName}=${styleObject(value.value)}`
  if (/["\\&{}<>]/.test(value.value)) return `${jsxName}={${JSON.stringify(value.value)}}`
  return `${jsxName}="${value.value}"`
}

function renderChild(child: XastElement | XastText, meta: IconMeta, depth: number): string {
  if (child.type === 'text') return `${'  '.repeat(depth)}{${JSON.stringify(child.value)}}`
  return renderElement(child, meta, depth)
}

function renderElement(node: XastElement, meta: IconMeta, depth: number): string {
  const indent = '  '.repeat(depth)
  const attributes = iconAttributes(node, meta, false).map(([name, value]) =>
    jsxAttribute(name, value)
  )
  const open = `${indent}<${node.name}${attributes.length ? ` ${attributes.join(' ')}` : ''}`
  const children = renderableChildren(node)
  if (children.length === 0) return `${open} />`
  return [
    `${open}>`,
    ...children.map((child) => renderChild(child, meta, depth + 1)),
    `${indent}</${node.name}>`,
  ].join('\n')
}

export function generateComponent(root: IconNode, meta: IconMeta): string {
  const componentName = toComponentName(meta.slug)
  const ratio = aspectRatio(root)
  const hasCustomProps = meta.colorProps.length > 0
  const propsType = hasCustomProps ? `${componentName}Props` : 'IconProps'

  const params = [
    `size = ${meta.defaults.size}`,
    ...(meta.defaults.color ? [`color = ${JSON.stringify(meta.defaults.color)}`] : []),
    'title',
    ...meta.colorProps.map((prop) => `${prop.name} = ${JSON.stringify(prop.value)}`),
    '...props',
  ]

  const rootAttributes = iconAttributes(root, meta, true).map(([name, value]) =>
    jsxAttribute(name, value)
  )
  const width = ratio === 1 ? 'size' : `typeof size === 'number' ? size * ${ratio} : undefined`
  const svgAttributes = [
    ...rootAttributes,
    `width={${width}}`,
    'height={size}',
    ...(meta.defaults.color ? ['color={color}'] : []),
    "role={title ? 'img' : undefined}",
    'aria-hidden={title ? undefined : true}',
    '{...props}',
  ]

  const body = renderableChildren(root)
    .map((child) => renderChild(child, meta, 3))
    .join('\n')

  return [
    `// Generated from icons/${meta.slug}.svg by scripts/generate.ts. Do not edit.`,
    "import type { IconProps } from '../../types.js'",
    '',
    ...(hasCustomProps
      ? [
          `export interface ${propsType} extends IconProps {`,
          ...meta.colorProps.map((prop) => `  ${prop.name}?: string`),
          '}',
          '',
        ]
      : []),
    `export function ${componentName}({ ${params.join(', ')} }: ${propsType}) {`,
    '  return (',
    `    <svg ${svgAttributes.join(' ')}>`,
    '      {title ? <title>{title}</title> : null}',
    body,
    '    </svg>',
    '  )',
    '}',
    '',
  ].join('\n')
}

const NATIVE_ELEMENTS: Record<string, string> = {
  circle: 'Circle',
  clipPath: 'ClipPath',
  defs: 'Defs',
  ellipse: 'Ellipse',
  g: 'G',
  image: 'SvgImage',
  line: 'Line',
  linearGradient: 'LinearGradient',
  marker: 'Marker',
  mask: 'Mask',
  path: 'Path',
  pattern: 'Pattern',
  polygon: 'Polygon',
  polyline: 'Polyline',
  radialGradient: 'RadialGradient',
  rect: 'Rect',
  stop: 'Stop',
  symbol: 'Symbol',
  text: 'Text',
  textPath: 'TextPath',
  tspan: 'TSpan',
  use: 'Use',
}

const NATIVE_DROPPED_ATTRIBUTE =
  /^(?:xmlns(?::.*)?|class|style|role|version|xml:space|data-.*|aria-.*|focusable)$/

function nativeElement(
  node: XastElement,
  meta: IconMeta,
  depth: number,
  used: Set<string>,
  skipped: Set<string>
): string | null {
  const component = NATIVE_ELEMENTS[node.name]
  if (!component) {
    skipped.add(node.name)
    return null
  }
  used.add(component)
  const indent = '  '.repeat(depth)
  const attributes = iconAttributes(node, meta, false)
    .filter(([name]) => !NATIVE_DROPPED_ATTRIBUTE.test(name))
    .map(([name, value]) => jsxAttribute(name, value))
  const open = `${indent}<${component}${attributes.length ? ` ${attributes.join(' ')}` : ''}`
  const children = renderableChildren(node)
    .map((child) =>
      child.type === 'text'
        ? `${'  '.repeat(depth + 1)}{${JSON.stringify(child.value)}}`
        : nativeElement(child, meta, depth + 1, used, skipped)
    )
    .filter((child): child is string => child !== null)
  if (children.length === 0) return `${open} />`
  return [`${open}>`, ...children, `${indent}</${component}>`].join('\n')
}

export interface NativeComponentResult {
  code: string
  /** SVG elements react-native-svg can't render, left out of the component. */
  skipped: string[]
}

export function generateNativeComponent(root: IconNode, meta: IconMeta): NativeComponentResult {
  const componentName = toComponentName(meta.slug)
  const ratio = aspectRatio(root)
  const hasCustomProps = meta.colorProps.length > 0
  const propsType = hasCustomProps ? `${componentName}Props` : 'NativeIconProps'
  const used = new Set<string>()
  const skipped = new Set<string>()

  const params = [
    `size = ${meta.defaults.size}`,
    ...(meta.defaults.color ? [`color = ${JSON.stringify(meta.defaults.color)}`] : []),
    'title',
    ...meta.colorProps.map((prop) => `${prop.name} = ${JSON.stringify(prop.value)}`),
    '...props',
  ]

  const rootAttributes = iconAttributes(root, meta, true)
    .filter(([name]) => !NATIVE_DROPPED_ATTRIBUTE.test(name))
    .map(([name, value]) => jsxAttribute(name, value))
  const width = ratio === 1 ? 'size' : `typeof size === 'number' ? size * ${ratio} : undefined`
  const svgAttributes = [
    ...rootAttributes,
    `width={${width}}`,
    'height={size}',
    ...(meta.defaults.color ? ['color={color}'] : []),
    'accessible={Boolean(title)}',
    'accessibilityLabel={title}',
    "accessibilityRole={title ? 'image' : undefined}",
    '{...props}',
  ]

  const body = renderableChildren(root)
    .map((child) => (child.type === 'text' ? null : nativeElement(child, meta, 3, used, skipped)))
    .filter((child): child is string => child !== null)
    .join('\n')

  const named = [...used].sort().map((name) => (name === 'SvgImage' ? 'Image as SvgImage' : name))

  const code = [
    `// Generated from icons/${meta.slug}.svg by scripts/generate.ts. Do not edit.`,
    `import Svg${named.length ? `, { ${named.join(', ')} }` : ''} from 'react-native-svg'`,
    "import type { NativeIconProps } from '../../native_types.js'",
    '',
    ...(hasCustomProps
      ? [
          `export interface ${propsType} extends NativeIconProps {`,
          ...meta.colorProps.map((prop) => `  ${prop.name}?: string`),
          '}',
          '',
        ]
      : []),
    `export function ${componentName}({ ${params.join(', ')} }: ${propsType}) {`,
    '  return (',
    `    <Svg ${svgAttributes.join(' ')}>`,
    body,
    '    </Svg>',
    '  )',
    '}',
    '',
  ].join('\n')

  return { code, skipped: [...skipped].filter((name) => name !== 'title') }
}
