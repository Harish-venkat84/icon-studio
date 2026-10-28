import { describe, expect, it } from 'vitest'
import { sameArtwork } from './fingerprint.ts'
import { MAX_SVG_BYTES, processSvg, SvgError } from './process.ts'

const svg = (inner: string, attributes = 'viewBox="0 0 24 24"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attributes}><path d="M0 0h24v24H0z"/>${inner}</svg>`

const UNSAFE =
  /script|foreignobject|iframe|javascript|vbscript|srcdoc|onload|onerror|onclick|https?:\/\/(?!www\.w3\.org\/)|<animate|<set\b|<a [^>]*href|cdata/i

describe('processSvg sanitizing', () => {
  const payloads: Record<string, string> = {
    'script element': '<script>alert(1)</script>',
    'uppercase script element': '<SCRIPT>alert(1)</SCRIPT>',
    'script inside a group': '<g><script href="https://evil.test/x.js"/></g>',
    'foreignObject with HTML':
      '<foreignObject><iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"/></foreignObject>',
    'lowercase foreignobject': '<foreignobject><img src="x" onerror="alert(1)"/></foreignobject>',
    'uppercase FOREIGNOBJECT': '<FOREIGNOBJECT><IFRAME srcdoc="x"/></FOREIGNOBJECT>',
    'event handler': '<path d="M1 1h2v2z" onload="alert(1)"/>',
    'uppercase event handler': '<path d="M1 1h2v2z" ONLOAD="alert(1)"/>',
    'javascript link': '<a href="javascript:alert(1)"><path d="M1 1h2v2z"/></a>',
    'javascript link with a tab': '<a href="jav&#x09;ascript:alert(1)"><path d="M1 1h2v2z"/></a>',
    'xlink javascript link': '<a xlink:href="javascript:alert(1)"><path d="M1 1h2v2z"/></a>',
    'external use': '<use href="https://evil.test/sprite.svg#icon"/>',
    'external image': '<image href="https://evil.test/x.png" width="4" height="4"/>',
    'svg data image':
      '<image href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" width="4" height="4"/>',
    'external url() in style': '<path d="M1 1h2v2z" style="fill:url(https://evil.test/x.svg#a)"/>',
    'external url() in fill': '<path d="M1 1h2v2z" fill="url(https://evil.test/x.svg#a)"/>',
    'mixed url() references':
      '<path d="M1 1h2v2z" style="fill:url(#a);stroke:url(https://evil.test/b)"/>',
    'style element import': '<style>@import url(https://evil.test/x.css);</style>',
    'animate setting href': '<animate attributeName="href" to="javascript:alert(1)"/>',
    'set element': '<set attributeName="onmouseover" to="alert(1)"/>',
    'srcdoc attribute':
      '<g srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"><path d="M1 1h2v2z"/></g>',
    'vbscript value': '<g filter="vbscript:msgbox(1)"><path d="M1 1h2v2z"/></g>',
    'top-level CDATA': '<![CDATA[<script>alert(1)</script>]]>',
    'unknown HTML elements': '<img src="x" onerror="alert(1)"/><iframe src="https://evil.test"/>',
  }

  for (const [name, payload] of Object.entries(payloads)) {
    it(`removes ${name}`, () => {
      const output = processSvg(svg(payload), 'icon').svg
      expect(output).not.toMatch(UNSAFE)
      expect(output).toContain('<path')
    })
  }

  it('drops data- attributes', () => {
    expect(processSvg(svg('<path d="M1 1h2v2z" data-x="1"/>'), 'icon').svg).not.toContain('data-')
  })

  it('keeps raster data images', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    expect(processSvg(svg(`<image href="${png}" width="4" height="4"/>`), 'icon').svg).toContain(
      png
    )
  })

  it('keeps and prefixes internal references', () => {
    const output = processSvg(
      svg(
        '<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/>'
      ),
      'credit-card'
    ).svg
    expect(output).toMatch(/fill="url\(#credit-card-[^)]+\)"/)
  })

  it('inlines CSS from a CDATA style block', () => {
    const output = processSvg(
      svg(
        '<style><![CDATA[ .a { fill: #ff0000 } ]]></style><rect class="a" width="4" height="4"/>'
      ),
      'icon'
    ).svg
    expect(output).not.toMatch(/cdata|<style/i)
    expect(output).toContain('#f00')
  })
})

