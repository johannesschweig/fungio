import { describe, expect, it } from 'vitest'
import { flattenFungi } from '@/composables/utils'
import { graphqlDetailNode, graphqlLookAlikeEdge } from '../fixtures/shrooms'

describe('flattenFungi', () => {
  it('returns null for missing nodes (unknown id -> "Pilz nicht gefunden")', () => {
    expect(flattenFungi(undefined)).toBeNull()
    expect(flattenFungi(null)).toBeNull()
  })

  it('flattens a full detail node, parsing the JSON-string attribute columns', () => {
    const shroom = flattenFungi(graphqlDetailNode())!

    expect(shroom).toMatchObject({
      id: 47347,
      name: 'Amanita muscaria',
      preferred_common_name: 'Fliegenpilz',
      ancestry: '48460/47169/47170/47183/47184/47348/47347',
      obs_count_ger: 1234,
      needs_photo_review: false,
      id_123: '123abc',
      type: ['gilled'],
      season_from: 7,
      season_to: 11,
      edibility: null,
      toxicity: 'toxic',
      look_alikes: ['456def', '789ghi'],
      description: 'Roter Hut mit weißen Flocken.',
      occurrence_text: 'Bei Birken und Fichten.',
      occurrence_trees: ['Birke', 'Fichte'],
    })
  })

  it('strips stray quotes from alternative names', () => {
    expect(flattenFungi(graphqlDetailNode())!.alternative_common_names).toEqual(['Roter Fliegenpilz', 'Rauschpilz'])
  })

  it('accepts alternative names that are already an array, or missing', () => {
    expect(flattenFungi(graphqlDetailNode({ alternative_common_names: ['A', 'B'] }))!.alternative_common_names).toEqual(['A', 'B'])
    expect(flattenFungi(graphqlDetailNode({ alternative_common_names: null }))!.alternative_common_names).toEqual([])
    expect(flattenFungi(graphqlDetailNode({ alternative_common_names: '{"not":"an array"}' }))!.alternative_common_names).toEqual([])
  })

  it('flattens photos in order and keeps quality_score (null when unscored)', () => {
    const photos = flattenFungi(graphqlDetailNode())!.photos!
    expect(photos.map(p => p.id)).toEqual([1, 2])
    expect(photos[0]).toMatchObject({ attribution: '(c) A', license_code: 'cc-by', quality_score: 0.9 })
    expect(photos[1].quality_score).toBeNull()
  })

  it('falls back to safe defaults when optional fields are absent', () => {
    const shroom = flattenFungi({ id: 1, name: 'Boletus edulis' })!
    expect(shroom).toMatchObject({
      preferred_common_name: '',
      english_common_name: '',
      ancestry: '',
      obs_count_ger: 0,
      needs_photo_review: false,
      alternative_common_names: [],
      photos: [],
    })
    // no `attributes` object at all (look-alike query) -> no attribute keys, no crash
    expect(shroom).not.toHaveProperty('edibility')
  })

  it('keeps null attribute columns as null (a species without look-alikes)', () => {
    const shroom = flattenFungi(graphqlDetailNode({
      attributes: { id_123: null, type: null, season_from: null, season_to: null, edibility: null, toxicity: null, look_alikes: null, description: null, occurrence_text: null, occurrence_trees: null },
    }))!
    expect(shroom.look_alikes).toBeNull()
    expect(shroom.type).toBeNull()
    expect(shroom.occurrence_trees).toBeNull()
  })

  it('handles a look-alike node (fungi without attributes)', () => {
    const shroom = flattenFungi(graphqlLookAlikeEdge(5, 'Amanita phalloides').node.fungi)!
    expect(shroom.id).toBe(5)
    expect(shroom.photos).toHaveLength(1)
    expect(shroom.photos![0].quality_score).toBeNull()
  })
})
