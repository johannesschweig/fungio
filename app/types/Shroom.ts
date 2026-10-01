export default interface Shroom {
  id: number
  rank_level?: number
  name: string // latin name
  preferred_common_name?: string
  alternative_common_names?: string[]
  english_common_name?: string
  ancestry: string
  obs_count_ger?: number
  needs_photo_review?: boolean
  photos?: {
    url: string
    attribution: string
    license_code: string
    quality_score?: number | null
  }[]
  id_123?: string
  type?: ('gilled' | 'poroid' | 'lichenized' | 'spiny' | 'round' | 'coral-like' | 'gelatinous' | 'other_genus')[]
  season_from?: number // months as numbers (1-12)
  season_to?: number
  edibility?: 'excellent' | 'good' | 'inedible'
  toxicity?: 'toxic' | 'deadly'
  look_alikes?: string[] // id_123 values of look-alike species
  description?: string | null // v2: fertiger Fließtext zur Morphologie, ersetzt die Facetten-Aufzählung wo vorhanden
  occurrence_text?: string | null // v2: Fließtext zu Habitat/Substrat/Saison
  occurrence_trees?: string[] | null // v2: konkrete Baumarten aus kontrolliertem Vokabular
}
