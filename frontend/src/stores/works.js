import { ref } from 'vue'
import { defineStore } from 'pinia'
import { worksApi, reviewsApi } from '@/api/index.js'

export const useWorksStore = defineStore('works', () => {
  const works = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const all = []
      let page = 1
      let totalPages = 1
      do {
        const { data } = await worksApi.getAll({ per_page: 100, page })
        all.push(...(data.works ?? data))
        totalPages = data.total_pages ?? 1
        page++
      } while (page <= totalPages)
      works.value = all
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Erreur lors du chargement'
    } finally {
      loading.value = false
    }
  }

  async function create(payload) {
    const { data } = await worksApi.create(payload)
    works.value.unshift(data)
    return data
  }

  async function deleteWork(workId) {
    await worksApi.delete(workId)
    works.value = works.value.filter((w) => w.id !== workId)
  }

  // Recharge une œuvre depuis l'API et met à jour la liste (avg_rating, review_count, my_review)
  async function refreshWork(workId) {
    try {
      const { data } = await worksApi.getOne(workId)
      const idx = works.value.findIndex((w) => w.id === workId)
      if (idx !== -1) {
        const { reviews: _, ...workData } = data
        works.value[idx] = workData
      }
    } catch {
      // silencieux — la liste reste à l'état précédent
    }
  }

  async function upvoteReview(reviewId) {
    const { data } = await reviewsApi.upvote(reviewId)
    return data
  }

  return { works, loading, error, fetchAll, create, deleteWork, refreshWork, upvoteReview }
})
