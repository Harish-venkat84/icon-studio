import { describe, expect, it } from 'vitest'
import { MAX_PNG_BYTES, MAX_PNG_DIMENSION, readPngSize, toImageExportName } from './image.ts'

function pngHeader(width: number, height: number, chunk = 'IHDR') {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  bytes.set(
    [...chunk].map((character) => character.charCodeAt(0)),
    12
  )
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

describe('readPngSize', () => {
  it('reads the size from the IHDR chunk', () => {
    expect(readPngSize(pngHeader(640, 480))).toEqual({ width: 640, height: 480 })
  })

  it('rejects files that are not PNGs', () => {
    const gif = new TextEncoder().encode('GIF89a'.padEnd(40, '\0'))
    expect(() => readPngSize(gif)).toThrow(/not a PNG/)
  })

  it('rejects truncated files', () => {
    expect(() => readPngSize(pngHeader(10, 10).subarray(0, 20))).toThrow(/not a PNG/)
  })

  it('rejects a damaged header', () => {
    expect(() => readPngSize(pngHeader(10, 10, 'IDAT'))).toThrow(/damaged/)
  })

  it('rejects zero and oversized dimensions', () => {
    expect(() => readPngSize(pngHeader(0, 10))).toThrow(/dimensions/)
    expect(() => readPngSize(pngHeader(10, MAX_PNG_DIMENSION + 1))).toThrow(/dimensions/)
  })

  it('rejects files over the size limit', () => {
    const big = new Uint8Array(MAX_PNG_BYTES + 1)
    big.set(pngHeader(10, 10))
    expect(() => readPngSize(big)).toThrow(/larger than/)
  })
})

describe('toImageExportName', () => {
  it('camel-cases the slug', () => {
    expect(toImageExportName('merchant-kyc-one')).toBe('merchantKycOneImage')
  })
})
