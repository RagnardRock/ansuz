// Nettoie un texte venu d'une API externe (AniList renvoie du HTML même avec asHtml: false) :
// <br> devient un retour à la ligne, les autres balises sont retirées, les entités courantes décodées.
const ENTITES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&rsquo;': '’', '&lsquo;': '‘' }

export function nettoyerTexte(texte) {
  if (typeof texte !== 'string') return texte ?? null
  const propre = texte
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, (e) => {
      if (ENTITES[e.toLowerCase()]) return ENTITES[e.toLowerCase()]
      const m = e.match(/^&#(x?)([0-9a-f]+);$/i)
      return m ? String.fromCodePoint(parseInt(m[2], m[1] ? 16 : 10)) : e
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return propre || null
}
