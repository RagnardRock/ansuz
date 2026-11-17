<template>
  <div class="not-found">
    <p class="not-found__code">404</p>
    <p class="not-found__text">Cette page n'existe pas.</p>
    <RouterLink to="/" class="not-found__link">Retourner à la bibliothèque</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: #0d0600;
}
.not-found__code {
  font-family: var(--font-serif);
  font-size: 6rem;
  color: var(--color-amber);
  opacity: 0.3;
  line-height: 1;
}
.not-found__text {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.not-found__link {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-amber-lt);
  text-decoration: underline;
  transition: opacity 0.2s;
}
.not-found__link:hover {
  opacity: 0.7;
}
</style>
