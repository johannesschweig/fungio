// CSS widths (px) of the photo slots. <NuxtImg :width="…" densities="x1 x2" preset="photo"> requests
// each at 1x and 2x through our image proxy (/_ipx); the lightbox uses 1x only. nuxt.config.ts derives
// the proxy's allow-list from this, so a new size has to be added here or the proxy refuses it.
export const IMAGE_WIDTHS = {
  thumb: 80, // small list cards, "Pilze des Tages"
  card: 320, // large cards, mobile gallery, small desktop gallery tiles
  hero: 640, // big desktop gallery photo
  lightbox: 1024, // fullscreen lightbox (= size of iNaturalist's "large" source, never upscaled)
} as const

// All photos live on iNaturalist's S3 bucket. The proxy URL carries a short alias instead of the full
// source URL (/_ipx/<modifiers>/inat/photos/… rather than …/https://…/photos/…): Vercel answers any
// path containing `//` with a 308 redirect, which would cost every photo an extra round trip.
export const PHOTO_ORIGIN = 'https://inaturalist-open-data.s3.amazonaws.com'
export const PHOTO_ALIAS = '/inat'

// `url` as stored in `photos.url` (iNaturalist "square" variant) -> proxy source for the given variant
export function proxyPhotoSource(url: string, size: 'medium' | 'large'): string {
  const sized = url.replace('square', size)
  return sized.startsWith(PHOTO_ORIGIN) ? PHOTO_ALIAS + sized.slice(PHOTO_ORIGIN.length) : sized
}
