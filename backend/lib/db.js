/**
 * Connexion à Neon via le driver serverless.
 *
 * @neondatabase/serverless utilise WebSockets au lieu de TCP classique,
 * ce qui fonctionne dans les environnements serverless (Vercel Functions)
 * où les connexions TCP persistantes ne sont pas possibles.
 *
 * DATABASE_URL est définie dans les variables d'environnement Vercel.
 * Format : postgresql://user:password@host/dbname?sslmode=require
 */
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

export default sql
