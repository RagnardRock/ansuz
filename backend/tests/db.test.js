import { describe, it, expect } from 'vitest'
import { construireRequete } from '../lib/db.js'

describe('construireRequete', () => {
  it('remplace chaque valeur par un paramètre numéroté', () => {
    const tag = (strings, ...values) => construireRequete(strings, values)
    const id = "x'; DROP TABLE users; --"
    expect(tag`SELECT * FROM works WHERE id = ${id} AND type = ANY(${['book']})`).toEqual({
      text: 'SELECT * FROM works WHERE id = $1 AND type = ANY($2)',
      values: [id, ['book']],
    })
  })
  it('fonctionne sans valeur', () => {
    const tag = (strings, ...values) => construireRequete(strings, values)
    expect(tag`SELECT 1`).toEqual({ text: 'SELECT 1', values: [] })
  })
})
