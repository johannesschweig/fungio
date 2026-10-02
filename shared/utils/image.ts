// CSS widths (px) of the photo slots. <NuxtImg :width="…" densities="x1 x2" preset="photo"> requests
// each at 1x and 2x through our image proxy (/_ipx); the lightbox uses 1x only. nuxt.config.ts derives
// the proxy's allow-list from this, so a new size has to be added here or the proxy refuses it.
export const IMAGE_WIDTHS = {
  thumb: 80, // small list cards, "Pilze des Tages"
  card: 320, // large cards, mobile gallery, small desktop gallery tiles
  hero: 640, // big desktop gallery photo
  lightbox: 1024, // fullscreen lightbox (= size of iNaturalist's "large" source, never upscaled)
} as const
