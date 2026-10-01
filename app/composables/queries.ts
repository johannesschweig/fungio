import { gql } from 'graphql-tag'

// for detail page
export const GET_SHROOM_BY_ID = gql`
  query GetShroomById($id: Int!) {
  fungiCollection(filter: {id: {eq: $id}}) {
    edges {
      node {
        id
        rank_level
        name
        preferred_common_name
        alternative_common_names
        obs_count_ger
        ancestry
        needs_photo_review
        photosCollection(first: 10) {
          edges {
            node {
              id
              url
              attribution
              license_code
              quality_score
            }
          }
        }
        attributes {
          id_123
          type
          season_from
          season_to
          edibility
          toxicity
          look_alikes
          description
          occurrence_text
          occurrence_trees
        }
      }
    }
  }
}`

const OFFSET = seedToday(9900) // max 9991 rows - some wiggle room

// for mushrooms of the day
export const GET_RANDOM_FUNGI = gql`
  query GetRandomFungiWithPhoto {
    fungiCollection(first: 20, offset:${OFFSET}) {
     edges {
      node {
        id
        photosCollection(first: 1) {
          edges {
            node {
              url
              fungi_id
            }
          }
        }
      }
    }
  }
}
`

// for autocomplete search suggestions
export const SEARCH_MUSHROOM_NAMES = gql`
query SearchMushroomNames($search: String) {
  fungiCollection(
    first: 5,
    filter: { search_name: { ilike: $search } },
    orderBy: [{ obs_count_ger: DescNullsLast }]
  ) {
    edges {
      node {
        id
        name
        preferred_common_name
      }
    }
  }
}
`

// for full search results page
export const SEARCH_MUSHROOMS = gql`
query SearchMushroom($search: String) {
  fungiCollection(
    first: 200,
    filter: { search_name: { ilike: $search } }
    orderBy: [{ obs_count_ger: DescNullsLast }]
  ) {
    totalCount
    edges {
      node {
        id
        name
        preferred_common_name
        obs_count_ger
        attributes {
          edibility
          toxicity
        }
        photosCollection(first: 1) {
          edges {
            node {
              url
              fungi_id
            }
          }
        }
      }
    }
  }
}`

// get look alikes by ids
export const GET_LOOK_ALIKE_FUNGI = gql`
  query GetLookAlikeFungi($ids: [String!]) {
    attributesCollection(filter: { id_123: { in: $ids } }) {
      edges {
        node {
          fungi_id
          fungi {
            id
            name
            preferred_common_name
            obs_count_ger
            photosCollection(first: 1) {
              edges {
                node {
                  url
                  fungi_id
                }
              }
            }
          }
        }
      }
    }
  }
`

// for season page - get top 10 mushrooms by observation count for a season
export const GET_MUSHROOMS_BY_SEASON = gql`
  query GetMushroomsBySeason($seasonStart: Int!, $seasonEnd: Int!) {
    fungi_seasonalCollection(
      first: 12,
      orderBy: [{ seasonal_priority: DescNullsLast }],
      filter: {
        season_from: { lte: $seasonEnd },
        season_to: { gte: $seasonStart }
      }
    ) {
      edges {
        node {
          id
          name
          preferred_common_name
          obs_count_ger
          photo_url
          season_from
          season_to
          edibility
          toxicity
        }
      }
    }
  }
`

// for top edible mushrooms page
export const GET_TOP_EDIBLE_MUSHROOMS = gql`
  query GetTopEdibleMushrooms($seasonStart: Int!, $seasonEnd: Int!, $edibilityLevels: [String!]) {
    fungi_seasonalCollection(
      first: 10,
      orderBy: [{ seasonal_priority: DescNullsLast }],
      filter: {
        edibility: { in: $edibilityLevels },
        season_from: { lte: $seasonEnd },
        season_to: { gte: $seasonStart }
      }
    ) {
      edges {
        node {
          id
          name
          preferred_common_name
          obs_count_ger
          photo_url
          season_from
          season_to
          edibility
          toxicity
        }
      }
    }
  }
`

export const GET_TOP_REGIONAL = gql`
  query GetRegionalTopTen($code: String!) {
    fungi_regional_statsCollection(
      filter: { region_code: { eq: $code } }
      orderBy: [{ obs_count: DescNullsLast }]
      first: 30
    ) {
      edges {
        node {
          fungi {
            id
            name
            preferred_common_name
            rank_level
            ancestry
            attributes {
              edibility
              toxicity
              season_from
              season_to
            }
            photosCollection(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`