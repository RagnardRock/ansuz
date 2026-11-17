import sql from '../../lib/db.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { type } = req.query
  const typeVal = type || null

  const [genresResult, yearsResult, languagesResult, statusesResult, originsResult, platformsResult] =
    await Promise.all([
      sql`
        SELECT DISTINCT UNNEST(genres) AS genre
        FROM works
        WHERE approved = true AND genres IS NOT NULL
          AND (${typeVal}::text IS NULL OR type = ${typeVal})
        ORDER BY genre
      `,
      sql`
        SELECT MIN(release_year) AS min, MAX(release_year) AS max
        FROM works
        WHERE approved = true AND release_year IS NOT NULL
          AND (${typeVal}::text IS NULL OR type = ${typeVal})
      `,
      sql`
        SELECT DISTINCT language
        FROM works
        WHERE approved = true AND language IS NOT NULL
          AND (${typeVal}::text IS NULL OR type = ${typeVal})
        ORDER BY language
      `,
      sql`
        SELECT DISTINCT status
        FROM works
        WHERE approved = true AND status IS NOT NULL
          AND (${typeVal}::text IS NULL OR type = ${typeVal})
        ORDER BY status
      `,
      sql`
        SELECT DISTINCT origin
        FROM works
        WHERE approved = true AND origin IS NOT NULL
          AND (${typeVal}::text IS NULL OR type = ${typeVal})
        ORDER BY origin
      `,
      sql`
        SELECT DISTINCT UNNEST(platforms) AS platform
        FROM works
        WHERE approved = true AND platforms IS NOT NULL
          AND (${typeVal}::text IS NULL OR type = ${typeVal})
        ORDER BY platform
      `,
    ])

  return res.status(200).json({
    genres: genresResult.map((r) => r.genre).filter(Boolean),
    year_range: { min: yearsResult[0]?.min ?? null, max: yearsResult[0]?.max ?? null },
    languages: languagesResult.map((r) => r.language).filter(Boolean),
    statuses: statusesResult.map((r) => r.status).filter(Boolean),
    origins: originsResult.map((r) => r.origin).filter(Boolean),
    platforms: platformsResult.map((r) => r.platform).filter(Boolean),
  })
})