describe('processSvg validation', () => {
  it('rejects text that is not an SVG', () => {
    expect(() => processSvg('<html><body>hi</body></html>', 'icon')).toThrow(SvgError)
  })

  it('rejects files over the size limit', () => {
    const padding = `<!--${'x'.repeat(MAX_SVG_BYTES)}-->`
    expect(() => processSvg(svg(padding), 'icon')).toThrow(/larger than/)
  })

  it('rejects SVGs without a viewBox or size', () => {
    expect(() => processSvg(svg('', ''), 'icon')).toThrow(/viewBox/)
  })

  it('derives the viewBox from width and height', () => {
    expect(processSvg(svg('', 'width="32" height="16"'), 'icon').viewBox).toEqual({
      width: 32,
      height: 16,
    })
  })

  it('rejects SVGs with nothing to draw', () => {
    expect(() =>
      processSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>', 'icon')
    ).toThrow(/no visible shapes/)
  })

  it('rejects malformed XML', () => {
    expect(() => processSvg('<svg viewBox="0 0 24 24"><path d="M0 0"></svg', 'icon')).toThrow(
      SvgError
    )
  })
})

describe('processSvg output', () => {
  it('gives the same fingerprint for the same artwork under different slugs', () => {
    const artwork = svg(
      '<defs><clipPath id="c"><rect width="4" height="4"/></clipPath></defs><g clip-path="url(#c)"><path d="M1 1h2v2z"/></g>'
    )
    expect(
      sameArtwork(processSvg(artwork, 'one').fingerprint, processSvg(artwork, 'two').fingerprint)
    ).toBe(true)
  })

  it('gives different fingerprints for different artwork', () => {
    expect(
      sameArtwork(
        processSvg(svg(''), 'icon').fingerprint,
        processSvg(svg('<circle cx="4" cy="4" r="2"/>'), 'icon').fingerprint
      )
    ).toBe(false)
  })

  const sameArtworkOf = (a: string, b: string) =>
    sameArtwork(processSvg(svg(a), 'one').fingerprint, processSvg(svg(b), 'two').fingerprint)

  it('matches artwork re-exported with slightly different rounding', () => {
    expect(
      sameArtworkOf(
        '<rect width="2.083" height="8.332" x="8.332" y="24.996" rx=".521" fill="#808080"/><path d="M10.416 6.77a.52.52 0 0 0-.521-.521.52.52 0 0 0 .52-.521c0 .288.234.52.521.52" fill="#808080"/>',
        '<rect width="2.083" height="8.332" x="8.333" y="24.996" rx=".521" fill="#808080"/><path d="M10.415 6.77a.52.52 0 0 0-.52-.521.52.52 0 0 0 .52-.521c0 .288.233.52.521.52" fill="#808080"/>'
      )
    ).toBe(true)
  })

  it('does not match artwork that moved visibly', () => {
    expect(sameArtworkOf('<circle cx="4" cy="4" r="2"/>', '<circle cx="4.5" cy="4" r="2"/>')).toBe(
      false
    )
  })

  it('does not match artwork with a different color', () => {
    expect(
      sameArtworkOf(
        '<circle cx="4" cy="4" r="2" fill="#808080"/>',
        '<circle cx="4" cy="4" r="2" fill="#808081"/>'
      )
    ).toBe(false)
  })

  it('collects normalized colors', () => {
    const { colors } = processSvg(
      svg('<path d="M1 1h2v2z" fill="#F00"/><path d="M3 3h2v2z" stroke="blue" fill="none"/>'),
      'icon'
    )
    expect(colors.sort()).toEqual(['#0000ff', '#ff0000'])
  })
})
