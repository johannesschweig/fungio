import type Shroom from '@/types/Shroom'
import ToxicIcon from '@/assets/toxic.svg'
import DeadlyIcon from '@/assets/deadly.svg'
import InedibleIcon from '@/assets/inedible.svg'
import EdibleGoodIcon from '@/assets/edible-good.svg'
import EdibleExcellentIcon from '@/assets/edible-excellent.svg'

export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// season_from/season_to (1-12) wrap around the year boundary (e.g. 9 -> 3 for Sept-March),
// same convention MushroomSeason's month-pill highlighting already relies on. When the
// range covers all 12 months (e.g. 12 -> 11) it means "year-round", not literally
// "from December to November" — worth calling out explicitly instead of printing that.
export function getSeasonText(seasonFrom?: number, seasonTo?: number): string | null {
  if (!seasonFrom || !seasonTo) return null
  const monthCount = ((seasonTo - seasonFrom + 12) % 12) + 1
  if (monthCount === 12) return 'ganzjährig'
  return `von ${GERMAN_MONTHS[seasonFrom - 1]} bis ${GERMAN_MONTHS[seasonTo - 1]}`
}

// buckets obs_count_ger into a human frequency label — shared by MushroomQuickStats
// (as a tile) and MushroomIntro (woven into the intro sentence)
export function getFrequencyLabel(obsCountGer: number | undefined): string {
  const count = obsCountGer || 0
  if (count < 10) return 'Sehr selten'
  if (count < 30) return 'Selten'
  if (count < 70) return 'Häufig'
  return 'Sehr häufig'
}

const TW_COLOR_MAP: Record<string, string> = {
  none: 'bg-white',
  white: 'bg-white',
  black: 'bg-black',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  grey: 'bg-gray-600',
  gray: 'bg-gray-600',
  brown: 'bg-[#8B4513]',
};

const HEX_COLOR_MAP: Record<string, string> = {
  none: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  yellow: '#FBBF24',
  orange: '#F97316',
  red: '#EF4444',
  pink: '#EC4899',
  blue: '#2563EB',
  green: '#16A34A',
  grey: '#4B5563',
  gray: '#4B5563',
  brown: '#8B4513',
};

export function toTwColorClass(
  color: string
): string {
  return TW_COLOR_MAP[color]
}

export function toHexColor(
  color: string
): string {
  return HEX_COLOR_MAP[color] || '#78716c'
}

// random number from 0-1 with seed
function seededRandom(seed: number) {
  let value = seed
  return function () {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

export function seedToday(max: number) {
  // seed
  const now = new Date()
  const dayFrom1980 = Math.floor(now.getTime() / (1000 * 60 * 60 * 24))

  const random = seededRandom(dayFrom1980);
  return Math.floor(random() * max)
}

export type MushroomIconData = {
  icon: any | null
  class: string
  text: string
}

export function getMushroomIcon(shroom: Shroom): MushroomIconData {
  if (!shroom) return { icon: null, class: '', text: '' }

  if (shroom.toxicity === 'deadly') return { icon: DeadlyIcon, class: 'text-red-700 bg-red-100', text: 'Tödlich giftig' }
  if (shroom.toxicity === 'toxic') return { icon: ToxicIcon, class: 'text-amber-700 bg-amber-100', text: 'Giftig' }

  switch (shroom.edibility) {
    case 'excellent':
      return { icon: EdibleExcellentIcon, class: 'text-emerald-800 bg-emerald-100', text: 'Ausgezeichnet' }
    case 'good':
      return { icon: EdibleGoodIcon, class: 'text-emerald-700 bg-emerald-50', text: 'Gut' }
    case 'inedible':
      return { icon: InedibleIcon, class: 'text-stone-700 bg-stone-100', text: 'Ungenießbar' }
    default:
      return { icon: null, class: '', text: '' }
  }
}

// from dot notation to object
export function getNested(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

export function getInaturalistImageUrl(photo: string, size: "square" | "small" | "medium" | "large") {
  return photo.replace("square", size)
}

// fungi.search_name holds the lowercased names with umlauts folded (ä->ae, ß->ss, ...) and
// hyphens/spaces removed (see migrations/fungi_search_name.sql). Typed text and displayed
// names are normalized the same way, so "wiesenchampignon" finds "Wiesen-Champignon".
export function normalizeSearch(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[-–—\s]+/g, '')
}

export function toSearchPattern(query: string): string {
  return `%${normalizeSearch(query)}%`
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Create slug from name
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getMushroomUrl(shroom: Shroom): string {
  return `/mushroom/${shroom.id}-${createSlug(shroom.preferred_common_name || shroom.name)}`
}

export interface Taxon {
  id: number
  name: string
  preferred_common_name?: string | null
  rank_level: number
}

// rank_levels that get their own /taxa/ page (iNaturalist scheme: order/family/genus)
export const TAXON_PAGE_RANKS: number[] = [40, 30, 20]

export function getTaxonUrl(taxon: Pick<Taxon, 'id' | 'name' | 'preferred_common_name'>): string {
  return `/taxa/${taxon.id}-${createSlug(taxon.preferred_common_name || taxon.name)}`
}

export function getRankLabelKey(rankLevel: number): string {
  switch (rankLevel) {
    case 40: return 'rank.order'
    case 30: return 'rank.family'
    case 20: return 'rank.genus'
    case 10: return 'rank.species'
    default: return 'rank.other'
  }
}

export function getRankLabelPluralKey(rankLevel: number): string {
  switch (rankLevel) {
    case 40: return 'rank.order.plural'
    case 30: return 'rank.family.plural'
    case 20: return 'rank.genus.plural'
    case 10: return 'rank.species.plural'
    default: return 'rank.other.plural'
  }
}

export const GERMAN_ALPHABET = 'AÄBCDEFGHIJKLMNOÖPQRSTUÜVWXYZ'

export interface SeasonConfig {
  key: 'spring' | 'summer' | 'autumn' | 'winter'
  nameGerman: string
  headline: string
  subheadline: string
  monthFrom: number
  monthTo: number
}

export const SEASONS: Record<string, SeasonConfig> = {
  spring: {
    key: 'spring',
    nameGerman: 'Frühling',
    headline: 'Das Frühlingserwachen',
    subheadline: 'Startschuss für Feinschmecker.',
    monthFrom: 3,
    monthTo: 5
  },
  summer: {
    key: 'summer',
    nameGerman: 'Sommer',
    headline: 'Der Sommerwald',
    subheadline: 'Leuchtendes Gold im grünen Moos.',
    monthFrom: 6,
    monthTo: 8
  },
  autumn: {
    key: 'autumn',
    nameGerman: 'Herbst',
    headline: 'Der Herbstwald',
    subheadline: 'Die goldene Zeit für Pilzsammler.',
    monthFrom: 9,
    monthTo: 11
  },
  winter: {
    key: 'winter',
    nameGerman: 'Winter',
    headline: 'Die Winterruhe',
    subheadline: 'Verborgene Schätze im Schnee.',
    monthFrom: 12,
    monthTo: 2
  }
}

export const stateNames: Record<string, string> = {
  'DE-BW': 'Baden-Württemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thüringen'
}