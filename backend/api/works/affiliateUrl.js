const AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG ?? ''
const APPLE_TOKEN = process.env.APPLE_AFFILIATE_TOKEN ?? ''

export function buildAffiliateUrl({ cdn_source, type, title, isbn, release_year }) {
  if (!cdn_source || !title) return null

  switch (cdn_source) {
    case 'googlebooks':
    case 'openlibrary': {
      const q = isbn ? `isbn:${isbn}` : encodeURIComponent(title)
      const base = `https://www.amazon.fr/s?k=${q}&i=stripbooks`
      return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base
    }

    case 'tmdb': {
      const q = encodeURIComponent(release_year ? `${title} ${release_year}` : title)
      const index = type === 'series' ? 'instant-video' : 'dvd'
      const base = `https://www.amazon.fr/s?k=${q}&i=${index}`
      return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base
    }

    case 'itunes': {
      // title est déjà une URL iTunes dans certains cas — on retourne null,
      // le lien iTunes sera géré côté covers.js si trackViewUrl est disponible
      return null
    }

    case 'deezer': {
      const q = encodeURIComponent(title)
      const base = `https://www.amazon.fr/s?k=${q}&i=digital-music`
      return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base
    }

    case 'rawg': {
      const q = encodeURIComponent(title)
      const base = `https://www.amazon.fr/s?k=${q}&i=videogames`
      return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base
    }

    case 'anilist': {
      const q = encodeURIComponent(title)
      const base = `https://www.amazon.fr/s?k=${q}&i=stripbooks`
      return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base
    }

    default:
      return null
  }
}
