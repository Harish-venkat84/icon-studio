import { describe, expect, it } from 'vitest'
import { formatName, normalizeTag, parseTags } from './meta.ts'

describe('formatName', () => {
  it('turns slugs and file names into words', () => {
    expect(formatName('verify-gard')).toBe('Verify gard')
    expect(formatName('Verified-bg')).toBe('Verified bg')
    expect(formatName('merchant_kyc_one')).toBe('Merchant kyc one')
  })

  it('capitalizes a lowercase first word', () => {
    expect(formatName('copy')).toBe('Copy')
    expect(formatName('  arrow   down ')).toBe('Arrow down')
  })

  it('keeps words that already have capitals', () => {
    expect(formatName('USB')).toBe('USB')
    expect(formatName('iOS')).toBe('iOS')
    expect(formatName('Merchant KYC one')).toBe('Merchant KYC one')
  })

  it('keeps dashes inside multi-word names', () => {
    expect(formatName('Wi-Fi signal')).toBe('Wi-Fi signal')
  })

  it('leaves an empty name empty', () => {
    expect(formatName('   ')).toBe('')
  })
})

describe('tags', () => {
  it('normalizes a tag to kebab-case', () => {
    expect(normalizeTag(' Merchant Dashboard ')).toBe('merchant-dashboard')
    expect(normalizeTag('2FA')).toBe('2fa')
    expect(normalizeTag('Café')).toBe('cafe')
  })

  it('parses a comma separated list and removes duplicates and blanks', () => {
    expect(parseTags('Payment, payment ,, Merchant Dashboard')).toEqual([
      'payment',
      'merchant-dashboard',
    ])
    expect(parseTags(['a b', 'A-B'])).toEqual(['a-b'])
  })
})
