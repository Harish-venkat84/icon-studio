import { describe, expect, it } from 'vitest'
import { iconMetaSchema, type IconMetaInput } from './meta.ts'
import { iconReleaseEntry, imageReleaseEntry, releaseImpact } from './release.ts'
import { bumpProblem, bumpVersion, caretAccepts, recommendedBump } from './version.ts'

const icon = (input: Partial<IconMetaInput> = {}) =>
  iconMetaSchema.parse({ name: 'Logo', slug: 'logo', mode: 'multi', ...input })

const image = { name: 'Hero', slug: 'hero', tags: [], alt: '', width: 1, height: 1, bytes: 1 }

describe('bumpVersion', () => {
  it('bumps each part', () => {
    expect(bumpVersion('0.4.6', 'patch')).toBe('0.4.7')
    expect(bumpVersion('0.4.6', 'minor')).toBe('0.5.0')
    expect(bumpVersion('0.4.6', 'major')).toBe('1.0.0')
    expect(bumpVersion('1.2.3-beta.1', 'patch')).toBe('1.2.4')
  })
})

describe('caretAccepts', () => {
  it('follows npm caret ranges', () => {
    expect(caretAccepts('0.4.6', '0.4.7')).toBe(true)
    expect(caretAccepts('0.4.6', '0.5.0')).toBe(false)
    expect(caretAccepts('1.2.3', '1.3.0')).toBe(true)
    expect(caretAccepts('1.2.3', '2.0.0')).toBe(false)
    expect(caretAccepts('0.0.3', '0.0.4')).toBe(false)
  })
})

describe('recommendedBump', () => {
  it('treats minor as breaking below 1.0.0', () => {
    expect(recommendedBump('0.4.6', 'breaking')).toBe('minor')
    expect(recommendedBump('0.4.6', 'feature')).toBe('patch')
    expect(recommendedBump('0.4.6', 'fix')).toBe('patch')
  })

  it('follows semver from 1.0.0', () => {
    expect(recommendedBump('1.0.0', 'breaking')).toBe('major')
    expect(recommendedBump('1.0.0', 'feature')).toBe('minor')
    expect(recommendedBump('1.0.0', 'fix')).toBe('patch')
  })
})

describe('bumpProblem', () => {
  it('blocks breaking releases that stay inside the caret range', () => {
    expect(bumpProblem('0.4.6', 'patch', 'breaking')).toMatch(/0\.5\.0/)
    expect(bumpProblem('1.4.6', 'minor', 'breaking')).toMatch(/2\.0\.0/)
  })

  it('allows breaking releases that leave the caret range', () => {
    expect(bumpProblem('0.4.6', 'minor', 'breaking')).toBeNull()
    expect(bumpProblem('0.4.6', 'major', 'breaking')).toBeNull()
    expect(bumpProblem('1.4.6', 'major', 'breaking')).toBeNull()
  })

  it('allows any bump for other releases', () => {
    expect(bumpProblem('0.4.6', 'patch', 'feature')).toBeNull()
    expect(bumpProblem('0.4.6', 'patch', null)).toBeNull()
  })
})

describe('iconReleaseEntry', () => {
  it('marks new icons as features', () => {
    expect(iconReleaseEntry('logo', null, icon())).toMatchObject({
      change: 'added',
      impact: 'feature',
    })
  })

  it('marks deleted icons as breaking', () => {
    expect(iconReleaseEntry('logo', icon(), null)).toMatchObject({
      change: 'removed',
      impact: 'breaking',
      notes: ['LogoIcon is no longer exported'],
    })
  })

  it('marks removed color props as breaking', () => {
    const before = icon({ colorProps: [{ name: 'accentColor', value: '#ff0000' }] })
    expect(iconReleaseEntry('logo', before, icon())).toMatchObject({
      change: 'updated',
      impact: 'breaking',
      notes: ['LogoIcon no longer has the accentColor prop'],
    })
  })

  it('marks new color props as features', () => {
    const after = icon({ colorProps: [{ name: 'accentColor', value: '#ff0000' }] })
    expect(iconReleaseEntry('logo', icon(), after)?.impact).toBe('feature')
  })

  it('marks other updates as fixes', () => {
    expect(iconReleaseEntry('logo', icon(), icon({ tags: ['brand'] }))?.impact).toBe('fix')
  })

  it('ignores files that never had valid metadata', () => {
    expect(iconReleaseEntry('logo', null, null)).toBeNull()
  })
})

describe('imageReleaseEntry', () => {
  it('marks deleted images as breaking', () => {
    expect(imageReleaseEntry('hero', image, null)).toMatchObject({
      impact: 'breaking',
      notes: ['heroImage is no longer exported'],
    })
  })
})

describe('releaseImpact', () => {
  it('takes the most severe change', () => {
    const added = iconReleaseEntry('a', null, icon())!
    const removed = iconReleaseEntry('b', icon(), null)!
    const updated = iconReleaseEntry('c', icon(), icon())!
    expect(releaseImpact([updated, added, removed])).toBe('breaking')
    expect(releaseImpact([updated, added])).toBe('feature')
    expect(releaseImpact([updated])).toBe('fix')
    expect(releaseImpact([])).toBeNull()
  })

  it('flags a rename as breaking', () => {
    const entries = [
      iconReleaseEntry('arrow-top-right', icon(), null)!,
      iconReleaseEntry('arrow-up-right', null, icon())!,
    ]
    expect(releaseImpact(entries)).toBe('breaking')
  })
})
