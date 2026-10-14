import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GERMAN_ALPHABET, GERMAN_MONTHS, SEASONS, TAXON_PAGE_RANKS, stateNames,
  capitalizeFirstLetter, createSlug, getFrequencyLabel, getInaturalistImageUrl, getMushroomIcon,
  getMushroomUrl, getNested, getRankLabelKey, getRankLabelPluralKey, getSeasonText, getTaxonUrl,
  normalizeSearch, seedToday, toHexColor, toSearchPattern, toTwColorClass,
} from '@/utils/utils'

describe('createSlug', () => {
  it('lowercases and folds German umlauts', () => {
    expect(createSlug('Grüner Knollenblätterpilz')).toBe('gruener-knollenblaetterpilz')
    expect(createSlug('Maronen-Röhrling')).toBe('maronen-roehrling')
    expect(createSlug('Fußpilz')).toBe('fusspilz')
  })
  it('collapses punctuation and trims dashes', () => {
    expect(createSlug('Amanita muscaria (L.) Lam.')).toBe('amanita-muscaria-l-lam')
    expect(createSlug('  --Pilz!!  ')).toBe('pilz')
  })
})

describe('URLs', () => {
  it('builds mushroom URLs as /mushroom/<id>-<slug> (used by sitemap + links)', () => {
    expect(getMushroomUrl({ id: 7, name: 'Amanita muscaria', preferred_common_name: 'Fliegenpilz', ancestry: '' }))
      .toBe('/mushroom/7-fliegenpilz')
  })
  it('falls back to the latin name when there is no German name (also for empty string)', () => {
    expect(getMushroomUrl({ id: 7, name: 'Amanita muscaria', ancestry: '' })).toBe('/mushroom/7-amanita-muscaria')
    expect(getMushroomUrl({ id: 7, name: 'Amanita muscaria', preferred_common_name: '', ancestry: '' }))
      .toBe('/mushroom/7-amanita-muscaria')
  })
  it('builds taxon URLs as /taxa/<id>-<slug>', () => {
    expect(getTaxonUrl({ id: 3, name: 'Boletaceae', preferred_common_name: 'Dickröhrlingsverwandte' }))
      .toBe('/taxa/3-dickroehrlingsverwandte')
    expect(getTaxonUrl({ id: 3, name: 'Boletaceae', preferred_common_name: null })).toBe('/taxa/3-boletaceae')
  })
})

describe('search normalisation', () => {
  it('ignores case, hyphens, spaces and umlauts so "wiesenchampignon" finds "Wiesen-Champignon"', () => {
    expect(normalizeSearch('Wiesen-Champignon')).toBe('wiesenchampignon')
    expect(normalizeSearch('wiesenchampignon')).toBe('wiesenchampignon')
    expect(normalizeSearch('Süßer Täubling')).toBe('suessertaeubling')
    expect(normalizeSearch('Pfifferling – echter')).toBe('pfifferlingechter')
  })
  it('wraps the normalised text in % for ilike', () => {
    expect(toSearchPattern('Stein Pilz')).toBe('%steinpilz%')
    expect(toSearchPattern('')).toBe('%%')
  })
  it('matches what the DB column fungi.search_name stores for the same text', () => {
    expect(normalizeSearch('Wiesen-Champignon')).toBe(normalizeSearch('wiesen champignon'))
  })
})

describe('getSeasonText', () => {
  it('returns null when a month is missing', () => {
    expect(getSeasonText()).toBeNull()
    expect(getSeasonText(5, undefined)).toBeNull()
  })
  it('formats a normal range', () => {
    expect(getSeasonText(7, 10)).toBe('von Juli bis Oktober')
  })
  it('handles ranges that wrap around the new year', () => {
    expect(getSeasonText(9, 3)).toBe('von September bis März')
  })
  it('says "ganzjährig" when the range covers all 12 months', () => {
    expect(getSeasonText(1, 12)).toBe('ganzjährig')
    expect(getSeasonText(12, 11)).toBe('ganzjährig')
    expect(getSeasonText(5, 4)).toBe('ganzjährig')
  })
  it('keeps 11 months as a range', () => {
    expect(getSeasonText(1, 11)).toBe('von Januar bis November')
  })
})

describe('getFrequencyLabel', () => {
  it.each([
    [undefined, 'Sehr selten'], [0, 'Sehr selten'], [9, 'Sehr selten'],
    [10, 'Selten'], [29, 'Selten'],
    [30, 'Häufig'], [69, 'Häufig'],
    [70, 'Sehr häufig'], [5000, 'Sehr häufig'],
  ])('%s observations -> %s', (count, label) => {
    expect(getFrequencyLabel(count)).toBe(label)
  })
})

