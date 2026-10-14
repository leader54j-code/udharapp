import jwt from 'jsonwebtoken'

const secret = () => process.env.JWT_SECRET || 'development-only-secret-change-before-production'

export function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, secret(), { expiresIn: '7d' })
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.khata_token || req.headers.authorization?.replace(/^Bearer\s+/i, '')
  try {
    if (!token) throw new Error('missing token')
    req.user = jwt.verify(token, secret())
    next()
  } catch {
    res.status(401).json({ error: 'Authentication required' })
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}
