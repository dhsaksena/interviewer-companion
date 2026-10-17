import { Router } from 'express'
import { signInWithGoogle, getUserById } from '../services/authService.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

router.post('/google', async (req, res, next) => {
  try {
    const credential = req.body?.credential
    if (typeof credential !== 'string' || !credential) throw new AppError(400, 'Google credential is required')

    const user = await signInWithGoogle(credential)

    // Regenerate the session on login to prevent session fixation
    req.session.regenerate(err => {
      if (err) return next(err)
      req.session.userId = user.id
      req.session.save(saveErr => (saveErr ? next(saveErr) : res.json({ user })))
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', async (req, res, next) => {
  try {
    const user = req.session.userId ? await getUserById(req.session.userId) : null
    if (!user) throw new AppError(401, 'Not signed in')
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err)
    res.clearCookie('connect.sid')
    res.status(204).end()
  })
})

export default router
