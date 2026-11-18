/**
 * Connexion PostgreSQL via node-postgres (pg), avec un pool de connexions gardées ouvertes.
 *
 * Le serveur tourne en continu sur le VPS (PM2) : un pool évite d'ouvrir une connexion
 * à chaque requête, contrairement à l'ancien driver HTTP de Neon prévu pour Vercel.
 *
 * DATABASE_URL (dans backend/.env) :
 *   - Postgres sur le VPS : postgresql://ansuz:motdepasse@localhost:5432/ansuz
 *   - Neon (fonctionne aussi) : postgresql://user:password@host/dbname?sslmode=require
 *
 * Usage inchangé : const rows = await sql`SELECT … WHERE id = ${id}`
 * Chaque ${valeur} devient un paramètre $1, $2… (jamais collé dans le texte SQL).
 */
import pg from 'pg'

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
})

pool.on('error', (err) => console.error('Erreur PostgreSQL (connexion inactive) :', err.message))

export function construireRequete(strings, values) {
  let text = strings[0]
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`
  return { text, values }
}

export default async function sql(strings, ...values) {
  const { rows } = await pool.query(construireRequete(strings, values))
  return rows
}
