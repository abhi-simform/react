const SITE = "ShopSphere"

/** "Cart | ShopSphere"; no page name -> just the site name. Every route's `meta` goes through this. */
export const pageTitle = (page?: string): string =>
  page ? `${page} | ${SITE}` : SITE
