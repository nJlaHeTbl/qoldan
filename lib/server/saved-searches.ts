export type SavedSearchRow = {
  id: string;
  name: string;
  search_query: string;
  region: string;
  category: string;
  offer_type: string;
  delivery_only: number;
  company_only: number;
  livestock_type: string;
  livestock_price_mode: string;
  livestock_quantity_group: string;
  created_at: number;
  last_viewed_at: number;
  total_matches: number;
  new_matches: number;
  latest_match_at: number | null;
};

export const savedSearchMatchPredicate = `listings.status = 'active'
  AND listings.owner_id != saved_searches.owner_id
  AND (saved_searches.search_query = ''
       OR LOWER(listings.title) LIKE '%' || LOWER(saved_searches.search_query) || '%'
       OR LOWER(listings.category) LIKE '%' || LOWER(saved_searches.search_query) || '%'
       OR LOWER(listings.location) LIKE '%' || LOWER(saved_searches.search_query) || '%'
       OR LOWER(listings.description) LIKE '%' || LOWER(saved_searches.search_query) || '%'
       OR LOWER(COALESCE(listings.livestock_type, '')) LIKE '%' || LOWER(saved_searches.search_query) || '%'
       OR LOWER(COALESCE(listings.livestock_breed, '')) LIKE '%' || LOWER(saved_searches.search_query) || '%')
  AND (saved_searches.region = 'Весь Казахстан'
       OR listings.region = saved_searches.region)
  AND (saved_searches.category = 'Все категории'
       OR listings.category = saved_searches.category)
  AND (saved_searches.offer_type = 'Все'
       OR listings.offer_type = saved_searches.offer_type)
  AND (saved_searches.delivery_only = 0 OR listings.delivery = 1)
  AND (saved_searches.company_only = 0
       OR listings.seller_type IN ('Компания', 'Магазин'))
  AND (saved_searches.livestock_type = 'Все виды'
       OR listings.livestock_type = saved_searches.livestock_type)
  AND (saved_searches.livestock_price_mode = 'all'
       OR listings.livestock_price_mode = saved_searches.livestock_price_mode)
  AND (saved_searches.livestock_quantity_group = 'all'
       OR (saved_searches.livestock_quantity_group = 'single'
           AND listings.livestock_quantity = 1)
       OR (saved_searches.livestock_quantity_group = 'small_group'
           AND listings.livestock_quantity BETWEEN 2 AND 10)
       OR (saved_searches.livestock_quantity_group = 'large_group'
           AND listings.livestock_quantity >= 11))`;

export const savedSearchSelect = `SELECT saved_searches.id, saved_searches.name,
    saved_searches.search_query, saved_searches.region,
    saved_searches.category, saved_searches.offer_type,
    saved_searches.delivery_only, saved_searches.company_only,
    saved_searches.livestock_type, saved_searches.livestock_price_mode,
    saved_searches.livestock_quantity_group,
    saved_searches.created_at, saved_searches.last_viewed_at,
    (SELECT COUNT(*) FROM listings WHERE ${savedSearchMatchPredicate}) AS total_matches,
    (SELECT COUNT(*) FROM listings
      WHERE ${savedSearchMatchPredicate}
        AND listings.created_at > saved_searches.last_viewed_at) AS new_matches,
    (SELECT MAX(listings.created_at) FROM listings
      WHERE ${savedSearchMatchPredicate}
        AND listings.created_at > saved_searches.last_viewed_at) AS latest_match_at
  FROM saved_searches`;

export function mapSavedSearch(row: SavedSearchRow) {
  return {
    id: row.id,
    name: row.name,
    query: row.search_query,
    region: row.region,
    category: row.category,
    offerType: row.offer_type,
    deliveryOnly: Boolean(row.delivery_only),
    companyOnly: Boolean(row.company_only),
    livestockType: row.livestock_type,
    livestockPriceMode: row.livestock_price_mode,
    livestockQuantityGroup: row.livestock_quantity_group,
    totalMatches: Number(row.total_matches || 0),
    newMatches: Number(row.new_matches || 0),
    latestMatchAt: row.latest_match_at ? Number(row.latest_match_at) : null,
    createdAt: Number(row.created_at),
    lastViewedAt: Number(row.last_viewed_at),
  };
}
