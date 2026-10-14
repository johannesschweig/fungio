import { describe, expect, it } from 'vitest'
import { IMAGE_WIDTHS, PHOTO_ALIAS, PHOTO_ORIGIN, proxyPhotoSource } from '../../shared/utils/image'

describe('proxyPhotoSource', () => {
  const stored = `${PHOTO_ORIGIN}/photos/12345/square.jpg`

  it('swaps the size variant and shortens the origin to the /inat alias (no "//" in proxy paths)', () => {
    expect(proxyPhotoSource(stored, 'medium')).toBe(`${PHOTO_ALIAS}/photos/12345/medium.jpg`)
    expect(proxyPhotoSource(stored, 'large')).toBe(`${PHOTO_ALIAS}/photos/12345/large.jpg`)
  })
  it('leaves URLs from other hosts untouched (apart from the size)', () => {
    expect(proxyPhotoSource('https://example.org/a/square.jpg', 'medium')).toBe('https://example.org/a/medium.jpg')
  })
  it('never produces a double slash for the proxied path', () => {
    expect(proxyPhotoSource(stored, 'medium')).not.toContain('//')
  })
})

describe('IMAGE_WIDTHS', () => {
  it('only contains positive widths, ascending from thumb to lightbox', () => {
    const { thumb, card, hero, lightbox } = IMAGE_WIDTHS
    expect([thumb, card, hero, lightbox]).toEqual([...[thumb, card, hero, lightbox]].sort((a, b) => a - b))
    expect(thumb).toBeGreaterThan(0)
  })
})
