import { createHash } from 'node:crypto'

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

export interface ArtworkFingerprint {
  shape: string
  numbers: number[]
  tolerance: number
}

const TOKEN = /#[0-9a-f]{3,8}\b|-?(?:\d+\.?\d*|\.\d+)/gi
const NUMBER = '\uE000'
const RELATIVE_TOLERANCE = 0.001

/**
 * Splits optimized SVG markup into its structure and its numbers, so artwork re-exported with
 * slightly different rounding still matches. `size` is the larger viewBox side.
 */
export function artworkFingerprint(svg: string, size: number): ArtworkFingerprint {
  const numbers: number[] = []
  const skeleton = svg
    .replace(TOKEN, (token) => {
      if (token.startsWith('#')) return token.toLowerCase()
      numbers.push(Number(token))
      return NUMBER
    })
    .replace(/(?<=\uE000)[\s,]+(?=\uE000)/g, '')
  return { shape: sha256Hex(skeleton), numbers, tolerance: size * RELATIVE_TOLERANCE }
}

export function sameArtwork(a: ArtworkFingerprint, b: ArtworkFingerprint): boolean {
  if (a.shape !== b.shape || a.numbers.length !== b.numbers.length) return false
  const tolerance = Math.min(a.tolerance, b.tolerance)
  return a.numbers.every((value, index) => Math.abs(value - b.numbers[index]!) <= tolerance)
}
