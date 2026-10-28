import { optimize, type CustomPlugin, type PluginConfig, type XastElement } from 'svgo'
import { artworkFingerprint, type ArtworkFingerprint } from './fingerprint.ts'
import { collectColors, viewBoxOf, type IconNode } from './render.ts'

export const MAX_SVG_BYTES = 256 * 1024

const BLOCKED_ELEMENTS = new Set([
  'script',
  'foreignObject',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
  'canvas',
  'set',
  'animate',
  'animateMotion',
  'animateTransform',
  'discard',
  'handler',
  'listener',
])

const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i

function isUnsafeAttribute(element: XastElement, name: string, value: string): boolean {
  const lowerName = name.toLowerCase()
  const lowerValue = [...value]
    .filter((character) => character.charCodeAt(0) > 0x20)
    .join('')
    .toLowerCase()
  if (lowerName.startsWith('on')) return true
  if (lowerName.startsWith('data-')) return true
  if (lowerValue.includes('javascript:') || lowerValue.includes('vbscript:')) return true
  if (lowerName === 'href' || lowerName === 'xlink:href') {
    if (value.startsWith('#')) return false
    return !(element.name === 'image' && SAFE_IMAGE_DATA_URL.test(value))
  }
  if (lowerValue.includes('url(')) {
    const references = lowerValue.match(/url\(([^)]*)\)/g) ?? []
    const total = lowerValue.split('url(').length - 1
    return (
      references.length !== total || references.some((reference) => !/^url\(['"]?#/.test(reference))
    )
  }
  return false
}

const sanitize: CustomPlugin = {
  name: 'iconStudioSanitize',
  fn: () => ({
    cdata: {
      enter: (node, parentNode) => {
        if (parentNode.type === 'element' && parentNode.name === 'style') return
        parentNode.children = parentNode.children.filter((child) => child !== node)
      },
    },
    element: {
      enter: (node, parentNode) => {
        if (BLOCKED_ELEMENTS.has(node.name) || node.name.includes(':')) {
          parentNode.children = parentNode.children.filter((child) => child !== node)
          return
        }
        for (const [name, value] of Object.entries(node.attributes)) {
          if (isUnsafeAttribute(node, name, value)) delete node.attributes[name]
        }
      },
    },
  }),
}

function pipeline(slug: string): PluginConfig[] {
  return [
    sanitize,
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeUnknownsAndDefaults: { keepRoleAttr: true },
          convertColors: { names2hex: true, rgb2hex: true, shorthex: false, shortname: false },
        },
      },
    },
    'removeDimensions',
    'convertStyleToAttrs',
    'removeXlink',
    'removeStyleElement',
    'removeScripts',
    { name: 'prefixIds', params: { prefix: slug, delim: '-' } },
    sanitize,
  ]
}

export class SvgError extends Error {}

export interface ProcessedSvg {
  svg: string
  /** The optimized artwork, independent of the slug, for duplicate detection with `sameArtwork`. */
  fingerprint: ArtworkFingerprint
  root: IconNode
  colors: string[]
  viewBox: { width: number; height: number }
}

export function processSvg(raw: string, slug: string): ProcessedSvg {
  if (Buffer.byteLength(raw, 'utf8') > MAX_SVG_BYTES) {
    throw new SvgError(`SVG is larger than ${MAX_SVG_BYTES / 1024} KB`)
  }
  if (!/<svg[\s>]/i.test(raw)) throw new SvgError('This does not look like an SVG file')

  let root: IconNode | undefined
  const capture: CustomPlugin = {
    name: 'iconStudioCapture',
    fn: (xast) => {
      root = xast.children.find(
        (child): child is XastElement => child.type === 'element' && child.name === 'svg'
      )
      return null
    },
  }

  let svg: string
  try {
    svg = optimize(raw, { multipass: true, plugins: [...pipeline(slug), capture] }).data
  } catch (error) {
    throw new SvgError(`Could not parse the SVG: ${(error as Error).message.split('\n')[0]}`)
  }
  if (!root) throw new SvgError('The file has no <svg> root element')

  const viewBox = viewBoxOf(root)
  if (!(viewBox.width > 0 && viewBox.height > 0)) {
    throw new SvgError('The SVG needs a viewBox (or width and height) so it can be scaled')
  }
  if (!root.children.some((child) => child.type === 'element')) {
    throw new SvgError('The SVG has no visible shapes')
  }

  return {
    svg,
    fingerprint: artworkFingerprint(
      svg.split(`${slug}-`).join(''),
      Math.max(viewBox.width, viewBox.height)
    ),
    root: structuredClone(root),
    colors: collectColors(root),
    viewBox,
  }
}
