<template>
  <div class="mentions-page">
    <header class="mentions-header">
      <router-link to="/" class="mentions-back" aria-label="Retour à la bibliothèque">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Bibliothèque
      </router-link>
      <h1 class="mentions-title">Mentions légales</h1>
    </header>

    <main class="mentions-content">
      <section class="mentions-section">
        <h2>Éditeur</h2>
        <p>Ce site est un projet personnel développé et exploité par <strong>RagnardRock</strong>.</p>
      </section>

      <section class="mentions-section">
        <h2>Hébergement</h2>
        <p>
          L'application est hébergée sur un serveur privé virtuel <strong>OVH</strong> (OVH SAS, 2 rue Kellermann, 59100 Roubaix, France).
        </p>
        <p>
          La base de données est hébergée sur <strong>Neon</strong> (Neon Inc., 682 Autumn Ave,
          Brooklyn, NY 11208, États-Unis).
        </p>
      </section>

      <section class="mentions-section">
        <h2>Données personnelles</h2>
        <p>L'application collecte uniquement :</p>
        <ul>
          <li>
            Un <strong>nom d'utilisateur</strong>, une <strong>adresse email</strong> et un
            <strong>mot de passe</strong> (hashé avec bcrypt) lors de la création d'un compte.
          </li>
          <li>
            Les <strong>avis</strong> (œuvres, notes, descriptions) et <strong>interactions</strong>
            (upvotes, abonnements) saisis volontairement.
          </li>
          <li>
            Une <strong>photo de profil</strong> (URL externe) et une <strong>biographie</strong> optionnelles.
          </li>
        </ul>
        <p>
          Ces données sont strictement réservées au fonctionnement de l'application et ne sont ni
          vendues, ni transmises à des tiers.
        </p>
      </section>

      <section class="mentions-section">
        <h2>Droits d'accès et suppression</h2>
        <p>
          Conformément au <strong>RGPD</strong>, vous disposez d'un droit d'accès, de rectification,
          de portabilité et de suppression de vos données.
        </p>
        <ul>
          <li>Modifier vos données : depuis votre page de profil (onglet Paramètres).</li>
          <li>Exporter vos données : depuis votre page de profil (onglet Paramètres → Télécharger).</li>
          <li>Supprimer votre compte : depuis votre page de profil (onglet Paramètres → Supprimer mon compte).</li>
          <li>Pour toute autre demande : <strong><a href="mailto:contact@ansuz.media">contact@ansuz.media</a></strong></li>
        </ul>
      </section>

      <section class="mentions-section">
        <h2>Cookies et authentification</h2>
        <p>
          Le site web utilise un unique cookie de session sécurisé (<code>HttpOnly</code>),
          strictement nécessaire à votre authentification. Il ne peut pas être lu par des scripts
          ou des tiers. Aucun cookie publicitaire ou de suivi n'est utilisé.
        </p>
        <p>
          L'extension navigateur <strong>Ansuz</strong> utilise quant à elle le stockage local de
          l'extension (<code>chrome.storage.local</code>) pour conserver un token d'authentification
          JWT. Ce token est isolé dans l'extension et inaccessible aux pages web.
        </p>
        <p>
          Ces mécanismes étant indispensables au fonctionnement du service, ils ne requièrent pas
          de consentement préalable conformément à la réglementation en vigueur.
        </p>
      </section>

      <section class="mentions-section">
        <h2>Sources externes</h2>
        <p>
          Les couvertures et métadonnées des œuvres sont chargées depuis les services suivants :
          <strong>Google Books</strong>, <strong>AniList</strong>, <strong>TMDB</strong> (The Movie Database),
          <strong>iTunes</strong> (Apple Inc.) et <strong>RAWG</strong>. Ces services tiers sont soumis
          à leurs propres politiques de confidentialité.
        </p>
      </section>
    </main>

    <footer class="mentions-footer">
      <p>Dernière mise à jour : juin 2026</p>
    </footer>
  </div>
</template>

<script setup></script>

<style scoped>
.mentions-page {
  min-height: 100vh;
  max-width: 720px;
  margin: 0 auto;
  padding: 2.5rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.mentions-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mentions-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  transition: color var(--transition);
  width: fit-content;
}
.mentions-back:hover {
  color: var(--color-amber);
}

.mentions-title {
  font-family: var(--font-serif);
  font-size: 2rem;
  color: var(--color-amber-lt);
  font-style: italic;
  font-weight: 400;
}

.mentions-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.mentions-section {
  border-left: 2px solid rgba(200, 130, 26, 0.25);
  padding-left: 1.25rem;
}

.mentions-section h2 {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  color: var(--color-amber-lt);
  font-weight: 400;
  margin-bottom: 0.6rem;
}

.mentions-section p {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 0.4rem;
}

.mentions-section p:last-child {
  margin-bottom: 0;
}

.mentions-section strong {
  color: var(--color-text);
}

.mentions-section code {
  font-family: monospace;
  font-size: 0.85em;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.1em 0.4em;
  border-radius: 3px;
  color: var(--color-text);
}

.mentions-section ul {
  margin: 0.4rem 0 0.4rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.mentions-section li {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.mentions-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.mentions-footer p {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .mentions-page {
    padding: 1.5rem 1rem 3rem;
  }
  .mentions-title {
    font-size: 1.5rem;
  }
}
</style>
