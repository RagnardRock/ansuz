/**
 * useLibraryScene — composable Three.js pour l'ambiance de la bibliothèque.
 *
 * Three.js est une bibliothèque WebGL qui gère la 3D dans le navigateur.
 * Les concepts clés :
 *
 *   Scene      → le conteneur de tous les objets 3D (comme une scène de théâtre)
 *   Camera     → le point de vue depuis lequel on "filme" la scène
 *   Renderer   → convertit la scène + caméra en pixels sur le canvas
 *   Geometry   → la forme d'un objet (ici, des Points pour les particules)
 *   Material   → l'apparence d'un objet (couleur, transparence…)
 *   Mesh       → geometry + material = un objet visible
 *   Points     → comme Mesh mais pour des nuages de points (particules)
 *
 * L'animation fonctionne avec requestAnimationFrame() : le navigateur appelle
 * notre fonction `animate` ~60 fois par seconde, synchronisé avec l'écran.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ dispose: () => void }}
 */
import * as THREE from 'three'

export function useLibraryScene(canvas) {
  // --- Scène ---
  const scene = new THREE.Scene()
  // Brouillard exponentiel : les objets lointains disparaissent progressivement
  // FogExp2(couleur, densité) — densité faible = brouillard discret
  scene.fog = new THREE.FogExp2(0x0a0400, 0.018)

  // --- Caméra ---
  // PerspectiveCamera(fov, aspect, near, far)
  // fov = champ de vision en degrés (75 = assez large, effet immersif)
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z = 5

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  // devicePixelRatio gère les écrans Retina — on plafonne à 2 pour les perfs
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x0d0600)

  // --- Lumières ---
  // Lumière ambiante : éclaire uniformément toute la scène (très douce)
  const ambientLight = new THREE.AmbientLight(0xff8822, 0.4)
  scene.add(ambientLight)

  // Lumière de bougie/lampe : point lumineux qui s'atténue avec la distance
  // PointLight(couleur, intensité, portée, décroissance)
  const lampLight = new THREE.PointLight(0xffcc66, 3, 25, 2)
  lampLight.position.set(3, 4, 3)
  scene.add(lampLight)

  // Deuxième lumière plus froide à gauche pour équilibre
  const fillLight = new THREE.PointLight(0x332200, 1, 15, 2)
  fillLight.position.set(-5, 2, -2)
  scene.add(fillLight)

  // --- Particules de poussière ---
  const PARTICLE_COUNT = 400

  // Float32Array : tableau de flottants 32 bits pour les performances GPU
  // Chaque particule = 3 valeurs (x, y, z)
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const velocities = [] // stocké en JS, pas sur le GPU

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Répartition aléatoire dans un volume 3D
    positions[i * 3] = (Math.random() - 0.5) * 22 // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12 // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12 // z

    // Vitesses très faibles : poussière qui flotte lentement
    velocities.push({
      x: (Math.random() - 0.5) * 0.003,
      y: Math.random() * 0.004 + 0.001, // monte légèrement
      z: (Math.random() - 0.5) * 0.002,
    })
  }

  // BufferGeometry : géométrie optimisée (données directement sur le GPU)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0xffddaa,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    // AdditiveBlending : les particules s'additionnent (effet lumineux)
    blending: THREE.AdditiveBlending,
    depthWrite: false, // évite les artefacts de transparence
    sizeAttenuation: true, // les particules éloignées paraissent plus petites
  })

  const particles = new THREE.Points(geometry, material)
  scene.add(particles)

  // --- Boucle d'animation ---
  let animId = null
  const posAttr = geometry.attributes.position

  function animate() {
    animId = requestAnimationFrame(animate)

    const t = Date.now() * 0.001 // temps en secondes

    // Mise à jour de chaque particule
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posAttr.array[i * 3] += velocities[i].x
      posAttr.array[i * 3 + 1] += velocities[i].y
      posAttr.array[i * 3 + 2] += velocities[i].z

      // Quand une particule sort par le haut → on la remet en bas
      if (posAttr.array[i * 3 + 1] > 6) {
        posAttr.array[i * 3 + 1] = -6
        // Nouvelle position X/Z aléatoire pour varier
        posAttr.array[i * 3] = (Math.random() - 0.5) * 22
        posAttr.array[i * 3 + 2] = (Math.random() - 0.5) * 12
      }
    }
    // Signale à Three.js que les positions ont changé → re-upload sur GPU
    posAttr.needsUpdate = true

    // Scintillement de la lampe (sinus = oscillation douce et continue)
    lampLight.intensity = 2.5 + Math.sin(t * 1.7) * 0.3 + Math.sin(t * 3.1) * 0.15

    // Très légère rotation du nuage de particules pour éviter un effet figé
    particles.rotation.y = t * 0.005
    particles.rotation.x = Math.sin(t * 0.3) * 0.02

    renderer.render(scene, camera)
  }

  animate()

  // --- Resize responsive ---
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // --- Nettoyage (appelé par onUnmounted dans LibraryView) ---
  return {
    dispose() {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
