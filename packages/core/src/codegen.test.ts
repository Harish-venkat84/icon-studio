import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { generateComponent, generateNativeComponent } from './codegen.ts'
import { iconMetaSchema, type IconMetaInput } from './meta.ts'
import { processSvg } from './process.ts'

const ICONS_DIR = join(import.meta.dirname, '../../../icons')

function build(raw: string, input: Partial<IconMetaInput> & { slug: string }) {
  const meta = iconMetaSchema.parse({ name: input.slug, ...input })
  const { root } = processSvg(raw, meta.slug)
  return { web: generateComponent(root, meta), native: generateNativeComponent(root, meta) }
}

function syntaxErrors(code: string) {
  const result = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  })
  return (result.diagnostics ?? []).map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  )
}

const twoTone =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#0091FF" d="M0 0h12v24H0z"/><path stroke="#ff0000" stroke-width="2" d="M12 0h12v24H12z"/></svg>'

describe('generateComponent', () => {
  it('turns every color into currentColor for single-color icons', () => {
    const { web } = build(twoTone, { slug: 'two-tone' })
    expect(web).toContain('export function TwoToneIcon(')
    expect(web).not.toMatch(/#0091ff|#ff0000/i)
    expect(web).toContain('fill="currentColor"')
    expect(web).toContain('stroke="currentColor"')
    expect(web).toContain('strokeWidth="2"')
  })

  it('maps colors to props for multi-color icons', () => {
    const { web } = build(twoTone, {
      slug: 'two-tone',
      mode: 'multi',
      colorProps: [{ name: 'accentColor', value: '#ff0000' }],
    })
    expect(web).toContain('export interface TwoToneIconProps extends IconProps')
    expect(web).toContain('accentColor = "#ff0000"')
    expect(web).toContain('stroke={accentColor}')
    expect(web).toContain('fill="#0091ff"')
  })

  it('scales the width by the aspect ratio', () => {
    const { web } = build(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24"><path d="M0 0h48v24H0z"/></svg>',
      { slug: 'wide' }
    )
    expect(web).toContain("width={typeof size === 'number' ? size * 2 : undefined}")
  })

  it('applies the default size and color', () => {
    const { web } = build(twoTone, { slug: 'two-tone', defaults: { size: 32, color: '#0866FF' } })
    expect(web).toContain('size = 32')
    expect(web).toContain('color = "#0866FF"')
  })

  it('escapes text content', () => {
    const { web } = build(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text>{"a"} &lt;b&gt;</text></svg>',
      { slug: 'label' }
    )
    expect(web).toContain('{"{\\"a\\"} <b>"}')
    expect(syntaxErrors(web)).toEqual([])
  })
})

describe('generateNativeComponent', () => {
  it('uses react-native-svg elements', () => {
    const { native } = build(twoTone, { slug: 'two-tone' })
    expect(native.code).toContain("import Svg, { Path } from 'react-native-svg'")
    expect(native.code).toContain('<Path ')
    expect(native.skipped).toEqual([])
  })

  it('reports elements react-native-svg cannot render', () => {
    const { native } = build(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><filter id="f"><feGaussianBlur stdDeviation="1"/></filter><path filter="url(#f)" d="M0 0h24v24H0z"/></svg>',
      { slug: 'blurred' }
    )
    expect(native.skipped).toContain('filter')
    expect(native.code).not.toContain('feGaussianBlur')
  })
})

describe('the icon library', () => {
  const slugs = readdirSync(ICONS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))

  it('has icons to check', () => {
    expect(slugs.length).toBeGreaterThan(0)
  })

  for (const slug of slugs) {
    it(`${slug} generates valid web and native components`, () => {
      const meta = iconMetaSchema.parse(
        JSON.parse(readFileSync(join(ICONS_DIR, `${slug}.json`), 'utf8'))
      )
      expect(meta.slug).toBe(slug)
      const raw = readFileSync(join(ICONS_DIR, `${slug}.svg`), 'utf8')
      const { root } = processSvg(raw, slug)
      expect(syntaxErrors(generateComponent(root, meta))).toEqual([])
      expect(syntaxErrors(generateNativeComponent(root, meta).code)).toEqual([])
    })
  }
})
