import axios from 'axios'
import router from '@/router/index.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('user')
      router.push({ name: 'auth' })
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
}

export const worksApi = {
  getAll: (params = {}) => api.get('/works', { params }),
  getFilters: (type = null) => api.get('/works/filters', { params: type ? { type } : {} }),
  getOne: (id) => api.get(`/works/${id}`),
  getRandom: (types) => api.get('/works/random', { params: types?.length ? { types: types.join(',') } : {} }),
  create: (data) => api.post('/works', data),
  delete: (id) => api.delete(`/works/${id}`),
  addReview: (workId, data) => api.post(`/works/${workId}/reviews`, data),
  getLibrary: (workId) => api.get(`/works/${workId}/library`),
  setLibrary: (workId, data) => api.put(`/works/${workId}/library`, data),
  removeLibrary: (workId) => api.delete(`/works/${workId}/library`),
}

export const reviewsApi = {
  update: (id, data) => api.put(`/reviews/${id}`, data),
  remove: (id) => api.delete(`/reviews/${id}`),
  upvote: (id) => api.post(`/reviews/${id}/upvote`),
  getReplies: (id) => api.get(`/reviews/${id}/replies`),
  addReply: (id, body) => api.post(`/reviews/${id}/replies`, { body }),
  removeReply: (replyId) => api.delete(`/replies/${replyId}`),
}

export const userApi = {
  deleteMe: () => api.delete('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  exportMe: () => api.get('/users/me/export', { responseType: 'blob' }),
  getProfile: (username) => api.get(`/users/${username}`),
  search: (q) => api.get('/users', { params: { q } }),
  toggleFollow: (username) => api.post(`/users/${username}/follow`),
  getFollowingWorks: () => api.get('/following-works'),
  getFollowing: (username) => api.get(`/users/${username}/following`),
  getFollowers: (username) => api.get(`/users/${username}/followers`),
  getLibrary: (username, status = null) => api.get(`/users/${username}/library`, { params: status ? { status } : {} }),
}

export const feedApi = {
  get: () => api.get('/feed'),
}

export const searchApi = {
  covers: (q, type = null) => api.get('/search/covers', { params: { q, ...(type && { type }) } }),
}

export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPendingWorks: () => api.get('/admin/works'),
  approveWork: (id) => api.patch(`/admin/works/${id}`, { approved: true }),
  rejectWork: (id) => api.patch(`/admin/works/${id}`, { approved: false }),
  updateWork: (id, data) => api.put(`/admin/works/${id}`, data),
  deleteWork: (id) => api.delete(`/admin/works/${id}`),
  getPendingCount: () => api.get('/admin/pending-count'),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export const trendingApi = {
  get: () => api.get('/trending'),
}

export default api
