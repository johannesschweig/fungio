// Shapes copied from what PostgREST / pg_graphql actually return (see app/composables/queries.ts):
// array-ish attribute columns come back as JSON *strings*, photos are nested in `photosCollection.edges`.

// GET_SHROOM_BY_ID -> fungiCollection.edges[0].node
export const graphqlDetailNode = (overrides: Record<string, any> = {}) => ({
  id: 47347,
  rank_level: 10,
  name: 'Amanita muscaria',
  preferred_common_name: 'Fliegenpilz',
  alternative_common_names: '["Roter Fliegenpilz","\\"Rauschpilz\\""]',
  obs_count_ger: 1234,
  ancestry: '48460/47169/47170/47183/47184/47348/47347',
  needs_photo_review: false,
  photosCollection: {
    edges: [
      { node: { id: 1, url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg', attribution: '(c) A', license_code: 'cc-by', quality_score: 0.9 } },
      { node: { id: 2, url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/2/square.jpg', attribution: '(c) B', license_code: 'cc0', quality_score: null } },
    ],
  },
  attributes: {
    id_123: '123abc',
    type: '["gilled"]',
    season_from: 7,
    season_to: 11,
    edibility: null,
    toxicity: 'toxic',
    look_alikes: '["456def","789ghi"]',
    description: 'Roter Hut mit weißen Flocken.',
    occurrence_text: 'Bei Birken und Fichten.',
    occurrence_trees: '["Birke","Fichte"]',
  },
  ...overrides,
})

// GET_LOOK_ALIKE_FUNGI -> attributesCollection.edges[n]  (edibility/toxicity sit on the node, fungi has no `attributes`)
export const graphqlLookAlikeEdge = (id: number, name: string, extra: Record<string, any> = {}) => ({
  node: {
    fungi_id: id,
    edibility: null,
    toxicity: null,
    fungi: {
      id,
      name,
      preferred_common_name: null,
      obs_count_ger: 10,
      photosCollection: { edges: [{ node: { url: `https://example.org/${id}/square.jpg`, fungi_id: id } }] },
    },
    ...extra,
  },
})
