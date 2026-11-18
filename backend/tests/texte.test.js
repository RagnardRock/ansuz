import { describe, it, expect } from 'vitest'
import { nettoyerTexte } from '../lib/texte.js'

describe('nettoyerTexte', () => {
  it('transforme les <br> en retours à la ligne et retire les balises', () => {
    expect(nettoyerTexte('Début.\n<br><br>\n<i>Note : fin.</i>')).toBe('Début.\n\nNote : fin.')
  })
  it('décode les entités courantes', () => {
    expect(nettoyerTexte('Tom &amp; Jerry &#39;n&#x27;')).toBe("Tom & Jerry 'n'")
  })
  it('laisse passer null et le texte sans balise', () => {
    expect(nettoyerTexte(null)).toBe(null)
    expect(nettoyerTexte('Simple')).toBe('Simple')
    expect(nettoyerTexte('<br>')).toBe(null)
  })
})
