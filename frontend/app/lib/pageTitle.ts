export const SITE_NAME = "ShopSphere"
const SITE = SITE_NAME

/** "Cart | ShopSphere"; no page name -> just the site name. Every route's `meta` goes through this. */
export const pageTitle = (page?: string): string =>
  page ? `${page} | ${SITE}` : SITE