describe('getMushroomIcon', () => {
  const base = { id: 1, name: 'x', ancestry: '' }
  it('returns an empty descriptor for missing data', () => {
    expect(getMushroomIcon(undefined as any)).toEqual({ icon: null, class: '', text: '' })
    expect(getMushroomIcon(base)).toEqual({ icon: null, class: '', text: '' })
  })
  it('shows the warning for deadly/toxic species...', () => {
    expect(getMushroomIcon({ ...base, toxicity: 'deadly' }).text).toBe('Tödlich giftig')
    expect(getMushroomIcon({ ...base, toxicity: 'toxic' }).text).toBe('Giftig')
  })
  it('...even if the same species is also marked edible (safety first)', () => {
    expect(getMushroomIcon({ ...base, toxicity: 'deadly', edibility: 'excellent' }).text).toBe('Tödlich giftig')
    expect(getMushroomIcon({ ...base, toxicity: 'toxic', edibility: 'good' }).text).toBe('Giftig')
  })
  it('maps edibility levels', () => {
    expect(getMushroomIcon({ ...base, edibility: 'excellent' }).text).toBe('Ausgezeichnet')
    expect(getMushroomIcon({ ...base, edibility: 'good' }).text).toBe('Gut')
    expect(getMushroomIcon({ ...base, edibility: 'inedible' }).text).toBe('Ungenießbar')
  })
  it('gives every non-empty descriptor an icon and a style', () => {
    for (const s of [{ toxicity: 'deadly' }, { toxicity: 'toxic' }, { edibility: 'excellent' }, { edibility: 'good' }, { edibility: 'inedible' }]) {
      const result = getMushroomIcon({ ...base, ...s } as any)
      expect(result.icon).toBeTruthy()
      expect(result.class).not.toBe('')
    }
  })
})

describe('colors', () => {
  it('maps known names to tailwind classes', () => {
    expect(toTwColorClass('red')).toBe('bg-red-500')
    expect(toTwColorClass('grey')).toBe(toTwColorClass('gray'))
  })
  it('maps names to hex and falls back to neutral for unknown ones', () => {
    expect(toHexColor('brown')).toBe('#8B4513')
    expect(toHexColor('grey')).toBe(toHexColor('gray'))
    expect(toHexColor('turquoise')).toBe('#78716c')
  })
})

describe('small helpers', () => {
  it('getNested reads dot paths and tolerates missing branches', () => {
    expect(getNested({ cap: { color: 'red' } }, 'cap.color')).toBe('red')
    expect(getNested({ cap: null }, 'cap.color')).toBeUndefined()
    expect(getNested({}, 'a.b.c')).toBeUndefined()
  })
  it('capitalizeFirstLetter', () => {
    expect(capitalizeFirstLetter('fliegenpilz')).toBe('Fliegenpilz')
    expect(capitalizeFirstLetter('')).toBe('')
  })
  it('getInaturalistImageUrl swaps the size variant in the URL', () => {
    expect(getInaturalistImageUrl('https://x/photos/1/square.jpg', 'large')).toBe('https://x/photos/1/large.jpg')
  })
})

describe('taxon ranks', () => {
  it('has a label for each rank with its own page, and a fallback', () => {
    expect(getRankLabelKey(40)).toBe('rank.order')
    expect(getRankLabelKey(30)).toBe('rank.family')
    expect(getRankLabelKey(20)).toBe('rank.genus')
    expect(getRankLabelKey(10)).toBe('rank.species')
    expect(getRankLabelKey(99)).toBe('rank.other')
    expect(getRankLabelPluralKey(40)).toBe('rank.order.plural')
    expect(getRankLabelPluralKey(99)).toBe('rank.other.plural')
  })
  it('keeps order/family/genus as the ranks with a /taxa page', () => {
    expect(TAXON_PAGE_RANKS).toEqual([40, 30, 20])
  })
})

describe('seasons', () => {
  it('assigns every month to exactly one season (no gaps, no overlap)', () => {
    for (let month = 1; month <= 12; month++) {
      const hits = Object.values(SEASONS).filter(({ monthFrom, monthTo }) =>
        monthFrom <= monthTo ? month >= monthFrom && month <= monthTo : month >= monthFrom || month <= monthTo)
      expect(hits, `month ${month}`).toHaveLength(1)
    }
  })
  it('keys match their record key (route param lookup relies on it)', () => {
    for (const [key, season] of Object.entries(SEASONS)) expect(season.key).toBe(key)
  })
  it('winter wraps over the new year', () => {
    expect(SEASONS.winter).toMatchObject({ monthFrom: 12, monthTo: 2 })
  })
})

describe('constants', () => {
  it('has 12 German months', () => {
    expect(GERMAN_MONTHS).toHaveLength(12)
    expect(GERMAN_MONTHS[2]).toBe('März')
  })
  it('has the 26 latin letters plus Ä Ö Ü, no duplicates', () => {
    expect(GERMAN_ALPHABET).toHaveLength(29)
    expect(new Set(GERMAN_ALPHABET).size).toBe(29)
    expect(GERMAN_ALPHABET).toContain('Ä')
  })
  it('has all 16 federal states, keyed like the region_code column', () => {
    const codes = Object.keys(stateNames)
    expect(codes).toHaveLength(16)
    expect(codes.every(c => /^DE-[A-Z]{2}$/.test(c))).toBe(true)
    expect(stateNames['DE-BE']).toBe('Berlin')
  })
})

describe('seedToday', () => {
  afterEach(() => vi.useRealTimers())

  it('is stable within a day and stays below max (the "mushrooms of the day" offset)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T06:00:00Z'))
    const morning = seedToday(9900)
    vi.setSystemTime(new Date('2026-10-14T20:00:00Z'))
    expect(seedToday(9900)).toBe(morning)
    expect(morning).toBeGreaterThanOrEqual(0)
    expect(morning).toBeLessThan(9900)
  })
  it('changes from day to day', () => {
    vi.useFakeTimers()
    const values = new Set<number>()
    for (let day = 1; day <= 10; day++) {
      vi.setSystemTime(new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`))
      values.add(seedToday(9900))
    }
    expect(values.size).toBeGreaterThan(5)
  })
})
