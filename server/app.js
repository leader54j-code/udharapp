import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { z } from 'zod'
import { cookieOptions, issueToken, requireAuth } from './auth.js'
import { createCharge, correctEntry, recordPayment } from './ledger.js'
import { dashboard, listPeople, listTransactions } from './queries.js'
import { id, now } from './lib.js'

const personSchema = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(20).default(''), notes: z.string().trim().max(500).default('') })
const chargeSchema = z.object({ personId: z.string().min(1), description: z.string().trim().min(2).max(200), amount: z.coerce.number().positive(), date: z.string().min(10), dueDate: z.string().nullable().optional() })
const paymentSchema = z.object({ personId: z.string().min(1), amount: z.coerce.number().positive(), date: z.string().min(10), method: z.enum(['cash','upi','bank','card','other']).default('cash'), reference: z.string().max(100).optional(), notes: z.string().max(500).optional() })

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return next(Object.assign(new Error(result.error.issues[0].message), { status: 400 }))
    req.validated = result.data
    next()
  }
}

function escapeCsv(value) { return `"${String(value ?? '').replaceAll('"', '""')}"` }

export function createApp(db, options = {}) {
  const app = express()
  const uploadDir = path.resolve(options.uploadDir || process.env.UPLOAD_DIR || './uploads')
  fs.mkdirSync(uploadDir, { recursive: true })
  const upload = multer({
    storage: multer.diskStorage({ destination: uploadDir, filename: (_req, file, cb) => cb(null, `${Date.now()}-${id('receipt')}${path.extname(file.originalname)}`) }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype)),
  })

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  app.use('/uploads', express.static(uploadDir))

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })
  app.post('/api/auth/register', authLimiter, validate(z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(100) })), async (req, res, next) => {
    try {
      const userId = id('usr')
      const passwordHash = await bcrypt.hash(req.validated.password, 12)
      db.prepare('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)').run(userId, req.validated.name, req.validated.email.toLowerCase(), passwordHash)
      const user = { id: userId, name: req.validated.name, email: req.validated.email.toLowerCase() }
      res.cookie('khata_token', issueToken(user), cookieOptions).status(201).json({ user })
    } catch (error) { if (String(error.message).includes('UNIQUE')) error = Object.assign(new Error('An account with this email already exists'), { status: 409 }); next(error) }
  })
  app.post('/api/auth/login', authLimiter, validate(z.object({ email: z.string().email(), password: z.string().min(1) })), async (req, res, next) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(req.validated.email.toLowerCase())
      if (!user || !(await bcrypt.compare(req.validated.password, user.password_hash))) throw Object.assign(new Error('Invalid email or password'), { status: 401 })
      const safeUser = { id: user.id, name: user.name, email: user.email }
      res.cookie('khata_token', issueToken(safeUser), cookieOptions).json({ user: safeUser })
    } catch (error) { next(error) }
  })
  app.post('/api/auth/logout', (_req, res) => res.clearCookie('khata_token', cookieOptions).status(204).end())
  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }))
  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.use('/api', requireAuth)
  app.get('/api/dashboard', (req, res) => res.json(dashboard(db, req.user.sub)))
  app.get('/api/people', (req, res) => res.json({ people: listPeople(db, req.user.sub, req.query.search || '') }))
  app.post('/api/people', validate(personSchema), (req, res) => {
    const person = { id: id('per'), user_id: req.user.sub, ...req.validated, created_at: now(), updated_at: now() }
    db.prepare('INSERT INTO people (id,user_id,name,phone,notes,created_at,updated_at) VALUES (@id,@user_id,@name,@phone,@notes,@created_at,@updated_at)').run(person)
    res.status(201).json({ person: { ...person, balance: 0, totalUdhar: 0, totalPaid: 0 } })
  })
  app.put('/api/people/:personId', validate(personSchema), (req, res) => {
    const result = db.prepare(`UPDATE people SET name=?,phone=?,notes=?,updated_at=? WHERE id=? AND user_id=?`).run(req.validated.name, req.validated.phone, req.validated.notes, now(), req.params.personId, req.user.sub)
    if (!result.changes) return res.status(404).json({ error: 'Person not found' })
    res.json({ person: db.prepare('SELECT * FROM people WHERE id=?').get(req.params.personId) })
  })

  app.post('/api/charges', validate(chargeSchema), (req, res, next) => { try { res.status(201).json(createCharge(db, req.user.sub, req.validated)) } catch (e) { next(e) } })
  app.post('/api/payments', validate(paymentSchema), (req, res, next) => { try { res.status(201).json(recordPayment(db, req.user.sub, req.validated)) } catch (e) { if (String(e.message).includes('UNIQUE')) e = Object.assign(new Error('That payment reference has already been used'), { status: 409 }); next(e) } })
  app.post('/api/transactions/:entryId/correct', validate(z.object({ reason: z.string().trim().min(3).max(500), replacementAmount: z.union([z.coerce.number().positive(), z.literal('')]).optional(), replacementDescription: z.string().max(200).optional() })), (req, res, next) => { try { res.status(201).json(correctEntry(db, req.user.sub, req.params.entryId, req.validated)) } catch (e) { next(e) } })
  app.get('/api/transactions', (req, res) => res.json({ transactions: listTransactions(db, req.user.sub, req.query) }))

  app.post('/api/payments/:paymentId/receipt', upload.single('receipt'), (req, res, next) => {
    try {
      if (!req.file) throw Object.assign(new Error('Choose a JPG, PNG, WebP, or PDF under 5 MB'), { status: 400 })
      const payment = db.prepare('SELECT id FROM payments WHERE id=? AND user_id=?').get(req.params.paymentId, req.user.sub)
      if (!payment) { fs.unlinkSync(req.file.path); throw Object.assign(new Error('Payment not found'), { status: 404 }) }
      const receipt = { id: id('rec'), user_id: req.user.sub, payment_id: payment.id, original_name: req.file.originalname, stored_name: req.file.filename, mime_type: req.file.mimetype, size_bytes: req.file.size, created_at: now() }
      db.prepare(`INSERT INTO receipts (id,user_id,payment_id,original_name,stored_name,mime_type,size_bytes,created_at)
        VALUES (@id,@user_id,@payment_id,@original_name,@stored_name,@mime_type,@size_bytes,@created_at)`).run(receipt)
      res.status(201).json({ receipt })
    } catch (e) { next(e) }
  })

  app.get('/api/export.csv', (req, res) => {
    const rows = listTransactions(db, req.user.sub, req.query)
    const header = ['Transaction ID','Timestamp','Person','Type','Amount (INR)','Description','Correction reason']
    const csv = [header, ...rows.map(r => [r.id,r.created_at,r.person_name,r.entry_type,r.signedAmount,r.description,r.correction_reason || ''])].map(row => row.map(escapeCsv).join(',')).join('\n')
    res.type('text/csv').set('Content-Disposition', `attachment; filename="khata-${new Date().toISOString().slice(0,10)}.csv"`).send(csv)
  })
  app.get('/api/backup', (req, res) => {
    const userId = req.user.sub
    const tables = ['people','orders','payments','ledger_entries','corrections','receipts']
    const data = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table} WHERE user_id=?`).all(userId)]))
    res.set('Content-Disposition', `attachment; filename="khata-backup-${new Date().toISOString().slice(0,10)}.json"`).json({ format: 'khataflow-backup', version: 1, exportedAt: now(), data })
  })
  app.post('/api/restore', (req, res, next) => {
    try {
      const backup = req.body
      if (backup?.format !== 'khataflow-backup' || backup?.version !== 1 || !backup?.data) throw Object.assign(new Error('Unsupported backup file'), { status: 400 })
      const userId = req.user.sub
      const restored = db.transaction(() => {
        let count = 0
        const insertRows = (table, columns, rows) => {
          const ownedRows = (rows || []).map(row => ({ ...row, user_id: userId }))
          const statement = db.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(c => `@${c}`).join(',')})`)
          for (const row of ownedRows) count += statement.run(row).changes
        }
        insertRows('people',['id','user_id','name','phone','notes','created_at','updated_at'],backup.data.people)
        insertRows('orders',['id','user_id','person_id','description','amount_paise','order_date','due_date','created_at'],backup.data.orders)
        insertRows('payments',['id','user_id','person_id','amount_paise','payment_date','method','reference','notes','created_at'],backup.data.payments)
        insertRows('ledger_entries',['id','user_id','person_id','entry_type','amount_paise','description','occurred_at','source_id','reverses_entry_id','created_at'],backup.data.ledger_entries)
        insertRows('corrections',['id','user_id','original_entry_id','reversal_entry_id','replacement_entry_id','reason','created_at'],backup.data.corrections)
        insertRows('receipts',['id','user_id','payment_id','original_name','stored_name','mime_type','size_bytes','created_at'],backup.data.receipts)
        return count
      })()
      res.json({ restored })
    } catch (e) { next(e) }
  })

  if (process.env.NODE_ENV === 'production') {
    const dist = path.resolve('dist')
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }
  app.use((error, _req, res, _next) => {
    console.error(error)
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Something went wrong' })
  })
  return app
}
