import 'dotenv/config'
import express from 'express'

import worksHandler from './api/works/index.js'
import worksRandomHandler from './api/works/random.js'
import worksFiltersHandler from './api/works/filters.js'
import workHandler from './api/works/[id].js'
import workReviewsHandler from './api/works/[id]/reviews.js'
import workLibraryHandler from './api/works/[id]/library.js'
import reviewHandler from './api/reviews/[id].js'
import upvoteHandler from './api/reviews/[id]/upvote.js'
import registerHandler from './api/auth/register.js'
import loginHandler from './api/auth/login.js'
import logoutHandler from './api/auth/logout.js'
import adminUsersHandler from './api/admin/users.js'
import adminUserByIdHandler from './api/admin/users/[id].js'
import adminWorksHandler from './api/admin/works.js'
import adminWorkByIdHandler from './api/admin/works/[id].js'
import adminPendingCountHandler from './api/admin/pending-count.js'
import usersHandler from './api/users/index.js'
import meHandler from './api/users/me.js'
import meExportHandler from './api/users/me/export.js'
import userByUsernameHandler from './api/users/[username].js'
import followHandler from './api/users/[username]/follow.js'
import followingHandler from './api/users/[username]/following.js'
import followersHandler from './api/users/[username]/followers.js'
import userLibraryHandler from './api/users/[username]/library.js'
import feedHandler from './api/feed.js'
import followingWorksHandler from './api/following-works.js'
import coversHandler from './api/search/covers.js'
import statsHandler from './api/stats.js'
import trendingHandler from './api/trending.js'

const app = express()
app.use(express.json())

// Les handlers Vercel lisent les params d'URL dans req.query.
// Express les met dans req.params — on les copie avant d'appeler le handler.
function adapt(handler, mapping) {
  return (req, res) => {
    const merged = Object.assign({}, req.query)
    for (const [queryKey, paramKey] of Object.entries(mapping)) {
      merged[queryKey] = req.params[paramKey]
    }
    Object.defineProperty(req, 'query', { get: () => merged, configurable: true })
    return handler(req, res)
  }
}

app.all('/api/auth/register', registerHandler)
app.all('/api/auth/login', loginHandler)
app.all('/api/auth/logout', logoutHandler)

app.all('/api/works', worksHandler)
app.all('/api/works/random', worksRandomHandler)
app.all('/api/works/filters', worksFiltersHandler)
app.all('/api/works/:id/reviews', adapt(workReviewsHandler, { id: 'id' }))
app.all('/api/works/:id/library', adapt(workLibraryHandler, { id: 'id' }))
app.all('/api/works/:id', adapt(workHandler, { id: 'id' }))

app.all('/api/reviews/:id/upvote', adapt(upvoteHandler, { id: 'id' }))
app.all('/api/reviews/:id', adapt(reviewHandler, { id: 'id' }))

app.all('/api/admin/users/:id', adapt(adminUserByIdHandler, { id: 'id' }))
app.all('/api/admin/users', adminUsersHandler)
app.all('/api/admin/works/:id', adapt(adminWorkByIdHandler, { id: 'id' }))
app.all('/api/admin/works', adminWorksHandler)
app.all('/api/admin/pending-count', adminPendingCountHandler)

app.all('/api/users/me/export', meExportHandler)
app.all('/api/users/me', meHandler)
app.all('/api/users/:username/follow', adapt(followHandler, { username: 'username' }))
app.all('/api/users/:username/following', adapt(followingHandler, { username: 'username' }))
app.all('/api/users/:username/followers', adapt(followersHandler, { username: 'username' }))
app.all('/api/users/:username/library', adapt(userLibraryHandler, { username: 'username' }))
app.all('/api/users/:username', adapt(userByUsernameHandler, { username: 'username' }))
app.all('/api/users', usersHandler)

app.all('/api/feed', feedHandler)
app.all('/api/following-works', followingWorksHandler)
app.all('/api/search/covers', coversHandler)
app.all('/api/stats', statsHandler)
app.all('/api/trending', trendingHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
